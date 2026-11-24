"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";

/** Professor marca que avisou a Gaming House (RF89) */
export async function marcarAvisado(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  if (!(await perfilComPapel(["admin", "diretor", "professor"]))) return { erro: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("marcar_compra_avisada", { p_compra: id });
  if (error) return { erro: "Não foi possível marcar." };
  refresh();
  return { ok: "Avisado ✅" };
}
