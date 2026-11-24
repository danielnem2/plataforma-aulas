import { Layers, Plus } from "lucide-react";
import { FormAcao } from "@/components/form-acao";
import { botao, Campo, Cartao, estiloInput, Expansivel, Selo, TituloPagina } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { DIAS_SEMANA, ROTULO_PERIODO, hora, type Periodo } from "@/lib/rotulos";
import { createClient } from "@/lib/supabase/server";
import { criarTurma, editarTurma } from "./actions";

export const metadata = { title: "Turmas" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

type Turma = {
  id: string;
  nome: string;
  escola_id: string;
  periodo: Periodo;
  dia_semana: number;
  horario_inicio: string;
  horario_fim: string;
  ativa: boolean;
};

export default async function TurmasPage({ searchParams }: PageProps<"/painel/turmas">) {
  const perfil = await exigirPapel(["admin", "diretor"]);
  const ehAdmin = perfil.papel === "admin";
  const { escola: filtroEscola } = await searchParams;
  const supabase = await createClient();

  let consultaTurmas = supabase
    .from("turmas")
    .select("id, nome, escola_id, periodo, dia_semana, horario_inicio, horario_fim, ativa")
    .order("dia_semana")
    .order("horario_inicio");
  if (typeof filtroEscola === "string" && filtroEscola) {
    consultaTurmas = consultaTurmas.eq("escola_id", filtroEscola);
  }

  const [{ data: escolas }, { data: turmas }, { data: professores }, { data: vinculos }, { data: alunos }] =
    await Promise.all([
      supabase.from("escolas").select("id, nome").order("nome"),
      consultaTurmas,
      supabase.from("perfis").select("id, nome, escola_id").eq("papel", "professor").order("nome"),
      supabase.from("turma_professores").select("turma_id, professor_id"),
      supabase.from("perfis").select("turma_id").eq("papel", "aluno"),
    ]);

  const nomeEscola = (id: string) => escolas?.find((e) => e.id === id)?.nome ?? "—";

  const camposTurma = (t?: Turma) => (
    <div className="grid gap-3 sm:grid-cols-3">
      <Campo rotulo="Nome da turma *">
        <input name="nome" defaultValue={t?.nome} placeholder="Ex.: Segunda 19:30" required className={estiloInput} />
      </Campo>
      {ehAdmin ? (
        <Campo rotulo="Escola *">
          <select name="escola_id" defaultValue={t?.escola_id ?? ""} required className={estiloInput}>
            <option value="" disabled>Selecione...</option>
            {escolas?.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </Campo>
      ) : (
        <Campo rotulo="Escola">
          <input value={nomeEscola(perfil.escola_id ?? "")} disabled className={estiloInput} />
        </Campo>
      )}
      <Campo rotulo="Período *">
        <select name="periodo" defaultValue={t?.periodo ?? ""} required className={estiloInput}>
          <option value="" disabled>Selecione...</option>
          {Object.entries(ROTULO_PERIODO).map(([v, r]) => (
            <option key={v} value={v}>{r}</option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Dia da aula *">
        <select name="dia_semana" defaultValue={t?.dia_semana ?? ""} required className={estiloInput}>
          <option value="" disabled>Selecione...</option>
          {DIAS_SEMANA.map((d, i) => (
            <option key={d} value={i}>{d}</option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Início *">
        <input type="time" name="horario_inicio" defaultValue={hora(t?.horario_inicio ?? null)} required className={estiloInput} />
      </Campo>
      <Campo rotulo="Fim *">
        <input type="time" name="horario_fim" defaultValue={hora(t?.horario_fim ?? null)} required className={estiloInput} />
      </Campo>
    </div>
  );

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <TituloPagina icone={Layers}>Turmas</TituloPagina>

      {ehAdmin && !escolas?.length ? (
        <Cartao>
          <p className="text-texto-medio">Cadastre uma escola primeiro (menu Escolas).</p>
        </Cartao>
      ) : (
        <Cartao titulo="Nova turma" icone={Plus}>
          <FormAcao acao={criarTurma} botao="Criar turma" limparAoSalvar>
            {camposTurma()}
          </FormAcao>
          <p className="mt-3 text-xs text-texto-suave">
            Os professores são escolhidos em &quot;Editar&quot;, depois que a turma existe.
          </p>
        </Cartao>
      )}

      <Cartao titulo={`${turmas?.length ?? 0} turma(s)`} icone={Layers}>
        {ehAdmin && (escolas?.length ?? 0) > 1 && (
          <form className="mb-4 flex items-end gap-2">
            <Campo rotulo="Filtrar por escola">
              <select name="escola" defaultValue={typeof filtroEscola === "string" ? filtroEscola : ""} className={estiloInput}>
                <option value="">Todas as escolas</option>
                {escolas?.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </Campo>
            <button className={botao("secundario")}>Filtrar</button>
          </form>
        )}

        {!turmas?.length && <p className="text-texto-suave">Nenhuma turma cadastrada.</p>}

        <ul className="flex flex-col divide-y divide-borda">
          {(turmas as Turma[] | null)?.map((t) => {
            const profsDaTurma = vinculos?.filter((v) => v.turma_id === t.id).map((v) => v.professor_id) ?? [];
            const profsDaEscola = professores?.filter((p) => p.escola_id === t.escola_id) ?? [];
            const qtdAlunos = alunos?.filter((a) => a.turma_id === t.id).length ?? 0;
            return (
              <li key={t.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">{t.nome}</span>
                  <Selo ativo={t.ativa} />
                  <span className="text-sm text-texto-suave">
                    {ehAdmin && `${nomeEscola(t.escola_id)} · `}
                    {DIAS_SEMANA[t.dia_semana]} {hora(t.horario_inicio)}–{hora(t.horario_fim)} ·{" "}
                    {ROTULO_PERIODO[t.periodo]} · {qtdAlunos} aluno(s) · Prof.:{" "}
                    {profsDaTurma.length
                      ? professores?.filter((p) => profsDaTurma.includes(p.id)).map((p) => p.nome).join(", ")
                      : "—"}
                  </span>
                </div>
                <Expansivel rotulo="Editar">
                  <FormAcao acao={editarTurma}>
                    <input type="hidden" name="id" value={t.id} />
                    {camposTurma(t)}
                    <fieldset className="flex flex-col gap-1">
                      <legend className="mb-1 text-sm text-texto-medio">Professores da turma</legend>
                      {!profsDaEscola.length && (
                        <span className="text-sm text-texto-suave">
                          Nenhum professor nesta escola. Cadastre em Usuários.
                        </span>
                      )}
                      {profsDaEscola.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm text-texto-medio">
                          <input
                            type="checkbox"
                            name="professores"
                            value={p.id}
                            defaultChecked={profsDaTurma.includes(p.id)}
                          />
                          {p.nome}
                        </label>
                      ))}
                    </fieldset>
                    <label className="flex items-center gap-2 text-sm text-texto-medio">
                      <input type="checkbox" name="ativa" defaultChecked={t.ativa} /> Turma ativa
                    </label>
                  </FormAcao>
                </Expansivel>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-texto-suave">
          Para colocar alunos numa turma, use a tela Usuários.
        </p>
      </Cartao>
    </div>
  );
}
