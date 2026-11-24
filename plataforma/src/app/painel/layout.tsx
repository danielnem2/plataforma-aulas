import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { exigirPapel } from "@/lib/auth";
import { DIAS_AVISO_AMARELO, DIAS_AVISO_VERMELHO } from "@/lib/contrato";
import type { Papel } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Área depende do usuário logado: renderiza a cada requisição
export const instant = false;

type ItemMenu = {
  href: string;
  rotulo: string;
  papeis: Papel[];
  contador?: "submissoes" | "compras" | "faltas" | "contratos";
};

const EQUIPE: Papel[] = ["admin", "diretor", "professor"];

const MENU: (ItemMenu | string)[] = [
  { href: "/painel", rotulo: "🏠 Início", papeis: EQUIPE },
  "Acompanhamento",
  { href: "/painel/submissoes", rotulo: "🎯 Submissões", papeis: EQUIPE, contador: "submissoes" },
  { href: "/painel/alunos", rotulo: "🧑‍🎓 Alunos", papeis: EQUIPE },
  { href: "/painel/faltas", rotulo: "🚨 Faltas", papeis: EQUIPE, contador: "faltas" },
  { href: "/painel/contratos", rotulo: "📄 Contratos", papeis: EQUIPE, contador: "contratos" },
  { href: "/painel/compras", rotulo: "🎮 Compras de horas", papeis: EQUIPE, contador: "compras" },
  "Conteúdo",
  { href: "/painel/aulas", rotulo: "🛠️ Aulas", papeis: EQUIPE },
  { href: "/painel/cursos", rotulo: "🎓 Cursos", papeis: ["admin"] },
  { href: "/painel/loja", rotulo: "🛒 Loja", papeis: ["admin", "diretor"] },
  "Gestão",
  { href: "/painel/escolas", rotulo: "🏫 Escolas", papeis: ["admin"] },
  { href: "/painel/turmas", rotulo: "📚 Turmas", papeis: ["admin", "diretor"] },
  { href: "/painel/usuarios", rotulo: "👥 Usuários", papeis: ["admin", "diretor"] },
  { href: "/painel/calendario", rotulo: "📅 Dias sem aula", papeis: EQUIPE },
];

export default async function PainelLayout({ children }: LayoutProps<"/painel">) {
  const perfil = await exigirPapel(EQUIPE);
  const supabase = await createClient();

  // Contadores do menu (RLS já limita ao que cada um pode ver)
  const agora = new Date();
  const emDias = (d: number) => new Date(agora.getTime() + d * 24 * 60 * 60 * 1000).toISOString();
  const [{ count: novas }, { count: compras }, { data: faltas }, { data: vencendo }] = await Promise.all([
    supabase.from("submissoes").select("id", { count: "exact", head: true }).eq("status", "nova"),
    supabase.from("compras").select("id", { count: "exact", head: true }).eq("status", "aguardando_aviso"),
    supabase.rpc("painel_faltas"),
    // contratos vencendo em até 1 mês (ainda com acesso)
    supabase
      .from("perfis")
      .select("acesso_fim")
      .eq("papel", "aluno")
      .eq("ativo", true)
      .gt("acesso_fim", agora.toISOString())
      .lte("acesso_fim", emDias(DIAS_AVISO_AMARELO)),
  ]);
  const limiteVermelho = agora.getTime() + DIAS_AVISO_VERMELHO * 24 * 60 * 60 * 1000;
  const vermelhoContratos = (vencendo ?? []).some((v) => new Date(v.acesso_fim!).getTime() <= limiteVermelho);
  const contadores = {
    submissoes: novas ?? 0,
    compras: compras ?? 0,
    faltas:
      (faltas as { faltas: number; aviso_visto: boolean }[] | null)?.filter(
        (f) => f.faltas >= 2 && !f.aviso_visto,
      ).length ?? 0,
    contratos: vencendo?.length ?? 0,
  };

  const itens = MENU.filter((m) => typeof m === "string" || m.papeis.includes(perfil.papel));

  return (
    <>
      <Cabecalho perfil={perfil} />
      <div className="flex flex-1">
        <nav className="w-56 shrink-0 border-r border-slate-800 bg-slate-900/40 p-3">
          <ul className="flex flex-col gap-1">
            {itens.map((m, i) =>
              typeof m === "string" ? (
                // título de seção só aparece se houver item visível depois dele
                typeof itens[i + 1] === "object" ? (
                  <li key={m} className="mt-3 px-3 text-xs uppercase tracking-wide text-slate-500">
                    {m}
                  </li>
                ) : null
              ) : (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    {m.rotulo}
                    {m.contador && contadores[m.contador] > 0 && (
                      <span
                        className={`rounded-full px-2 text-xs font-bold ${
                          m.contador === "contratos" && !vermelhoContratos
                            ? "bg-amber-400 text-slate-950"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {contadores[m.contador]}
                      </span>
                    )}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
        <main className="flex-1 overflow-x-auto p-6">{children}</main>
      </div>
    </>
  );
}
