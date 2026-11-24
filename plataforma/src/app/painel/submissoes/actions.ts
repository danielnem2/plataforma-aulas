"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";

/** Aprovar ou devolver uma submissão (RF28/RF30/RF52) */
export async function avaliarSubmissao(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  if (!(await perfilComPapel(["admin", "diretor", "professor"]))) return { erro: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const decisao = String(formData.get("decisao") ?? "");
  const comentario = String(formData.get("comentario") ?? "").trim();

  const supabase = await createClient();
  if (decisao === "aprovar") {
    const { error } = await supabase.rpc("aprovar_submissao", { p_submissao: id, p_comentario: comentario || null });
    if (error) return { erro: error.message.includes("já avaliada") ? "Já foi avaliada por outra pessoa." : "Não foi possível aprovar." };
    refresh();
    return { ok: "Aprovada ✅" };
  }
  if (decisao === "devolver") {
    if (!comentario) return { erro: "Escreva um comentário explicando o que corrigir." };
    const { error } = await supabase.rpc("devolver_submissao", { p_submissao: id, p_comentario: comentario });
    if (error) return { erro: error.message.includes("já avaliada") ? "Já foi avaliada por outra pessoa." : "Não foi possível devolver." };
    refresh();
    return { ok: "Devolvida 🔙" };
  }
  return { erro: "Escolha aprovar ou devolver." };
}
