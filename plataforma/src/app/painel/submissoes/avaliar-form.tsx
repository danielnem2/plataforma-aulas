"use client";

import { botao, estiloInput, Icone } from "@/components/ui";
import { Check, CircleAlert, CircleCheck, RotateCcw } from "lucide-react";
import { useActionState } from "react";
import type { EstadoAcao } from "@/components/form-acao";
import { avaliarSubmissao } from "./actions";

/** Comentário + botões Aprovar / Devolver */
export function AvaliarForm({ id }: { id: string }) {
  const [estado, executar, enviando] = useActionState<EstadoAcao, FormData>(avaliarSubmissao, {});

  if (estado.ok)
    return (
      <p role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-sucesso">
        <Icone icone={CircleCheck} tamanho={16} /> {estado.ok}
      </p>
    );

  return (
    <form action={executar} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <textarea
        name="comentario"
        rows={2}
        placeholder="Comentário (obrigatório para devolver)"
        aria-label="Comentário"
        className={estiloInput}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          name="decisao"
          value="aprovar"
          disabled={enviando}
          className={botao("sucesso", "pequeno")}
        >
          <Icone icone={Check} tamanho={16} /> Aprovar
        </button>
        <button
          name="decisao"
          value="devolver"
          disabled={enviando}
          className={botao("atencao", "pequeno")}
        >
          <Icone icone={RotateCcw} tamanho={16} /> Devolver
        </button>
        {estado.erro && (
          <span role="alert" className="inline-flex items-center gap-1.5 text-sm font-medium text-perigo">
            <Icone icone={CircleAlert} tamanho={16} /> {estado.erro}
          </span>
        )}
      </div>
    </form>
  );
}
