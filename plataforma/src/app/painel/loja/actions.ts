"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { TIPOS_ITEM, type TipoItem } from "@/lib/loja";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";

type NovoItem = {
  escola_id: string;
  nome: string;
  descricao: string | null;
  tipo: TipoItem;
  preco_gold: number;
  horas: number | null;
  imagem_path: string | null;
  arquivo_path: string | null;
};

/** Cria item da loja. Os arquivos já foram enviados ao Storage pelo navegador. */
export async function criarItemLoja(item: NovoItem): Promise<EstadoAcao> {
  const perfil = await perfilComPapel(["admin", "diretor"]);
  if (!perfil) return { erro: "Sem permissão." };

  const escolaId = perfil.papel === "diretor" ? perfil.escola_id : item.escola_id;
  if (!escolaId) return { erro: "Escolha a escola." };
  if (!item.nome.trim()) return { erro: "Informe o nome." };
  if (!TIPOS_ITEM.includes(item.tipo)) return { erro: "Tipo inválido." };
  if (!(item.preco_gold > 0)) return { erro: "O preço precisa ser maior que zero." };
  const ehHoras = item.tipo === "horas_gaming";
  if (ehHoras && !(Number(item.horas) > 0)) return { erro: "Informe quantas horas." };
  if (!ehHoras && !item.arquivo_path) return { erro: "Envie o arquivo do item." };
  // arquivos precisam estar na pasta da escola
  for (const p of [item.imagem_path, item.arquivo_path]) {
    if (p && !p.startsWith(`${escolaId}/`)) return { erro: "Arquivo enviado para a pasta errada." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("loja_itens").insert({
    escola_id: escolaId,
    nome: item.nome.trim(),
    descricao: item.descricao?.trim() || null,
    tipo: item.tipo,
    preco_gold: Math.trunc(item.preco_gold),
    horas: ehHoras ? Number(item.horas) : null,
    imagem_path: item.imagem_path,
    arquivo_path: ehHoras ? null : item.arquivo_path,
  });
  if (error) return { erro: "Não foi possível criar o item." };
  refresh();
  return { ok: `Item "${item.nome}" criado.` };
}

export async function editarItemLoja(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  if (!(await perfilComPapel(["admin", "diretor"]))) return { erro: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const preco = Math.trunc(Number(formData.get("preco_gold") ?? 0));
  if (!nome) return { erro: "Informe o nome." };
  if (!(preco > 0)) return { erro: "O preço precisa ser maior que zero." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loja_itens")
    .update({
      nome,
      descricao: String(formData.get("descricao") ?? "").trim() || null,
      preco_gold: preco,
      ativo: formData.get("ativo") === "on",
    })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { erro: "Sem permissão." };
  refresh();
  return { ok: "Salvo." };
}
