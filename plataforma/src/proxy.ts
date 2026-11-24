import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  DURACAO_SESSAO_MS,
  SUPABASE_KEY,
  SUPABASE_URL,
} from "@/lib/supabase/config";
import { acessoLiberado, type DadosContrato } from "@/lib/contrato";

const ROTAS_PUBLICAS = ["/login"];

/**
 * Roda antes de cada página:
 * - renova os cookies da sessão do Supabase (recarregar a página não derruba o login)
 * - manda para /login quem não está logado
 * - encerra a sessão 2h depois do login (RF80)
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const rotaPublica = ROTAS_PUBLICAS.some((r) => pathname.startsWith(r));

  /** Redireciona mantendo os cookies que o Supabase acabou de gravar */
  const redirecionar = (destino: string) => {
    const url = request.nextUrl.clone();
    const [caminho, busca] = destino.split("?");
    url.pathname = caminho;
    url.search = busca ? `?${busca}` : "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") redirect.headers.set(key, value);
    });
    return redirect;
  };

  if (!user) {
    return rotaPublica ? response : redirecionar("/login");
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("ativo, ultimo_login_em, papel, tipo_acesso, acesso_inicio, acesso_fim, contrato_meses")
    .eq("id", user.id)
    .single();

  // Aluno fora do período do contrato / aula experimental
  if (perfil?.papel === "aluno" && !acessoLiberado(perfil as DadosContrato)) {
    await supabase.auth.signOut();
    return rotaPublica ? response : redirecionar("/login?erro=contrato");
  }

  const loginEm = perfil?.ultimo_login_em
    ? new Date(perfil.ultimo_login_em).getTime()
    : 0;
  const expirou = Date.now() - loginEm > DURACAO_SESSAO_MS;

  if (!perfil || !perfil.ativo || expirou) {
    await supabase.auth.signOut();
    if (rotaPublica) return response;
    return redirecionar(
      !perfil || !perfil.ativo ? "/login?erro=inativo" : "/login?expirada=1",
    );
  }

  if (rotaPublica) return redirecionar("/");

  return response;
}

export const config = {
  matcher: [
    // tudo, exceto arquivos estáticos e imagens
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
