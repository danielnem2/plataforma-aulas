"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { normalizarFigma } from "@/lib/figma";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";

const EQUIPE = ["admin", "diretor", "professor"] as const;
const DIFICULDADES = ["facil", "medio", "dificil"];

function lerAula(formData: FormData) {
  const figma = normalizarFigma(String(formData.get("figma") ?? ""));
  const tempo = Number(formData.get("tempo_estimado_min") ?? 0);
  return {
    dados: {
      curso_id: String(formData.get("curso_id") ?? ""),
      titulo: String(formData.get("titulo") ?? "").trim(),
      numero_missao: Number(formData.get("numero_missao") ?? 1) || 1,
      descricao: String(formData.get("descricao") ?? "").trim() || null,
      figma_embed_url: figma ?? "",
      camada: Number(formData.get("camada") ?? 0) || 0,
      ordem: Number(formData.get("ordem") ?? 0) || 0,
      dificuldade: String(formData.get("dificuldade") ?? "facil"),
      tempo_estimado_min: tempo > 0 ? tempo : null,
      gold_recompensa: Math.max(0, Number(formData.get("gold_recompensa") ?? 0) || 0),
      dica_envio: String(formData.get("dica_envio") ?? "").trim() || null,
    },
    dependencias: formData.getAll("dependencias").map(String),
    figmaValido: !!figma,
  };
}

function validar(l: ReturnType<typeof lerAula>): string | null {
  if (!l.dados.curso_id) return "Escolha o curso.";
  if (!l.dados.titulo) return "Informe o título.";
  if (!l.figmaValido)
    return "Link do Figma inválido. Cole o link de compartilhamento do Figma, a URL embed.figma.com ou o bloco <iframe>.";
  if (!DIFICULDADES.includes(l.dados.dificuldade)) return "Dificuldade inválida.";
  return null;
}

/** true se adicionar essas dependências a `aulaId` criaria um ciclo */
async function criaCiclo(aulaId: string, novas: string[]): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("aula_dependencias").select("aula_id, depende_de_id");
  const grafo = new Map<string, string[]>();
  for (const d of data ?? []) {
    if (d.aula_id === aulaId) continue; // serão substituídas
    grafo.set(d.aula_id, [...(grafo.get(d.aula_id) ?? []), d.depende_de_id]);
  }
  grafo.set(aulaId, novas);
  // a partir de cada dependência, alguém chega de volta em aulaId?
  const visitado = new Set<string>();
  const pilha = [...novas];
  while (pilha.length) {
    const atual = pilha.pop()!;
    if (atual === aulaId) return true;
    if (visitado.has(atual)) continue;
    visitado.add(atual);
    pilha.push(...(grafo.get(atual) ?? []));
  }
  return false;
}

async function salvarDependencias(aulaId: string, cursoId: string, deps: string[]) {
  const supabase = await createClient();
  // só aceita aulas do mesmo curso
  const { data: validas } = deps.length
    ? await supabase.from("aulas").select("id").in("id", deps).eq("curso_id", cursoId).neq("id", aulaId)
    : { data: [] as { id: string }[] };
  const ids = (validas ?? []).map((v) => v.id);
  if (await criaCiclo(aulaId, ids)) return "Essas dependências criariam um ciclo (uma aula dependendo dela mesma).";

  await supabase.from("aula_dependencias").delete().eq("aula_id", aulaId);
  if (ids.length) {
    const { error } = await supabase
      .from("aula_dependencias")
      .insert(ids.map((id) => ({ aula_id: aulaId, depende_de_id: id })));
    if (error) return "Não foi possível salvar as dependências.";
  }
  return null;
}

export async function criarAula(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel([...EQUIPE]);
  if (!perfil) return { erro: "Sem permissão." };
  const l = lerAula(formData);
  const erro = validar(l);
  if (erro) return { erro };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("aulas")
    .insert({ ...l.dados, criado_por: perfil.id })
    .select("id")
    .single();
  if (error || !data) return { erro: "Não foi possível criar a aula." };

  const erroDeps = await salvarDependencias(data.id, l.dados.curso_id, l.dependencias);
  refresh();
  if (erroDeps) return { erro: `Aula criada, mas: ${erroDeps}` };
  return { ok: `Aula "${l.dados.titulo}" criada.` };
}

export async function editarAula(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  if (!(await perfilComPapel([...EQUIPE]))) return { erro: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const l = lerAula(formData);
  const erro = validar(l);
  if (erro) return { erro };

  const supabase = await createClient();
  const { error } = await supabase
    .from("aulas")
    .update({ ...l.dados, ativa: formData.get("ativa") === "on" })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar a aula." };

  const erroDeps = await salvarDependencias(id, l.dados.curso_id, l.dependencias);
  refresh();
  if (erroDeps) return { erro: erroDeps };
  return { ok: "Salvo." };
}
