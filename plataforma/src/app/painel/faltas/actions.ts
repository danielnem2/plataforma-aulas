"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";

/** Marca o aviso de falta como visto/contatado (RF98) */
export async function marcarFaltaVista(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel(["admin", "diretor", "professor"]);
  if (!perfil) return { erro: "Sem permissão." };
  const alunoId = String(formData.get("aluno_id") ?? "");
  const faltas = Number(formData.get("faltas") ?? 0);
  const observacao = String(formData.get("observacao") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("alertas_falta_vistos")
    .insert({ aluno_id: alunoId, faltas_no_momento: faltas, visto_por: perfil.id, observacao });
  if (error) return { erro: "Sem permissão." };
  refresh();
  return { ok: "Marcado como contatado." };
}

/** Cadastra um dia sem aula (feriado/recesso) — RF99 */
export async function criarDiaSemAula(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel(["admin", "diretor", "professor"]);
  if (!perfil) return { erro: "Sem permissão." };
  const data = String(formData.get("data") ?? "");
  const turmaId = String(formData.get("turma_id") ?? "") || null;
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Informe a data." };
  if (perfil.papel === "professor" && !turmaId) return { erro: "Professor cadastra dias sem aula por turma." };

  const supabase = await createClient();
  let escolaId = perfil.escola_id;
  if (turmaId) {
    const { data: turma } = await supabase.from("turmas").select("escola_id").eq("id", turmaId).single();
    if (!turma) return { erro: "Turma não encontrada." };
    escolaId = turma.escola_id;
  } else if (perfil.papel === "admin") {
    escolaId = String(formData.get("escola_id") ?? "") || null;
  }
  if (!escolaId) return { erro: "Escolha a escola ou a turma." };

  const { error } = await supabase
    .from("semanas_sem_aula")
    .insert({ escola_id: escolaId, turma_id: turmaId, data, motivo, criado_por: perfil.id });
  if (error) return { erro: "Sem permissão para essa escola/turma." };
  refresh();
  return { ok: "Dia sem aula cadastrado." };
}

export async function excluirDiaSemAula(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  if (!(await perfilComPapel(["admin", "diretor", "professor"]))) return { erro: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.from("semanas_sem_aula").delete().eq("id", id).select("id");
  if (error || !data?.length) return { erro: "Sem permissão." };
  refresh();
  return { ok: "Removido." };
}
