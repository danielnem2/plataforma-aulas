/**
 * Tema da escola: a partir da cor da marca gera as variáveis de cor da plataforma
 * (modo claro e escuro), ajustando tons para manter o contraste WCAG AA (≥ 4,5:1).
 */

export type TemaEscola = {
  tema_cor: string | null;
  tema_fundo: "padrao" | "preto_branco";
  tema_modo: "claro" | "escuro";
  tema_nome: string | null;
  logo_path: string | null;
};

type RGB = [number, number, number];

const paraRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const paraHex = (c: RGB) =>
  "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

function luminancia(hex: string) {
  const [r, g, b] = paraRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Mistura a cor com outra (t = 0 → a, t = 1 → b) */
function misturar(a: string, b: string, t: number) {
  const [ca, cb] = [paraRgb(a), paraRgb(b)];
  return paraHex(ca.map((v, i) => v + (cb[i] - v) * t) as RGB);
}

/** Escurece (ou clareia) a cor até ter contraste mínimo com o fundo */
function ajustarContraste(cor: string, fundo: string, minimo = 4.5) {
  const alvo = luminancia(fundo) > 0.4 ? "#000000" : "#ffffff";
  let c = cor;
  for (let t = 0; t <= 1 && contraste(c, fundo) < minimo; t += 0.04) c = misturar(cor, alvo, t);
  return c;
}

/** Fundos neutros "preto e branco" (o estilo padrão vem do globals.css) */
const PRETO_BRANCO = {
  claro: {
    fundo: "#f6f6f5", superficie: "#ffffff", elevado: "#efefee", "elevado-2": "#e4e4e3",
    borda: "#dcdcdb", "borda-forte": "#858583", texto: "#111111", "texto-medio": "#2b2b2b", "texto-suave": "#5a5a58",
  },
  escuro: {
    fundo: "#0a0a0a", superficie: "#141414", elevado: "#1d1d1d", "elevado-2": "#272727",
    borda: "#2e2e2e", "borda-forte": "#7a7a78", texto: "#f9f7f4", "texto-medio": "#e6e4e0", "texto-suave": "#a9a7a3",
  },
};

/** Superfície usada como referência de contraste em cada modo, quando o fundo é o padrão */
const SUPERFICIE_PADRAO = { claro: "#fbfaf6", escuro: "#252526" };

function variaveisPrimarias(cor: string, superficie: string, modo: "claro" | "escuro") {
  const sobre = contraste("#0a0a0a", cor) >= contraste("#ffffff", cor) ? "#0a0a0a" : "#ffffff";
  const forte = misturar(cor, modo === "claro" ? "#000000" : "#ffffff", 0.12);
  const suave = misturar(cor, superficie, modo === "claro" ? 0.86 : 0.78);
  // texto/link na cor da marca: legível tanto na superfície quanto no fundo "suave"
  let texto = ajustarContraste(cor, superficie);
  texto = ajustarContraste(texto, suave);
  return {
    primaria: cor,
    "primaria-forte": forte,
    "primaria-texto": texto,
    "primaria-suave": suave,
    "sobre-primaria": sobre,
  };
}

const bloco = (seletor: string, vars: Record<string, string>) =>
  `${seletor}{${Object.entries(vars)
    .map(([k, v]) => `--${k}:${v}`)
    .join(";")}}`;

/**
 * CSS do tema. O modo padrão da escola vale enquanto a pessoa não escolher outro
 * no botão do topo (data-tema="claro" | "escuro").
 */
export function cssTemaEscola(t: TemaEscola) {
  if (!t.tema_cor && t.tema_fundo === "padrao" && t.tema_modo === "claro") return "";
  const partes: string[] = [];

  for (const modo of ["claro", "escuro"] as const) {
    const neutros = t.tema_fundo === "preto_branco" ? PRETO_BRANCO[modo] : null;
    const superficie = neutros?.superficie ?? SUPERFICIE_PADRAO[modo];
    const vars: Record<string, string> = {
      ...(neutros ?? {}),
      ...(t.tema_cor ? variaveisPrimarias(t.tema_cor.toLowerCase(), superficie, modo) : {}),
    };
    if (!Object.keys(vars).length) continue;

    // modo padrão da escola: vale sem escolha; o outro só com escolha explícita
    const seletor =
      modo === t.tema_modo
        ? `:root:not([data-tema="${modo === "claro" ? "escuro" : "claro"}"])`
        : `:root[data-tema="${modo}"]`;
    partes.push(bloco(seletor, vars));
  }

  // escuro como padrão: herda os neutros escuros do globals.css quando o fundo é o padrão
  if (t.tema_modo === "escuro" && t.tema_fundo === "padrao") {
    partes.unshift(
      bloco(':root:not([data-tema="claro"])', {
        fundo: "#1e1e1e", superficie: "#252526", elevado: "#2d2d30", "elevado-2": "#37373d",
        borda: "#3c3c3c", "borda-forte": "#7a7a7a", texto: "#d4d4d4", "texto-medio": "#cccccc", "texto-suave": "#a6a6a6",
        sucesso: "#89d185", "sucesso-suave": "#1f3523", aviso: "#cca700", "aviso-suave": "#3a3214",
        perigo: "#f48771", "perigo-suave": "#4b2522", atencao: "#ce9178", "atencao-suave": "#3f2c22",
        especial: "#c586c0", "especial-suave": "#3b2a3a", info: "#4ec9b0", "info-suave": "#1d3b36",
        "sobre-cor": "#1e1e1e", sobreposicao: "rgb(0 0 0 / 0.6)", "color-scheme": "dark",
      }),
    );
  }
  // preto e branco escuro também precisa das cores de status escuras
  if (t.tema_fundo === "preto_branco") {
    const statusEscuro = {
      sucesso: "#89d185", "sucesso-suave": "#1f3523", aviso: "#cca700", "aviso-suave": "#3a3214",
      perigo: "#f48771", "perigo-suave": "#4b2522", atencao: "#ce9178", "atencao-suave": "#3f2c22",
      especial: "#c586c0", "especial-suave": "#3b2a3a", info: "#4ec9b0", "info-suave": "#1d3b36",
      "sobre-cor": "#0a0a0a", sobreposicao: "rgb(0 0 0 / 0.6)", "color-scheme": "dark",
    };
    partes.push(
      bloco(t.tema_modo === "escuro" ? ':root:not([data-tema="claro"])' : ':root[data-tema="escuro"]', statusEscuro),
    );
  }
  return partes.join("\n").replace(/--color-scheme:(\w+)/g, "color-scheme:$1");
}

/** URL pública do logo */
export function urlLogo(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/escolas-logos/${path}`;
}
