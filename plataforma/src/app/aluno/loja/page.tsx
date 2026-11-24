import Link from "next/link";
import { FormAcao } from "@/components/form-acao";
import { Cartao } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { ROTULO_TIPO, TIPOS_ITEM, urlImagem, type TipoItem } from "@/lib/loja";
import { createClient } from "@/lib/supabase/server";
import { comprar } from "./actions";

export const metadata = { title: "Loja" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

const MOTIVO = { aula_aprovada: "Aula aprovada", compra: "Compra", ajuste_manual: "Ajuste" } as const;

export default async function LojaAlunoPage({ searchParams }: PageProps<"/aluno/loja">) {
  const perfil = await exigirPapel(["aluno"]);
  const { tipo } = await searchParams;
  const filtro = typeof tipo === "string" && TIPOS_ITEM.includes(tipo as TipoItem) ? (tipo as TipoItem) : null;
  const supabase = await createClient();

  // RLS: só itens ativos da escola do aluno
  let consulta = supabase
    .from("loja_itens")
    .select("id, nome, descricao, tipo, preco_gold, horas, imagem_path")
    .eq("ativo", true)
    .order("preco_gold");
  if (filtro) consulta = consulta.eq("tipo", filtro);

  const [{ data: itens }, { data: compras }, { data: extrato }] = await Promise.all([
    consulta,
    supabase
      .from("compras")
      .select("id, status, criado_em, item:loja_itens(nome, tipo, horas, arquivo_path)")
      .eq("aluno_id", perfil.id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("transacoes_gold")
      .select("valor, motivo, descricao, criado_em")
      .eq("aluno_id", perfil.id)
      .order("criado_em", { ascending: false })
      .limit(30),
  ]);

  type Compra = {
    id: string;
    status: string;
    criado_em: string;
    item: { nome: string; tipo: TipoItem; horas: number | null; arquivo_path: string | null } | null;
  };
  // links de download temporários (1h) só para o que o aluno comprou (RNF07)
  const minhas = await Promise.all(
    ((compras ?? []) as unknown as Compra[]).map(async (c) => {
      let download: string | null = null;
      if (c.item?.arquivo_path) {
        const { data } = await supabase.storage.from("loja-arquivos").createSignedUrl(c.item.arquivo_path, 3600, {
          download: true,
        });
        download = data?.signedUrl ?? null;
      }
      return { ...c, download };
    }),
  );

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🛒 Loja</h1>
          <p className="text-sm text-slate-400">Gaste seu Gold em novos itens</p>
        </div>
        <span className="rounded-full bg-amber-500/15 px-4 py-2 text-lg font-bold text-amber-300">
          🪙 {perfil.gold_saldo}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/aluno/loja"
          className={`rounded-full px-3 py-1 text-sm ${!filtro ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}
        >
          Todos
        </Link>
        {TIPOS_ITEM.map((t) => (
          <Link
            key={t}
            href={`/aluno/loja?tipo=${t}`}
            className={`rounded-full px-3 py-1 text-sm ${filtro === t ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}
          >
            {ROTULO_TIPO[t]}
          </Link>
        ))}
      </div>

      <Cartao>
        {!itens?.length && <p className="text-slate-400">Nenhum item à venda no momento.</p>}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {itens?.map((i) => {
            const img = urlImagem(i.imagem_path);
            const podeComprar = perfil.gold_saldo >= i.preco_gold;
            return (
              <li key={i.id} className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="h-36 w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-lg bg-slate-800 text-5xl">
                    {ROTULO_TIPO[i.tipo as TipoItem].split(" ")[0]}
                  </div>
                )}
                <p className="font-semibold">{i.nome}</p>
                <p className="text-xs text-slate-400">
                  {ROTULO_TIPO[i.tipo as TipoItem]}
                  {i.horas && ` · ${i.horas}h de jogo`}
                </p>
                {i.descricao && <p className="text-sm text-slate-300">{i.descricao}</p>}
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="font-bold text-amber-300">🪙 {i.preco_gold}</span>
                  {podeComprar ? (
                    <FormAcao acao={comprar} botao="Comprar">
                      <input type="hidden" name="item_id" value={i.id} />
                    </FormAcao>
                  ) : (
                    <span className="text-xs text-slate-500">Faltam {i.preco_gold - perfil.gold_saldo} 🪙</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Cartao>

      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao titulo="🎒 Meus itens">
          {!minhas.length && <p className="text-sm text-slate-400">Você ainda não comprou nada.</p>}
          <ul className="flex flex-col gap-2 text-sm">
            {minhas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {c.item && ROTULO_TIPO[c.item.tipo].split(" ")[0]} {c.item?.nome}{" "}
                  <span className="text-slate-500">· {dataHora(c.criado_em)}</span>
                </span>
                {c.download ? (
                  <a href={c.download} className="text-cyan-300 hover:underline">⬇️ Baixar</a>
                ) : c.status === "aguardando_aviso" ? (
                  <span className="text-amber-300">⏳ Professor vai avisar a Gaming House</span>
                ) : c.status === "avisado" ? (
                  <span className="text-emerald-300">✅ Gaming House avisada</span>
                ) : null}
              </li>
            ))}
          </ul>
        </Cartao>

        <Cartao titulo="📜 Extrato de Gold">
          {!extrato?.length && <p className="text-sm text-slate-400">Sem movimentações ainda.</p>}
          <ul className="flex flex-col gap-1 text-sm">
            {extrato?.map((t, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-slate-300">
                  {dataHora(t.criado_em)} · {MOTIVO[t.motivo as keyof typeof MOTIVO]}
                  {t.descricao && ` — ${t.descricao}`}
                </span>
                <span className={t.valor > 0 ? "text-emerald-300" : "text-red-300"}>
                  {t.valor > 0 ? "+" : ""}
                  {t.valor}
                </span>
              </li>
            ))}
          </ul>
        </Cartao>
      </div>
    </div>
  );
}
