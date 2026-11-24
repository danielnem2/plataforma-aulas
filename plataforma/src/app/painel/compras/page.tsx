import Link from "next/link";
import { FormAcao } from "@/components/form-acao";
import { Cartao } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { marcarAvisado } from "./actions";

export const metadata = { title: "Compras de horas" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

type Linha = {
  id: string;
  status: "aguardando_aviso" | "avisado";
  preco_pago: number;
  criado_em: string;
  avisado_em: string | null;
  aluno: { id: string; nome: string; turma_id: string | null } | null;
  item: { nome: string; horas: number | null; tipo: string } | null;
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function ComprasPage({ searchParams }: PageProps<"/painel/compras">) {
  await exigirPapel(["admin", "diretor", "professor"]);
  const { status } = await searchParams;
  const aba = status === "avisado" ? "avisado" : "aguardando_aviso";
  const supabase = await createClient();

  const [{ data }, { data: turmas }] = await Promise.all([
    supabase
      .from("compras")
      .select(
        "id, status, preco_pago, criado_em, avisado_em, aluno:perfis!compras_aluno_id_fkey(id, nome, turma_id), item:loja_itens(nome, horas, tipo)",
      )
      .eq("status", aba)
      .order("criado_em", { ascending: aba === "aguardando_aviso" })
      .limit(200),
    supabase.from("turmas").select("id, nome"),
  ]);
  const linhas = (data ?? []) as unknown as Linha[];
  const nomeTurma = (id: string | null | undefined) => turmas?.find((t) => t.id === id)?.nome ?? "—";

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">🎮 Compras de horas na Gaming House</h1>
        <p className="text-sm text-slate-400">
          Quando um aluno compra horas, avise a Gaming House e marque como avisado.
        </p>
      </div>

      <div className="flex gap-2">
        {[
          { v: "aguardando_aviso", r: "⏳ Aguardando aviso" },
          { v: "avisado", r: "✅ Avisadas" },
        ].map((a) => (
          <Link
            key={a.v}
            href={`/painel/compras?status=${a.v}`}
            className={`rounded-full px-3 py-1 text-sm ${
              a.v === aba ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {a.r}
          </Link>
        ))}
      </div>

      <Cartao>
        {!linhas.length && <p className="text-slate-400">Nenhuma compra aqui.</p>}
        <ul className="flex flex-col divide-y divide-slate-800">
          {linhas.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span>
                <Link href={`/painel/alunos/${c.aluno?.id}`} className="font-medium hover:underline">
                  {c.aluno?.nome}
                </Link>{" "}
                <span className="text-slate-400">({nomeTurma(c.aluno?.turma_id)})</span> comprou{" "}
                <strong>{c.item?.horas}h</strong> — {c.item?.nome} · 🪙 {c.preco_pago} ·{" "}
                <span className="text-slate-500">{dataHora(c.criado_em)}</span>
                {c.avisado_em && <span className="text-emerald-300"> · avisado em {dataHora(c.avisado_em)}</span>}
              </span>
              {c.status === "aguardando_aviso" && (
                <FormAcao acao={marcarAvisado} botao="✅ Avisei a Gaming House">
                  <input type="hidden" name="id" value={c.id} />
                </FormAcao>
              )}
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
