-- Revisões de aula: professor/coordenador manda ao ADM uma dúvida sobre uma missão
-- (dúvida dele sobre a atividade, ou dúvida que um aluno teve). O ADM responde e marca como resolvida.

create type public.tipo_revisao as enum ('duvida_professor', 'duvida_aluno');
create type public.status_revisao as enum ('aberta', 'resolvida');

create table public.revisoes_aula (
  id              uuid primary key default gen_random_uuid(),
  aula_id         uuid not null references public.aulas(id) on delete cascade,
  autor_id        uuid not null references public.perfis(id) on delete cascade,
  tipo            public.tipo_revisao not null,
  texto           text not null check (length(trim(texto)) between 5 and 4000),
  status          public.status_revisao not null default 'aberta',
  resposta        text check (resposta is null or length(resposta) <= 4000),
  respondido_por  uuid references public.perfis(id) on delete set null,
  respondido_em   timestamptz,
  criado_em       timestamptz not null default now()
);
create index on public.revisoes_aula (status, criado_em desc);
create index on public.revisoes_aula (autor_id);

alter table public.revisoes_aula enable row level security;

-- Quem enviou vê as suas; o admin vê todas
create policy revisoes_ler on public.revisoes_aula for select to authenticated
  using (autor_id = auth.uid() or is_admin());
-- Professor e coordenador enviam em nome próprio
create policy revisoes_enviar on public.revisoes_aula for insert to authenticated
  with check (autor_id = auth.uid() and papel_atual() in ('professor', 'diretor') and status = 'aberta'
              and resposta is null and respondido_por is null);
-- Só o admin responde / resolve
create policy revisoes_responder on public.revisoes_aula for update to authenticated
  using (is_admin()) with check (is_admin());

revoke all on public.revisoes_aula from anon;
grant select, insert on public.revisoes_aula to authenticated;
grant update (status, resposta, respondido_por, respondido_em) on public.revisoes_aula to authenticated;
