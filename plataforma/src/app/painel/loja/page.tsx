import { ShoppingBag, Plus, List } from "lucide-react";
import { FormAcao } from "@/components/form-acao";
import { Campo, Cartao, estiloInput, Expansivel, Icone, Selo, TituloPagina } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { ICONE_TIPO, ROTULO_TIPO, urlImagem, type TipoItem } from "@/lib/loja";
import { createClient } from "@/lib/supabase/server";
import { editarItemLoja } from "./actions";
import { NovoItemForm } from "./novo-item-form";

export const metadata = { title: "Loja" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

export default async function LojaGestaoPage() {
  const perfil = await exigirPapel(["admin", "diretor"]);
  const supabase = await createClient();

  const [{ data: escolas }, { data: itens }, { data: compras }] = await Promise.all([
    supabase.from("escolas").select("id, nome").order("nome"),
    supabase
      .from("loja_itens")
      .select("id, escola_id, nome, descricao, tipo, preco_gold, horas, imagem_path, arquivo_path, ativo")
      .order("criado_em", { ascending: false }),
    supabase.from("compras").select("item_id"),
  ]);
  const nomeEscola = (id: string) => escolas?.find((e) => e.id === id)?.nome ?? "";

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <TituloPagina icone={ShoppingBag} descricao="Cada escola tem a sua loja. Os alunos compram com o Gold ganho nas aulas.">
        Gerenciar Loja
      </TituloPagina>

      <Cartao titulo="Novo item" icone={Plus}>
        <NovoItemForm escolas={escolas ?? []} escolaFixa={perfil.papel === "diretor" ? perfil.escola_id : null} />
      </Cartao>

      <Cartao titulo={`${itens?.length ?? 0} item(ns)`} icone={List}>
        {!itens?.length && <p className="text-texto-suave">Nenhum item ainda.</p>}
        <ul className="grid gap-4 sm:grid-cols-2">
          {itens?.map((i) => {
            const img = urlImagem(i.imagem_path);
            const vendidos = compras?.filter((c) => c.item_id === i.id).length ?? 0;
            return (
              <li key={i.id} className="flex flex-col gap-2 rounded-xl border border-borda p-3">
                <div className="flex gap-3">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primaria-suave text-primaria-texto">
                      <Icone icone={ICONE_TIPO[i.tipo as TipoItem]} tamanho={28} />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{i.nome}</p>
                    <p className="text-xs text-texto-suave">
                      {ROTULO_TIPO[i.tipo as TipoItem]}
                      {i.horas && ` · ${i.horas}h`} · {i.preco_gold} Gold · {vendidos} vendido(s)
                      {perfil.papel === "admin" && ` · ${nomeEscola(i.escola_id)}`}
                    </p>
                    <Selo ativo={i.ativo} sim="À venda" nao="Fora da loja" />
                  </div>
                </div>
                <Expansivel rotulo="Editar">
                  <FormAcao acao={editarItemLoja}>
                    <input type="hidden" name="id" value={i.id} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Campo rotulo="Nome">
                        <input name="nome" defaultValue={i.nome} required className={estiloInput} />
                      </Campo>
                      <Campo rotulo="Preço (Gold)">
                        <input name="preco_gold" type="number" min={1} defaultValue={i.preco_gold} className={estiloInput} />
                      </Campo>
                    </div>
                    <Campo rotulo="Descrição">
                      <textarea name="descricao" defaultValue={i.descricao ?? ""} rows={2} className={estiloInput} />
                    </Campo>
                    <label className="flex items-center gap-2 text-sm text-texto-medio">
                      <input type="checkbox" name="ativo" defaultChecked={i.ativo} /> À venda
                    </label>
                  </FormAcao>
                </Expansivel>
              </li>
            );
          })}
        </ul>
      </Cartao>
    </div>
  );
}
