"use client";

import { BookOpen, CalendarOff, ChevronDown, ClipboardCheck, FileText, Gamepad2, GraduationCap, House, Layers, type LucideIcon, MessagesSquare, PanelLeftClose, PanelLeftOpen, School, ShoppingBag, TriangleAlert, UserRoundSearch, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { Icone } from "@/components/ui";
import type { Papel } from "@/lib/supabase/config";

export type Contador = "submissoes" | "compras" | "faltas" | "contratos" | "revisoes";
export type Contadores = Record<Contador, { valor: number; urgente: boolean }>;

type Item = { href: string; rotulo: string; icone: LucideIcon; papeis: Papel[]; contador?: Contador };
type Secao = { id: string; titulo: string; itens: Item[] };

const EQUIPE: Papel[] = ["admin", "diretor", "professor"];

const INICIO: Item = { href: "/painel", rotulo: "Início", icone: House, papeis: EQUIPE };

const SECOES: Secao[] = [
  {
    id: "acompanhamento",
    titulo: "Acompanhamento",
    itens: [
      { href: "/painel/submissoes", rotulo: "Submissões", icone: ClipboardCheck, papeis: EQUIPE, contador: "submissoes" },
      { href: "/painel/alunos", rotulo: "Alunos", icone: UserRoundSearch, papeis: EQUIPE },
      { href: "/painel/faltas", rotulo: "Faltas", icone: TriangleAlert, papeis: EQUIPE, contador: "faltas" },
      { href: "/painel/contratos", rotulo: "Contratos", icone: FileText, papeis: EQUIPE, contador: "contratos" },
      { href: "/painel/compras", rotulo: "Compras de horas", icone: Gamepad2, papeis: EQUIPE, contador: "compras" },
    ],
  },
  {
    id: "conteudo",
    titulo: "Conteúdo",
    itens: [
      { href: "/painel/aulas", rotulo: "Aulas", icone: BookOpen, papeis: EQUIPE },
      { href: "/painel/cursos", rotulo: "Cursos", icone: GraduationCap, papeis: ["admin"] },
      { href: "/painel/revisoes", rotulo: "Revisões de aulas", icone: MessagesSquare, papeis: EQUIPE, contador: "revisoes" },
      { href: "/painel/loja", rotulo: "Loja", icone: ShoppingBag, papeis: ["admin", "diretor"] },
    ],
  },
  {
    id: "gestao",
    titulo: "Gestão",
    itens: [
      { href: "/painel/escolas", rotulo: "Escolas", icone: School, papeis: ["admin"] },
      { href: "/painel/turmas", rotulo: "Turmas", icone: Layers, papeis: ["admin", "diretor"] },
      { href: "/painel/usuarios", rotulo: "Usuários", icone: Users, papeis: ["admin", "diretor"] },
      { href: "/painel/calendario", rotulo: "Dias sem aula", icone: CalendarOff, papeis: EQUIPE },
    ],
  },
];

const CHAVE = "menu-painel";

function lerPreferencia() {
  try {
    return localStorage.getItem(CHAVE) ?? "{}";
  } catch {
    return "{}";
  }
}

function assinarPreferencia(aviso: () => void) {
  window.addEventListener(CHAVE, aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener(CHAVE, aviso);
    window.removeEventListener("storage", aviso);
  };
}

function ativo(pathname: string, href: string) {
  return href === "/painel" ? pathname === "/painel" : pathname === href || pathname.startsWith(href + "/");
}

function Contagem({ c, compacto = false }: { c?: { valor: number; urgente: boolean }; compacto?: boolean }) {
  if (!c || c.valor <= 0) return null;
  return (
    <span
      className={`rounded-full text-xs font-bold ${compacto ? "absolute -right-1 -top-1 px-1.5" : "px-2"} ${
        c.urgente ? "bg-perigo text-sobre-cor" : "bg-aviso text-sobre-cor"
      }`}
    >
      {c.valor}
      <span className="sr-only"> pendente(s)</span>
    </span>
  );
}

/** Menu do painel: seções recolhíveis e menu inteiro recolhível (só ícones). Lembra a escolha. */
export function MenuLateral({ papel, contadores }: { papel: Papel; contadores: Contadores }) {
  const pathname = usePathname();
  const secoes = SECOES.map((s) => ({ ...s, itens: s.itens.filter((i) => i.papeis.includes(papel)) })).filter(
    (s) => s.itens.length,
  );

  // Preferência salva no navegador (no servidor, tudo aberto)
  const bruto = useSyncExternalStore(assinarPreferencia, lerPreferencia, () => "{}");
  const { fechadas, recolhido } = useMemo(() => {
    try {
      const p = JSON.parse(bruto);
      return {
        fechadas: Array.isArray(p.fechadas) ? (p.fechadas as string[]) : [],
        recolhido: p.recolhido === true,
      };
    } catch {
      return { fechadas: [] as string[], recolhido: false };
    }
  }, [bruto]);

  const salvar = (f: string[], r: boolean) => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ fechadas: f, recolhido: r }));
    } catch {}
    window.dispatchEvent(new Event(CHAVE));
  };

  const linkItem = (i: Item) => {
    const atual = ativo(pathname, i.href);
    const c = i.contador ? contadores[i.contador] : undefined;
    return (
      <li key={i.href}>
        <Link
          href={i.href}
          aria-current={atual ? "page" : undefined}
          title={recolhido ? i.rotulo : undefined}
          className={`relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm ${
            atual
              ? "bg-primaria-suave font-semibold text-primaria-texto"
              : "text-texto-medio hover:bg-elevado hover:text-texto"
          } ${recolhido ? "justify-center" : ""}`}
        >
          {atual && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-full bg-primaria" />}
          <Icone icone={i.icone} />
          {recolhido ? <span className="sr-only">{i.rotulo}</span> : <span className="flex-1">{i.rotulo}</span>}
          <Contagem c={c} compacto={recolhido} />
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Menu do painel"
      className={`shrink-0 border-r border-borda bg-superficie p-3 ${recolhido ? "w-[4.5rem]" : "w-60"}`}
    >
      <button
        type="button"
        onClick={() => salvar(fechadas, !recolhido)}
        aria-expanded={!recolhido}
        className={`mb-2 flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-texto-suave hover:bg-elevado hover:text-texto ${
          recolhido ? "justify-center" : ""
        }`}
      >
        <Icone icone={recolhido ? PanelLeftOpen : PanelLeftClose} />
        {recolhido ? <span className="sr-only">Mostrar menu</span> : "Recolher menu"}
      </button>

      <ul className="flex flex-col gap-1">{linkItem(INICIO)}</ul>

      {secoes.map((s) => {
        const aberta = recolhido || !fechadas.includes(s.id) || s.itens.some((i) => ativo(pathname, i.href));
        // ao fechar a seção, o total pendente aparece no título (o aviso não some)
        const pendentes = s.itens.reduce(
          (acc, i) => {
            const c = i.contador ? contadores[i.contador] : undefined;
            return c && c.valor > 0 ? { valor: acc.valor + c.valor, urgente: acc.urgente || c.urgente } : acc;
          },
          { valor: 0, urgente: false },
        );
        return (
          <div key={s.id} className={recolhido ? "mt-3 border-t border-borda pt-3" : "mt-4"}>
            {!recolhido && (
              <button
                type="button"
                aria-expanded={aberta}
                aria-controls={`secao-${s.id}`}
                onClick={() =>
                  salvar(aberta ? [...fechadas, s.id] : fechadas.filter((f) => f !== s.id), recolhido)
                }
                className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-xs font-semibold uppercase tracking-wider text-texto-suave hover:bg-elevado hover:text-texto"
              >
                <span className="flex-1 text-left">{s.titulo}</span>
                {!aberta && <Contagem c={pendentes} />}
                <Icone icone={ChevronDown} tamanho={16} className={`transition-transform ${aberta ? "rotate-180" : ""}`} />
              </button>
            )}
            {aberta && (
              <ul id={`secao-${s.id}`} className="mt-1 flex flex-col gap-1">
                {s.itens.map(linkItem)}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
