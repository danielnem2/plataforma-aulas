import Link from "next/link";
import { FormAcao } from "@/components/form-acao";
import { MapaHabilidades } from "@/components/mapa-habilidades";
import { Campo, Cartao, Expansivel, Selo, estiloInput } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { criarAula, editarAula } from "./actions";

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
  await exigirPapel(["admin", "diretor", "professor"]);
  const { curso } = await searchParams;
  const supabase = await createClient();

  const { data: cursos } = await supabase.from("cursos").select("id, nome").order("ordem");
  const cursoId = (typeof curso === "string" && curso) || cursos?.[0]?.id;

  if (!cursoId) {
    return (
      <Cartao>
        <p className="text-slate-300">Nenhum curso cadastrado. Peça ao admin para criar em Cursos.</p>
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
      .order("camada")
      .order("ordem"),
    supabase.from("aula_dependencias").select("aula_id, depende_de_id"),
  ]);
  const aulas = (aulasRaw ?? []) as Aula[];
  const idsCurso = new Set(aulas.map((a) => a.id));
  const depsCurso = (deps ?? []).filter((d) => idsCurso.has(d.aula_id));

  const campos = (a?: Aula) => {
    const depsDaAula = depsCurso.filter((d) => d.aula_id === a?.id).map((d) => d.depende_de_id);
    const outras = aulas.filter((x) => x.id !== a?.id);
    return (
      <>
        <input type="hidden" name="curso_id" value={cursoId} />
        <div className="grid gap-3 sm:grid-cols-4">
          <Campo rotulo="Título *">
            <input name="titulo" defaultValue={a?.titulo} required className={estiloInput} />
          </Campo>
          <Campo rotulo="Nº da missão">
            <input name="numero_missao" type="number" min={1} defaultValue={a?.numero_missao ?? aulas.length + 1} className={estiloInput} />
          </Campo>
          <Campo rotulo="Camada no mapa (0, 1, 2...)">
            <input name="camada" type="number" min={0} defaultValue={a?.camada ?? 0} className={estiloInput} />
          </Campo>
          <Campo rotulo="Ordem na camada">
            <input name="ordem" type="number" min={0} defaultValue={a?.ordem ?? 0} className={estiloInput} />
          </Campo>
        </div>
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
          <Campo rotulo="🪙 Gold ao aprovar">
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
          <legend className="mb-1 text-sm text-slate-300">
            Dependências — aulas que precisam ser aprovadas antes desta
          </legend>
          {!outras.length && <span className="text-sm text-slate-500">Nenhuma outra aula no curso.</span>}
          <div className="grid gap-1 sm:grid-cols-3">
            {outras.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="dependencias" value={o.id} defaultChecked={depsDaAula.includes(o.id)} />
                #{o.numero_missao} {o.titulo}
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
        <h1 className="text-2xl font-bold">🛠️ Aulas</h1>
        <div className="flex flex-wrap gap-2">
          {cursos?.map((c) => (
            <Link
              key={c.id}
              href={`/painel/aulas?curso=${c.id}`}
              className={`rounded-full px-3 py-1 text-sm ${
                c.id === cursoId ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {c.nome}
            </Link>
          ))}
        </div>
      </div>

      <Cartao titulo="🗺️ Mapa do curso">
        <MapaHabilidades
          nos={aulas.filter((a) => a.ativa).map((a) => ({ ...a }))}
          dependencias={depsCurso}
        />
      </Cartao>

      <Cartao titulo="Nova aula">
        <FormAcao acao={criarAula} botao="Criar aula" limparAoSalvar>
          {campos()}
        </FormAcao>
      </Cartao>

      <Cartao titulo={`${aulas.length} aula(s) neste curso`}>
        <ul className="flex flex-col divide-y divide-slate-800">
          {aulas.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">
                  #{a.numero_missao} {a.titulo}
                </span>
                <Selo ativo={a.ativa} />
                <span className="text-sm text-slate-400">
                  Camada {a.camada} · {ROTULO_DIF[a.dificuldade]} · 🪙 {a.gold_recompensa}
                  {a.tempo_estimado_min && ` · ${a.tempo_estimado_min} min`}
                </span>
                <a href={a.figma_embed_url} target="_blank" rel="noreferrer" className="text-sm text-cyan-300 hover:underline">
                  Abrir no Figma ↗
                </a>
              </div>
              <Expansivel rotulo="Editar">
                <FormAcao acao={editarAula}>
                  <input type="hidden" name="id" value={a.id} />
                  {campos(a)}
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" name="ativa" defaultChecked={a.ativa} /> Aula ativa (inativa some do mapa dos alunos)
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
