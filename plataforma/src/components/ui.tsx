/**
 * Peças visuais padrão (funcionam em Server e Client Components).
 * Regras: ícones só do lucide-react (mesmo traço), sempre com texto ao lado;
 * cor nunca é a única pista; cores só pelos nomes semânticos do globals.css.
 */
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

export type Tom = "neutro" | "primaria" | "sucesso" | "aviso" | "perigo" | "atencao" | "especial" | "info";

/** Fundo suave + texto da cor (etiquetas, avisos, linhas destacadas) */
export const TOM_SUAVE: Record<Tom, string> = {
  neutro: "bg-elevado text-texto-medio",
  primaria: "bg-primaria-suave text-primaria-texto",
  sucesso: "bg-sucesso-suave text-sucesso",
  aviso: "bg-aviso-suave text-aviso",
  perigo: "bg-perigo-suave text-perigo",
  atencao: "bg-atencao-suave text-atencao",
  especial: "bg-especial-suave text-especial",
  info: "bg-info-suave text-info",
};

/** Só o texto da cor */
export const TOM_TEXTO: Record<Tom, string> = {
  neutro: "text-texto-suave",
  primaria: "text-primaria-texto",
  sucesso: "text-sucesso",
  aviso: "text-aviso",
  perigo: "text-perigo",
  atencao: "text-atencao",
  especial: "text-especial",
  info: "text-info",
};

/** Fundo sólido (contador do menu, pontos) */
export const TOM_SOLIDO: Record<Tom, string> = {
  neutro: "bg-elevado-2 text-texto",
  primaria: "bg-primaria text-sobre-primaria",
  sucesso: "bg-sucesso text-sobre-cor",
  aviso: "bg-aviso text-sobre-cor",
  perigo: "bg-perigo text-sobre-cor",
  atencao: "bg-atencao text-sobre-cor",
  especial: "bg-especial text-sobre-cor",
  info: "bg-info text-sobre-cor",
};

export const estiloInput =
  "min-h-10 rounded-lg border border-borda-forte bg-superficie px-3 py-2 text-base text-texto placeholder:text-texto-suave focus:border-primaria disabled:bg-elevado disabled:text-texto-suave";

type VarianteBotao = "primario" | "secundario" | "sucesso" | "perigo" | "atencao" | "fantasma";
const VARIANTE_BOTAO: Record<VarianteBotao, string> = {
  primario: "bg-primaria text-sobre-primaria hover:bg-primaria-forte",
  secundario: "border border-borda-forte bg-superficie text-texto hover:bg-elevado",
  sucesso: "bg-sucesso text-sobre-cor hover:opacity-90",
  perigo: "bg-perigo-suave text-perigo hover:bg-perigo/20",
  atencao: "bg-atencao text-sobre-cor hover:opacity-90",
  fantasma: "text-primaria-texto hover:bg-primaria-suave",
};

/** Classes de botão padrão (também serve para <Link> com cara de botão) */
export function botao(variante: VarianteBotao = "primario", tamanho: "normal" | "pequeno" = "normal") {
  return `inline-flex min-h-10 items-center justify-center gap-2 rounded-lg font-semibold disabled:opacity-60 ${
    tamanho === "pequeno" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm"
  } ${VARIANTE_BOTAO[variante]}`;
}

/** Pílula de filtro/aba: ativa = primária, inativa = neutra */
export function pilula(ativa: boolean) {
  return `inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
    ativa ? "bg-primaria text-sobre-primaria" : "bg-elevado text-texto-medio hover:bg-elevado-2"
  }`;
}

/** Ícone padrão: tamanho e traço iguais em toda a plataforma, escondido do leitor de tela */
export function Icone({ icone: I, className = "", tamanho = 18 }: { icone: LucideIcon; className?: string; tamanho?: number }) {
  return <I aria-hidden="true" size={tamanho} strokeWidth={2} className={`shrink-0 ${className}`} />;
}

export function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-texto-medio">
      {rotulo}
      {children}
    </label>
  );
}

export function TituloPagina({
  icone,
  children,
  descricao,
}: {
  icone: LucideIcon;
  children: React.ReactNode;
  descricao?: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="flex items-center gap-3 text-2xl font-bold text-texto">
        <span className="rounded-xl bg-primaria-suave p-2 text-primaria-texto">
          <Icone icone={icone} tamanho={24} />
        </span>
        {children}
      </h1>
      {descricao && <p className="mt-2 text-sm text-texto-suave">{descricao}</p>}
    </div>
  );
}

export function Cartao({
  titulo,
  icone,
  children,
  className = "",
}: {
  titulo?: React.ReactNode;
  icone?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-borda bg-superficie p-5 shadow-sm ${className}`}>
      {titulo && (
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-texto">
          {icone && <Icone icone={icone} className="text-primaria-texto" />}
          {titulo}
        </h2>
      )}
      {children}
    </section>
  );
}

/** Etiqueta de status: ícone + texto + cor (nunca só a cor) */
export function Etiqueta({
  tom = "neutro",
  icone,
  children,
  className = "",
}: {
  tom?: Tom;
  icone?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TOM_SUAVE[tom]} ${className}`}>
      {icone && <Icone icone={icone} tamanho={14} />}
      {children}
    </span>
  );
}

export function Selo({ ativo, sim = "Ativa", nao = "Inativa" }: { ativo: boolean; sim?: string; nao?: string }) {
  return <Etiqueta tom={ativo ? "sucesso" : "neutro"}>{ativo ? sim : nao}</Etiqueta>;
}

/** Caixa de aviso com ícone (informação, alerta, erro...) */
export function Aviso({
  tom = "info",
  icone,
  children,
  className = "",
}: {
  tom?: Tom;
  icone?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${TOM_SUAVE[tom]} ${className}`}>
      {icone && <Icone icone={icone} className="mt-0.5" />}
      <div>{children}</div>
    </div>
  );
}

/** Número em destaque (painéis) */
export function Indicador({
  valor,
  rotulo,
  icone,
  tom = "primaria",
}: {
  valor: React.ReactNode;
  rotulo: React.ReactNode;
  icone?: LucideIcon;
  tom?: Tom;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-borda bg-superficie p-4 shadow-sm">
      {icone && (
        <span className={`rounded-xl p-2 ${TOM_SUAVE[tom]}`}>
          <Icone icone={icone} tamanho={20} />
        </span>
      )}
      <div>
        <p className="text-2xl font-bold text-texto">{valor}</p>
        <p className="text-sm text-texto-suave">{rotulo}</p>
      </div>
    </div>
  );
}

/** Bloco "Editar" que abre/fecha sem JavaScript */
export function Expansivel({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="inline-flex min-h-10 list-none items-center gap-1 rounded-lg px-2 text-sm font-medium text-primaria-texto hover:bg-primaria-suave [&::-webkit-details-marker]:hidden">
        <Icone icone={ChevronDown} tamanho={16} className="transition-transform group-open:rotate-180" />
        {rotulo}
      </summary>
      <div className="mt-3 rounded-xl border border-borda bg-fundo p-4">{children}</div>
    </details>
  );
}
