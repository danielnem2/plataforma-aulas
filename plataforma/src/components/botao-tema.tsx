"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { botao, Icone } from "@/components/ui";

/** Chave no navegador; o script do <head> (app/layout.tsx) aplica antes da página aparecer */
export const CHAVE_TEMA = "tema";
const EVENTO = "tema-mudou";

function temaAtual() {
  return document.documentElement.dataset.tema === "escuro" ? "escuro" : "claro";
}

function assinar(aviso: () => void) {
  window.addEventListener(EVENTO, aviso);
  return () => window.removeEventListener(EVENTO, aviso);
}

/** Botão do topo: alterna entre o tema claro (padrão) e o escuro estilo VS Code */
export function BotaoTema() {
  const tema = useSyncExternalStore(assinar, temaAtual, () => "claro");
  const escuro = tema === "escuro";

  const alternar = () => {
    const novo = temaAtual() === "escuro" ? "claro" : "escuro";
    if (novo === "escuro") document.documentElement.dataset.tema = "escuro";
    else delete document.documentElement.dataset.tema;
    try {
      localStorage.setItem(CHAVE_TEMA, novo);
    } catch {}
    window.dispatchEvent(new Event(EVENTO));
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={escuro}
      className={botao("secundario", "pequeno")}
    >
      {/* o rótulo vem do CSS (data-tema), então já aparece certo antes do React carregar */}
      <span className="inline-flex items-center gap-2 escuro:hidden">
        <Icone icone={Moon} tamanho={16} /> Modo escuro
      </span>
      <span className="hidden items-center gap-2 escuro:inline-flex">
        <Icone icone={Sun} tamanho={16} /> Modo claro
      </span>
    </button>
  );
}
