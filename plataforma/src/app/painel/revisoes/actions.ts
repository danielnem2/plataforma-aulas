"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";

const TIPOS = ["duvida_professor", "duvida_aluno"];

/** Professor/coordenador manda ao ADM uma dúvida sobre a missão */
export async function enviarRevisao(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel(["professor", "diretor"]);
  if (!perfil) return { erro: "Só professor e coordenação enviam dúvidas ao ADM." };

  const aulaId = String(formData.get("aula_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  if (!TIPOS.includes(tipo)) return { erro: "Escolha de quem é a dúvida." };
  if (texto.length < 5) return { erro: "Explique a dúvida (pelo menos algumas palavras)." };
  if (texto.length > 4000) return { erro: "Texto muito longo (máximo 4000 caracteres)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("revisoes_aula")
    .insert({ aula_id: aulaId, autor_id: perfil.id, tipo, texto });
  if (error) return { erro: "Não foi possível enviar." };
  refresh();
  return { ok: "Enviado ao ADM. A resposta aparece em Revisões de aulas." };
}

/** ADM responde e/ou marca como resolvida */
export async function responderRevisao(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel(["admin"]);
  if (!perfil) return { erro: "Só o ADM responde." };

  const id = String(formData.get("id") ?? "");
  const resposta = String(formData.get("resposta") ?? "").trim();
  const resolver = formData.get("resolver") === "on";
  if (!resposta && !resolver) return { erro: "Escreva uma resposta ou marque como resolvida." };
  if (resposta.length > 4000) return { erro: "Resposta muito longa (máximo 4000 caracteres)." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("revisoes_aula")
    .update({
      ...(resposta ? { resposta, respondido_por: perfil.id, respondido_em: new Date().toISOString() } : {}),
      status: resolver ? "resolvida" : "aberta",
    })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { erro: "Não foi possível salvar." };
  refresh();
  return { ok: resolver ? "Respondida e marcada como resolvida." : "Resposta enviada." };
}
