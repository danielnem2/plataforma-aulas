import { Inbox, CircleCheck, RotateCcw, List, ClipboardCheck, UserRound, Layers, Target, Clock, ExternalLink, MessageSquare, PartyPopper } from "lucide-react";
import Link from "next/link";
import { Aviso, Cartao, Etiqueta, Icone, Indicador, pilula, TituloPagina } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AvaliarForm } from "./avaliar-form";

export const metadata = { title: "Submissões" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

const ABAS = [
  { valor: "nova", rotulo: "Novas", icone: Inbox, tom: "primaria" },
  { valor: "aprovada", rotulo: "Aprovadas", icone: CircleCheck, tom: "sucesso" },
  { valor: "devolvida", rotulo: "Devolvidas", icone: RotateCcw, tom: "atencao" },
  { valor: "todas", rotulo: "Todas", icone: List, tom: "neutro" },
] as const;

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
      <TituloPagina icone={ClipboardCheck} descricao="Avalie as tarefas enviadas pelos alunos">
        Submissões
      </TituloPagina>

      <div className="grid gap-3 sm:grid-cols-3">
        {ABAS.filter((a) => a.valor !== "todas").map((a) => (
          <Indicador key={a.valor} valor={total[a.valor]} rotulo={a.rotulo} icone={a.icone} tom={a.tom} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <Link
            key={a.valor}
            href={`/painel/submissoes?status=${a.valor}`}
            className={pilula(a.valor === aba)}
            aria-current={a.valor === aba ? "page" : undefined}
          >
            <Icone icone={a.icone} tamanho={16} />
            {a.rotulo}
          </Link>
        ))}
      </div>

      <Cartao>
        {!linhas.length && <Aviso tom="sucesso" icone={PartyPopper}>Nada por aqui.</Aviso>}
        <ul className="flex flex-col divide-y divide-borda">
          {linhas.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 py-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium"><Icone icone={UserRound} tamanho={16} /> {s.aluno?.nome}</span>
                <span className="inline-flex items-center gap-1.5 text-texto-suave"><Icone icone={Layers} tamanho={16} /> {nomeTurma(s.aluno?.turma_id)}</span>
                <span className="inline-flex items-center gap-1.5 text-texto-medio">
                  <Icone icone={Target} tamanho={16} /> Missão {s.aula?.numero_missao}: {s.aula?.titulo}
                </span>
                <span className="inline-flex items-center gap-1.5 text-texto-suave"><Icone icone={Clock} tamanho={16} /> {dataHora(s.enviado_em)}</span>
                <a href={s.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-primaria-texto hover:underline">
                  Acessar submissão <Icone icone={ExternalLink} tamanho={16} />
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
              </div>
              {s.status === "nova" ? (
                <AvaliarForm id={s.id} />
              ) : (
                <p className="flex flex-wrap items-center gap-2 text-sm text-texto-suave">
                  {s.status === "aprovada" ? (
                    <Etiqueta tom="sucesso" icone={CircleCheck}>Aprovada</Etiqueta>
                  ) : (
                    <Etiqueta tom="atencao" icone={RotateCcw}>Devolvida</Etiqueta>
                  )}
                  {s.avaliado_em && `em ${dataHora(s.avaliado_em)}`}
                  {s.comentario && (
                    <span className="inline-flex items-center gap-1.5"><Icone icone={MessageSquare} tamanho={16} /> {s.comentario}</span>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
