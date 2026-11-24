import "server-only";
import { redirect } from "next/navigation";
import { getPerfilAtual, type PerfilAtual } from "@/lib/supabase/server";
import type { Papel } from "@/lib/supabase/config";

/** Garante que há um usuário logado com um dos papéis; senão redireciona */
export async function exigirPapel(papeis: Papel[]): Promise<PerfilAtual> {
  const perfil = await getPerfilAtual();
  if (!perfil) redirect("/login");
  if (!papeis.includes(perfil.papel)) redirect("/");
  return perfil;
}

/** Para Server Actions: devolve o perfil ou null se não tiver permissão */
export async function perfilComPapel(
  papeis: Papel[],
): Promise<PerfilAtual | null> {
  const perfil = await getPerfilAtual();
  return perfil && papeis.includes(perfil.papel) ? perfil : null;
}
