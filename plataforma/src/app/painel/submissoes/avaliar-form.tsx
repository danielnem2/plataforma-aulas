"use client";

import { useActionState } from "react";
import type { EstadoAcao } from "@/components/form-acao";
import { avaliarSubmissao } from "./actions";

/** Comentário + botões Aprovar / Devolver */
export function AvaliarForm({ id }: { id: string }) {
  const [estado, executar, enviando] = useActionState<EstadoAcao, FormData>(avaliarSubmissao, {});

  if (estado.ok) return <p className="text-sm text-emerald-300">{estado.ok}</p>;

  return (
    <form action={executar} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <textarea
        name="comentario"
        rows={2}
        placeholder="Comentário (obrigatório para devolver)"
        className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
      />
      <div className="flex items-center gap-2">
        <button
          name="decisao"
          value="aprovar"
          disabled={enviando}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          ✅ Aprovar
        </button>
        <button
          name="decisao"
          value="devolver"
          disabled={enviando}
          className="rounded-lg bg-orange-500/80 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-60"
        >
          🔙 Devolver
        </button>
        {estado.erro && <span role="alert" className="text-sm text-red-300">{estado.erro}</span>}
      </div>
    </form>
  );
}
