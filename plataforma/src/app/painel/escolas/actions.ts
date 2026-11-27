"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";

function lerEscola(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    endereco: String(formData.get("endereco") ?? "").trim() || null,
    telefone: String(formData.get("telefone") ?? "").trim() || null,
  };
}

export async function criarEscola(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  if (!(await perfilComPapel(["admin"]))) return { erro: "Sem permissão." };
  const dados = lerEscola(formData);
  if (!dados.nome) return { erro: "Informe o nome da escola." };

  const supabase = await createClient();
  const { error } = await supabase.from("escolas").insert(dados);
  if (error) return { erro: "Não foi possível criar a escola." };

  refresh();
  return { ok: `Escola "${dados.nome}" criada.` };
}

/** Tema da escola (cor, fundo, modo padrão, nome exibido e logo) — só admin */
export async function salvarTemaEscola(dados: {
  id: string;
  tema_cor: string | null;
  tema_fundo: string;
  tema_modo: string;
  tema_nome: string | null;
  logo_path?: string | null;
}): Promise<EstadoAcao> {
  if (!(await perfilComPapel(["admin"]))) return { erro: "Só o ADM altera o tema." };
  if (dados.tema_cor && !/^#[0-9a-fA-F]{6}$/.test(dados.tema_cor)) return { erro: "Cor inválida (use #RRGGBB)." };
  if (!["padrao", "preto_branco"].includes(dados.tema_fundo)) return { erro: "Fundo inválido." };
  if (!["claro", "escuro"].includes(dados.tema_modo)) return { erro: "Modo inválido." };
  const nome = dados.tema_nome?.trim() || null;
  if (nome && nome.length > 60) return { erro: "Nome exibido muito longo (máx. 60)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("escolas")
    .update({
      tema_cor: dados.tema_cor || null,
      tema_fundo: dados.tema_fundo,
      tema_modo: dados.tema_modo,
      tema_nome: nome,
      ...(dados.logo_path !== undefined ? { logo_path: dados.logo_path } : {}),
    })
    .eq("id", dados.id);
  if (error) return { erro: "Não foi possível salvar o tema." };
  refresh();
  return { ok: "Tema salvo. Quem é da escola já vê o novo visual ao recarregar." };
}

export async function editarEscola(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  if (!(await perfilComPapel(["admin"]))) return { erro: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const dados = { ...lerEscola(formData), ativa: formData.get("ativa") === "on" };
  if (!dados.nome) return { erro: "Informe o nome da escola." };

  const supabase = await createClient();
  const { error } = await supabase.from("escolas").update(dados).eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };

  refresh();
  return { ok: "Salvo." };
}
