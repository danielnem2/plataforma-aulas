import Link from "next/link";
import { Cartao } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AvaliarForm } from "./avaliar-form";

export const metadata = { title: "Submissões" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

const ABAS = [
  { valor: "nova", rotulo: "🆕 Novas" },
  { valor: "aprovada", rotulo: "✅ Aprovadas" },
  { valor: "devolvida", rotulo: "🔙 Devolvidas" },
  { valor: "todas", rotulo: "📊 Todas" },
];

type Linha = {
  id: string;
  link: string;
  status: "nova" | "aprovada" | "devolvida";
  comentario: string | null;
  enviado_em: string;
  avaliado_em: string | null;
  aluno: { nome: string; turma_id: string | null } | null;
  aula: { titulo: string; numero_missao: number } | null;
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function SubmissoesPage({ searchParams }: PageProps<"/painel/submissoes">) {
  await exigirPapel(["admin", "diretor", "professor"]);
  const { status } = await searchParams;
  const aba = typeof status === "string" && ABAS.some((a) => a.valor === status) ? status : "nova";
  const supabase = await createClient();

  let consulta = supabase
    .from("submissoes")
    .select(
      "id, link, status, comentario, enviado_em, avaliado_em, aluno:perfis!submissoes_aluno_id_fkey(nome, turma_id), aula:aulas(titulo, numero_missao)",
    )
    .order("enviado_em", { ascending: aba === "nova" })
    .limit(200);
  if (aba !== "todas") consulta = consulta.eq("status", aba);

  const [{ data }, { data: turmas }, contagens] = await Promise.all([
    consulta,
    supabase.from("turmas").select("id, nome"),
    Promise.all(
      (["nova", "aprovada", "devolvida"] as const).map(async (s) => {
        const { count } = await supabase.from("submissoes").select("id", { count: "exact", head: true }).eq("status", s);
        return [s, count ?? 0] as const;
      }),
    ),
  ]);
  const total = Object.fromEntries(contagens) as Record<string, number>;
  const linhas = (data ?? []) as unknown as Linha[];
  const nomeTurma = (id: string | null | undefined) => turmas?.find((t) => t.id === id)?.nome ?? "—";

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">🎯 Torre de Controle — Submissões</h1>
        <p className="text-sm text-slate-400">Avalie as tarefas enviadas pelos alunos</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["nova", "aprovada", "devolvida"] as const).map((s) => (
          <div key={s} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">{ABAS.find((a) => a.valor === s)?.rotulo}</p>
            <p className="text-3xl font-bold">{total[s]}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <Link
            key={a.valor}
            href={`/painel/submissoes?status=${a.valor}`}
            className={`rounded-full px-3 py-1 text-sm ${
              a.valor === aba ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      <Cartao>
        {!linhas.length && <p className="text-slate-400">Nada por aqui. 🎉</p>}
        <ul className="flex flex-col divide-y divide-slate-800">
          {linhas.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 py-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-medium">🧑‍🎓 {s.aluno?.nome}</span>
                <span className="text-slate-400">📚 {nomeTurma(s.aluno?.turma_id)}</span>
                <span className="text-slate-300">
                  🎯 #{s.aula?.numero_missao} {s.aula?.titulo}
                </span>
                <span className="text-slate-500">⏱️ {dataHora(s.enviado_em)}</span>
                <a href={s.link} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">
                  🔗 Acessar submissão ↗
                </a>
              </div>
              {s.status === "nova" ? (
                <AvaliarForm id={s.id} />
              ) : (
                <p className="text-sm text-slate-400">
                  {s.status === "aprovada" ? "✅ Aprovada" : "🔙 Devolvida"}
                  {s.avaliado_em && ` em ${dataHora(s.avaliado_em)}`}
                  {s.comentario && ` — 💬 ${s.comentario}`}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
