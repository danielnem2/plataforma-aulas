import Link from "next/link";
import { Campo, Cartao, estiloInput } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { corFalta, type LinhaFalta } from "@/lib/faltas";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Alunos" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

export default async function AlunosPage({ searchParams }: PageProps<"/painel/alunos">) {
  await exigirPapel(["admin", "diretor", "professor"]);
  const { turma } = await searchParams;
  const filtroTurma = typeof turma === "string" ? turma : "";
  const supabase = await createClient();

  // RLS: professor só vê alunos das suas turmas; coordenador, da escola
  let consultaAlunos = supabase
    .from("perfis")
    .select("id, nome, turma_id, gold_saldo, ativo")
    .eq("papel", "aluno")
    .order("nome");
  if (filtroTurma) consultaAlunos = consultaAlunos.eq("turma_id", filtroTurma);

  const [{ data: alunos }, { data: turmas }, { data: matriculas }, { data: aulas }, { data: subs }, { data: faltas }] =
    await Promise.all([
      consultaAlunos,
      supabase.from("turmas").select("id, nome").order("nome"),
      supabase.from("aluno_cursos").select("aluno_id, curso_id"),
      supabase.from("aulas").select("id, curso_id, titulo, numero_missao").eq("ativa", true),
      supabase.from("submissoes").select("aluno_id, aula_id, status"),
      supabase.rpc("painel_faltas"),
    ]);

  const faltasPor = new Map(((faltas ?? []) as LinhaFalta[]).map((f) => [f.aluno_id, f.faltas]));

  const linhas = (alunos ?? []).map((a) => {
    const cursos = (matriculas ?? []).filter((m) => m.aluno_id === a.id).map((m) => m.curso_id);
    const aulasDoAluno = (aulas ?? []).filter((x) => cursos.includes(x.curso_id));
    const aprovadas = new Set(
      (subs ?? []).filter((s) => s.aluno_id === a.id && s.status === "aprovada").map((s) => s.aula_id),
    );
    const pendentes = (subs ?? []).filter((s) => s.aluno_id === a.id && s.status === "nova").length;
    const atual = aulasDoAluno
      .filter((x) => !aprovadas.has(x.id))
      .sort((x, y) => x.numero_missao - y.numero_missao)[0];
    const total = aulasDoAluno.length;
    return {
      ...a,
      turma: turmas?.find((t) => t.id === a.turma_id)?.nome ?? "—",
      faltas: faltasPor.get(a.id) ?? 0,
      progresso: total ? Math.round((aprovadas.size / total) * 100) : 0,
      concluidas: aprovadas.size,
      total,
      pendentes,
      atual: atual ? `#${atual.numero_missao} ${atual.titulo}` : total ? "🏁 Tudo concluído" : "—",
    };
  });
  // RF32/RF95: quem tem falta vem primeiro
  linhas.sort((a, b) => b.faltas - a.faltas || a.nome.localeCompare(b.nome));

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">🧑‍🎓 Alunos</h1>
        <p className="text-sm text-slate-400">
          Acompanhe o progresso. 🟡 1 falta · 🔴 2+ faltas seguidas (ficam no topo).
        </p>
      </div>

      <Cartao>
        <form className="mb-4 flex items-end gap-2">
          <Campo rotulo="Turma">
            <select name="turma" defaultValue={filtroTurma} className={estiloInput}>
              <option value="">Todas</option>
              {turmas?.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </Campo>
          <button className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">Filtrar</button>
        </form>

        {!linhas.length && <p className="text-slate-400">Nenhum aluno encontrado.</p>}
        {!!linhas.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="py-2 pr-3">Aluno</th>
                  <th className="pr-3">Turma</th>
                  <th className="pr-3">Aula atual</th>
                  <th className="pr-3">Progresso</th>
                  <th className="pr-3">Aguardando</th>
                  <th className="pr-3">Faltas</th>
                  <th className="pr-3">🪙</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const cor = corFalta(l.faltas);
                  return (
                    <tr key={l.id} className={`border-b border-slate-800/60 ${cor.fundo}`}>
                      <td className="py-2 pr-3 font-medium">
                        {l.nome} {!l.ativo && <span className="text-xs text-slate-500">(inativo)</span>}
                      </td>
                      <td className="pr-3 text-slate-300">{l.turma}</td>
                      <td className="pr-3 text-slate-300">{l.atual}</td>
                      <td className="pr-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded bg-slate-800">
                            <div className="h-full bg-cyan-400" style={{ width: `${l.progresso}%` }} />
                          </div>
                          <span className="text-slate-400">
                            {l.concluidas}/{l.total}
                          </span>
                        </div>
                      </td>
                      <td className="pr-3">{l.pendentes ? `⏳ ${l.pendentes}` : "—"}</td>
                      <td className={`pr-3 ${cor.texto}`}>
                        {cor.selo} {l.faltas}
                      </td>
                      <td className="pr-3">{l.gold_saldo}</td>
                      <td>
                        <Link href={`/painel/alunos/${l.id}`} className="text-cyan-300 hover:underline">
                          Abrir →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  );
}
