import Link from "next/link";
import { Cartao } from "@/components/ui";
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
      <Cartao titulo="🗺️ Mapa do Mundo">
        <p className="text-slate-300">
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
        <div>
          <h1 className="text-2xl font-bold">🗺️ Mapa de Habilidades</h1>
          <p className="text-sm text-slate-400">Explore sua jornada e complete as missões</p>
        </div>
        {cursos.length > 1 && (
          <div className="flex gap-2">
            {cursos.map((c) => (
              <Link
                key={c.id}
                href={`/aluno?curso=${c.id}`}
                className={`rounded-full px-3 py-1 text-sm ${
                  c.id === cursoAtual.id ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
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
