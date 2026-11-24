"use client";

import { CircleAlert, LoaderCircle, LogIn } from "lucide-react";
import { useActionState } from "react";
import { Aviso, botao, Campo, estiloInput, Icone } from "@/components/ui";
import { entrar, type EstadoLogin } from "./actions";

export function LoginForm({ aviso }: { aviso?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, {});
  const mensagem = estado.erro ?? aviso;

  return (
    <form action={acao} className="flex flex-col gap-4">
      <Campo rotulo="E-mail">
        <input name="email" type="email" autoComplete="username" required className={estiloInput} />
      </Campo>
      <Campo rotulo="Senha">
        <input name="senha" type="password" autoComplete="current-password" required className={estiloInput} />
      </Campo>

      {mensagem && (
        <div role="alert">
          <Aviso tom="aviso" icone={CircleAlert}>{mensagem}</Aviso>
        </div>
      )}

      <button type="submit" disabled={enviando} className={botao("primario")}>
        <Icone icone={enviando ? LoaderCircle : LogIn} className={enviando ? "animate-spin" : ""} />
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
