import Link from "next/link";
import { notFound } from "next/navigation";
import { MapaAluno } from "@/app/aluno/mapa-aluno";
import { FormAcao } from "@/components/form-acao";
import { Campo, Cartao, estiloInput } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { corFalta } from "@/lib/faltas";
import { carregarMapa } from "@/lib/mapa";
import { createClient } from "@/lib/supabase/server";
import { ajustarGold, liberarAula, revogarAula, salvarCursosAluno } from "../actions";

export const metadata = { title: "Aluno" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

const ROTULO_ESTADO: Record<string, string> = {
  concluida: "✓ Concluída",
  disponivel: "► Disponível",
  pendente: "⏳ Aguardando avaliação",
  devolvida: "🔙 Devolvida",
  bloqueada: "🔒 Bloqueada",
};

const MOTIVO_GOLD: Record<string, string> = {
  aula_aprovada: "Aula aprovada",
  compra: "Compra na loja",
  ajuste_manual: "Ajuste manual",
};

export default async function AlunoDetalhePage({ params, searchParams }: PageProps<"/painel/alunos/[id]">) {
  const perfil = await exigirPapel(["admin", "diretor", "professor"]);
  const { id } = await params;
  const { curso } = await searchParams;
  const supabase = await createClient();

  // RLS: se o usuário não pode gerir este aluno, a consulta volta vazia
  const { data: aluno } = await supabase
    .from("perfis")
    .select("id, nome, email, turma_id, escola_id, gold_saldo, ativo")
    .eq("id", id)
    .eq("papel", "aluno")
    .single();
  if (!aluno) notFound();

  const [
    { data: cursos },
    { data: matriculas },
    { data: turma },
    { data: presencas },
    { data: extrato },
    { data: compras },
    { data: faltas },
    { data: liberacoes },
  ] = await Promise.all([
    supabase.from("cursos").select("id, nome").eq("ativo", true).order("ordem"),
    supabase.from("aluno_cursos").select("curso_id, tudo_liberado").eq("aluno_id", id),
    supabase.from("turmas").select("nome").eq("id", aluno.turma_id ?? "").maybeSingle(),
    supabase.from("presencas").select("data, registrado_em").eq("aluno_id", id).order("data", { ascending: false }).limit(20),
    supabase.from("transacoes_gold").select("valor, motivo, descricao, criado_em").eq("aluno_id", id).order("criado_em", { ascending: false }).limit(20),
    supabase.from("compras").select("id, preco_pago, status, criado_em, item:loja_itens(nome, tipo)").eq("aluno_id", id).order("criado_em", { ascending: false }).limit(20),
    supabase.rpc("faltas_seguidas", { p_aluno: id }),
    supabase
      .from("liberacoes_aula")
      .select("aula_id, liberado_em, revogado_em, quem:perfis!liberacoes_aula_liberado_por_fkey(nome)")
      .eq("aluno_id", id)
      .order("liberado_em", { ascending: false })
      .limit(20),
  ]);

  const cursosDoAluno = (matriculas ?? []).map((m) => m.curso_id);
  const cursoMapa =
    (typeof curso === "string" && cursosDoAluno.includes(curso) && curso) || cursosDoAluno[0] || null;
  const mapa = cursoMapa ? await carregarMapa(id, cursoMapa) : null;
  const cor = corFalta((faltas as number | null) ?? 0);
  const nomeAula = (aulaId: string) => mapa?.nos.find((n) => n.id === aulaId)?.titulo ?? "aula de outro curso";

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div>
        <Link href="/painel/alunos" className="text-sm text-cyan-300 hover:underline">← Alunos</Link>
        <h1 className="mt-1 text-2xl font-bold">🧑‍🎓 {aluno.nome}</h1>
        <p className="text-sm text-slate-400">
          {aluno.email} · Turma: {turma?.nome ?? "—"} · 🪙 {aluno.gold_saldo} ·{" "}
          <span className={cor.texto}>
            {cor.selo} {(faltas as number | null) ?? 0} falta(s) seguida(s)
          </span>
          {!aluno.ativo && " · (inativo)"}
        </p>
      </div>

      <Cartao titulo="🎓 Cursos do aluno">
        <FormAcao acao={salvarCursosAluno} botao="Salvar cursos">
          <input type="hidden" name="aluno_id" value={id} />
          <div className="flex flex-col gap-2">
            {cursos?.map((c) => {
              const m = matriculas?.find((x) => x.curso_id === c.id);
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-6 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="cursos" value={c.id} defaultChecked={!!m} /> {c.nome}
                  </label>
                  <label className="flex items-center gap-2 text-slate-400">
                    <input type="checkbox" name="tudo_liberado" value={c.id} defaultChecked={m?.tudo_liberado} />
                    Liberar o curso inteiro (ignora dependências)
                  </label>
                </div>
              );
            })}
          </div>
        </FormAcao>
      </Cartao>

      {mapa && cursoMapa && (
        <Cartao titulo="🗺️ Mapa do aluno">
          {cursosDoAluno.length > 1 && (
            <div className="mb-3 flex gap-2">
              {cursos
                ?.filter((c) => cursosDoAluno.includes(c.id))
                .map((c) => (
                  <Link
                    key={c.id}
                    href={`/painel/alunos/${id}?curso=${c.id}`}
                    className={`rounded-full px-3 py-1 text-sm ${
                      c.id === cursoMapa ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {c.nome}
                  </Link>
                ))}
            </div>
          )}
          <MapaAluno {...mapa} somenteLeitura />

          <h3 className="mb-2 mt-5 font-semibold">🔓 Liberar aulas individualmente</h3>
          <ul className="flex flex-col divide-y divide-slate-800 text-sm">
            {mapa.nos.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span>
                  #{n.numero_missao} {n.titulo}{" "}
                  <span className="text-slate-400">— {ROTULO_ESTADO[n.estado ?? "bloqueada"]}</span>
                  {n.liberada_manualmente && <span className="text-violet-300"> · 🔓 liberada manualmente</span>}
                </span>
                {n.liberada_manualmente ? (
                  <FormAcao acao={revogarAula} botao="Bloquear de novo">
                    <input type="hidden" name="aluno_id" value={id} />
                    <input type="hidden" name="aula_id" value={n.id} />
                  </FormAcao>
                ) : n.estado === "bloqueada" ? (
                  <FormAcao acao={liberarAula} botao="Liberar">
                    <input type="hidden" name="aluno_id" value={id} />
                    <input type="hidden" name="aula_id" value={n.id} />
                  </FormAcao>
                ) : null}
              </li>
            ))}
          </ul>
          {!!liberacoes?.length && (
            <details className="mt-3 text-sm text-slate-400">
              <summary className="cursor-pointer">Histórico de liberações</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {liberacoes.map((l, i) => (
                  <li key={i}>
                    {nomeAula(l.aula_id)} — liberada por{" "}
                    {(l.quem as unknown as { nome: string } | null)?.nome ?? "—"} em {dataHora(l.liberado_em)}
                    {l.revogado_em && ` · bloqueada de novo em ${dataHora(l.revogado_em)}`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Cartao>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao titulo="📅 Presenças (últimas 20)">
          {!presencas?.length && <p className="text-sm text-slate-400">Nenhuma presença registrada.</p>}
          <ul className="flex flex-col gap-1 text-sm text-slate-300">
            {presencas?.map((p) => (
              <li key={p.data}>
                {data(p.data + "T12:00:00")} — login às{" "}
                {new Date(p.registrado_em).toLocaleTimeString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </li>
            ))}
          </ul>
        </Cartao>

        <Cartao titulo="🪙 Extrato de Gold">
          {!extrato?.length && <p className="text-sm text-slate-400">Sem movimentações.</p>}
          <ul className="flex flex-col gap-1 text-sm">
            {extrato?.map((t, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-slate-300">
                  {dataHora(t.criado_em)} · {MOTIVO_GOLD[t.motivo]}
                  {t.descricao && ` — ${t.descricao}`}
                </span>
                <span className={t.valor > 0 ? "text-emerald-300" : "text-red-300"}>
                  {t.valor > 0 ? "+" : ""}
                  {t.valor}
                </span>
              </li>
            ))}
          </ul>
          {(perfil.papel === "admin" || perfil.papel === "diretor") && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <FormAcao acao={ajustarGold} botao="Ajustar Gold" limparAoSalvar>
                <input type="hidden" name="aluno_id" value={id} />
                <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                  <Campo rotulo="Valor (+/-)">
                    <input name="valor" type="number" required className={estiloInput} />
                  </Campo>
                  <Campo rotulo="Motivo *">
                    <input name="motivo" required placeholder="Ex.: bônus por ajudar colega" className={estiloInput} />
                  </Campo>
                </div>
              </FormAcao>
            </div>
          )}
        </Cartao>
      </div>

      <Cartao titulo="🛒 Compras">
        {!compras?.length && <p className="text-sm text-slate-400">Nenhuma compra.</p>}
        <ul className="flex flex-col gap-1 text-sm text-slate-300">
          {compras?.map((c) => {
            const item = c.item as unknown as { nome: string; tipo: string } | null;
            return (
              <li key={c.id}>
                {dataHora(c.criado_em)} · {item?.nome} · 🪙 {c.preco_pago} ·{" "}
                {c.status === "aguardando_aviso" ? "⏳ aguardando aviso à Gaming House" : c.status === "avisado" ? "✅ avisado" : "✅ entregue"}
              </li>
            );
          })}
        </ul>
      </Cartao>
    </div>
  );
}
