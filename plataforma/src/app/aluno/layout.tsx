import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { exigirPapel } from "@/lib/auth";

// Área depende do usuário logado: renderiza a cada requisição
export const instant = false;

const MENU = [
  { href: "/aluno", rotulo: "🗺️ Mapa do Mundo" },
  { href: "/aluno/estatisticas", rotulo: "📊 Minhas Estatísticas" },
  { href: "/aluno/loja", rotulo: "🛒 Loja" },
];

export default async function AlunoLayout({ children }: LayoutProps<"/aluno">) {
  const perfil = await exigirPapel(["aluno"]);
  return (
    <>
      <Cabecalho perfil={perfil} />
      <nav className="flex gap-2 border-b border-slate-800 bg-slate-900/40 px-6 py-2">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            {m.rotulo}
          </Link>
        ))}
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </>
  );
}
