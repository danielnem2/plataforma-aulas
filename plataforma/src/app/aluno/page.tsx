import { Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { Cartao, pilula, TituloPagina } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { carregarMapa, cursosDoAluno } from "@/lib/mapa";
import { MapaAluno } from "./mapa-aluno";

export const metadata = { title: "Mapa do Mundo" };
// Depende do usuário logado: renderiza a cada requisição
export const instant = false;

export default async function AlunoPage({ searchParams }: PageProps<"/aluno">) {
  const perfil = await exigirPapel(["aluno"]);
  const { curso } = await searchParams;
  const cursos = await cursosDoAluno(perfil.id);

  if (!cursos.length) {
    return (
      <Cartao titulo="Mapa do Mundo" icone={MapIcon}>
        <p className="text-texto-medio">
          Olá, {perfil.nome}! Você ainda não tem nenhum curso liberado. Fale com seu professor.
        </p>
      </Cartao>
    );
  }

  const cursoAtual = cursos.find((c) => c.id === curso) ?? cursos[0];
  const mapa = await carregarMapa(perfil.id, cursoAtual.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TituloPagina icone={MapIcon} descricao="Explore sua jornada e complete as missões">
          Mapa de Habilidades
        </TituloPagina>
        {cursos.length > 1 && (
          <div className="flex gap-2">
            {cursos.map((c) => (
              <Link
                key={c.id}
                href={`/aluno?curso=${c.id}`}
                className={pilula(c.id === cursoAtual.id)}
              >
                {c.nome}
              </Link>
            ))}
          </div>
        )}
      </div>
      <MapaAluno {...mapa} />
    </div>
  );
}
