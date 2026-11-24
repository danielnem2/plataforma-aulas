import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ChartColumn,
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
  Gamepad2,
  Hourglass,
  House,
  Repeat,
  Target,
  Timer,
  TrendingUp,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { botao, Campo, Cartao, estiloInput, Etiqueta, Icone, TituloPagina, TOM_SUAVE, type Tom } from "@/components/ui";
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
    <div className="h-24 w-full rounded bg-elevado">
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

  const cards: { icone: LucideIcon; rotulo: string; valor: React.ReactNode; sub: string }[] = [
    { icone: Users, rotulo: "Alunos ativos (30 dias)", valor: ativos30.size, sub: variacao === null ? "sem dados do mês anterior" : `${variacao >= 0 ? "+" : ""}${variacao}% vs. mês anterior` },
    { icone: ChartColumn, rotulo: "Taxa de conclusão", valor: `${conclusao}%`, sub: `${aprovadas.length} de ${aulasTotal} aulas` },
    { icone: Timer, rotulo: "Tempo médio por módulo", valor: tempoMedio, sub: "dias entre aprovações" },
    { icone: Activity, rotulo: "Engajamento semanal", valor: `${pct(ativos7.size, alunos.size)}%`, sub: "logaram nos últimos 7 dias" },
    { icone: Repeat, rotulo: "Taxa de retenção", valor: `${retencao}%`, sub: "ativos no mês anterior que voltaram" },
  ];

  const pendencias: { href: string; icone: LucideIcon; tom: Tom; texto: React.ReactNode; mostrar: boolean }[] = [
    { href: "/painel/submissoes", icone: ClipboardCheck, tom: "primaria", texto: <><strong>{novas}</strong> tarefa(s) aguardando avaliação</>, mostrar: novas > 0 },
    { href: "/painel/faltas", icone: CircleAlert, tom: "perigo", texto: <><strong>{vermelhos}</strong> aluno(s) com 2+ faltas seguidas</>, mostrar: vermelhos > 0 },
    { href: "/painel/compras", icone: Gamepad2, tom: "especial", texto: <><strong>{comprasPend}</strong> compra(s) de horas para avisar</>, mostrar: (comprasPend ?? 0) > 0 },
  ];

  const legendaDist: { tom: Tom; icone: LucideIcon; rotulo: string; valor: number; barra: string }[] = [
    { tom: "sucesso", icone: CircleCheck, rotulo: "No trilho", valor: dist.noTrilho, barra: "bg-sucesso" },
    { tom: "primaria", icone: Hourglass, rotulo: "Aguardando avaliação", valor: dist.aguardando, barra: "bg-primaria" },
    { tom: "aviso", icone: TriangleAlert, rotulo: "1 falta", valor: dist.umaFalta, barra: "bg-aviso" },
    { tom: "perigo", icone: CircleAlert, rotulo: "2+ faltas", valor: dist.duasMais, barra: "bg-perigo" },
  ];

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <TituloPagina
          icone={House}
          descricao={
            <>
              {perfil.papel === "professor" ? "Resumo das suas turmas" : perfil.papel === "diretor" ? "Resumo da sua escola" : "Resumo da plataforma"}
              {" · "}
              {alunos.size} aluno(s) ativo(s) cadastrado(s)
            </>
          }
        >
          Olá, {perfil.nome}
        </TituloPagina>
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
            <button className={botao("secundario")}>Ver</button>
          </form>
        )}
      </div>

      {pendencias.some((p) => p.mostrar) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {pendencias
            .filter((p) => p.mostrar)
            .map((p) => (
              <Link key={p.href} href={p.href} className={`flex items-center gap-3 rounded-xl p-4 hover:shadow-md ${TOM_SUAVE[p.tom]}`}>
                <Icone icone={p.icone} tamanho={22} />
                <span className="flex-1">{p.texto}</span>
                <Icone icone={ArrowRight} />
              </Link>
            ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.rotulo} className="rounded-2xl border border-borda bg-superficie p-4 shadow-sm">
            <p className="flex items-center gap-2 text-sm text-texto-suave">
              <Icone icone={c.icone} tamanho={16} className="text-primaria-texto" /> {c.rotulo}
            </p>
            <p className="mt-1 text-3xl font-bold text-texto">{c.valor}</p>
            <p className="text-xs text-texto-suave">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao titulo="Atividade semanal — enviadas × aprovadas" icone={ChartColumn}>
          <div className="grid grid-cols-8 gap-2">
            {semanas.map((s) => (
              <div key={s.rotulo} className="flex flex-col items-center gap-1">
                <div className="flex w-full gap-0.5">
                  <Barra valor={s.enviadas} max={maxAtividade} cor="bg-primaria" />
                  <Barra valor={s.aprovadas} max={maxAtividade} cor="bg-sucesso" />
                </div>
                <span className="text-xs text-texto-suave">{s.rotulo}</span>
                <span className="text-xs text-texto-suave">
                  {s.enviadas}/{s.aprovadas}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex flex-wrap gap-4 text-xs text-texto-suave">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-primaria" /> enviadas</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-sucesso" /> aprovadas</span>
            <span>(semana que começa na data)</span>
          </p>
        </Cartao>

        <Cartao titulo="Presença por semana — alunos que logaram" icone={TrendingUp}>
          <div className="grid grid-cols-8 gap-2">
            {semanas.map((s) => (
              <div key={s.rotulo} className="flex flex-col items-center gap-1">
                <Barra valor={s.presentes} max={Math.max(1, alunos.size)} cor="bg-especial" />
                <span className="text-xs text-texto-suave">{s.rotulo}</span>
                <span className="text-xs text-texto-suave">{pct(s.presentes, alunos.size)}%</span>
              </div>
            ))}
          </div>
        </Cartao>
      </div>

      <Cartao titulo="Distribuição dos alunos" icone={Target}>
        <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-full bg-elevado" aria-hidden="true">
          {legendaDist.map((d) => (
            <div key={d.rotulo} className={d.barra} style={{ width: `${(d.valor / totalDist) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {legendaDist.map((d) => (
            <li key={d.rotulo}>
              <Etiqueta tom={d.tom} icone={d.icone}>
                {d.rotulo}: {d.valor}
              </Etiqueta>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
