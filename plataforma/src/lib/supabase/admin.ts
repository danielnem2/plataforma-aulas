import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Cliente com a chave secreta — ignora RLS.
 * Usar SÓ para operações de login (criar usuário, trocar senha),
 * sempre depois de conferir a permissão de quem pediu.
 */
export function createAdminClient() {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) {
    throw new Error(
      "SUPABASE_SECRET_KEY não configurada no .env.local (Supabase > Project Settings > API Keys > Secret key).",
    );
  }
  return createClient(SUPABASE_URL, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
