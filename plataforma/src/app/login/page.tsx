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
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800/60 p-8 shadow-xl">
        <h1 className="mb-1 text-2xl font-bold text-cyan-300">Plataforma de Aulas</h1>
        <p className="mb-6 text-sm text-slate-400">Entre com sua conta</p>
        <LoginForm aviso={aviso} />
      </div>
    </main>
  );
}
