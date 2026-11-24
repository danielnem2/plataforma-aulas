# Plataforma de Aulas Gamificada

Next.js 16 + Supabase. Requisitos em `../requisitos.md`, modelo do banco em `../modelo-banco.md`.

## Como rodar

### 1. Criar o projeto no Supabase
1. Crie uma conta em https://supabase.com e um projeto novo (região: São Paulo).
2. **Authentication > Sign In / Providers**: desative "Allow new users to sign up"
   (quem cria contas é o admin/diretor, não o próprio aluno).

### 2. Criar as tabelas
1. No Supabase, abra **SQL Editor**.
2. Cole todo o conteúdo de `supabase/migrations/0001_schema.sql` e clique **Run**; depois o de `0002_itens_comprados.sql`.
3. Cole o conteúdo de `supabase/seed.sql` e clique **Run** (cria os cursos Júnior e Pleno).

### 3. Criar o primeiro admin
1. **Authentication > Users > Add user > Create new user** — use seu e-mail, defina a senha, marque *Auto Confirm User*.
2. Copie o **User UID**.
3. No SQL Editor, rode (trocando os valores):
   ```sql
   insert into public.perfis (id, nome, email, papel)
   values ('COLE-O-USER-UID', 'Seu Nome', 'seu@email.com', 'admin');
   ```

### 4. Configurar o projeto local
1. Copie `.env.example` para `.env.local`.
2. Preencha com os dados de **Project Settings > API Keys** (URL e *publishable key*).
3. Rode:
   ```powershell
   npm install
   npm run dev
   ```
4. Abra http://localhost:3000 e entre com o admin.

5. No `.env.local`, preencha também `SUPABASE_SECRET_KEY` (Secret key) — usada só no servidor para criar logins.
   Depois rode `supabase/migrations/0002_itens_comprados.sql` no SQL Editor (se ainda não rodou).

## O que já funciona

**Todos**
- Login, sessão de 2h (com aviso 10 min antes), presença do aluno registrada no login

**Equipe (`/painel`)**
| Tela | Quem |
|---|---|
| Início — dashboard: alunos ativos, conclusão, tempo por módulo, engajamento, retenção, gráficos semanais, distribuição | todos (cada um vê seu escopo) |
| Submissões — aprovar/devolver com comentário; aprovar dá Gold e libera as próximas aulas | todos |
| Alunos — progresso, aula atual, faltas coloridas; página do aluno com cursos, liberação manual de aulas, mapa, presenças, extrato, ajuste de Gold | todos (ajuste de Gold: admin/coordenador) |
| Faltas — 🟡 1 / 🔴 2+ semanas seguidas, marcar como contatado | todos |
| Compras de horas — avisar a Gaming House | todos |
| Aulas — criar/editar com link do Figma, dependências e mapa | admin (professor e coordenador só veem e enviam dúvida) |
| Cursos | admin |
| Loja — itens com upload de arquivo e imagem | admin, coordenador |
| Escolas · Turmas · Usuários · Dias sem aula | conforme papel |

**Aluno (`/aluno`)**
- Mapa do Mundo por curso, janela da aula com Figma, tela cheia, **janela flutuante** (Edge/Chrome), envio do link da tarefa, comentário de devolução
- Minhas Estatísticas — cards, missão atual, presenças e calendário
- Loja — compra com Gold, meus itens com download, extrato

## Estrutura
```
supabase/migrations/   0001 esquema completo · 0002 itens comprados
supabase/seed.sql      cursos iniciais + instrução do 1º admin
src/proxy.ts           sessão, login obrigatório, expiração 2h
src/lib/               supabase (clientes), auth, mapa, figma, faltas, loja
src/components/        mapa de habilidades, janela flutuante, formulários, UI
src/app/login/         login/logout
src/app/aluno/         mapa, estatísticas, loja
src/app/painel/        dashboard e telas da equipe
```
