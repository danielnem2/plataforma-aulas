-- Tema de cada escola: cor da marca, estilo do fundo, modo padrão e logo.
-- Alunos, professores e coordenadores da escola veem a plataforma com esse visual.

alter table public.escolas
  add column tema_cor text check (tema_cor is null or tema_cor ~ '^#[0-9a-fA-F]{6}$'),
  add column tema_fundo text not null default 'padrao' check (tema_fundo in ('padrao', 'preto_branco')),
  add column tema_modo text not null default 'claro' check (tema_modo in ('claro', 'escuro')),
  add column tema_nome text check (tema_nome is null or length(tema_nome) <= 60),
  add column logo_path text;

-- Logos: públicos para leitura; só o admin envia/troca
insert into storage.buckets (id, name, public) values ('escolas-logos', 'escolas-logos', true)
on conflict (id) do nothing;

create policy logos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'escolas-logos' and public.is_admin());
create policy logos_alterar on storage.objects for update to authenticated
  using (bucket_id = 'escolas-logos' and public.is_admin());
create policy logos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'escolas-logos' and public.is_admin());
