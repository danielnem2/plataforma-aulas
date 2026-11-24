import { CalendarOff, Plus, List } from "lucide-react";
import { FormAcao } from "@/components/form-acao";
import { Campo, Cartao, estiloInput, TituloPagina } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { DIAS_SEMANA } from "@/lib/rotulos";
import { createClient } from "@/lib/supabase/server";
import { criarDiaSemAula, excluirDiaSemAula } from "../faltas/actions";

export const metadata = { title: "Dias sem aula" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

export default async function CalendarioPage() {
  const perfil = await exigirPapel(["admin", "diretor", "professor"]);
  const supabase = await createClient();

  // Professor só lança para as suas turmas
  const turmasQuery =
    perfil.papel === "professor"
      ? supabase.from("turma_professores").select("turma:turmas(id, nome, dia_semana)").eq("professor_id", perfil.id)
      : supabase.from("turmas").select("id, nome, dia_semana").order("nome");

  const [{ data: turmasRaw }, { data: escolas }, { data: dias }] = await Promise.all([
    turmasQuery,
    supabase.from("escolas").select("id, nome").order("nome"),
    supabase.from("semanas_sem_aula").select("id, data, motivo, turma_id, escola_id").order("data", { ascending: false }).limit(100),
  ]);

  type T = { id: string; nome: string; dia_semana: number };
  const turmas: T[] =
    perfil.papel === "professor"
      ? ((turmasRaw ?? []) as unknown as { turma: T }[]).map((x) => x.turma).filter(Boolean)
      : ((turmasRaw ?? []) as T[]);
  const nomeTurma = (id: string | null) => (id ? turmas.find((t) => t.id === id)?.nome ?? "outra turma" : null);
  const nomeEscola = (id: string) => escolas?.find((e) => e.id === id)?.nome ?? "";

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <TituloPagina icone={CalendarOff}>Dias sem aula</TituloPagina>
        <p className="text-sm text-texto-suave">
          Feriados e recessos cadastrados aqui não contam como falta.
        </p>
      </div>

      <Cartao titulo="Cadastrar dia sem aula" icone={Plus}>
        <FormAcao acao={criarDiaSemAula} botao="Cadastrar" limparAoSalvar>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Data *">
              <input name="data" type="date" required className={estiloInput} />
            </Campo>
            <Campo rotulo={perfil.papel === "professor" ? "Turma *" : "Turma (vazio = escola toda)"}>
              <select name="turma_id" defaultValue="" required={perfil.papel === "professor"} className={estiloInput}>
                <option value="">{perfil.papel === "professor" ? "Selecione..." : "— escola toda —"}</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({DIAS_SEMANA[t.dia_semana]})
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Motivo">
              <input name="motivo" placeholder="Ex.: Feriado" className={estiloInput} />
            </Campo>
            {perfil.papel === "admin" && (
              <Campo rotulo="Escola (se for a escola toda)">
                <select name="escola_id" defaultValue="" className={estiloInput}>
                  <option value="">—</option>
                  {escolas?.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </Campo>
            )}
          </div>
        </FormAcao>
        <p className="mt-2 text-xs text-texto-suave">
          Use a data do dia em que a turma teria aula.
        </p>
      </Cartao>

      <Cartao titulo="Cadastrados" icone={List}>
        {!dias?.length && <p className="text-texto-suave">Nenhum dia cadastrado.</p>}
        <ul className="flex flex-col divide-y divide-borda text-sm">
          {dias?.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span>
                {new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR")} ·{" "}
                {nomeTurma(d.turma_id) ?? `Escola toda${perfil.papel === "admin" ? ` (${nomeEscola(d.escola_id)})` : ""}`}
                {d.motivo && ` — ${d.motivo}`}
              </span>
              <FormAcao acao={excluirDiaSemAula} botao="Remover">
                <input type="hidden" name="id" value={d.id} />
              </FormAcao>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
