"use server";

import { refresh } from "next/cache";
import { perfilComPapel } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Papel } from "@/lib/supabase/config";
import { createClient, type PerfilAtual } from "@/lib/supabase/server";
import type { EstadoAcao } from "@/components/form-acao";
import { lerContrato, SEM_CONTRATO } from "@/lib/contrato-form";

const SENHA_MINIMA = 8;

/** Papéis que cada um pode criar/editar */
function papeisPermitidos(perfil: PerfilAtual): Papel[] {
  return perfil.papel === "admin"
    ? ["admin", "diretor", "professor", "aluno"]
    : ["professor", "aluno"];
}

type Vinculo = { papel: Papel; escola_id: string | null; turma_id: string | null };

/** Lê papel/escola/turma do formulário e valida as regras de vínculo */
async function lerVinculo(
  formData: FormData,
  perfil: PerfilAtual,
): Promise<Vinculo | string> {
  const papel = String(formData.get("papel") ?? "") as Papel;
  if (!papeisPermitidos(perfil).includes(papel)) return "Papel inválido.";

  const escola_id =
    papel === "admin"
      ? null
      : perfil.papel === "diretor"
        ? perfil.escola_id
        : String(formData.get("escola_id") ?? "") || null;
  if (papel !== "admin" && !escola_id) return "Escolha a escola.";

  let turma_id: string | null = null;
  if (papel === "aluno") {
    turma_id = String(formData.get("turma_id") ?? "") || null;
    if (!turma_id) return "Escolha a turma do aluno.";
    const supabase = await createClient();
    const { data: turma } = await supabase
      .from("turmas")
      .select("escola_id")
      .eq("id", turma_id)
      .single();
    if (!turma || turma.escola_id !== escola_id) return "A turma não pertence a essa escola.";
  }
  return { papel, escola_id, turma_id };
}

export async function criarUsuario(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel(["admin", "diretor"]);
  if (!perfil) return { erro: "Sem permissão." };

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  if (!nome) return { erro: "Informe o nome." };
  if (!email.includes("@")) return { erro: "E-mail inválido." };
  if (senha.length < SENHA_MINIMA) return { erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` };

  const vinculo = await lerVinculo(formData, perfil);
  if (typeof vinculo === "string") return { erro: vinculo };

  // Aluno sempre entra com contrato (meses) ou aula experimental (24h)
  const contrato = vinculo.papel === "aluno" ? lerContrato(formData) : SEM_CONTRATO;
  if (typeof contrato === "string") return { erro: contrato };

  // 1. Cria o login (exige a chave secreta)
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { erro: (e as Error).message };
  }
  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (erroAuth || !criado.user) {
    return {
      erro: erroAuth?.message.includes("already")
        ? "Já existe um usuário com esse e-mail."
        : "Não foi possível criar o login.",
    };
  }

  // 2. Cria o perfil com as permissões de quem está logado (RLS confere a escola)
  const supabase = await createClient();
  const { error: erroPerfil } = await supabase
    .from("perfis")
    .insert({ id: criado.user.id, nome, email, ...vinculo, ...contrato });
  if (erroPerfil) {
    await admin.auth.admin.deleteUser(criado.user.id); // desfaz o login
    return { erro: "Sem permissão para criar esse usuário nessa escola." };
  }

  refresh();
  return { ok: `${nome} cadastrado(a).` };
}

export async function editarUsuario(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel(["admin", "diretor"]);
  if (!perfil) return { erro: "Sem permissão." };

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe o nome." };
  if (id === perfil.id && formData.get("ativo") !== "on") {
    return { erro: "Você não pode desativar a própria conta." };
  }

  const vinculo = await lerVinculo(formData, perfil);
  if (typeof vinculo === "string") return { erro: vinculo };
  if (id === perfil.id && vinculo.papel !== perfil.papel) {
    return { erro: "Você não pode mudar o próprio papel." };
  }

  const supabase = await createClient();
  const { data: antes } = await supabase.from("perfis").select("papel, escola_id").eq("id", id).single();
  if (!antes) return { erro: "Usuário não encontrado." };

  const { data: salvo, error } = await supabase
    .from("perfis")
    .update({
      nome,
      ativo: formData.get("ativo") === "on",
      ...vinculo,
      // deixou de ser aluno: não tem mais contrato
      ...(vinculo.papel !== "aluno" ? SEM_CONTRATO : {}),
    })
    .eq("id", id)
    .select("id");
  if (error || !salvo?.length) return { erro: "Sem permissão para salvar esse usuário." };

  // Mudou de escola ou deixou de ser professor: sai das turmas que dava aula
  if (antes.papel === "professor" && (vinculo.papel !== "professor" || vinculo.escola_id !== antes.escola_id)) {
    await supabase.from("turma_professores").delete().eq("professor_id", id);
  }

  refresh();
  return { ok: "Salvo." };
}

export async function redefinirSenha(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const perfil = await perfilComPapel(["admin", "diretor"]);
  if (!perfil) return { erro: "Sem permissão." };

  const id = String(formData.get("id") ?? "");
  const senha = String(formData.get("senha") ?? "");
  if (senha.length < SENHA_MINIMA) return { erro: `Mínimo de ${SENHA_MINIMA} caracteres.` };

  // Confere se quem pediu pode gerir esse usuário
  const supabase = await createClient();
  const { data: alvo } = await supabase.from("perfis").select("papel, escola_id").eq("id", id).single();
  const pode =
    alvo &&
    (perfil.papel === "admin" ||
      (alvo.escola_id === perfil.escola_id && papeisPermitidos(perfil).includes(alvo.papel)));
  if (!pode) return { erro: "Sem permissão." };

  try {
    const { error } = await createAdminClient().auth.admin.updateUserById(id, { password: senha });
    if (error) return { erro: "Não foi possível trocar a senha." };
  } catch (e) {
    return { erro: (e as Error).message };
  }
  return { ok: "Senha alterada." };
}
