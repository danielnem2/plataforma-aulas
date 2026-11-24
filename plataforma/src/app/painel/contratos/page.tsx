import { FileText, FlaskConical } from "lucide-react";
import Link from "next/link";
import { Cartao, Etiqueta, Icone, Indicador, TituloPagina, TOM_TEXTO } from "@/components/ui";
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
  { situacao: "vence_semana", titulo: `Vence em até ${DIAS_AVISO_VERMELHO} dias` },
  { situacao: "vence_mes", titulo: `Vence em até ${DIAS_AVISO_AMARELO} dias` },
  { situacao: "vencido", titulo: "Vencidos (sem acesso)" },
  { situacao: "a_comecar", titulo: "Ainda vão começar" },
  { situacao: "sem_contrato", titulo: "Sem contrato cadastrado" },
  { situacao: "em_dia", titulo: "Em dia" },
];

export default async function ContratosPage() {
  const perfil = await exigirPapel(["admin", "diretor", "professor"]);
  const supabase = await createClient();

  // RLS: professor vê os alunos das suas turmas; coordenador, da escola; admin, todos
  const { data } = await supabase
    .from("perfis")
    .select("id, nome, tipo_acesso, acesso_inicio, acesso_fim, contrato_meses, turma:turmas!perfis_turma_id_fkey(nome)")
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
      <TituloPagina
        icone={FileText}
        descricao={
          <>
            Tempo de acesso de cada aluno. Aviso amarelo faltando 1 mês e vermelho faltando 1 semana.
            {ehCoordenacao ? " Clique no aluno para renovar ou alterar." : " Só a coordenação altera contratos."}
          </>
        }
      >
        Contratos
      </TituloPagina>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SECOES.slice(0, 4).map(({ situacao }) => {
          const cor = COR_SITUACAO[situacao];
          return (
            <Indicador key={situacao} valor={porSituacao(situacao).length} rotulo={cor.rotulo} icone={cor.icone} tom={cor.tom} />
          );
        })}
      </div>

      {SECOES.map(({ situacao, titulo }) => {
        const lista = porSituacao(situacao);
        if (!lista.length) return null;
        const cor = COR_SITUACAO[situacao];
        return (
          <Cartao key={situacao} titulo={`${titulo} (${lista.length})`} icone={cor.icone}>
            <ul className="flex flex-col gap-1 text-sm">
              {lista.map((a) => (
                <li key={a.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-2 ${cor.fundo}`}>
                  <span className="flex flex-wrap items-center gap-2">
                    <Link href={`/painel/alunos/${a.id}#contrato`} className="font-medium text-texto underline-offset-2 hover:underline">
                      {a.nome}
                    </Link>
                    <span className="text-texto-suave">· {a.turma?.nome ?? "sem turma"}</span>
                    {a.tipo_acesso === "experimental" && (
                      <Etiqueta tom="especial" icone={FlaskConical}>experimental</Etiqueta>
                    )}
                    {a.contrato_meses && (
                      <span className="text-texto-suave">· {a.contrato_meses} {a.contrato_meses === 1 ? "mês" : "meses"}</span>
                    )}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 font-medium ${TOM_TEXTO[cor.tom]}`}>
                    <Icone icone={cor.icone} tamanho={16} />
                    {a.st.texto}
                    {a.st.ultimoDia && situacao !== "a_comecar" && (
                      <span className="font-normal text-texto-suave"> · até {a.st.ultimoDia}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Cartao>
        );
      })}

      {!alunos.length && <p className="text-sm text-texto-suave">Nenhum aluno ativo.</p>}
    </div>
  );
}
