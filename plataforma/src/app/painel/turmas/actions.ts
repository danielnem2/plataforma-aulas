"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { ROTULO_PERIODO } from "@/lib/rotulos";
import { createClient, type PerfilAtual } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";

type DadosTurma = {
  nome: string;
  escola_id: string;
  periodo: string;
  dia_semana: number;
  horario_inicio: string;
  horario_fim: string;
};

function lerTurma(formData: FormData, perfil: PerfilAtual): DadosTurma | string {
  const dados = {
    nome: String(formData.get("nome") ?? "").trim(),
    // coordenador só cria turmas na própria escola
    escola_id:
      perfil.papel === "diretor"
        ? perfil.escola_id ?? ""
        : String(formData.get("escola_id") ?? ""),
    periodo: String(formData.get("periodo") ?? ""),
    dia_semana: Number(formData.get("dia_semana")),
    horario_inicio: String(formData.get("horario_inicio") ?? ""),
    horario_fim: String(formData.get("horario_fim") ?? ""),
  };
  if (!dados.nome) return "Informe o nome da turma.";
  if (!dados.escola_id) return "Escolha a escola.";
  if (!(dados.periodo in ROTULO_PERIODO)) return "Escolha o período.";
  if (!(dados.dia_semana >= 0 && dados.dia_semana <= 6)) return "Escolha o dia da semana.";
  if (!dados.horario_inicio || !dados.horario_fim) return "Informe os horários.";
  if (dados.horario_fim <= dados.horario_inicio) return "O horário de fim deve ser depois do início.";
  return dados;
}

export async function criarTurma(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel(["admin", "diretor"]);
  if (!perfil) return { erro: "Sem permissão." };
  const dados = lerTurma(formData, perfil);
  if (typeof dados === "string") return { erro: dados };

  const supabase = await createClient();
  const { error } = await supabase.from("turmas").insert(dados);
  if (error) return { erro: "Não foi possível criar a turma." };

  refresh();
  return { ok: `Turma "${dados.nome}" criada.` };
}

export async function editarTurma(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel(["admin", "diretor"]);
  if (!perfil) return { erro: "Sem permissão." };
  const id = String(formData.get("id") ?? "");
  const dados = lerTurma(formData, perfil);
  if (typeof dados === "string") return { erro: dados };

  const supabase = await createClient();
  const { error } = await supabase
    .from("turmas")
    .update({ ...dados, ativa: formData.get("ativa") === "on" })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar a turma." };

  // Professores: só aceita professores da mesma escola da turma
  const escolhidos = formData.getAll("professores").map(String);
  const { data: validos } = escolhidos.length
    ? await supabase
        .from("perfis")
        .select("id")
        .in("id", escolhidos)
        .eq("papel", "professor")
        .eq("escola_id", dados.escola_id)
    : { data: [] as { id: string }[] };

  const { error: erroDel } = await supabase.from("turma_professores").delete().eq("turma_id", id);
  if (erroDel) return { erro: "Turma salva, mas não foi possível atualizar os professores." };
  if (validos?.length) {
    const { error: erroIns } = await supabase
      .from("turma_professores")
      .insert(validos.map((p) => ({ turma_id: id, professor_id: p.id })));
    if (erroIns) return { erro: "Turma salva, mas não foi possível atualizar os professores." };
  }

  refresh();
  return { ok: "Salvo." };
}
