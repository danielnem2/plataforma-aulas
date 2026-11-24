"use client";

import { ChartColumn, Map as MapIcon, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "@/components/ui";

const MENU = [
  { href: "/aluno", rotulo: "Mapa do Mundo", icone: MapIcon },
  { href: "/aluno/estatisticas", rotulo: "Minhas Estatísticas", icone: ChartColumn },
  { href: "/aluno/loja", rotulo: "Loja", icone: ShoppingBag },
];

/** Menu do aluno: poucas opções, grandes e sempre no mesmo lugar */
export function MenuAluno() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu do aluno" className="border-b border-borda bg-superficie px-6 py-2">
      <ul className="flex flex-wrap gap-2">
        {MENU.map((m) => {
          const atual = m.href === "/aluno" ? pathname === "/aluno" : pathname.startsWith(m.href);
          return (
            <li key={m.href}>
              <Link
                href={m.href}
                aria-current={atual ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm ${
                  atual
                    ? "bg-primaria-suave font-semibold text-primaria-texto"
                    : "text-texto-medio hover:bg-elevado hover:text-texto"
                }`}
              >
                <Icone icone={m.icone} />
                {m.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
