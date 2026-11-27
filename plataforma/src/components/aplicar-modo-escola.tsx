"use client";

import { useEffect } from "react";
import { CHAVE_TEMA, CHAVE_TEMA_ESCOLA, EVENTO_TEMA } from "@/components/botao-tema";

/**
 * Sem escolha da pessoa no botão do topo, vale o modo padrão da escola.
 * Guarda o padrão para o script do <head> já aplicar na próxima visita (sem piscar).
 */
export function AplicarModoEscola({ modo }: { modo: "claro" | "escuro" }) {
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_TEMA_ESCOLA, modo);
      if (localStorage.getItem(CHAVE_TEMA)) return; // a pessoa já escolheu
    } catch {}
    if (document.documentElement.dataset.tema !== modo) {
      document.documentElement.dataset.tema = modo;
      window.dispatchEvent(new Event(EVENTO_TEMA));
    }
  }, [modo]);
  return null;
}
