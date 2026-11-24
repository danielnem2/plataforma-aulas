import Link from "next/link";
import { CamposContrato } from "@/components/campos-contrato";
import { FormAcao } from "@/components/form-acao";
import { FlaskConical, UserPlus, Users } from "lucide-react";
import { botao, Campo, Cartao, Expansivel, Icone, Selo, estiloInput, TituloPagina, TOM_TEXTO } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import {
  agoraLocalInput,
  COR_SITUACAO,
  hojeLocal,
  statusContrato,
  type DadosContrato,
} from "@/lib/contrato";
import { ICONE_PAPEL, ROTULO_PAPEL } from "@/lib/rotulos";
import type { Papel } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { criarUsuario, editarUsuario, redefinirSenha } from "./actions";

export const metadata = { title: "Usuários" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

type Usuario = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  escola_id: string | null;
  turma_id: string | null;
  ativo: boolean;
} & DadosContrato;

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function UsuariosPage({ searchParams }: PageProps<"/painel/usuarios">) {
  const perfil = await exigirPapel(["admin", "diretor"]);
  const ehAdmin = perfil.papel === "admin";
  const filtros = await searchParams;
  const fPapel = texto(filtros.papel);
  const fEscola = texto(filtros.escola);
  const fTurma = texto(filtros.turma);
  const fBusca = texto(filtros.busca).trim();

  const supabase = await createClient();
  let consulta = supabase
    .from("perfis")
    .select("id, nome, email, papel, escola_id, turma_id, ativo, tipo_acesso, acesso_inicio, acesso_fim, contrato_meses")
    .order("papel")
    .order("nome");
  if (fPapel) consulta = consulta.eq("papel", fPapel);
  if (fEscola) consulta = consulta.eq("escola_id", fEscola);
  if (fTurma) consulta = consulta.eq("turma_id", fTurma);
  if (fBusca) consulta = consulta.or(`nome.ilike.%${fBusca.replace(/[%,()]/g, "")}%,email.ilike.%${fBusca.replace(/[%,()]/g, "")}%`);

  const [{ data: escolas }, { data: turmas }, { data: usuarios }] = await Promise.all([
    supabase.from("escolas").select("id, nome").order("nome"),
    supabase.from("turmas").select("id, nome, escola_id").eq("ativa", true).order("nome"),
    consulta,
  ]);

  const papeisCriaveis: Papel[] = ehAdmin ? ["diretor", "professor", "aluno", "admin"] : ["professor", "aluno"];
  const nomeEscola = (id: string | null) => escolas?.find((e) => e.id === id)?.nome ?? "—";
  const nomeTurma = (id: string | null) => turmas?.find((t) => t.id === id)?.nome ?? "—";

  const selectTurma = (padrao?: string | null) => (
    <Campo rotulo="Turma (só para aluno)">
      <select name="turma_id" defaultValue={padrao ?? ""} className={estiloInput}>
        <option value="">— sem turma —</option>
        {escolas?.map((e) => {
          const ts = turmas?.filter((t) => t.escola_id === e.id) ?? [];
          if (!ts.length) return null;
          return (
            <optgroup key={e.id} label={e.nome}>
              {ts.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </Campo>
  );

  const selectEscola = (padrao?: string | null) =>
    ehAdmin ? (
      <Campo rotulo="Escola (exceto admin)">
        <select name="escola_id" defaultValue={padrao ?? ""} className={estiloInput}>
          <option value="">— nenhuma —</option>
          {escolas?.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
      </Campo>
    ) : (
      <Campo rotulo="Escola">
        <input value={nomeEscola(perfil.escola_id)} disabled className={estiloInput} />
      </Campo>
    );

  const contagem = (p: Papel) => usuarios?.filter((u) => u.papel === p).length ?? 0;

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <TituloPagina icone={Users}>Usuários</TituloPagina>

      <Cartao titulo="Novo usuário" icone={UserPlus}>
        <FormAcao acao={criarUsuario} botao="Cadastrar" limparAoSalvar>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Papel *">
              <select name="papel" defaultValue="" required className={estiloInput}>
                <option value="" disabled>Selecione...</option>
                {papeisCriaveis.map((p) => (
                  <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Nome *">
              <input name="nome" required className={estiloInput} />
            </Campo>
            <Campo rotulo="E-mail (login) *">
              <input name="email" type="email" required autoComplete="off" className={estiloInput} />
            </Campo>
            <Campo rotulo="Senha inicial * (mín. 8)">
              <input name="senha" type="password" required minLength={8} autoComplete="new-password" className={estiloInput} />
            </Campo>
            {selectEscola()}
            {selectTurma()}
          </div>
          <CamposContrato
            titulo="Acesso (só para aluno)"
            data={hojeLocal()}
            dataHora={agoraLocalInput()}
          />
        </FormAcao>
      </Cartao>

      <Cartao titulo="Usuários cadastrados" icone={Users}>
        <form className="mb-4 grid gap-2 sm:grid-cols-5">
          <Campo rotulo="Buscar">
            <input name="busca" defaultValue={fBusca} placeholder="Nome ou e-mail" className={estiloInput} />
          </Campo>
          <Campo rotulo="Papel">
            <select name="papel" defaultValue={fPapel} className={estiloInput}>
              <option value="">Todos</option>
              {(["admin", "diretor", "professor", "aluno"] as Papel[]).map((p) => (
                <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>
              ))}
            </select>
          </Campo>
          {ehAdmin && (
            <Campo rotulo="Escola">
              <select name="escola" defaultValue={fEscola} className={estiloInput}>
                <option value="">Todas</option>
                {escolas?.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </Campo>
          )}
          <Campo rotulo="Turma">
            <select name="turma" defaultValue={fTurma} className={estiloInput}>
              <option value="">Todas</option>
              {turmas?.map((t) => (
                <option key={t.id} value={t.id}>
                  {ehAdmin ? `${nomeEscola(t.escola_id)} — ` : ""}{t.nome}
                </option>
              ))}
            </select>
          </Campo>
          <div className="flex items-end gap-2">
            <button className={botao("secundario")}>Filtrar</button>
            <a href="/painel/usuarios" className={botao("fantasma")}>Limpar</a>
          </div>
        </form>

        <p className="mb-3 text-sm text-texto-suave">
          {usuarios?.length ?? 0} usuário(s) ·{" "}
          {(["admin", "diretor", "professor", "aluno"] as Papel[])
            .map((p) => `${ROTULO_PAPEL[p]}: ${contagem(p)}`)
            .join(" · ")}
        </p>

        <ul className="flex flex-col divide-y divide-borda">
          {(usuarios as Usuario[] | null)?.map((u) => {
            const podeEditar = ehAdmin || (u.papel === "professor" || u.papel === "aluno");
            return (
              <li key={u.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">{u.nome}</span>
                  <span className="text-sm text-texto-suave">{u.email}</span>
                  <span className="inline-flex items-center gap-1 text-sm text-texto-medio">
                    <Icone icone={ICONE_PAPEL[u.papel]} tamanho={16} /> {ROTULO_PAPEL[u.papel]}
                  </span>
                  <Selo ativo={u.ativo} sim="Ativo" nao="Inativo" />
                  <span className="text-sm text-texto-suave">
                    {u.papel !== "admin" && nomeEscola(u.escola_id)}
                    {u.papel === "aluno" && ` · ${nomeTurma(u.turma_id)}`}
                  </span>
                  {u.papel === "aluno" && (() => {
                    const st = statusContrato(u);
                    const cor = COR_SITUACAO[st.situacao];
                    return (
                      <Link href={`/painel/alunos/${u.id}#contrato`} className={`inline-flex items-center gap-1 text-sm font-medium hover:underline ${TOM_TEXTO[cor.tom]}`}>
                        <Icone icone={cor.icone} tamanho={16} />
                        {u.tipo_acesso === "experimental" && <Icone icone={FlaskConical} tamanho={16} />}
                        {st.texto}
                      </Link>
                    );
                  })()}
                </div>
                {podeEditar && (
                  <div className="flex flex-wrap gap-6">
                    <Expansivel rotulo="Editar">
                      <FormAcao acao={editarUsuario}>
                        <input type="hidden" name="id" value={u.id} />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Campo rotulo="Nome *">
                            <input name="nome" defaultValue={u.nome} required className={estiloInput} />
                          </Campo>
                          <Campo rotulo="Papel *">
                            <select name="papel" defaultValue={u.papel} className={estiloInput}>
                              {papeisCriaveis.map((p) => (
                                <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>
                              ))}
                            </select>
                          </Campo>
                          {selectEscola(u.escola_id)}
                          {selectTurma(u.turma_id)}
                        </div>
                        <label className="flex min-h-10 items-center gap-2 text-sm text-texto-medio">
                          <input type="checkbox" name="ativo" defaultChecked={u.ativo} /> Usuário ativo
                          <span className="text-texto-suave">(desativado não consegue entrar)</span>
                        </label>
                      </FormAcao>
                    </Expansivel>
                    {u.id !== perfil.id && (
                      <Expansivel rotulo="Redefinir senha">
                        <FormAcao acao={redefinirSenha} botao="Trocar senha" limparAoSalvar>
                          <input type="hidden" name="id" value={u.id} />
                          <Campo rotulo="Nova senha (mín. 8)">
                            <input name="senha" type="password" required minLength={8} autoComplete="new-password" className={estiloInput} />
                          </Campo>
                        </FormAcao>
                      </Expansivel>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Cartao>
    </div>
  );
}
