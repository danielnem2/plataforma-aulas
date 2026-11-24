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
