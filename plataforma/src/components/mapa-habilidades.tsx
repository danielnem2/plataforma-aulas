"use client";

import { Check, Hourglass, Lock, LockOpen, Play, RotateCcw, Hash, type LucideIcon } from "lucide-react";
import { Icone } from "@/components/ui";

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

const VISUAL: Record<EstadoAula | "neutro", { icone: LucideIcon; cor: string; rotulo: string }> = {
  concluida: { icone: Check, cor: "border-sucesso bg-sucesso-suave text-sucesso", rotulo: "Concluída" },
  disponivel: { icone: Play, cor: "border-primaria bg-primaria-suave text-primaria-texto", rotulo: "Disponível" },
  pendente: { icone: Hourglass, cor: "border-aviso bg-aviso-suave text-aviso", rotulo: "Aguardando avaliação" },
  devolvida: { icone: RotateCcw, cor: "border-atencao bg-atencao-suave text-atencao", rotulo: "Devolvida — corrigir" },
  bloqueada: { icone: Lock, cor: "border-borda-forte bg-elevado text-texto-suave", rotulo: "Bloqueada" },
  neutro: { icone: Hash, cor: "border-borda-forte bg-elevado text-texto", rotulo: "" },
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
    return <p className="text-texto-suave">Nenhuma aula neste curso ainda.</p>;
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
    <div className="overflow-auto rounded-xl border border-borda bg-fundo">
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
                stroke="var(--borda-forte)"
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
              aria-label={`Missão ${n.numero_missao}: ${n.titulo}${v.rotulo ? " — " + v.rotulo : ""}`}
              style={{ left: p.x, top: p.y, width: 160, height: 60 }}
              className={`absolute flex flex-col justify-center rounded-xl border-2 px-3 text-left text-sm transition ${v.cor} ${
                clicavel ? "cursor-pointer hover:shadow-md" : "cursor-default"
              }`}
            >
              <span className="flex items-center gap-1 text-xs">
                <Icone icone={v.icone} tamanho={14} /> Missão {n.numero_missao}
                {n.liberada_manualmente && (
                  <>
                    <Icone icone={LockOpen} tamanho={14} className="ml-1" />
                    <span className="sr-only">liberada pelo professor</span>
                  </>
                )}
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
    <div className="flex flex-wrap gap-3 text-xs text-texto-suave">
      {(["concluida", "disponivel", "pendente", "devolvida", "bloqueada"] as EstadoAula[]).map((e) => (
        <span key={e} className="inline-flex items-center gap-1">
          <Icone icone={VISUAL[e].icone} tamanho={14} /> {VISUAL[e].rotulo}
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <Icone icone={LockOpen} tamanho={14} /> Liberada pelo professor
      </span>
    </div>
  );
}
