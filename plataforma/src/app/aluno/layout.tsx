import { Cabecalho } from "@/components/cabecalho";
import { MenuAluno } from "@/components/menu-aluno";
import { exigirPapel } from "@/lib/auth";

// Área depende do usuário logado: renderiza a cada requisição
export const instant = false;

export default async function AlunoLayout({ children }: LayoutProps<"/aluno">) {
  const perfil = await exigirPapel(["aluno"]);
  return (
    <>
      <Cabecalho perfil={perfil} />
      <MenuAluno />
      <main id="conteudo" tabIndex={-1} className="flex-1 p-6 focus:outline-none">
        {children}
      </main>
    </>
  );
}
