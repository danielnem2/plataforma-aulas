/**
 * Contrato do aluno (tempo de acesso).
 * - contrato: N meses a partir da data de início (00:00 de Brasília)
 * - experimental: 24 horas a partir do início
 * Aviso no painel: amarelo faltando 1 mês, vermelho faltando 1 semana.
 */

export type TipoAcesso = "contrato" | "experimental";

export type DadosContrato = {
  tipo_acesso: TipoAcesso | null;
  acesso_inicio: string | null;
  acesso_fim: string | null;
  contrato_meses: number | null;
};

export const HORAS_EXPERIMENTAL = 24;
export const DIAS_AVISO_AMARELO = 30;
export const DIAS_AVISO_VERMELHO = 7;
export const MESES_OPCOES = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24];

const DIA_MS = 24 * 60 * 60 * 1000;
const FUSO = "America/Sao_Paulo";
const OFFSET = "-03:00"; // Brasília (sem horário de verão desde 2019)

/** "2026-11-24" → instante 00:00 em Brasília */
export function inicioDoDia(data: string) {
  return new Date(`${data}T00:00:00${OFFSET}`);
}

/** "2026-11-24T14:30" (datetime-local) → instante em Brasília */
export function dataHoraLocal(valor: string) {
  return new Date(`${valor.length === 16 ? valor + ":00" : valor}${OFFSET}`);
}

/** Data de hoje em Brasília, "AAAA-MM-DD" */
export function hojeLocal(agora = new Date()) {
  return agora.toLocaleDateString("en-CA", { timeZone: FUSO });
}

/** Agora em Brasília no formato do input datetime-local */
export function agoraLocalInput(agora = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(agora);
  const v = (t: string) => p.find((x) => x.type === t)?.value;
  return `${v("year")}-${v("month")}-${v("day")}T${v("hour")}:${v("minute")}`;
}

/** Instante → "AAAA-MM-DD" / "AAAA-MM-DDTHH:mm" em Brasília (para preencher inputs) */
export const paraInputData = (iso: string) => hojeLocal(new Date(iso));
export const paraInputDataHora = (iso: string) => agoraLocalInput(new Date(iso));

/** Soma meses a "AAAA-MM-DD" (31/01 + 1 mês = 28/02) */
export function somarMeses(data: string, meses: number) {
  const [a, m, d] = data.split("-").map(Number);
  const total = m - 1 + meses;
  const ano = a + Math.floor(total / 12);
  const mes = total % 12; // 0-11
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const dia = Math.min(d, ultimoDia);
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Calcula início/fim a partir do que veio do formulário */
export function calcularPeriodo(
  tipo: TipoAcesso,
  entrada: { data?: string; dataHora?: string; meses?: number },
): { inicio: Date; fim: Date; meses: number | null } | string {
  if (tipo === "experimental") {
    if (!entrada.dataHora || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(entrada.dataHora)) {
      return "Informe a data e hora da aula experimental.";
    }
    const inicio = dataHoraLocal(entrada.dataHora);
    if (isNaN(inicio.getTime())) return "Data/hora inválida.";
    return { inicio, fim: new Date(inicio.getTime() + HORAS_EXPERIMENTAL * 60 * 60 * 1000), meses: null };
  }
  if (!entrada.data || !/^\d{4}-\d{2}-\d{2}$/.test(entrada.data)) return "Informe a data de início.";
  const meses = Math.trunc(entrada.meses ?? 0);
  if (!(meses >= 1 && meses <= 60)) return "Informe a duração do contrato (1 a 60 meses).";
  const inicio = inicioDoDia(entrada.data);
  if (isNaN(inicio.getTime())) return "Data de início inválida.";
  return { inicio, fim: inicioDoDia(somarMeses(entrada.data, meses)), meses };
}

export type Situacao = "sem_contrato" | "a_comecar" | "em_dia" | "vence_mes" | "vence_semana" | "vencido";

export type StatusContrato = {
  situacao: Situacao;
  /** dias (contrato) que faltam para vencer, arredondado para cima */
  diasRestantes: number | null;
  /** horas que faltam (útil para experimental) */
  horasRestantes: number | null;
  /** texto curto: "faltam 12 dias", "vence hoje", "vencido há 3 dias" */
  texto: string;
  /** último dia de acesso, dd/mm/aaaa */
  ultimoDia: string | null;
};

const fmtData = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: FUSO });
const fmtDataHora = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" });

export function statusContrato(c: DadosContrato, agora = new Date()): StatusContrato {
  if (!c.acesso_fim) {
    return { situacao: "sem_contrato", diasRestantes: null, horasRestantes: null, texto: "sem contrato cadastrado", ultimoDia: null };
  }
  const fim = new Date(c.acesso_fim);
  const inicio = c.acesso_inicio ? new Date(c.acesso_inicio) : null;
  const experimental = c.tipo_acesso === "experimental";
  const ultimoDia = experimental ? fmtDataHora(fim) : fmtData(new Date(fim.getTime() - 1));
  const resta = fim.getTime() - agora.getTime();
  const horas = Math.ceil(resta / (60 * 60 * 1000));
  const dias = Math.ceil(resta / DIA_MS);

  if (inicio && inicio.getTime() > agora.getTime()) {
    return {
      situacao: "a_comecar", diasRestantes: dias, horasRestantes: horas, ultimoDia,
      texto: `começa em ${experimental ? fmtDataHora(inicio) : fmtData(inicio)}`,
    };
  }
  if (resta <= 0) {
    const ha = Math.floor(-resta / DIA_MS);
    return {
      situacao: "vencido", diasRestantes: 0, horasRestantes: 0, ultimoDia,
      texto: ha === 0 ? "venceu hoje" : `vencido há ${ha} dia(s)`,
    };
  }
  const situacao: Situacao =
    dias <= DIAS_AVISO_VERMELHO ? "vence_semana" : dias <= DIAS_AVISO_AMARELO ? "vence_mes" : "em_dia";
  const texto = experimental || horas <= 24
    ? `faltam ${horas} hora(s)`
    : `faltam ${dias} dia(s)`;
  return { situacao, diasRestantes: dias, horasRestantes: horas, texto, ultimoDia };
}

/** O aluno pode entrar agora? (contrato sem datas = acesso liberado) */
export function acessoLiberado(c: DadosContrato, agora = new Date()) {
  const s = statusContrato(c, agora).situacao;
  return s !== "a_comecar" && s !== "vencido";
}

export const COR_SITUACAO: Record<Situacao, { fundo: string; texto: string; selo: string; rotulo: string }> = {
  vence_semana: { fundo: "bg-red-500/15", texto: "text-red-300", selo: "🔴", rotulo: "Vence em até 1 semana" },
  vence_mes: { fundo: "bg-amber-500/15", texto: "text-amber-300", selo: "🟡", rotulo: "Vence em até 1 mês" },
  em_dia: { fundo: "", texto: "text-emerald-300", selo: "🟢", rotulo: "Em dia" },
  a_comecar: { fundo: "", texto: "text-sky-300", selo: "🔵", rotulo: "Ainda não começou" },
  vencido: { fundo: "bg-slate-700/30", texto: "text-slate-400", selo: "⚫", rotulo: "Vencido" },
  sem_contrato: { fundo: "", texto: "text-slate-400", selo: "⚪", rotulo: "Sem contrato" },
};

export const ROTULO_TIPO_ACESSO: Record<TipoAcesso, string> = {
  contrato: "📄 Contrato",
  experimental: "🧪 Aula experimental",
};
