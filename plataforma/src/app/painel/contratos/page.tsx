import Link from "next/link";
import { Cartao } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import {
  COR_SITUACAO,
  DIAS_AVISO_AMARELO,
  DIAS_AVISO_VERMELHO,
  statusContrato,
  type DadosContrato,
  type Situacao,
} from "@/lib/contrato";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Contratos" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

type LinhaAluno = DadosContrato & {
  id: string;
  nome: string;
  turma: { nome: string } | null;
};

/** Ordem das seções na tela */
const SECOES: { situacao: Situacao; titulo: string }[] = [
  { situacao: "vence_semana", titulo: `🔴 Vence em até ${DIAS_AVISO_VERMELHO} dias` },
  { situacao: "vence_mes", titulo: `🟡 Vence em até ${DIAS_AVISO_AMARELO} dias` },
  { situacao: "vencido", titulo: "⚫ Vencidos (sem acesso)" },
  { situacao: "a_comecar", titulo: "🔵 Ainda vão começar" },
  { situacao: "sem_contrato", titulo: "⚪ Sem contrato cadastrado" },
  { situacao: "em_dia", titulo: "🟢 Em dia" },
];

export default async function ContratosPage() {
  const perfil = await exigirPapel(["admin", "diretor", "professor"]);
  const supabase = await createClient();

  // RLS: professor vê os alunos das suas turmas; coordenador, da escola; admin, todos
  const { data } = await supabase
    .from("perfis")
    .select("id, nome, tipo_acesso, acesso_inicio, acesso_fim, contrato_meses, turma:turmas(nome)")
    .eq("papel", "aluno")
    .eq("ativo", true)
    .order("acesso_fim", { ascending: true, nullsFirst: false })
    .order("nome");

  const agora = new Date();
  const alunos = ((data ?? []) as unknown as LinhaAluno[]).map((a) => ({ ...a, st: statusContrato(a, agora) }));
  const porSituacao = (s: Situacao) => alunos.filter((a) => a.st.situacao === s);
  const ehCoordenacao = perfil.papel === "admin" || perfil.papel === "diretor";

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">📄 Contratos</h1>
        <p className="text-sm text-slate-400">
          Tempo de acesso de cada aluno. Aviso 🟡 faltando 1 mês e 🔴 faltando 1 semana.
          {ehCoordenacao ? " Clique no aluno para renovar ou alterar." : " Só a coordenação altera contratos."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SECOES.slice(0, 4).map(({ situacao }) => {
          const cor = COR_SITUACAO[situacao];
          return (
            <div key={situacao} className={`rounded-xl border border-slate-800 p-4 ${cor.fundo}`}>
              <p className={`text-2xl font-bold ${cor.texto}`}>{porSituacao(situacao).length}</p>
              <p className="text-sm text-slate-400">{cor.selo} {cor.rotulo}</p>
            </div>
          );
        })}
      </div>

      {SECOES.map(({ situacao, titulo }) => {
        const lista = porSituacao(situacao);
        if (!lista.length) return null;
        const cor = COR_SITUACAO[situacao];
        return (
          <Cartao key={situacao} titulo={`${titulo} (${lista.length})`}>
            <ul className="flex flex-col divide-y divide-slate-800 text-sm">
              {lista.map((a) => (
                <li key={a.id} className={`flex flex-wrap items-center justify-between gap-3 rounded px-2 py-2 ${cor.fundo}`}>
                  <span>
                    <Link href={`/painel/alunos/${a.id}#contrato`} className="font-medium hover:underline">
                      {a.nome}
                    </Link>
                    <span className="text-slate-400"> · {a.turma?.nome ?? "sem turma"}</span>
                    {a.tipo_acesso === "experimental" && <span className="text-violet-300"> · 🧪 experimental</span>}
                    {a.contrato_meses && (
                      <span className="text-slate-500"> · {a.contrato_meses} {a.contrato_meses === 1 ? "mês" : "meses"}</span>
                    )}
                  </span>
                  <span className={cor.texto}>
                    {a.st.texto}
                    {a.st.ultimoDia && situacao !== "a_comecar" && (
                      <span className="text-slate-500"> · até {a.st.ultimoDia}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Cartao>
        );
      })}

      {!alunos.length && <p className="text-sm text-slate-400">Nenhum aluno ativo.</p>}
    </div>
  );
}
