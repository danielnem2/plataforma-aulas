"use client";

import { useActionState, useEffect, useRef } from "react";

export type EstadoAcao = { erro?: string; ok?: string };
export type Acao = (anterior: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;

/**
 * Formulário ligado a uma Server Action.
 * Mostra erro/sucesso e, se `limparAoSalvar`, zera os campos depois de salvar.
 */
export function FormAcao({
  acao,
  children,
  botao = "Salvar",
  limparAoSalvar = false,
  className = "",
}: {
  acao: Acao;
  children: React.ReactNode;
  botao?: string;
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
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
        >
          {enviando ? "Salvando..." : botao}
        </button>
        {estado.erro && <span role="alert" className="text-sm text-red-300">{estado.erro}</span>}
        {estado.ok && <span className="text-sm text-emerald-300">{estado.ok}</span>}
      </div>
    </form>
  );
}
