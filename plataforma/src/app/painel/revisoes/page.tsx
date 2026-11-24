import {
  ArrowRight,
  CircleCheck,
  GraduationCap,
  Inbox,
  MessageSquareReply,
  MessagesSquare,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { FormAcao } from "@/components/form-acao";
import { Aviso, Cartao, estiloInput, Etiqueta, Icone, Indicador, pilula, TituloPagina } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { ROTULO_PAPEL } from "@/lib/rotulos";
import type { Papel } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { responderRevisao } from "./actions";

export const metadata = { title: "Revisões de aulas" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

type Revisao = {
  id: string;
  tipo: "duvida_professor" | "duvida_aluno";
  texto: string;
  status: "aberta" | "resolvida";
  resposta: string | null;
  respondido_em: string | null;
  criado_em: string;
  aula: { id: string; titulo: string; numero_missao: number; curso_id: string; curso: { nome: string } | null } | null;
  autor: { nome: string; papel: Papel } | null;
};

const ROTULO_TIPO = {
  duvida_professor: { texto: "Dúvida do professor", icone: UserRound, tom: "primaria" as const },
  duvida_aluno: { texto: "Dúvida de aluno", icone: GraduationCap, tom: "especial" as const },
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function RevisoesPage({ searchParams }: PageProps<"/painel/revisoes">) {
  const perfil = await exigirPapel(["admin", "diretor", "professor"]);
  const ehAdmin = perfil.papel === "admin";
  const { status } = await searchParams;
  const aba = status === "resolvida" ? "resolvida" : status === "todas" ? "todas" : "aberta";
  const supabase = await createClient();

  // RLS: admin vê todas; professor/coordenador vê só as que enviou
  let consulta = supabase
    .from("revisoes_aula")
    .select(
      "id, tipo, texto, status, resposta, respondido_em, criado_em, aula:aulas(id, titulo, numero_missao, curso_id, curso:cursos(nome)), autor:perfis!revisoes_aula_autor_id_fkey(nome, papel)",
    )
    .order("criado_em", { ascending: aba === "aberta" });
  if (aba !== "todas") consulta = consulta.eq("status", aba);

  const [{ data }, { count: abertas }, { count: resolvidas }] = await Promise.all([
    consulta,
    supabase.from("revisoes_aula").select("id", { count: "exact", head: true }).eq("status", "aberta"),
    supabase.from("revisoes_aula").select("id", { count: "exact", head: true }).eq("status", "resolvida"),
  ]);
  const lista = (data ?? []) as unknown as Revisao[];

  const ABAS = [
    { valor: "aberta", rotulo: "Abertas", icone: Inbox },
    { valor: "resolvida", rotulo: "Resolvidas", icone: CircleCheck },
    { valor: "todas", rotulo: "Todas", icone: MessagesSquare },
  ];

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <TituloPagina
        icone={MessagesSquare}
        descricao={
          ehAdmin
            ? "Dúvidas de professores e coordenadores sobre as missões. Revise a aula, responda e marque como resolvida."
            : "Dúvidas que você enviou ao ADM sobre as missões. Para enviar uma nova, vá em Aulas → “Enviar dúvida ao ADM”."
        }
      >
        Revisões de aulas
      </TituloPagina>

      <div className="grid gap-3 sm:grid-cols-2">
        <Indicador valor={abertas ?? 0} rotulo="Aguardando o ADM" icone={Inbox} tom="aviso" />
        <Indicador valor={resolvidas ?? 0} rotulo="Resolvidas" icone={CircleCheck} tom="sucesso" />
      </div>

      <div className="flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <Link
            key={a.valor}
            href={`/painel/revisoes?status=${a.valor}`}
            className={pilula(a.valor === aba)}
            aria-current={a.valor === aba ? "page" : undefined}
          >
            <Icone icone={a.icone} tamanho={16} /> {a.rotulo}
          </Link>
        ))}
      </div>

      {!lista.length && (
        <Aviso tom="sucesso" icone={CircleCheck}>
          {aba === "aberta" ? "Nenhuma dúvida aguardando." : "Nada por aqui."}
        </Aviso>
      )}

      {lista.map((r) => {
        const tipo = ROTULO_TIPO[r.tipo];
        return (
          <Cartao key={r.id}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Etiqueta tom={tipo.tom} icone={tipo.icone}>{tipo.texto}</Etiqueta>
                {r.status === "aberta" ? (
                  <Etiqueta tom="aviso" icone={Inbox}>Aguardando o ADM</Etiqueta>
                ) : (
                  <Etiqueta tom="sucesso" icone={CircleCheck}>Resolvida</Etiqueta>
                )}
                <span className="text-texto-suave">{dataHora(r.criado_em)}</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-texto">
                  {r.aula ? `Missão ${r.aula.numero_missao} — ${r.aula.titulo}` : "Aula removida"}
                  {r.aula?.curso && <span className="font-normal text-texto-suave"> · {r.aula.curso.nome}</span>}
                </h2>
                {r.aula && (
                  <Link
                    href={`/painel/aulas?curso=${r.aula.curso_id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primaria-texto hover:underline"
                  >
                    Ver aula <Icone icone={ArrowRight} tamanho={16} />
                  </Link>
                )}
              </div>

              {ehAdmin && r.autor && (
                <p className="text-sm text-texto-suave">
                  Enviada por <strong className="text-texto-medio">{r.autor.nome}</strong> ({ROTULO_PAPEL[r.autor.papel]})
                </p>
              )}

              <blockquote className="whitespace-pre-wrap rounded-lg border-l-4 border-borda-forte bg-fundo px-4 py-3 text-texto">
                {r.texto}
              </blockquote>

              {r.resposta && (
                <div className="rounded-lg bg-primaria-suave px-4 py-3">
                  <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primaria-texto">
                    <Icone icone={MessageSquareReply} tamanho={16} /> Resposta do ADM
                    {r.respondido_em && <span className="font-normal"> · {dataHora(r.respondido_em)}</span>}
                  </p>
                  <p className="whitespace-pre-wrap text-texto">{r.resposta}</p>
                </div>
              )}

              {ehAdmin && (
                <FormAcao acao={responderRevisao} botao={r.resposta ? "Atualizar resposta" : "Responder"}>
                  <input type="hidden" name="id" value={r.id} />
                  <label className="flex flex-col gap-1 text-sm font-medium text-texto-medio">
                    {r.resposta ? "Nova resposta (substitui a anterior)" : "Resposta"}
                    <textarea
                      name="resposta"
                      rows={3}
                      maxLength={4000}
                      placeholder="Ex.: corrigi o slide 5, já está no Figma. / Explique ao aluno que..."
                      className={estiloInput}
                    />
                  </label>
                  <label className="flex min-h-10 items-center gap-2 text-sm text-texto-medio">
                    <input type="checkbox" name="resolver" defaultChecked /> Marcar como
                    resolvida
                  </label>
                </FormAcao>
              )}
            </div>
          </Cartao>
        );
      })}
    </div>
  );
}
