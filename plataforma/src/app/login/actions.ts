"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoLogin = { erro?: string };

export async function entrar(
  _anterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) return { erro: "E-mail ou senha incorretos." };

  // Grava a hora do login (sessão de 2h) e a presença do dia do aluno (RF79)
  const { error: erroRegistro } = await supabase.rpc("registrar_login");
  if (erroRegistro) {
    await supabase.auth.signOut();
    return { erro: "Não foi possível iniciar a sessão. Fale com a secretaria." };
  }

  redirect("/");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
