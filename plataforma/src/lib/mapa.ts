import "server-only";
import type { Dependencia, EstadoAula, NoMapa } from "@/components/mapa-habilidades";
import type { DetalheAula } from "@/app/aluno/mapa-aluno";
import { createClient } from "@/lib/supabase/server";

export type CursoDoAluno = { id: string; nome: string; tudo_liberado: boolean };

/** Cursos liberados para o aluno */
export async function cursosDoAluno(alunoId: string): Promise<CursoDoAluno[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("aluno_cursos")
    .select("tudo_liberado, cursos(id, nome, ordem, ativo)")
    .eq("aluno_id", alunoId);

  type Linha = { tudo_liberado: boolean; cursos: { id: string; nome: string; ordem: number; ativo: boolean } | null };
  return ((data ?? []) as unknown as Linha[])
    .filter((l) => l.cursos?.ativo)
    .sort((a, b) => a.cursos!.ordem - b.cursos!.ordem)
    .map((l) => ({ id: l.cursos!.id, nome: l.cursos!.nome, tudo_liberado: l.tudo_liberado }));
}

/** Monta o mapa de um curso para um aluno: estados, dependências e detalhes das aulas */
export async function carregarMapa(alunoId: string, cursoId: string) {
  const supabase = await createClient();

  const [{ data: estados }, { data: aulas }, { data: deps }, { data: subs }] = await Promise.all([
    supabase.rpc("estado_aulas", { p_aluno: alunoId, p_curso: cursoId }),
    supabase
      .from("aulas")
      .select("id, titulo, descricao, figma_embed_url, dificuldade, tempo_estimado_min, gold_recompensa, dica_envio")
      .eq("curso_id", cursoId)
      .eq("ativa", true),
    supabase.from("aula_dependencias").select("aula_id, depende_de_id"),
    supabase
      .from("submissoes")
      .select("aula_id, status, comentario, link, enviado_em")
      .eq("aluno_id", alunoId)
      .order("enviado_em", { ascending: false }),
  ]);

  type Estado = {
    aula_id: string;
    titulo: string;
    numero_missao: number;
    camada: number;
    ordem: number;
    estado: EstadoAula;
    liberada_manualmente: boolean;
  };

  const nos: NoMapa[] = ((estados ?? []) as Estado[]).map((e) => ({
    id: e.aula_id,
    titulo: e.titulo,
    numero_missao: e.numero_missao,
    camada: e.camada,
    ordem: e.ordem,
    estado: e.estado,
    liberada_manualmente: e.liberada_manualmente,
  }));

  const ids = new Set(nos.map((n) => n.id));
  const dependencias: Dependencia[] = (deps ?? []).filter((d) => ids.has(d.aula_id));

  const detalhes: Record<string, DetalheAula> = {};
  for (const a of (aulas ?? []) as Omit<DetalheAula, "ultima">[]) {
    // aprovação tem prioridade; senão, o envio mais recente
    const daAula = (subs ?? []).filter((s) => s.aula_id === a.id);
    const ultima = daAula.find((s) => s.status === "aprovada") ?? daAula[0] ?? null;
    detalhes[a.id] = { ...a, ultima };
  }

  return { nos, dependencias, detalhes };
}
