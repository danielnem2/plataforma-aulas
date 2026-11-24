export type LinhaFalta = {
  aluno_id: string;
  nome: string;
  turma_id: string;
  turma_nome: string;
  faltas: number;
  aviso_visto: boolean;
};

/** Cor por faltas seguidas: 1 = amarelo, 2+ = vermelho (RF95) */
export function corFalta(faltas: number) {
  if (faltas >= 2) return { fundo: "bg-red-500/15", texto: "text-red-300", selo: "🔴" };
  if (faltas === 1) return { fundo: "bg-amber-500/15", texto: "text-amber-300", selo: "🟡" };
  return { fundo: "", texto: "text-slate-400", selo: "🟢" };
}
