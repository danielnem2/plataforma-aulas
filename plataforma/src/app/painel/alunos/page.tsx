import Link from "next/link";
import { ArrowRight, Coins, Flag, Hourglass, UserRoundSearch } from "lucide-react";
import { botao, Campo, Cartao, estiloInput, Etiqueta, Icone, TituloPagina } from "@/components/ui";
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
      atual: atual ? `#${atual.numero_missao} ${atual.titulo}` : total ? "Tudo concluído" : "—",
      tudoConcluido: !atual && total > 0,
    };
  });
  // RF32/RF95: quem tem falta vem primeiro
  linhas.sort((a, b) => b.faltas - a.faltas || a.nome.localeCompare(b.nome));

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <TituloPagina icone={UserRoundSearch} descricao="Acompanhe o progresso. Quem tem faltas seguidas aparece no topo.">
        Alunos
      </TituloPagina>

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
          <button className={botao("secundario")}>Filtrar</button>
        </form>

        {!linhas.length && <p className="text-texto-suave">Nenhum aluno encontrado.</p>}
        {!!linhas.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-texto-suave">
                <tr className="border-b border-borda">
                  <th scope="col" className="py-2 pr-3">Aluno</th>
                  <th scope="col" className="pr-3">Turma</th>
                  <th scope="col" className="pr-3">Aula atual</th>
                  <th scope="col" className="pr-3">Progresso</th>
                  <th scope="col" className="pr-3">Aguardando</th>
                  <th scope="col" className="pr-3">Faltas</th>
                  <th scope="col" className="pr-3">
                    <span className="inline-flex items-center gap-1"><Icone icone={Coins} tamanho={16} /> Gold</span>
                  </th>
                  <th scope="col"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const cor = corFalta(l.faltas);
                  return (
                    <tr key={l.id} className={`border-b border-borda ${cor.fundo}`}>
                      <td className="py-2 pr-3 font-medium">
                        {l.nome} {!l.ativo && <span className="text-xs text-texto-suave">(inativo)</span>}
                      </td>
                      <td className="pr-3 text-texto-medio">{l.turma}</td>
                      <td className="pr-3 text-texto-medio">
                        {l.tudoConcluido ? <Etiqueta tom="sucesso" icone={Flag}>Tudo concluído</Etiqueta> : l.atual}
                      </td>
                      <td className="pr-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded bg-elevado">
                            <div className="h-full bg-primaria" style={{ width: `${l.progresso}%` }} />
                          </div>
                          <span className="text-texto-suave">
                            {l.concluidas}/{l.total}
                          </span>
                        </div>
                      </td>
                      <td className="pr-3">
                        {l.pendentes ? <Etiqueta tom="primaria" icone={Hourglass}>{l.pendentes}</Etiqueta> : "—"}
                      </td>
                      <td className="pr-3">
                        <Etiqueta tom={cor.tom} icone={cor.icone}>{l.faltas}</Etiqueta>
                      </td>
                      <td className="pr-3">{l.gold_saldo}</td>
                      <td>
                        <Link href={`/painel/alunos/${l.id}`} className={botao("fantasma", "pequeno")}>
                          Abrir <Icone icone={ArrowRight} tamanho={16} />
                          <span className="sr-only">{l.nome}</span>
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
