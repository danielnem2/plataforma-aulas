"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";

const EQUIPE = ["admin", "diretor", "professor"] as const;

/** Cursos do aluno e "curso inteiro liberado" (RF43/RF44) */
export async function salvarCursosAluno(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel([...EQUIPE]);
  if (!perfil) return { erro: "Sem permissão." };
  const alunoId = String(formData.get("aluno_id") ?? "");
  const cursos = formData.getAll("cursos").map(String);
  const tudo = new Set(formData.getAll("tudo_liberado").map(String));

  const supabase = await createClient();
  const { data: atuais, error: erroLer } = await supabase
    .from("aluno_cursos")
    .select("curso_id, tudo_liberado")
    .eq("aluno_id", alunoId);
  if (erroLer) return { erro: "Sem permissão para este aluno." };

  const remover = (atuais ?? []).filter((a) => !cursos.includes(a.curso_id)).map((a) => a.curso_id);
  if (remover.length) {
    const { error } = await supabase.from("aluno_cursos").delete().eq("aluno_id", alunoId).in("curso_id", remover);
    if (error) return { erro: "Não foi possível remover cursos." };
  }

  for (const cursoId of cursos) {
    const existente = atuais?.find((a) => a.curso_id === cursoId);
    const liberarTudo = tudo.has(cursoId);
    if (!existente) {
      const { error } = await supabase.from("aluno_cursos").insert({
        aluno_id: alunoId,
        curso_id: cursoId,
        tudo_liberado: liberarTudo,
        liberado_por: perfil.id,
      });
      if (error) return { erro: "Sem permissão para liberar curso para este aluno." };
    } else if (existente.tudo_liberado !== liberarTudo) {
      await supabase
        .from("aluno_cursos")
        .update({ tudo_liberado: liberarTudo, liberado_por: perfil.id, liberado_em: new Date().toISOString() })
        .eq("aluno_id", alunoId)
        .eq("curso_id", cursoId);
    }
  }

  refresh();
  return { ok: "Cursos atualizados." };
}

/** Libera uma aula específica, ignorando dependências (RF45) */
export async function liberarAula(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel([...EQUIPE]);
  if (!perfil) return { erro: "Sem permissão." };
  const alunoId = String(formData.get("aluno_id") ?? "");
  const aulaId = String(formData.get("aula_id") ?? "");

  const supabase = await createClient();
  const { error } = await supabase
    .from("liberacoes_aula")
    .insert({ aluno_id: alunoId, aula_id: aulaId, liberado_por: perfil.id });
  if (error) return { erro: "Sem permissão." };
  refresh();
  return { ok: "Aula liberada 🔓" };
}

/** Bloqueia de novo o que foi liberado manualmente (RF46) — mantém histórico (RF48) */
export async function revogarAula(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel([...EQUIPE]);
  if (!perfil) return { erro: "Sem permissão." };
  const alunoId = String(formData.get("aluno_id") ?? "");
  const aulaId = String(formData.get("aula_id") ?? "");

  const supabase = await createClient();
  const { error } = await supabase
    .from("liberacoes_aula")
    .update({ revogado_por: perfil.id, revogado_em: new Date().toISOString() })
    .eq("aluno_id", alunoId)
    .eq("aula_id", aulaId)
    .is("revogado_em", null);
  if (error) return { erro: "Sem permissão." };
  refresh();
  return { ok: "Liberação removida 🔒" };
}

/** Ajuste manual de Gold (RF90) — admin e coordenador */
export async function ajustarGold(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  if (!(await perfilComPapel(["admin", "diretor"]))) return { erro: "Sem permissão." };
  const alunoId = String(formData.get("aluno_id") ?? "");
  const valor = Math.trunc(Number(formData.get("valor") ?? 0));
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!valor) return { erro: "Informe um valor diferente de zero (negativo para descontar)." };
  if (!motivo) return { erro: "Informe o motivo." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("ajustar_gold", { p_aluno: alunoId, p_valor: valor, p_descricao: motivo });
  if (error) {
    return { erro: error.message.includes("gold_saldo") ? "O saldo não pode ficar negativo." : "Não foi possível ajustar." };
  }
  refresh();
  return { ok: `Gold ajustado (${valor > 0 ? "+" : ""}${valor}).` };
}
