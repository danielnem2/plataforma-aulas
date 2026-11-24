import { CircleAlert, CircleCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Tom } from "@/components/ui";

export type LinhaFalta = {
  aluno_id: string;
  nome: string;
  turma_id: string;
  turma_nome: string;
  faltas: number;
  aviso_visto: boolean;
};

/** Status por faltas seguidas: 1 = amarelo, 2+ = vermelho (RF95) — sempre com ícone + texto */
export function corFalta(faltas: number): { tom: Tom; icone: LucideIcon; fundo: string } {
  if (faltas >= 2) return { tom: "perigo", icone: CircleAlert, fundo: "bg-perigo-suave" };
  if (faltas === 1) return { tom: "aviso", icone: TriangleAlert, fundo: "bg-aviso-suave" };
  return { tom: "sucesso", icone: CircleCheck, fundo: "" };
}
