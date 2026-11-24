"use client";

import { useState } from "react";
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => e.target === e.currentTarget && setAberta(null)}
        >
          <div
            className={`flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl ${
              telaCheia ? "h-full w-full" : "h-[90vh] w-full max-w-5xl"
            }`}
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-3">
              <div>
                <h2 className="text-lg font-bold text-cyan-300">🎯 {aula.titulo}</h2>
                <p className="text-xs text-slate-400">
                  Dificuldade: {ROTULO_DIF[aula.dificuldade]}
                  {aula.tempo_estimado_min && ` · ⏱️ ${aula.tempo_estimado_min} min`} · 🪙 {aula.gold_recompensa}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => abrirJanelaFlutuante(aula.figma_embed_url, aula.titulo)}
                  className="rounded-lg bg-violet-500/20 px-3 py-1.5 text-sm text-violet-200 hover:bg-violet-500/30"
                  title={
                    suportaJanelaFlutuante()
                      ? "Abre a aula numa janela que fica por cima das outras"
                      : "Seu navegador não tem janela flutuante; abre num popup"
                  }
                >
                  🪟 Janela flutuante
                </button>
                <button
                  type="button"
                  onClick={() => setTelaCheia((v) => !v)}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
                  title="Tela cheia"
                >
                  {telaCheia ? "🗗" : "⛶"}
                </button>
                <button
                  type="button"
                  onClick={() => setAberta(null)}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            </header>

            <iframe
              key={aula.id}
              src={aula.figma_embed_url}
              title={aula.titulo}
              allowFullScreen
              className="w-full flex-1 bg-white"
            />

            <footer className="flex flex-col gap-2 border-t border-slate-800 px-5 py-3">
              {aula.descricao && <p className="text-sm text-slate-300">{aula.descricao}</p>}

              {aula.ultima?.status === "devolvida" && (
                <p className="rounded-lg bg-orange-500/15 px-3 py-2 text-sm text-orange-200">
                  🔙 Tarefa devolvida: {aula.ultima.comentario}
                </p>
              )}

              {aberta.estado === "concluida" && (
                <p className="text-sm text-emerald-300">
                  ✅ Aula concluída!
                  {aula.ultima?.comentario && ` Comentário: ${aula.ultima.comentario}`}
                </p>
              )}
              {aberta.estado === "pendente" && (
                <p className="text-sm text-amber-300">⏳ Tarefa enviada, aguardando avaliação.</p>
              )}

              {!somenteLeitura && (aberta.estado === "disponivel" || aberta.estado === "devolvida") && (
                <FormAcao acao={enviarTarefa} botao="🚀 Enviar">
                  <input type="hidden" name="aula_id" value={aula.id} />
                  <label className="flex flex-col gap-1 text-sm text-slate-300">
                    🔗 Link público da missão *
                    <input
                      name="link"
                      type="url"
                      required
                      placeholder="https://drive.google.com/... ou https://github.com/..."
                      className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    💡 {aula.dica_envio ?? "Deixe o link público (qualquer pessoa com o link pode ver)."}
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
