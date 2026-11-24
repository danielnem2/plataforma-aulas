import { Coins, GraduationCap, LogOut } from "lucide-react";
import { sair } from "@/app/login/actions";
import { AvisoSessao } from "@/components/aviso-sessao";
import { BotaoTema } from "@/components/botao-tema";
import { botao, Icone } from "@/components/ui";
import { ICONE_PAPEL, ROTULO_PAPEL } from "@/lib/rotulos";
import type { PerfilAtual } from "@/lib/supabase/server";

export function Cabecalho({ perfil }: { perfil: PerfilAtual }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-borda bg-superficie px-6 py-3">
      <span className="flex items-center gap-2 text-lg font-bold text-primaria-texto">
        <Icone icone={GraduationCap} tamanho={24} />
        Plataforma de Aulas
      </span>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <AvisoSessao loginEm={perfil.ultimo_login_em} />
        <BotaoTema />
        {perfil.papel === "aluno" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-aviso-suave px-3 py-1 font-semibold text-aviso">
            <Icone icone={Coins} tamanho={16} />
            {perfil.gold_saldo}
            <span className="sr-only">Gold</span>
          </span>
        )}
        <span className="inline-flex items-center gap-2 text-texto-medio">
          <Icone icone={ICONE_PAPEL[perfil.papel]} tamanho={16} className="text-texto-suave" />
          <span>
            {perfil.nome} <span className="text-texto-suave">· {ROTULO_PAPEL[perfil.papel]}</span>
          </span>
        </span>
        <form action={sair}>
          <button className={botao("secundario", "pequeno")}>
            <Icone icone={LogOut} tamanho={16} />
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
