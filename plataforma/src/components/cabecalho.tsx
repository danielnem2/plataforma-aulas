import { sair } from "@/app/login/actions";
import { AvisoSessao } from "@/components/aviso-sessao";
import { ROTULO_PAPEL } from "@/lib/rotulos";
import type { PerfilAtual } from "@/lib/supabase/server";

export function Cabecalho({ perfil }: { perfil: PerfilAtual }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-700 bg-slate-900/80 px-6 py-3">
      <span className="font-bold text-cyan-300">Plataforma de Aulas</span>
      <div className="flex items-center gap-4 text-sm">
        <AvisoSessao loginEm={perfil.ultimo_login_em} />
        {perfil.papel === "aluno" && (
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-300">
            🪙 {perfil.gold_saldo}
          </span>
        )}
        <span className="text-slate-300">
          {perfil.nome} · {ROTULO_PAPEL[perfil.papel]}
        </span>
        <form action={sair}>
          <button className="rounded-lg bg-red-500/15 px-3 py-1 text-red-300 hover:bg-red-500/25">
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
