"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";

/** Compra com Gold (RF39) — tudo acontece numa transação no banco */
export async function comprar(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  if (!(await perfilComPapel(["aluno"]))) return { erro: "Sem permissão." };
  const itemId = String(formData.get("item_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("comprar_item", { p_item: itemId });
  if (error) {
    if (error.message.includes("insuficiente")) return { erro: "Gold insuficiente." };
    if (error.message.includes("indisponível")) return { erro: "Item indisponível." };
    return { erro: "Não foi possível comprar." };
  }
  refresh();
  return { ok: "Comprado!" };
}
