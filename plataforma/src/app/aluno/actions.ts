"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";

const HOSTS_ACEITOS = [
  "drive.google.com",
  "docs.google.com",
  "dropbox.com",
  "www.dropbox.com",
  "github.com",
  "gist.github.com",
  "onedrive.live.com",
  "1drv.ms",
];

/** Aluno envia o link da tarefa de uma aula (RF26/RF65) */
export async function enviarTarefa(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  if (!(await perfilComPapel(["aluno"]))) return { erro: "Sem permissão." };
  const aulaId = String(formData.get("aula_id") ?? "");
  const link = String(formData.get("link") ?? "").trim();

  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return { erro: "Cole um link válido (começando com https://)." };
  }
  if (url.protocol !== "https:" || !HOSTS_ACEITOS.includes(url.hostname)) {
    return { erro: "Use um link público do Google Drive, Dropbox, GitHub ou OneDrive." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("enviar_submissao", { p_aula: aulaId, p_link: link });
  if (error) {
    const msg = error.message;
    if (msg.includes("aguardando")) return { erro: "Você já enviou esta tarefa. Aguarde a avaliação." };
    if (msg.includes("concluída")) return { erro: "Esta aula já foi concluída." };
    if (msg.includes("bloqueada")) return { erro: "Esta aula ainda está bloqueada." };
    return { erro: "Não foi possível enviar. Tente de novo." };
  }

  refresh();
  return { ok: "Tarefa enviada! Agora é só aguardar a avaliação." };
}
