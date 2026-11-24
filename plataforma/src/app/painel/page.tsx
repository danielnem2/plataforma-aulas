import Link from "next/link";
import { Campo, Cartao, estiloInput } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import type { LinhaFalta } from "@/lib/faltas";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Painel" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

const DIA = 24 * 60 * 60 * 1000;
const hoje = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const menosDias = (iso: string, n: number) => new Date(new Date(iso + "T12:00:00Z").getTime() - n * DIA).toISOString().slice(0, 10);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

function Barra({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  return (
    <div className="h-24 w-full rounded bg-slate-800/40">
      <div className="flex h-full items-end">
        <div className={`w-full rounded ${cor}`} style={{ height: `${max ? (valor / max) * 100 : 0}%` }} title={String(valor)} />
      </div>
    </div>
  );
}

export default async function PainelPage({ searchParams }: PageProps<"/painel">) {
  const perfil = await exigirPapel(["admin", "diretor", "professor"]);
  const { escola } = await searchParams;
  const filtroEscola = perfil.papel === "admin" && typeof escola === "string" ? escola : "";
  const supabase = await createClient();
  const h = hoje();
  const desde = menosDias(h, 60);

  let alunosQ = supabase.from("perfis").select("id, escola_id").eq("papel", "aluno").eq("ativo", true);
  if (filtroEscola) alunosQ = alunosQ.eq("escola_id", filtroEscola);

  const [
    { data: alunosRaw },
    { data: escolas },
    { data: presencas },
    { data: subs },
    { data: matriculas },
    { data: aulas },
    { data: faltasRaw },
    { count: comprasPend },
  ] = await Promise.all([
    alunosQ,
    supabase.from("escolas").select("id, nome").order("nome"),
    supabase.from("presencas").select("aluno_id, data").gte("data", desde),
    supabase.from("submissoes").select("aluno_id, aula_id, status, enviado_em, avaliado_em"),
    supabase.from("aluno_cursos").select("aluno_id, curso_id"),
    supabase.from("aulas").select("id, curso_id").eq("ativa", true),
    supabase.rpc("painel_faltas"),
    supabase.from("compras").select("id", { count: "exact", head: true }).eq("status", "aguardando_aviso"),
  ]);

  const alunos = new Set((alunosRaw ?? []).map((a) => a.id));
  const doFiltro = <T extends { aluno_id: string }>(xs: T[] | null) => (xs ?? []).filter((x) => alunos.has(x.aluno_id));
  const pres = doFiltro(presencas);
  const sub = doFiltro(subs);
  const faltas = doFiltro((faltasRaw ?? []) as LinhaFalta[]);

  // RF49 — métricas
  const ativosEm = (de: string, ate: string) => new Set(pres.filter((p) => p.data > de && p.data <= ate).map((p) => p.aluno_id));
  const ativos30 = ativosEm(menosDias(h, 30), h);
  const ativos30ant = ativosEm(menosDias(h, 60), menosDias(h, 30));
  const variacao = ativos30ant.size ? Math.round(((ativos30.size - ativos30ant.size) / ativos30ant.size) * 100) : null;
  const ativos7 = ativosEm(menosDias(h, 7), h);
  const retencao = ativos30ant.size ? pct([...ativos30ant].filter((a) => ativos30.has(a)).length, ativos30ant.size) : 0;

  let aulasTotal = 0;
  for (const m of doFiltro(matriculas)) aulasTotal += (aulas ?? []).filter((a) => a.curso_id === m.curso_id).length;
  const aprovadas = sub.filter((s) => s.status === "aprovada");
  const conclusao = pct(aprovadas.length, aulasTotal);

  // tempo médio entre aprovações consecutivas do mesmo aluno (dias por módulo)
  const porAluno = new Map<string, number[]>();
  for (const s of aprovadas) if (s.avaliado_em) porAluno.set(s.aluno_id, [...(porAluno.get(s.aluno_id) ?? []), new Date(s.avaliado_em).getTime()]);
  const intervalos: number[] = [];
  for (const ts of porAluno.values()) {
    ts.sort((a, b) => a - b);
    for (let i = 1; i < ts.length; i++) intervalos.push((ts[i] - ts[i - 1]) / DIA);
  }
  const tempoMedio = intervalos.length ? (intervalos.reduce((a, b) => a + b, 0) / intervalos.length).toFixed(1) : "—";

  // RF33 — atividade nas últimas 8 semanas
  const semanas = Array.from({ length: 8 }, (_, i) => {
    const fim = menosDias(h, i * 7);
    const ini = menosDias(h, i * 7 + 7);
    const dentro = (iso: string | null) => !!iso && iso.slice(0, 10) > ini && iso.slice(0, 10) <= fim;
    return {
      rotulo: `${ini.slice(8)}/${ini.slice(5, 7)}`,
      enviadas: sub.filter((s) => dentro(s.enviado_em)).length,
      aprovadas: sub.filter((s) => s.status === "aprovada" && dentro(s.avaliado_em)).length,
      presentes: new Set(pres.filter((p) => p.data > ini && p.data <= fim).map((p) => p.aluno_id)).size,
    };
  }).reverse();
  const maxAtividade = Math.max(1, ...semanas.map((s) => Math.max(s.enviadas, s.aprovadas)));

  // RF35 — distribuição
  const aguardando = new Set(sub.filter((s) => s.status === "nova").map((s) => s.aluno_id));
  const dist = {
    noTrilho: faltas.filter((f) => f.faltas === 0 && !aguardando.has(f.aluno_id)).length,
    aguardando: faltas.filter((f) => f.faltas === 0 && aguardando.has(f.aluno_id)).length,
    umaFalta: faltas.filter((f) => f.faltas === 1).length,
    duasMais: faltas.filter((f) => f.faltas >= 2).length,
  };
  const totalDist = Math.max(1, faltas.length);

  const novas = sub.filter((s) => s.status === "nova").length;
  const vermelhos = faltas.filter((f) => f.faltas >= 2 && !f.aviso_visto).length;

  const cards = [
    { icone: "👥", rotulo: "Alunos ativos (30 dias)", valor: ativos30.size, sub: variacao === null ? "sem dados do mês anterior" : `${variacao >= 0 ? "+" : ""}${variacao}% vs. mês anterior` },
    { icone: "📊", rotulo: "Taxa de conclusão", valor: `${conclusao}%`, sub: `${aprovadas.length} de ${aulasTotal} aulas` },
    { icone: "⏱️", rotulo: "Tempo médio por módulo", valor: tempoMedio, sub: "dias entre aprovações" },
    { icone: "🔥", rotulo: "Engajamento semanal", valor: `${pct(ativos7.size, alunos.size)}%`, sub: "logaram nos últimos 7 dias" },
    { icone: "❤️", rotulo: "Taxa de retenção", valor: `${retencao}%`, sub: "ativos no mês anterior que voltaram" },
  ];

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Olá, {perfil.nome} 👋</h1>
          <p className="text-sm text-slate-400">
            {perfil.papel === "professor" ? "Resumo das suas turmas" : perfil.papel === "diretor" ? "Resumo da sua escola" : "Resumo da plataforma"}
            {" · "}
            {alunos.size} aluno(s) ativo(s) cadastrado(s)
          </p>
        </div>
        {perfil.papel === "admin" && (escolas?.length ?? 0) > 1 && (
          <form className="flex items-end gap-2">
            <Campo rotulo="Escola">
              <select name="escola" defaultValue={filtroEscola} className={estiloInput}>
                <option value="">Todas</option>
                {escolas?.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </Campo>
            <button className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">Ver</button>
          </form>
        )}
      </div>

      {(novas > 0 || vermelhos > 0 || (comprasPend ?? 0) > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {novas > 0 && (
            <Link href="/painel/submissoes" className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4 hover:bg-cyan-500/20">
              🎯 <strong>{novas}</strong> tarefa(s) aguardando avaliação →
            </Link>
          )}
          {vermelhos > 0 && (
            <Link href="/painel/faltas" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 hover:bg-red-500/20">
              🚨 <strong>{vermelhos}</strong> aluno(s) com 2+ faltas seguidas →
            </Link>
          )}
          {(comprasPend ?? 0) > 0 && (
            <Link href="/painel/compras" className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-4 hover:bg-violet-500/20">
              🎮 <strong>{comprasPend}</strong> compra(s) de horas para avisar →
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.rotulo} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">
              {c.icone} {c.rotulo}
            </p>
            <p className="text-3xl font-bold">{c.valor}</p>
            <p className="text-xs text-slate-500">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao titulo="📊 Atividade semanal — enviadas × aprovadas">
          <div className="grid grid-cols-8 gap-2">
            {semanas.map((s) => (
              <div key={s.rotulo} className="flex flex-col items-center gap-1">
                <div className="flex w-full gap-0.5">
                  <Barra valor={s.enviadas} max={maxAtividade} cor="bg-cyan-400" />
                  <Barra valor={s.aprovadas} max={maxAtividade} cor="bg-emerald-400" />
                </div>
                <span className="text-[10px] text-slate-500">{s.rotulo}</span>
                <span className="text-[10px] text-slate-400">
                  {s.enviadas}/{s.aprovadas}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">🟦 enviadas · 🟩 aprovadas (semana que começa na data)</p>
        </Cartao>

        <Cartao titulo="📈 Presença por semana — alunos que logaram">
          <div className="grid grid-cols-8 gap-2">
            {semanas.map((s) => (
              <div key={s.rotulo} className="flex flex-col items-center gap-1">
                <Barra valor={s.presentes} max={Math.max(1, alunos.size)} cor="bg-violet-400" />
                <span className="text-[10px] text-slate-500">{s.rotulo}</span>
                <span className="text-[10px] text-slate-400">{pct(s.presentes, alunos.size)}%</span>
              </div>
            ))}
          </div>
        </Cartao>
      </div>

      <Cartao titulo="🎯 Distribuição dos alunos">
        <div className="flex h-6 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="bg-emerald-500" style={{ width: `${(dist.noTrilho / totalDist) * 100}%` }} />
          <div className="bg-cyan-500" style={{ width: `${(dist.aguardando / totalDist) * 100}%` }} />
          <div className="bg-amber-500" style={{ width: `${(dist.umaFalta / totalDist) * 100}%` }} />
          <div className="bg-red-500" style={{ width: `${(dist.duasMais / totalDist) * 100}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
          <span>🟢 No trilho: {dist.noTrilho}</span>
          <span>🔵 Aguardando avaliação: {dist.aguardando}</span>
          <span>🟡 1 falta: {dist.umaFalta}</span>
          <span>🔴 2+ faltas: {dist.duasMais}</span>
        </div>
      </Cartao>
    </div>
  );
}
