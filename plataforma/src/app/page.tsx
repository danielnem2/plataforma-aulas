import { redirect } from "next/navigation";
import { getPerfilAtual } from "@/lib/supabase/server";

export const instant = false;

/** Página inicial: manda cada papel para a sua área */
export default async function Home() {
  const perfil = await getPerfilAtual();
  if (!perfil) redirect("/login");
  redirect(perfil.papel === "aluno" ? "/aluno" : "/painel");
}
