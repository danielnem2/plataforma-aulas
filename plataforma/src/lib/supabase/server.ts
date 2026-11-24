import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, type Papel } from "./config";

/** Cliente Supabase para Server Components e Server Actions */
export async function createClient() {
  // Dados do usuário são sempre por requisição (nunca pré-renderizados)
  await connection();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de um Server Component: o proxy já renova a sessão.
        }
      },
    },
  });
}

export type PerfilAtual = {
  id: string;
  nome: string;
  papel: Papel;
  escola_id: string | null;
  turma_id: string | null;
  gold_saldo: number;
  ultimo_login_em: string | null;
};

/** Perfil do usuário logado (ou null) */
export async function getPerfilAtual(): Promise<PerfilAtual | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("perfis")
    .select("id, nome, papel, escola_id, turma_id, gold_saldo, ultimo_login_em")
    .eq("id", user.id)
    .single();

  return data as PerfilAtual | null;
}
