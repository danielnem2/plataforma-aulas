"use client";

export type EstadoAula = "concluida" | "pendente" | "devolvida" | "disponivel" | "bloqueada";

export type NoMapa = {
  id: string;
  titulo: string;
  numero_missao: number;
  camada: number;
  ordem: number;
  estado?: EstadoAula;
  liberada_manualmente?: boolean;
};

export type Dependencia = { aula_id: string; depende_de_id: string };

const LARGURA_COLUNA = 220;
const ALTURA_LINHA = 110;
const MARGEM = 40;

const VISUAL: Record<EstadoAula | "neutro", { icone: string; cor: string; rotulo: string }> = {
  concluida: { icone: "✓", cor: "border-emerald-400 bg-emerald-500/20 text-emerald-200", rotulo: "Concluída" },
  disponivel: { icone: "►", cor: "border-cyan-400 bg-cyan-500/20 text-cyan-100", rotulo: "Disponível" },
  pendente: { icone: "⏳", cor: "border-amber-400 bg-amber-500/20 text-amber-100", rotulo: "Aguardando avaliação" },
  devolvida: { icone: "🔙", cor: "border-orange-400 bg-orange-500/20 text-orange-100", rotulo: "Devolvida — corrigir" },
  bloqueada: { icone: "🔒", cor: "border-slate-600 bg-slate-800/80 text-slate-500", rotulo: "Bloqueada" },
  neutro: { icone: "#", cor: "border-slate-500 bg-slate-800 text-slate-200", rotulo: "" },
};

/** Mapa de habilidades: aulas em camadas (colunas) ligadas pelas dependências */
export function MapaHabilidades({
  nos,
  dependencias,
  aoSelecionar,
}: {
  nos: NoMapa[];
  dependencias: Dependencia[];
  aoSelecionar?: (no: NoMapa) => void;
}) {
  if (!nos.length) {
    return <p className="text-slate-400">Nenhuma aula neste curso ainda.</p>;
  }

  // posição: coluna = camada, linha = ordem dentro da camada
  const camadas = [...new Set(nos.map((n) => n.camada))].sort((a, b) => a - b);
  const pos = new Map<string, { x: number; y: number }>();
  let maxLinhas = 1;
  camadas.forEach((camada, col) => {
    const daCamada = nos.filter((n) => n.camada === camada).sort((a, b) => a.ordem - b.ordem);
    maxLinhas = Math.max(maxLinhas, daCamada.length);
    daCamada.forEach((n, lin) => {
      pos.set(n.id, { x: MARGEM + col * LARGURA_COLUNA, y: MARGEM + lin * ALTURA_LINHA });
    });
  });
  const largura = MARGEM * 2 + (camadas.length - 1) * LARGURA_COLUNA + 160;
  const altura = MARGEM * 2 + (maxLinhas - 1) * ALTURA_LINHA + 60;

  return (
    <div className="overflow-auto rounded-xl border border-slate-800 bg-slate-950/70">
      <div className="relative" style={{ width: largura, height: altura }}>
        <svg className="absolute inset-0" width={largura} height={altura} aria-hidden>
          {dependencias.map((d) => {
            const de = pos.get(d.depende_de_id);
            const para = pos.get(d.aula_id);
            if (!de || !para) return null;
            const x1 = de.x + 160, y1 = de.y + 30, x2 = para.x, y2 = para.y + 30;
            const meio = (x1 + x2) / 2;
            return (
              <path
                key={`${d.depende_de_id}-${d.aula_id}`}
                d={`M${x1},${y1} C${meio},${y1} ${meio},${y2} ${x2},${y2}`}
                fill="none"
                stroke="rgb(100 116 139)"
                strokeWidth={2}
              />
            );
          })}
        </svg>
        {nos.map((n) => {
          const p = pos.get(n.id)!;
          const v = VISUAL[n.estado ?? "neutro"];
          const clicavel = aoSelecionar && n.estado !== "bloqueada";
          return (
            <button
              key={n.id}
              type="button"
              disabled={!clicavel}
              onClick={() => aoSelecionar?.(n)}
              title={v.rotulo || n.titulo}
              style={{ left: p.x, top: p.y, width: 160, height: 60 }}
              className={`absolute flex flex-col justify-center rounded-xl border-2 px-3 text-left text-sm transition ${v.cor} ${
                clicavel ? "cursor-pointer hover:scale-105" : "cursor-default"
              }`}
            >
              <span className="text-xs opacity-80">
                {v.icone} Missão #{n.numero_missao}
                {n.liberada_manualmente && " · 🔓"}
              </span>
              <span className="truncate font-semibold">{n.titulo}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LegendaMapa() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
      {(["concluida", "disponivel", "pendente", "devolvida", "bloqueada"] as EstadoAula[]).map((e) => (
        <span key={e}>
          {VISUAL[e].icone} {VISUAL[e].rotulo}
        </span>
      ))}
      <span>🔓 Liberada pelo professor</span>
    </div>
  );
}
