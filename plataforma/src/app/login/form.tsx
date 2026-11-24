"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "./actions";

export function LoginForm({ aviso }: { aviso?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(
    entrar,
    {},
  );

  const mensagem = estado.erro ?? aviso;

  return (
    <form action={acao} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-base outline-none focus:border-cyan-400"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-base outline-none focus:border-cyan-400"
        />
      </label>

      {mensagem && (
        <p role="alert" className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-300">
          {mensagem}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
      >
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
