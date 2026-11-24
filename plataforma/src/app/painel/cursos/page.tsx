import Link from "next/link";
import { FormAcao } from "@/components/form-acao";
import { Campo, Cartao, Expansivel, Selo, estiloInput } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { criarCurso, editarCurso } from "./actions";

export const metadata = { title: "Cursos" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

export default async function CursosPage() {
  await exigirPapel(["admin"]);
  const supabase = await createClient();
  const [{ data: cursos }, { data: aulas }, { data: matriculas }] = await Promise.all([
    supabase.from("cursos").select("id, nome, descricao, ordem, ativo").order("ordem"),
    supabase.from("aulas").select("curso_id"),
    supabase.from("aluno_cursos").select("curso_id"),
  ]);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold">🎓 Cursos</h1>

      <Cartao titulo="Novo curso">
        <FormAcao acao={criarCurso} botao="Criar curso" limparAoSalvar>
          <div className="grid gap-3 sm:grid-cols-[2fr_3fr_1fr]">
            <Campo rotulo="Nome *">
              <input name="nome" required className={estiloInput} />
            </Campo>
            <Campo rotulo="Descrição">
              <input name="descricao" className={estiloInput} />
            </Campo>
            <Campo rotulo="Ordem">
              <input name="ordem" type="number" defaultValue={(cursos?.length ?? 0) + 1} className={estiloInput} />
            </Campo>
          </div>
        </FormAcao>
      </Cartao>

      <Cartao titulo={`${cursos?.length ?? 0} curso(s)`}>
        <ul className="flex flex-col divide-y divide-slate-800">
          {cursos?.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">
                  {c.ordem}. {c.nome}
                </span>
                <Selo ativo={c.ativo} sim="Ativo" nao="Inativo" />
                <span className="text-sm text-slate-400">
                  {aulas?.filter((a) => a.curso_id === c.id).length ?? 0} aula(s) ·{" "}
                  {matriculas?.filter((m) => m.curso_id === c.id).length ?? 0} aluno(s)
                </span>
                <Link href={`/painel/aulas?curso=${c.id}`} className="text-sm text-cyan-300 hover:underline">
                  Ver aulas →
                </Link>
              </div>
              <Expansivel rotulo="Editar">
                <FormAcao acao={editarCurso}>
                  <input type="hidden" name="id" value={c.id} />
                  <div className="grid gap-3 sm:grid-cols-[2fr_3fr_1fr]">
                    <Campo rotulo="Nome *">
                      <input name="nome" defaultValue={c.nome} required className={estiloInput} />
                    </Campo>
                    <Campo rotulo="Descrição">
                      <input name="descricao" defaultValue={c.descricao ?? ""} className={estiloInput} />
                    </Campo>
                    <Campo rotulo="Ordem">
                      <input name="ordem" type="number" defaultValue={c.ordem} className={estiloInput} />
                    </Campo>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" name="ativo" defaultChecked={c.ativo} /> Curso ativo
                  </label>
                </FormAcao>
              </Expansivel>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
