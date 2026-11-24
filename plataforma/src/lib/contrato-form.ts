import "server-only";
import { calcularPeriodo, type TipoAcesso } from "@/lib/contrato";

/** Lê os campos de <CamposContrato> e devolve as colunas do perfil (ou a mensagem de erro) */
export function lerContrato(formData: FormData) {
  const tipo = String(formData.get("tipo_acesso") ?? "contrato") as TipoAcesso;
  if (tipo !== "contrato" && tipo !== "experimental") return "Tipo de acesso inválido.";
  const periodo = calcularPeriodo(tipo, {
    data: String(formData.get("acesso_data") ?? ""),
    dataHora: String(formData.get("acesso_data_hora") ?? ""),
    meses: Number(formData.get("contrato_meses") ?? 0),
  });
  if (typeof periodo === "string") return periodo;
  return {
    tipo_acesso: tipo,
    acesso_inicio: periodo.inicio.toISOString(),
    acesso_fim: periodo.fim.toISOString(),
    contrato_meses: periodo.meses,
  };
}

export const SEM_CONTRATO = {
  tipo_acesso: null,
  acesso_inicio: null,
  acesso_fim: null,
  contrato_meses: null,
};
