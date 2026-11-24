"use client";

import { Aviso, botao, estiloInput, Icone } from "@/components/ui";
import { Target, Clock, Coins, PictureInPicture2, Maximize2, Minimize2, X, RotateCcw, CircleCheck, Hourglass, Link as LinkIcon, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { FormAcao } from "@/components/form-acao";
import { abrirJanelaFlutuante, suportaJanelaFlutuante } from "@/components/janela-flutuante";
import {
  LegendaMapa,
  MapaHabilidades,
  type Dependencia,
  type NoMapa,
} from "@/components/mapa-habilidades";
import { enviarTarefa } from "./actions";

export type DetalheAula = {
  id: string;
  titulo: string;
  descricao: string | null;
  figma_embed_url: string;
  dificuldade: "facil" | "medio" | "dificil";
  tempo_estimado_min: number | null;
  gold_recompensa: number;
  dica_envio: string | null;
  ultima?: { status: string; comentario: string | null; link: string } | null;
};

const ROTULO_DIF = { facil: "Fácil", medio: "Intermediária", dificil: "Difícil" };

export function MapaAluno({
  nos,
  dependencias,
  detalhes,
  somenteLeitura = false,
}: {
  nos: NoMapa[];
  dependencias: Dependencia[];
  detalhes: Record<string, DetalheAula>;
  somenteLeitura?: boolean;
}) {
  const [aberta, setAberta] = useState<NoMapa | null>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const aula = aberta ? detalhes[aberta.id] : null;

  // Esc fecha a janela da aula
  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberta(null);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberta]);

  return (
    <>
      <MapaHabilidades nos={nos} dependencias={dependencias} aoSelecionar={setAberta} />
      <div className="mt-3">
        <LegendaMapa />
      </div>

      {aberta && aula && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={aula.titulo}
          className="fixed inset-0 z-50 flex items-center justify-center bg-sobreposicao p-4"
          onClick={(e) => e.target === e.currentTarget && setAberta(null)}
        >
          <div
            className={`flex flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-2xl ${
              telaCheia ? "h-full w-full" : "h-[90vh] w-full max-w-5xl"
            }`}
          >
            <header className="flex items-start justify-between gap-3 border-b border-borda px-5 py-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-texto">
                  <Icone icone={Target} className="text-primaria-texto" /> {aula.titulo}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-texto-suave">
                  <span>Dificuldade: {ROTULO_DIF[aula.dificuldade]}</span>
                  {aula.tempo_estimado_min && (
                    <span className="inline-flex items-center gap-1"><Icone icone={Clock} tamanho={16} /> {aula.tempo_estimado_min} min</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-aviso"><Icone icone={Coins} tamanho={16} /> {aula.gold_recompensa} Gold</span>
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => abrirJanelaFlutuante(aula.figma_embed_url, aula.titulo)}
                  className={botao("secundario", "pequeno")}
                  title={
                    suportaJanelaFlutuante()
                      ? "Abre a aula numa janela que fica por cima das outras"
                      : "Seu navegador não tem janela flutuante; abre num popup"
                  }
                >
                  <Icone icone={PictureInPicture2} tamanho={16} /> Janela flutuante
                </button>
                <button
                  type="button"
                  onClick={() => setTelaCheia((v) => !v)}
                  className={botao("secundario", "pequeno")}
                  aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
                  title={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
                >
                  <Icone icone={telaCheia ? Minimize2 : Maximize2} tamanho={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setAberta(null)}
                  className={botao("secundario", "pequeno")}
                  aria-label="Fechar (Esc)"
                  title="Fechar (Esc)"
                >
                  <Icone icone={X} tamanho={16} />
                </button>
              </div>
            </header>

            <iframe
              key={aula.id}
              src={aula.figma_embed_url}
              title={aula.titulo}
              allowFullScreen
              className="w-full flex-1 bg-superficie"
            />

            <footer className="flex flex-col gap-2 border-t border-borda px-5 py-3">
              {aula.descricao && <p className="text-sm text-texto-medio">{aula.descricao}</p>}

              {aula.ultima?.status === "devolvida" && (
                <Aviso tom="atencao" icone={RotateCcw}>
                  <strong>Tarefa devolvida:</strong> {aula.ultima.comentario}
                </Aviso>
              )}

              {aberta.estado === "concluida" && (
                <Aviso tom="sucesso" icone={CircleCheck}>
                  <strong>Aula concluída!</strong>
                  {aula.ultima?.comentario && ` Comentário: ${aula.ultima.comentario}`}
                </Aviso>
              )}
              {aberta.estado === "pendente" && (
                <Aviso tom="aviso" icone={Hourglass}>Tarefa enviada, aguardando avaliação.</Aviso>
              )}

              {!somenteLeitura && (aberta.estado === "disponivel" || aberta.estado === "devolvida") && (
                <FormAcao acao={enviarTarefa} botao="Enviar tarefa">
                  <input type="hidden" name="aula_id" value={aula.id} />
                  <label className="flex flex-col gap-1 text-sm font-medium text-texto-medio">
                    <span className="inline-flex items-center gap-1.5"><Icone icone={LinkIcon} tamanho={16} /> Link público da missão *</span>
                    <input
                      name="link"
                      type="url"
                      required
                      placeholder="https://drive.google.com/... ou https://github.com/..."
                      className={estiloInput}
                    />
                  </label>
                  <p className="flex items-start gap-1.5 text-sm text-texto-suave">
                    <Icone icone={Lightbulb} tamanho={16} className="mt-0.5" />
                    {aula.dica_envio ?? "Deixe o link público (qualquer pessoa com o link pode ver)."}
                  </p>
                </FormAcao>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
