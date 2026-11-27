import "server-only";
import { AplicarModoEscola } from "@/components/aplicar-modo-escola";
import { createClient } from "@/lib/supabase/server";
import { cssTemaEscola, urlLogo, type TemaEscola } from "@/lib/tema-escola";

export type MarcaEscola = { nome: string; logo: string | null };

/** Lê o tema da escola do usuário (admin sem escola → visual padrão) */
export async function carregarTemaEscola(escolaId: string | null) {
  if (!escolaId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("escolas")
    .select("nome, tema_cor, tema_fundo, tema_modo, tema_nome, logo_path")
    .eq("id", escolaId)
    .maybeSingle();
  if (!data) return null;
  const tema = data as TemaEscola & { nome: string };
  return {
    tema,
    marca: { nome: tema.tema_nome || tema.nome, logo: urlLogo(tema.logo_path) } satisfies MarcaEscola,
  };
}

/** Injeta as cores da escola e aplica o modo padrão dela (claro/escuro) */
export function EstiloEscola({ tema }: { tema: TemaEscola }) {
  const css = cssTemaEscola(tema);
  return (
    <>
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <AplicarModoEscola modo={tema.tema_modo} />
    </>
  );
}
