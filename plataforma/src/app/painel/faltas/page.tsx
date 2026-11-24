import Link from "next/link";
import { FormAcao } from "@/components/form-acao";
import { CircleAlert, CircleCheck, PartyPopper, TriangleAlert } from "lucide-react";
import { Aviso, botao, Campo, Cartao, estiloInput, Etiqueta, TituloPagina } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { corFalta, type LinhaFalta } from "@/lib/faltas";
import { createClient } from "@/lib/supabase/server";
import { marcarFaltaVista } from "./actions";

export const metadata = { title: "Faltas" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

export default async function FaltasPage({ searchParams }: PageProps<"/painel/faltas">) {
  const perfil = await exigirPapel(["admin", "diretor", "professor"]);
  const { turma, todos } = await searchParams;
  const filtroTurma = typeof turma === "string" ? turma : "";
  const mostrarTodos = todos === "1";
  const supabase = await createClient();

  const [{ data }, { data: turmas }] = await Promise.all([
    supabase.rpc("painel_faltas"),
    supabase.from("turmas").select("id, nome").order("nome"),
  ]);

  const linhas = ((data ?? []) as LinhaFalta[])
    .filter((l) => !filtroTurma || l.turma_id === filtroTurma)
    .filter((l) => mostrarTodos || l.faltas >= 1);
  const vermelhos = linhas.filter((l) => l.faltas >= 2 && !l.aviso_visto).length;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <TituloPagina
        icone={TriangleAlert}
        descricao={
          <>
            Uma falta = uma semana de aula da turma sem login. Amarelo: 1 falta · Vermelho: 2 ou mais seguidas.
            {perfil.papel === "professor" ? " Você vê os alunos das suas turmas." : " Você vê todos os alunos da escola."}
          </>
        }
      >
        Faltas
      </TituloPagina>

      {vermelhos > 0 && (
        <Aviso tom="perigo" icone={CircleAlert}>
          {vermelhos} aluno(s) com 2 ou mais faltas seguidas aguardando contato.
        </Aviso>
      )}

      <Cartao>
        <form className="mb-4 flex flex-wrap items-end gap-3">
          <Campo rotulo="Turma">
            <select name="turma" defaultValue={filtroTurma} className={estiloInput}>
              <option value="">Todas</option>
              {turmas?.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </Campo>
          <label className="flex min-h-10 items-center gap-2 text-sm text-texto-medio">
            <input type="checkbox" name="todos" value="1" defaultChecked={mostrarTodos} /> Mostrar também quem não tem falta
          </label>
          <button className={botao("secundario")}>Filtrar</button>
        </form>

        {!linhas.length && (
          <Aviso tom="sucesso" icone={PartyPopper}>Nenhum aluno com falta.</Aviso>
        )}
        <ul className="flex flex-col gap-2">
          {linhas.map((l) => {
            const cor = corFalta(l.faltas);
            return (
              <li key={l.aluno_id} className={`flex flex-col gap-2 rounded-xl border border-borda p-3 ${cor.fundo || "bg-superficie"}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <Etiqueta tom={cor.tom} icone={cor.icone}>
                    {l.faltas} falta(s)
                  </Etiqueta>
                  <Link href={`/painel/alunos/${l.aluno_id}`} className="font-medium hover:underline">
                    {l.nome}
                  </Link>
                  <span className="text-sm text-texto-suave">{l.turma_nome}</span>
                  {l.aviso_visto && <Etiqueta tom="sucesso" icone={CircleCheck}>contatado</Etiqueta>}
                </div>
                {l.faltas >= 1 && !l.aviso_visto && (
                  <FormAcao acao={marcarFaltaVista} botao="Marcar como contatado" className="max-w-xl">
                    <input type="hidden" name="aluno_id" value={l.aluno_id} />
                    <input type="hidden" name="faltas" value={l.faltas} />
                    <input name="observacao" placeholder="Observação (ex.: liguei para o responsável)" className={estiloInput} />
                  </FormAcao>
                )}
              </li>
            );
          })}
        </ul>
      </Cartao>
    </div>
  );
}
