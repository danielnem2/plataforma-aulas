import { FormAcao } from "@/components/form-acao";
import { Campo, Cartao, Expansivel, Selo, estiloInput } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { criarEscola, editarEscola } from "./actions";

export const metadata = { title: "Escolas" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

export default async function EscolasPage() {
  await exigirPapel(["admin"]);
  const supabase = await createClient();

  const [{ data: escolas }, { data: turmas }, { data: pessoas }] = await Promise.all([
    supabase.from("escolas").select("id, nome, endereco, telefone, ativa").order("nome"),
    supabase.from("turmas").select("escola_id"),
    supabase.from("perfis").select("escola_id, papel, nome").neq("papel", "admin"),
  ]);

  const contar = (escolaId: string) => ({
    turmas: turmas?.filter((t) => t.escola_id === escolaId).length ?? 0,
    alunos: pessoas?.filter((p) => p.escola_id === escolaId && p.papel === "aluno").length ?? 0,
    coordenadores:
      pessoas?.filter((p) => p.escola_id === escolaId && p.papel === "diretor").map((p) => p.nome) ?? [],
  });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-bold">🏫 Escolas</h1>

      <Cartao titulo="Nova escola">
        <FormAcao acao={criarEscola} botao="Criar escola" limparAoSalvar>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Nome *">
              <input name="nome" required className={estiloInput} />
            </Campo>
            <Campo rotulo="Endereço">
              <input name="endereco" className={estiloInput} />
            </Campo>
            <Campo rotulo="Telefone">
              <input name="telefone" className={estiloInput} />
            </Campo>
          </div>
        </FormAcao>
      </Cartao>

      <Cartao titulo={`${escolas?.length ?? 0} escola(s)`}>
        {!escolas?.length && <p className="text-slate-400">Nenhuma escola cadastrada ainda.</p>}
        <ul className="flex flex-col divide-y divide-slate-800">
          {escolas?.map((e) => {
            const c = contar(e.id);
            return (
              <li key={e.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">{e.nome}</span>
                  <Selo ativo={e.ativa} />
                  <span className="text-sm text-slate-400">
                    {c.turmas} turma(s) · {c.alunos} aluno(s) · Coordenação:{" "}
                    {c.coordenadores.length ? c.coordenadores.join(", ") : "—"}
                  </span>
                </div>
                <Expansivel rotulo="Editar">
                  <FormAcao acao={editarEscola}>
                    <input type="hidden" name="id" value={e.id} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Campo rotulo="Nome *">
                        <input name="nome" defaultValue={e.nome} required className={estiloInput} />
                      </Campo>
                      <Campo rotulo="Endereço">
                        <input name="endereco" defaultValue={e.endereco ?? ""} className={estiloInput} />
                      </Campo>
                      <Campo rotulo="Telefone">
                        <input name="telefone" defaultValue={e.telefone ?? ""} className={estiloInput} />
                      </Campo>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" name="ativa" defaultChecked={e.ativa} /> Escola ativa
                    </label>
                  </FormAcao>
                </Expansivel>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Para ligar um coordenador a uma escola, use a tela Usuários.
        </p>
      </Cartao>
    </div>
  );
}
