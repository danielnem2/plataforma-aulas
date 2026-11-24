-- =====================================================================
-- Dados iniciais — rodar DEPOIS de 0001_schema.sql
-- =====================================================================

-- Cursos
insert into public.cursos (nome, descricao, ordem) values
  ('Desenvolvedor Júnior', 'Trilha inicial de desenvolvimento de jogos', 1),
  ('Desenvolvedor Pleno',  'Trilha avançada de desenvolvimento de jogos', 2);

-- ---------------------------------------------------------------------
-- Primeiro administrador
-- 1. No Supabase: Authentication > Users > Add user > Create new user
--    (marque "Auto Confirm User")
-- 2. Copie o "User UID" do usuário criado
-- 3. Troque os valores abaixo e rode este trecho
-- ---------------------------------------------------------------------
-- insert into public.perfis (id, nome, email, papel)
-- values ('COLE-AQUI-O-USER-UID', 'Seu Nome', 'seu@email.com', 'admin');
