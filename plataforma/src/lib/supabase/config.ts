export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Sessão expira 2h depois do login (RF80) */
export const DURACAO_SESSAO_MS = 2 * 60 * 60 * 1000;

export type Papel = "admin" | "diretor" | "professor" | "aluno";
