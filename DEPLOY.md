# Publicar a plataforma (Vercel + GitHub)

O banco já está na nuvem (Supabase, São Paulo). Falta só hospedar o site.
Usamos **Vercel** (feita pelos criadores do Next.js, plano gratuito) ligada ao **GitHub**:
cada vez que o código é enviado ao GitHub, a Vercel publica a nova versão sozinha.

## 1. Git no computador
Instalado pelo Claude com `winget install Git.Git` (com sua permissão).

## 2. Contas (você cria)
1. **GitHub** — https://github.com/signup
2. **Vercel** — https://vercel.com/signup → "Continue with GitHub" (usa a mesma conta)

## 3. Enviar o código para o GitHub
1. No GitHub: **New repository** → nome `plataforma-aulas` → **Private** → sem README → Create.
2. O Claude faz o `git init`, o commit e o `git push`. Na primeira vez abre uma janela
   do GitHub pedindo para você autorizar — é você quem faz login nela.

> O `.env.local` (com as chaves) **não** vai para o GitHub — está no `.gitignore`.

## 4. Importar na Vercel
1. Vercel → **Add New… → Project** → escolha o repositório `plataforma-aulas` → Import.
2. **Root Directory**: clique em *Edit* e escolha **`plataforma`**.
3. **Environment Variables** — adicione as três (copie os valores do seu `plataforma\.env.local`):
   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://zkopocjnoltdtijxtvxv.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | a chave `sb_publishable_...` |
   | `SUPABASE_SECRET_KEY` | a chave `sb_secret_...` — **cole você mesmo, não mande no chat** |
4. **Deploy**. Em ~2 minutos sai um endereço tipo `https://plataforma-aulas.vercel.app`.

## 5. Depois de publicar
- Abra o endereço e entre com o admin.
- Supabase → **Authentication → URL Configuration → Site URL**: coloque o endereço da Vercel.
- Para atualizar o site no futuro: o Claude faz commit + push e a Vercel publica sozinha.
- Domínio próprio (ex.: `aulas.suaescola.com.br`): Vercel → Settings → Domains.
