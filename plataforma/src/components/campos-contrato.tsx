"use client";

import { useState } from "react";
import { estiloInput } from "@/components/ui";
import {
  HORAS_EXPERIMENTAL,
  MESES_OPCOES,
  somarMeses,
  type TipoAcesso,
} from "@/lib/contrato";

const fmt = (data: string) => data.split("-").reverse().join("/");

/** Campos do contrato do aluno: tipo, início e duração (com prévia do vencimento) */
export function CamposContrato({
  tipo: tipoInicial = "contrato",
  data: dataInicial,
  dataHora: dataHoraInicial,
  meses: mesesInicial = 6,
  titulo = "Acesso do aluno",
}: {
  tipo?: TipoAcesso;
  data: string;
  dataHora: string;
  meses?: number;
  titulo?: string;
}) {
  const [tipo, setTipo] = useState<TipoAcesso>(tipoInicial);
  const [data, setData] = useState(dataInicial);
  const [meses, setMeses] = useState(mesesInicial);
  const opcoes = MESES_OPCOES.includes(meses) ? MESES_OPCOES : [...MESES_OPCOES, meses].sort((a, b) => a - b);

  // último dia de acesso = véspera da data de término
  const ultimoDia = (() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
    const fim = new Date(somarMeses(data, meses) + "T12:00:00Z");
    fim.setUTCDate(fim.getUTCDate() - 1);
    return fmt(fim.toISOString().slice(0, 10));
  })();

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-slate-700 p-3">
      <legend className="px-1 text-sm text-slate-300">{titulo}</legend>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="tipo_acesso" value="contrato" checked={tipo === "contrato"} onChange={() => setTipo("contrato")} />
          📄 Contrato (meses)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="tipo_acesso" value="experimental" checked={tipo === "experimental"} onChange={() => setTipo("experimental")} />
          🧪 Aula experimental ({HORAS_EXPERIMENTAL}h)
        </label>
      </div>

      {tipo === "contrato" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Data de início *
            <input name="acesso_data" type="date" required value={data} onChange={(e) => setData(e.target.value)} className={estiloInput} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Duração *
            <select name="contrato_meses" value={meses} onChange={(e) => setMeses(Number(e.target.value))} className={estiloInput}>
              {opcoes.map((m) => (
                <option key={m} value={m}>{m} {m === 1 ? "mês" : "meses"}</option>
              ))}
            </select>
          </label>
          <p className="self-end pb-2 text-sm text-slate-400">
            {ultimoDia && <>Acesso até <strong className="text-slate-200">{ultimoDia}</strong></>}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Início do acesso *
            <input name="acesso_data_hora" type="datetime-local" required defaultValue={dataHoraInicial} className={estiloInput} />
          </label>
          <p className="self-end pb-2 text-sm text-slate-400 sm:col-span-2">
            O aluno entra por {HORAS_EXPERIMENTAL} horas a partir desse horário. Depois, é só mudar para contrato.
          </p>
        </div>
      )}
    </fieldset>
  );
}
