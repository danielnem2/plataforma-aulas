"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";

function lerCurso(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    ordem: Number(formData.get("ordem") ?? 0) || 0,
  };
}

export async function criarCurso(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  if (!(await perfilComPapel(["admin"]))) return { erro: "Sem permissão." };
  const dados = lerCurso(formData);
  if (!dados.nome) return { erro: "Informe o nome do curso." };
  const supabase = await createClient();
  const { error } = await supabase.from("cursos").insert(dados);
  if (error) return { erro: "Não foi possível criar o curso." };
  refresh();
  return { ok: `Curso "${dados.nome}" criado.` };
}

export async function editarCurso(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  if (!(await perfilComPapel(["admin"]))) return { erro: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const dados = { ...lerCurso(formData), ativo: formData.get("ativo") === "on" };
  if (!dados.nome) return { erro: "Informe o nome do curso." };
  const supabase = await createClient();
  const { error } = await supabase.from("cursos").update(dados).eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };
  refresh();
  return { ok: "Salvo." };
}
