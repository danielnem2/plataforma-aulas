import { Cabecalho } from "@/components/cabecalho";
import { MenuLateral, type Contadores } from "@/components/menu-lateral";
import { exigirPapel } from "@/lib/auth";
import { DIAS_AVISO_AMARELO, DIAS_AVISO_VERMELHO } from "@/lib/contrato";
import { createClient } from "@/lib/supabase/server";

// Área depende do usuário logado: renderiza a cada requisição
export const instant = false;

export default async function PainelLayout({ children }: LayoutProps<"/painel">) {
  const perfil = await exigirPapel(["admin", "diretor", "professor"]);
  const supabase = await createClient();

  // Contadores do menu (RLS já limita ao que cada um pode ver)
  const agora = new Date();
  const emDias = (d: number) => new Date(agora.getTime() + d * 24 * 60 * 60 * 1000).toISOString();
  const [{ count: novas }, { count: compras }, { data: faltas }, { data: vencendo }, { count: revisoes }] = await Promise.all([
    supabase.from("submissoes").select("id", { count: "exact", head: true }).eq("status", "nova"),
    supabase.from("compras").select("id", { count: "exact", head: true }).eq("status", "aguardando_aviso"),
    supabase.rpc("painel_faltas"),
    // contratos vencendo em até 1 mês (ainda com acesso)
    supabase
      .from("perfis")
      .select("acesso_fim")
      .eq("papel", "aluno")
      .eq("ativo", true)
      .gt("acesso_fim", agora.toISOString())
      .lte("acesso_fim", emDias(DIAS_AVISO_AMARELO)),
    // dúvidas de professores aguardando o ADM
    supabase.from("revisoes_aula").select("id", { count: "exact", head: true }).eq("status", "aberta"),
  ]);
  const limiteVermelho = agora.getTime() + DIAS_AVISO_VERMELHO * 24 * 60 * 60 * 1000;

  const contadores: Contadores = {
    submissoes: { valor: novas ?? 0, urgente: true },
    compras: { valor: compras ?? 0, urgente: true },
    faltas: {
      valor:
        (faltas as { faltas: number; aviso_visto: boolean }[] | null)?.filter((f) => f.faltas >= 2 && !f.aviso_visto)
          .length ?? 0,
      urgente: true,
    },
    revisoes: { valor: perfil.papel === "admin" ? (revisoes ?? 0) : 0, urgente: false },
    contratos: {
      valor: vencendo?.length ?? 0,
      urgente: (vencendo ?? []).some((v) => new Date(v.acesso_fim!).getTime() <= limiteVermelho),
    },
  };

  return (
    <>
      <Cabecalho perfil={perfil} />
      <div className="flex flex-1">
        <MenuLateral papel={perfil.papel} contadores={contadores} />
        <main id="conteudo" tabIndex={-1} className="flex-1 overflow-x-auto p-6 focus:outline-none">
          {children}
        </main>
      </div>
    </>
  );
}
