import Link from "next/link";
import { Cartao } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Minhas Estatísticas" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** "AAAA-MM-DD" de hoje no fuso de São Paulo */
function hojeLocal() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
const somarDias = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const br = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC" });

export default async function EstatisticasPage({ searchParams }: PageProps<"/aluno/estatisticas">) {
  const perfil = await exigirPapel(["aluno"]);
  const { periodo } = await searchParams;
  const dias = periodo === "90" ? 90 : periodo === "7" ? 7 : 30;
  const hoje = hojeLocal();
  const inicio = somarDias(hoje, -(dias - 1));
  const supabase = await createClient();

  const [{ data: matriculas }, { data: subs }, { data: presencasPeriodo }, { data: resumo }, { data: faltas }] =
    await Promise.all([
      supabase.from("aluno_cursos").select("curso_id").eq("aluno_id", perfil.id),
      supabase.from("submissoes").select("aula_id, status").eq("aluno_id", perfil.id),
      supabase
        .from("presencas")
        .select("data, registrado_em")
        .eq("aluno_id", perfil.id)
        .gte("data", inicio)
        .order("data", { ascending: false }),
      supabase.from("presencas").select("data").eq("aluno_id", perfil.id).order("data"),
      supabase.rpc("faltas_seguidas", { p_aluno: perfil.id }),
    ]);

  const cursos = (matriculas ?? []).map((m) => m.curso_id);
  const { data: aulas } = cursos.length
    ? await supabase.from("aulas").select("id, titulo, numero_missao").in("curso_id", cursos).eq("ativa", true)
    : { data: [] as { id: string; titulo: string; numero_missao: number }[] };

  const aprovadas = new Set((subs ?? []).filter((s) => s.status === "aprovada").map((s) => s.aula_id));
  const total = aulas?.length ?? 0;
  const concluidas = aulas?.filter((a) => aprovadas.has(a.id)).length ?? 0;
  const progresso = total ? Math.round((concluidas / total) * 100) : 0;
  const atual = aulas?.filter((a) => !aprovadas.has(a.id)).sort((a, b) => a.numero_missao - b.numero_missao)[0];
  const aguardando = (subs ?? []).filter((s) => s.status === "nova").length;

  const presentes = new Set((presencasPeriodo ?? []).map((p) => p.data));
  const todas = resumo ?? [];

  // calendário: semanas completas cobrindo o período
  const primeiro = somarDias(inicio, -new Date(inicio + "T12:00:00Z").getUTCDay());
  const celulas: string[] = [];
  for (let d = primeiro; d <= hoje; d = somarDias(d, 1)) celulas.push(d);

  const cards = [
    { rotulo: "TOTAL DE AULAS", valor: total },
    { rotulo: "CONCLUÍDAS", valor: concluidas },
    { rotulo: "PROGRESSO", valor: `${progresso}%` },
    { rotulo: "AGUARDANDO AVALIAÇÃO", valor: aguardando },
  ];

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">👨‍🎓 Minhas Estatísticas</h1>
          <p className="text-sm text-slate-400">Acompanhe seu progresso e presenças</p>
        </div>
        <span className="rounded-full bg-amber-500/15 px-4 py-2 font-bold text-amber-300">🪙 {perfil.gold_saldo}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.rotulo} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-xs tracking-wide text-slate-400">{c.rotulo}</p>
            <p className="text-3xl font-bold">{c.valor}</p>
          </div>
        ))}
      </div>

      <Cartao titulo="🎯 Missão atual">
        {atual ? (
          <p>
            <span className="text-slate-400">Missão #{atual.numero_missao}</span> — <strong>{atual.titulo}</strong>{" "}
            <Link href="/aluno" className="text-sm text-cyan-300 hover:underline">Ir para o mapa →</Link>
          </p>
        ) : (
          <p className="text-slate-400">{total ? "🏁 Você concluiu todas as aulas!" : "Nenhum curso liberado ainda."}</p>
        )}
      </Cartao>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Cartao titulo="📍 Resumo de presenças">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-400">Total de presenças</dt>
            <dd className="font-semibold">{todas.length}</dd>
            <dt className="text-slate-400">Primeira</dt>
            <dd>{todas[0] ? br(todas[0].data) : "—"}</dd>
            <dt className="text-slate-400">Última</dt>
            <dd>{todas.length ? br(todas[todas.length - 1].data) : "—"}</dd>
            <dt className="text-slate-400">Faltas seguidas</dt>
            <dd>{(faltas as number | null) ?? 0}</dd>
          </dl>
        </Cartao>

        <Cartao titulo="📅 Calendário de presenças">
          <div className="mb-3 flex gap-2 text-sm">
            {[7, 30, 90].map((p) => (
              <Link
                key={p}
                href={`/aluno/estatisticas?periodo=${p}`}
                className={`rounded-full px-3 py-1 ${p === dias ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}
              >
                Últimos {p} dias
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {DIAS.map((d) => (
              <span key={d} className="text-slate-500">{d}</span>
            ))}
            {celulas.map((d) => {
              const noPeriodo = d >= inicio;
              const presente = presentes.has(d);
              return (
                <span
                  key={d}
                  title={br(d)}
                  className={`rounded py-1.5 ${
                    !noPeriodo
                      ? "text-slate-700"
                      : presente
                        ? "bg-emerald-500/30 font-semibold text-emerald-200"
                        : "bg-slate-800/60 text-slate-500"
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">🟩 Presente (fez login) · ⬛ Sem login</p>

          <h3 className="mb-1 mt-4 text-sm font-semibold">Últimas presenças no período</h3>
          <ul className="text-sm text-slate-300">
            {(presencasPeriodo ?? []).slice(0, 10).map((p) => (
              <li key={p.data}>
                {br(p.data)} (
                {new Date(p.registrado_em).toLocaleTimeString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                )
              </li>
            ))}
            {!presencasPeriodo?.length && <li className="text-slate-500">Nenhuma no período.</li>}
          </ul>
        </Cartao>
      </div>
    </div>
  );
}
