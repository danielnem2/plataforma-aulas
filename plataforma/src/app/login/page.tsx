import { GraduationCap } from "lucide-react";
import { BotaoTema } from "@/components/botao-tema";
import { Icone } from "@/components/ui";
import { LoginForm } from "./form";

export const metadata = { title: "Entrar" };
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;

  let aviso: string | undefined;
  if (params.expirada) aviso = "Sua sessão expirou após 2 horas. Entre novamente.";
  if (params.erro === "inativo") aviso = "Conta desativada ou sem cadastro. Fale com a secretaria.";
  if (params.erro === "contrato") aviso = "Seu período de acesso terminou (ou ainda não começou). Fale com a coordenação.";

  return (
    <main id="conteudo" className="relative flex flex-1 items-center justify-center p-6">
      <div className="absolute right-6 top-4">
        <BotaoTema />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-borda bg-superficie p-8 shadow-sm">
        <span className="mb-4 inline-flex rounded-2xl bg-primaria-suave p-3 text-primaria-texto">
          <Icone icone={GraduationCap} tamanho={32} />
        </span>
        <h1 className="mb-1 text-2xl font-bold text-texto">Plataforma de Aulas</h1>
        <p className="mb-6 text-sm text-texto-suave">Entre com sua conta</p>
        <LoginForm aviso={aviso} />
      </div>
    </main>
  );
}
