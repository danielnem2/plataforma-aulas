"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { botao as estiloBotao, Icone } from "@/components/ui";

export type EstadoAcao = { erro?: string; ok?: string };
export type Acao = (anterior: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;

/**
 * Formulário ligado a uma Server Action.
 * Mostra erro/sucesso (com ícone, anunciado ao leitor de tela) e,
 * se `limparAoSalvar`, zera os campos depois de salvar.
 */
export function FormAcao({
  acao,
  children,
  botao = "Salvar",
  variante = "primario",
  limparAoSalvar = false,
  className = "",
}: {
  acao: Acao;
  children: React.ReactNode;
  botao?: string;
  variante?: "primario" | "secundario" | "sucesso" | "perigo" | "atencao";
  limparAoSalvar?: boolean;
  className?: string;
}) {
  const [estado, executar, enviando] = useActionState(acao, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok && limparAoSalvar) ref.current?.reset();
  }, [estado, limparAoSalvar]);

  return (
    <form ref={ref} action={executar} className={`flex flex-col gap-3 ${className}`}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enviando} className={estiloBotao(variante)}>
          {enviando && <Icone icone={LoaderCircle} className="animate-spin" />}
          {enviando ? "Salvando..." : botao}
        </button>
        <span aria-live="polite" className="contents">
          {estado.erro && (
            <span role="alert" className="inline-flex items-center gap-1.5 text-sm font-medium text-perigo">
              <Icone icone={CircleAlert} tamanho={16} /> {estado.erro}
            </span>
          )}
          {estado.ok && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sucesso">
              <Icone icone={CircleCheck} tamanho={16} /> {estado.ok}
            </span>
          )}
        </span>
      </div>
    </form>
  );
}
