"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { statusContrato, type DadosContrato } from "@/lib/contrato";

export type EstadoLogin = { erro?: string };

export async function entrar(
  _anterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) return { erro: "E-mail ou senha incorretos." };

  // Aluno só entra dentro do período do contrato / aula experimental
  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel, tipo_acesso, acesso_inicio, acesso_fim, contrato_meses")
    .eq("id", data.user.id)
    .single();
  if (perfil?.papel === "aluno") {
    const st = statusContrato(perfil as DadosContrato);
    if (st.situacao === "a_comecar" || st.situacao === "vencido") {
      await supabase.auth.signOut();
      return {
        erro:
          st.situacao === "a_comecar"
            ? `Seu acesso ${st.texto}. Até lá!`
            : perfil.tipo_acesso === "experimental"
              ? "Sua aula experimental terminou. Fale com a coordenação para continuar."
              : "Seu contrato venceu. Fale com a coordenação para renovar.",
      };
    }
  }

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
