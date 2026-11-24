import { BookOpen, ExternalLink, GitBranch, List, Map as MapIcon, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormAcao } from "@/components/form-acao";
import { MapaHabilidades } from "@/components/mapa-habilidades";
import { Aviso, Campo, Cartao, estiloInput, Expansivel, Icone, pilula, Selo, TituloPagina } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CamposRevisao } from "@/components/campos-revisao";
import { enviarRevisao } from "../revisoes/actions";
import { criarAula, editarAula, removerAula } from "./actions";

export const metadata = { title: "Aulas" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

type Aula = {
  id: string;
  curso_id: string;
  titulo: string;
  numero_missao: number;
  descricao: string | null;
  figma_embed_url: string;
  camada: number;
  ordem: number;
  dificuldade: "facil" | "medio" | "dificil";
  tempo_estimado_min: number | null;
  gold_recompensa: number;
  dica_envio: string | null;
  ativa: boolean;
};

const ROTULO_DIF = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };

export default async function AulasPage({ searchParams }: PageProps<"/painel/aulas">) {
  const perfil = await exigirPapel(["admin", "diretor", "professor"]);
  const podeRemover = perfil.papel === "admin" || perfil.papel === "diretor";
  const podeEnviarDuvida = perfil.papel === "professor" || perfil.papel === "diretor";
  const { curso } = await searchParams;
  const supabase = await createClient();

  const { data: cursos } = await supabase.from("cursos").select("id, nome").order("ordem");
  const cursoId = (typeof curso === "string" && curso) || cursos?.[0]?.id;

  if (!cursoId) {
    return (
      <Cartao>
        <p className="text-texto-medio">Nenhum curso cadastrado. Peça ao admin para criar em Cursos.</p>
      </Cartao>
    );
  }

  const [{ data: aulasRaw }, { data: deps }] = await Promise.all([
    supabase
      .from("aulas")
      .select(
        "id, curso_id, titulo, numero_missao, descricao, figma_embed_url, camada, ordem, dificuldade, tempo_estimado_min, gold_recompensa, dica_envio, ativa",
      )
      .eq("curso_id", cursoId)
      .order("numero_missao"),
    supabase.from("aula_dependencias").select("aula_id, depende_de_id"),
  ]);
  const aulas = (aulasRaw ?? []) as Aula[];
  const idsCurso = new Set(aulas.map((a) => a.id));
  const depsCurso = (deps ?? []).filter((d) => idsCurso.has(d.aula_id));

  const nomeAula = (id: string) => {
    const x = aulas.find((y) => y.id === id);
    return x ? `Missão ${x.numero_missao} — ${x.titulo}` : "?";
  };
  const ativas = aulas.filter((a) => a.ativa);
  const ultima = ativas[ativas.length - 1];

  const campos = (a?: Aula) => {
    const depsDaAula = depsCurso.filter((d) => d.aula_id === a?.id).map((d) => d.depende_de_id);
    const outras = aulas.filter((x) => x.id !== a?.id);
    return (
      <>
        <input type="hidden" name="curso_id" value={cursoId} />
        <Campo rotulo="Título *">
          <input name="titulo" defaultValue={a?.titulo} required className={estiloInput} />
        </Campo>
        <Campo rotulo="Link do Figma * (link de compartilhamento, embed.figma.com ou <iframe>)">
          <input name="figma" defaultValue={a?.figma_embed_url} required className={estiloInput} />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-4">
          <Campo rotulo="Dificuldade">
            <select name="dificuldade" defaultValue={a?.dificuldade ?? "facil"} className={estiloInput}>
              {Object.entries(ROTULO_DIF).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Tempo estimado (min)">
            <input name="tempo_estimado_min" type="number" min={1} defaultValue={a?.tempo_estimado_min ?? ""} className={estiloInput} />
          </Campo>
          <Campo rotulo="Gold ao aprovar">
            <input name="gold_recompensa" type="number" min={0} defaultValue={a?.gold_recompensa ?? 10} className={estiloInput} />
          </Campo>
          <Campo rotulo="Dica de envio">
            <input name="dica_envio" defaultValue={a?.dica_envio ?? ""} placeholder="Ex.: envie o link do Drive" className={estiloInput} />
          </Campo>
        </div>
        <Campo rotulo="Descrição">
          <textarea name="descricao" defaultValue={a?.descricao ?? ""} rows={2} className={estiloInput} />
        </Campo>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium text-texto-medio">
            {a ? "Pré-requisitos" : "Pré-requisitos manuais (só vale se escolher “Escolher manualmente” acima)"} — aulas
            que precisam ser aprovadas antes desta
          </legend>
          {!outras.length && <span className="text-sm text-texto-suave">Nenhuma outra aula no curso.</span>}
          <div className="grid gap-1 sm:grid-cols-3">
            {outras.map((o) => (
              <label key={o.id} className="flex min-h-10 items-center gap-2 text-sm text-texto-medio">
                <input type="checkbox" name="dependencias" value={o.id} defaultChecked={depsDaAula.includes(o.id)} />
                Missão {o.numero_missao} — {o.titulo}
              </label>
            ))}
          </div>
        </fieldset>
      </>
    );
  };

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TituloPagina icone={BookOpen}>Aulas</TituloPagina>
        <div className="flex flex-wrap gap-2">
          {cursos?.map((c) => (
            <Link
              key={c.id}
              href={`/painel/aulas?curso=${c.id}`}
              className={pilula(c.id === cursoId)}
            >
              {c.nome}
            </Link>
          ))}
        </div>
      </div>

      <Cartao titulo="Mapa do curso" icone={MapIcon}>
        <MapaHabilidades
          nos={aulas.filter((a) => a.ativa).map((a) => ({ ...a }))}
          dependencias={depsCurso}
        />
      </Cartao>

      <Cartao titulo="Nova aula" icone={Plus}>
        <FormAcao acao={criarAula} botao="Criar aula" limparAoSalvar>
          <Campo rotulo="Onde colocar no caminho do curso *">
            <select name="posicao" defaultValue={ultima ? `depois:${ultima.id}` : "inicio"} className={estiloInput}>
              {ativas.map((x) => (
                <option key={x.id} value={`depois:${x.id}`}>
                  Depois de: Missão {x.numero_missao} — {x.titulo}
                  {x.id === ultima?.id ? " (no fim)" : ""}
                </option>
              ))}
              <option value="inicio">No começo (sem pré-requisito)</option>
              <option value="manual">Escolher pré-requisitos manualmente (abaixo)</option>
            </select>
          </Campo>
          <p className="-mt-1 text-sm text-texto-suave">
            “Depois de” encaixa a aula no meio do caminho: as aulas que vinham depois daquela passam a vir depois desta.
            A coluna no mapa e o número da missão são calculados sozinhos.
          </p>
          {campos()}
        </FormAcao>
      </Cartao>

      <Cartao titulo={`${aulas.length} aula(s) neste curso`} icone={List}>
        <ul className="flex flex-col divide-y divide-borda">
          {aulas.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">
                  Missão {a.numero_missao} — {a.titulo}
                </span>
                <Selo ativo={a.ativa} />
                <span className="text-sm text-texto-suave">
                  Coluna {a.camada + 1} · {ROTULO_DIF[a.dificuldade]} · {a.gold_recompensa} Gold
                  {a.tempo_estimado_min && ` · ${a.tempo_estimado_min} min`}
                </span>
                <a href={a.figma_embed_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primaria-texto hover:underline">
                  Abrir no Figma <Icone icone={ExternalLink} tamanho={16} />
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-texto-suave">
                <Icone icone={GitBranch} tamanho={16} />
                {(() => {
                  const pre = depsCurso.filter((d) => d.aula_id === a.id).map((d) => nomeAula(d.depende_de_id));
                  return pre.length ? `Depende de: ${pre.join(", ")}` : "Sem pré-requisito (começo do caminho)";
                })()}
              </p>
              <div className="flex flex-wrap gap-4">
              <Expansivel rotulo="Editar">
                <FormAcao acao={editarAula}>
                  <input type="hidden" name="id" value={a.id} />
                  {campos(a)}
                  <label className="flex min-h-10 items-center gap-2 text-sm text-texto-medio">
                    <input type="checkbox" name="ativa" defaultChecked={a.ativa} /> Aula ativa (inativa some do mapa dos alunos)
                  </label>
                </FormAcao>
              </Expansivel>
              {podeEnviarDuvida && (
                <Expansivel rotulo="Enviar dúvida ao ADM">
                  <FormAcao acao={enviarRevisao} botao="Enviar ao ADM" limparAoSalvar>
                    <CamposRevisao aulaId={a.id} />
                  </FormAcao>
                </Expansivel>
              )}
              {podeRemover && (
                <Expansivel rotulo="Remover aula">
                  <FormAcao acao={removerAula} botao="Remover aula" variante="perigo">
                    <input type="hidden" name="id" value={a.id} />
                    <Aviso tom="perigo" icone={Trash2}>
                      A aula sai do caminho e as aulas que dependiam dela passam a depender dos pré-requisitos dela.
                      Se algum aluno já entregou essa tarefa, ela é arquivada (o histórico fica); senão, é excluída de vez.
                    </Aviso>
                    <label className="flex min-h-10 items-center gap-2 text-sm text-texto-medio">
                      <input type="checkbox" name="confirmar" required /> Confirmo que quero remover “{a.titulo}”
                    </label>
                  </FormAcao>
                </Expansivel>
              )}
              </div>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
