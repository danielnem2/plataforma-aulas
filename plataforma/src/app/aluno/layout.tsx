import { Cabecalho } from "@/components/cabecalho";
import { MenuAluno } from "@/components/menu-aluno";
import { carregarTemaEscola, EstiloEscola } from "@/components/tema-da-escola";
import { exigirPapel } from "@/lib/auth";

// Área depende do usuário logado: renderiza a cada requisição
export const instant = false;

export default async function AlunoLayout({ children }: LayoutProps<"/aluno">) {
  const perfil = await exigirPapel(["aluno"]);
  const escola = await carregarTemaEscola(perfil.escola_id);
  return (
    <>
      {escola && <EstiloEscola tema={escola.tema} />}
      <Cabecalho perfil={perfil} marca={escola?.marca} />
      <MenuAluno />
      <main id="conteudo" tabIndex={-1} className="flex-1 p-6 focus:outline-none">
        {children}
      </main>
    </>
  );
}
