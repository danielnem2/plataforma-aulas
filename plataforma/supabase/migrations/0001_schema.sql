-- =====================================================================
-- Plataforma de Aulas Gamificada — esquema inicial
-- Rodar no Supabase: Dashboard > SQL Editor > colar tudo > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
create type public.papel as enum ('admin', 'diretor', 'professor', 'aluno');
create type public.periodo as enum ('manha', 'tarde', 'noite');
create type public.dificuldade as enum ('facil', 'medio', 'dificil');
create type public.status_submissao as enum ('nova', 'aprovada', 'devolvida');
create type public.tipo_item as enum ('modelo_3d', 'template_botao', 'unitypack', 'animacao', 'horas_gaming');
create type public.status_compra as enum ('concluida', 'aguardando_aviso', 'avisado');
create type public.motivo_gold as enum ('aula_aprovada', 'compra', 'ajuste_manual');

-- ---------------------------------------------------------------------
-- 2. Pessoas
-- ---------------------------------------------------------------------
create table public.escolas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  endereco   text,
  telefone   text,
  ativa      boolean not null default true,
  criado_em  timestamptz not null default now()
);

create table public.turmas (
  id              uuid primary key default gen_random_uuid(),
  escola_id       uuid not null references public.escolas(id) on delete restrict,
  nome            text not null,
  periodo         public.periodo not null,
  dia_semana      smallint not null check (dia_semana between 0 and 6), -- 0 = domingo
  horario_inicio  time not null,
  horario_fim     time not null,
  ativa           boolean not null default true,
  criado_em       timestamptz not null default now(),
  check (horario_fim > horario_inicio)
);

create table public.perfis (
  id               uuid primary key references auth.users(id) on delete cascade,
  nome             text not null,
  email            text not null,
  papel            public.papel not null,
  escola_id        uuid references public.escolas(id) on delete restrict,
  turma_id         uuid references public.turmas(id) on delete set null,
  gold_saldo       integer not null default 0 check (gold_saldo >= 0),
  ativo            boolean not null default true,
  ultimo_login_em  timestamptz,
  criado_em        timestamptz not null default now(),
  check (papel = 'admin' or escola_id is not null),
  check (papel = 'aluno' or turma_id is null)
);
create index on public.perfis (escola_id);
create index on public.perfis (turma_id);

create table public.turma_professores (
  turma_id      uuid not null references public.turmas(id) on delete cascade,
  professor_id  uuid not null references public.perfis(id) on delete cascade,
  primary key (turma_id, professor_id)
);
create index on public.turma_professores (professor_id);

-- ---------------------------------------------------------------------
-- 3. Conteúdo
-- ---------------------------------------------------------------------
create table public.cursos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  descricao  text,
  ordem      integer not null default 0,
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

create table public.aulas (
  id                  uuid primary key default gen_random_uuid(),
  curso_id            uuid not null references public.cursos(id) on delete cascade,
  titulo              text not null,
  numero_missao       integer not null default 1,
  descricao           text,
  figma_embed_url     text not null check (figma_embed_url like 'https://embed.figma.com/%'),
  camada              integer not null default 0,
  ordem               integer not null default 0,
  dificuldade         public.dificuldade not null default 'facil',
  tempo_estimado_min  integer check (tempo_estimado_min > 0),
  gold_recompensa     integer not null default 0 check (gold_recompensa >= 0),
  dica_envio          text,
  ativa               boolean not null default true,
  criado_por          uuid references public.perfis(id) on delete set null,
  criado_em           timestamptz not null default now()
);
create index on public.aulas (curso_id);

create table public.aula_dependencias (
  aula_id        uuid not null references public.aulas(id) on delete cascade,
  depende_de_id  uuid not null references public.aulas(id) on delete cascade,
  primary key (aula_id, depende_de_id),
  check (aula_id <> depende_de_id)
);

-- ---------------------------------------------------------------------
-- 4. Acesso e progresso
-- ---------------------------------------------------------------------
create table public.aluno_cursos (
  aluno_id       uuid not null references public.perfis(id) on delete cascade,
  curso_id       uuid not null references public.cursos(id) on delete cascade,
  tudo_liberado  boolean not null default false,
  liberado_por   uuid references public.perfis(id) on delete set null,
  liberado_em    timestamptz not null default now(),
  primary key (aluno_id, curso_id)
);

create table public.liberacoes_aula (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references public.perfis(id) on delete cascade,
  aula_id       uuid not null references public.aulas(id) on delete cascade,
  liberado_por  uuid references public.perfis(id) on delete set null,
  liberado_em   timestamptz not null default now(),
  revogado_por  uuid references public.perfis(id) on delete set null,
  revogado_em   timestamptz
);
create index on public.liberacoes_aula (aluno_id, aula_id);

create table public.submissoes (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references public.perfis(id) on delete cascade,
  aula_id       uuid not null references public.aulas(id) on delete cascade,
  link          text not null check (link ~* '^https://'),
  status        public.status_submissao not null default 'nova',
  comentario    text,
  avaliado_por  uuid references public.perfis(id) on delete set null,
  avaliado_em   timestamptz,
  enviado_em    timestamptz not null default now()
);
create index on public.submissoes (aluno_id, aula_id);
create index on public.submissoes (status);
-- no máximo uma submissão aguardando avaliação por aluno/aula
create unique index submissoes_uma_nova on public.submissoes (aluno_id, aula_id) where status = 'nova';
-- no máximo uma aprovação por aluno/aula (Gold não é pago duas vezes)
create unique index submissoes_uma_aprovada on public.submissoes (aluno_id, aula_id) where status = 'aprovada';

-- ---------------------------------------------------------------------
-- 5. Frequência
-- ---------------------------------------------------------------------
create table public.presencas (
  id             uuid primary key default gen_random_uuid(),
  aluno_id       uuid not null references public.perfis(id) on delete cascade,
  data           date not null,
  registrado_em  timestamptz not null default now(),
  unique (aluno_id, data)
);

create table public.semanas_sem_aula (
  id         uuid primary key default gen_random_uuid(),
  escola_id  uuid not null references public.escolas(id) on delete cascade,
  turma_id   uuid references public.turmas(id) on delete cascade, -- null = escola toda
  data       date not null,
  motivo     text,
  criado_por uuid references public.perfis(id) on delete set null
);
create index on public.semanas_sem_aula (escola_id, data);

create table public.alertas_falta_vistos (
  id                 uuid primary key default gen_random_uuid(),
  aluno_id           uuid not null references public.perfis(id) on delete cascade,
  faltas_no_momento  integer not null,
  visto_por          uuid references public.perfis(id) on delete set null,
  visto_em           timestamptz not null default now(),
  observacao         text
);
create index on public.alertas_falta_vistos (aluno_id, visto_em desc);

-- ---------------------------------------------------------------------
-- 6. Loja e Gold
-- ---------------------------------------------------------------------
create table public.loja_itens (
  id            uuid primary key default gen_random_uuid(),
  escola_id     uuid not null references public.escolas(id) on delete cascade,
  nome          text not null,
  descricao     text,
  tipo          public.tipo_item not null,
  preco_gold    integer not null check (preco_gold > 0),
  imagem_path   text,
  arquivo_path  text,
  horas         numeric(5,2),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  check (
    (tipo = 'horas_gaming' and horas > 0 and arquivo_path is null)
    or (tipo <> 'horas_gaming' and horas is null)
  )
);
create index on public.loja_itens (escola_id);

create table public.compras (
  id           uuid primary key default gen_random_uuid(),
  aluno_id     uuid not null references public.perfis(id) on delete cascade,
  item_id      uuid not null references public.loja_itens(id) on delete restrict,
  preco_pago   integer not null,
  status       public.status_compra not null,
  avisado_por  uuid references public.perfis(id) on delete set null,
  avisado_em   timestamptz,
  criado_em    timestamptz not null default now()
);
create index on public.compras (aluno_id);
create index on public.compras (status);

create table public.transacoes_gold (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references public.perfis(id) on delete cascade,
  valor         integer not null check (valor <> 0),
  motivo        public.motivo_gold not null,
  submissao_id  uuid references public.submissoes(id) on delete set null,
  compra_id     uuid references public.compras(id) on delete set null,
  descricao     text,
  criado_por    uuid references public.perfis(id) on delete set null,
  criado_em     timestamptz not null default now(),
  check (motivo <> 'ajuste_manual' or descricao is not null)
);
create index on public.transacoes_gold (aluno_id, criado_em desc);

-- =====================================================================
-- 7. Funções auxiliares de permissão
-- =====================================================================
create or replace function public.papel_atual()
returns public.papel language sql stable security definer set search_path = public as $$
  select papel from perfis where id = auth.uid() and ativo
$$;

create or replace function public.escola_atual()
returns uuid language sql stable security definer set search_path = public as $$
  select escola_id from perfis where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(papel_atual() = 'admin', false)
$$;

create or replace function public.is_equipe()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(papel_atual() in ('admin', 'diretor', 'professor'), false)
$$;

-- Pode o usuário atual gerir este aluno?
-- admin: todos · diretor: alunos da escola · professor: alunos das suas turmas
create or replace function public.pode_gerir_aluno(p_aluno uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case papel_atual()
    when 'admin' then true
    when 'diretor' then exists (
      select 1 from perfis a
      where a.id = p_aluno and a.papel = 'aluno' and a.escola_id = escola_atual())
    when 'professor' then exists (
      select 1 from perfis a
      join turma_professores tp on tp.turma_id = a.turma_id
      where a.id = p_aluno and a.papel = 'aluno' and tp.professor_id = auth.uid())
    else false
  end
$$;

-- Pode o usuário atual gerir esta turma? (admin / diretor da escola)
create or replace function public.pode_gerir_turma(p_turma uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case papel_atual()
    when 'admin' then true
    when 'diretor' then exists (select 1 from turmas t where t.id = p_turma and t.escola_id = escola_atual())
    else false
  end
$$;

-- Data/hora local da escola (Brasil)
create or replace function public.agora_local()
returns timestamp language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')
$$;

-- =====================================================================
-- 8. Regras do mapa de habilidades
-- =====================================================================

-- A aula está disponível para o aluno?
-- (curso liberado) e (curso todo liberado OU liberação manual ativa OU todas as dependências aprovadas)
create or replace function public.aula_disponivel(p_aluno uuid, p_aula uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from aulas a
    join aluno_cursos ac on ac.curso_id = a.curso_id and ac.aluno_id = p_aluno
    where a.id = p_aula and a.ativa
      and (
        ac.tudo_liberado
        or exists (select 1 from liberacoes_aula l
                   where l.aluno_id = p_aluno and l.aula_id = p_aula and l.revogado_em is null)
        or not exists (
          select 1 from aula_dependencias d
          where d.aula_id = p_aula
            and not exists (select 1 from submissoes s
                            where s.aluno_id = p_aluno and s.aula_id = d.depende_de_id
                              and s.status = 'aprovada'))
      )
  )
$$;

-- Estado de cada aula de um curso para um aluno (usado no Mapa do Mundo)
-- estados: concluida · pendente · devolvida · disponivel · bloqueada
create or replace function public.estado_aulas(p_aluno uuid, p_curso uuid)
returns table (
  aula_id uuid, titulo text, numero_missao integer, camada integer, ordem integer,
  dificuldade public.dificuldade, estado text, liberada_manualmente boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_aluno is distinct from auth.uid() and not pode_gerir_aluno(p_aluno) then
    raise exception 'sem permissão';
  end if;

  return query
  select a.id, a.titulo, a.numero_missao, a.camada, a.ordem, a.dificuldade,
    case
      when exists (select 1 from submissoes s where s.aluno_id = p_aluno and s.aula_id = a.id and s.status = 'aprovada')
        then 'concluida'
      when ult.status = 'nova' then 'pendente'
      when ult.status = 'devolvida' then 'devolvida'
      when aula_disponivel(p_aluno, a.id) then 'disponivel'
      else 'bloqueada'
    end,
    exists (select 1 from liberacoes_aula l
            where l.aluno_id = p_aluno and l.aula_id = a.id and l.revogado_em is null)
  from aulas a
  left join lateral (
    select s.status from submissoes s
    where s.aluno_id = p_aluno and s.aula_id = a.id
    order by s.enviado_em desc limit 1
  ) ult on true
  where a.curso_id = p_curso and a.ativa
  order by a.camada, a.ordem;
end $$;

-- =====================================================================
-- 9. Operações (sempre por função — garantem regras e atomicidade)
-- =====================================================================

-- Chamada logo após o login: grava hora do login e presença do dia (aluno)
create or replace function public.registrar_login()
returns void language plpgsql security definer set search_path = public as $$
declare v_papel papel;
begin
  update perfis set ultimo_login_em = now() where id = auth.uid() returning papel into v_papel;
  if v_papel = 'aluno' then
    insert into presencas (aluno_id, data)
    values (auth.uid(), agora_local()::date)
    on conflict (aluno_id, data) do nothing;
  end if;
end $$;

-- Aluno envia a tarefa de uma aula
create or replace function public.enviar_submissao(p_aula uuid, p_link text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if papel_atual() is distinct from 'aluno' then
    raise exception 'apenas alunos enviam tarefas';
  end if;
  if exists (select 1 from submissoes where aluno_id = auth.uid() and aula_id = p_aula and status = 'aprovada') then
    raise exception 'esta aula já foi concluída';
  end if;
  if exists (select 1 from submissoes where aluno_id = auth.uid() and aula_id = p_aula and status = 'nova') then
    raise exception 'já existe uma tarefa aguardando avaliação';
  end if;
  if not aula_disponivel(auth.uid(), p_aula) then
    raise exception 'aula bloqueada';
  end if;

  insert into submissoes (aluno_id, aula_id, link)
  values (auth.uid(), p_aula, trim(p_link))
  returning id into v_id;
  return v_id;
end $$;

-- Aprovar: conclui a aula e credita o Gold, tudo junto
create or replace function public.aprovar_submissao(p_submissao uuid, p_comentario text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_sub submissoes; v_gold integer;
begin
  select * into v_sub from submissoes where id = p_submissao for update;
  if not found then raise exception 'submissão não encontrada'; end if;
  if not pode_gerir_aluno(v_sub.aluno_id) then raise exception 'sem permissão'; end if;
  if v_sub.status <> 'nova' then raise exception 'submissão já avaliada'; end if;

  update submissoes
     set status = 'aprovada', comentario = nullif(trim(p_comentario), ''),
         avaliado_por = auth.uid(), avaliado_em = now()
   where id = p_submissao;

  select gold_recompensa into v_gold from aulas where id = v_sub.aula_id;
  if v_gold > 0 then
    insert into transacoes_gold (aluno_id, valor, motivo, submissao_id, criado_por)
    values (v_sub.aluno_id, v_gold, 'aula_aprovada', p_submissao, auth.uid());
    update perfis set gold_saldo = gold_saldo + v_gold where id = v_sub.aluno_id;
  end if;
end $$;

-- Devolver: comentário obrigatório
create or replace function public.devolver_submissao(p_submissao uuid, p_comentario text)
returns void language plpgsql security definer set search_path = public as $$
declare v_sub submissoes;
begin
  if coalesce(trim(p_comentario), '') = '' then raise exception 'comentário obrigatório ao devolver'; end if;
  select * into v_sub from submissoes where id = p_submissao for update;
  if not found then raise exception 'submissão não encontrada'; end if;
  if not pode_gerir_aluno(v_sub.aluno_id) then raise exception 'sem permissão'; end if;
  if v_sub.status <> 'nova' then raise exception 'submissão já avaliada'; end if;

  update submissoes
     set status = 'devolvida', comentario = trim(p_comentario),
         avaliado_por = auth.uid(), avaliado_em = now()
   where id = p_submissao;
end $$;

-- Comprar item da loja: confere escola e saldo, desconta e registra, tudo junto
create or replace function public.comprar_item(p_item uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_item loja_itens; v_aluno perfis; v_compra uuid;
begin
  select * into v_aluno from perfis where id = auth.uid() for update;
  if v_aluno.papel is distinct from 'aluno' then raise exception 'apenas alunos compram'; end if;

  select * into v_item from loja_itens where id = p_item;
  if not found or not v_item.ativo then raise exception 'item indisponível'; end if;
  if v_item.escola_id <> v_aluno.escola_id then raise exception 'item de outra escola'; end if;
  if v_aluno.gold_saldo < v_item.preco_gold then raise exception 'Gold insuficiente'; end if;

  insert into compras (aluno_id, item_id, preco_pago, status)
  values (v_aluno.id, v_item.id, v_item.preco_gold,
          case when v_item.tipo = 'horas_gaming' then 'aguardando_aviso'::status_compra
               else 'concluida'::status_compra end)
  returning id into v_compra;

  insert into transacoes_gold (aluno_id, valor, motivo, compra_id, criado_por)
  values (v_aluno.id, -v_item.preco_gold, 'compra', v_compra, v_aluno.id);

  update perfis set gold_saldo = gold_saldo - v_item.preco_gold where id = v_aluno.id;
  return v_compra;
end $$;

-- Professor/diretor marca que avisou a Gaming House
create or replace function public.marcar_compra_avisada(p_compra uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_c compras;
begin
  select * into v_c from compras where id = p_compra for update;
  if not found then raise exception 'compra não encontrada'; end if;
  if not pode_gerir_aluno(v_c.aluno_id) then raise exception 'sem permissão'; end if;
  if v_c.status <> 'aguardando_aviso' then raise exception 'compra não está aguardando aviso'; end if;
  update compras set status = 'avisado', avisado_por = auth.uid(), avisado_em = now() where id = p_compra;
end $$;

-- Ajuste manual de Gold (admin / diretor da escola)
create or replace function public.ajustar_gold(p_aluno uuid, p_valor integer, p_descricao text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(papel_atual() not in ('admin', 'diretor'), true) or not pode_gerir_aluno(p_aluno) then
    raise exception 'sem permissão';
  end if;
  if coalesce(trim(p_descricao), '') = '' then raise exception 'motivo obrigatório'; end if;
  -- o check gold_saldo >= 0 impede saldo negativo
  update perfis set gold_saldo = gold_saldo + p_valor where id = p_aluno and papel = 'aluno';
  insert into transacoes_gold (aluno_id, valor, motivo, descricao, criado_por)
  values (p_aluno, p_valor, 'ajuste_manual', trim(p_descricao), auth.uid());
end $$;

-- =====================================================================
-- 10. Faltas
-- =====================================================================

-- Semanas de aula seguidas sem login, da mais recente para trás.
-- Semana da aula = do dia da aula até 6 dias depois.
create or replace function public.faltas_seguidas(p_aluno uuid)
returns integer language plpgsql stable security definer set search_path = public as $$
declare
  v_aluno perfis; v_turma turmas;
  v_agora timestamp := agora_local();
  v_hoje date := v_agora::date;
  v_data date; v_faltas integer := 0; v_i integer := 0;
begin
  select * into v_aluno from perfis where id = p_aluno and papel = 'aluno';
  if not found or v_aluno.turma_id is null then return 0; end if;
  select * into v_turma from turmas where id = v_aluno.turma_id;

  -- última data de aula que já terminou
  v_data := v_hoje - ((extract(dow from v_hoje)::int - v_turma.dia_semana + 7) % 7);
  if v_data = v_hoje and v_agora::time < v_turma.horario_fim then
    v_data := v_data - 7;
  end if;

  while v_i < 104 and v_data >= (v_aluno.criado_em at time zone 'America/Sao_Paulo')::date loop
    v_i := v_i + 1;
    if exists (select 1 from semanas_sem_aula s
               where s.escola_id = v_turma.escola_id and s.data = v_data
                 and (s.turma_id is null or s.turma_id = v_turma.id)) then
      v_data := v_data - 7;
      continue;
    end if;
    exit when exists (select 1 from presencas p
                      where p.aluno_id = p_aluno and p.data between v_data and v_data + 6);
    v_faltas := v_faltas + 1;
    v_data := v_data - 7;
  end loop;
  return v_faltas;
end $$;

-- Painel de faltas: alunos que o usuário pode gerir, com contagem e se o aviso já foi visto
create or replace function public.painel_faltas()
returns table (aluno_id uuid, nome text, turma_id uuid, turma_nome text,
               faltas integer, aviso_visto boolean)
language sql stable security definer set search_path = public as $$
  with base as (
    select a.id, a.nome, a.turma_id, t.nome as turma_nome, faltas_seguidas(a.id) as faltas
    from perfis a
    join turmas t on t.id = a.turma_id
    where a.papel = 'aluno' and a.ativo and pode_gerir_aluno(a.id)
  )
  select b.id, b.nome, b.turma_id, b.turma_nome, b.faltas,
         exists (
           select 1 from alertas_falta_vistos v
           where v.aluno_id = b.id and v.faltas_no_momento >= b.faltas
             and v.visto_em > coalesce((select max(p.registrado_em) from presencas p where p.aluno_id = b.id),
                                       '-infinity'::timestamptz))
  from base b
  order by b.faltas desc, b.nome
$$;

-- =====================================================================
-- 11. Segurança por linha (RLS)
-- =====================================================================
alter table public.escolas              enable row level security;
alter table public.turmas               enable row level security;
alter table public.perfis               enable row level security;
alter table public.turma_professores    enable row level security;
alter table public.cursos               enable row level security;
alter table public.aulas                enable row level security;
alter table public.aula_dependencias    enable row level security;
alter table public.aluno_cursos         enable row level security;
alter table public.liberacoes_aula      enable row level security;
alter table public.submissoes           enable row level security;
alter table public.presencas            enable row level security;
alter table public.semanas_sem_aula     enable row level security;
alter table public.alertas_falta_vistos enable row level security;
alter table public.loja_itens           enable row level security;
alter table public.compras              enable row level security;
alter table public.transacoes_gold      enable row level security;

-- Acesso pela API: só usuários logados (anônimo não vê nada).
-- As políticas abaixo decidem QUAIS linhas cada um vê/altera.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Escolas
create policy escolas_ler on public.escolas for select to authenticated
  using (is_admin() or id = escola_atual());
create policy escolas_admin on public.escolas for all to authenticated
  using (is_admin()) with check (is_admin());

-- Turmas
create policy turmas_ler on public.turmas for select to authenticated
  using (is_admin() or escola_id = escola_atual());
create policy turmas_gerir on public.turmas for all to authenticated
  using (is_admin() or (papel_atual() = 'diretor' and escola_id = escola_atual()))
  with check (is_admin() or (papel_atual() = 'diretor' and escola_id = escola_atual()));

-- Perfis
create policy perfis_ler on public.perfis for select to authenticated
  using (
    id = auth.uid()
    or is_admin()
    or (papel_atual() = 'diretor' and escola_id = escola_atual())
    or (papel_atual() = 'professor' and escola_id = escola_atual() and papel in ('professor', 'diretor'))
    or pode_gerir_aluno(id)
  );
create policy perfis_admin on public.perfis for all to authenticated
  using (is_admin()) with check (is_admin());
create policy perfis_diretor on public.perfis for all to authenticated
  using (papel_atual() = 'diretor' and escola_id = escola_atual() and papel in ('professor', 'aluno'))
  with check (papel_atual() = 'diretor' and escola_id = escola_atual() and papel in ('professor', 'aluno'));
-- gold_saldo e ultimo_login_em só mudam pelas funções
revoke insert, update on public.perfis from authenticated;
grant insert (id, nome, email, papel, escola_id, turma_id, ativo) on public.perfis to authenticated;
grant update (nome, email, papel, escola_id, turma_id, ativo) on public.perfis to authenticated;

-- Professores da turma
create policy tp_ler on public.turma_professores for select to authenticated
  using (is_equipe() and exists (select 1 from turmas t where t.id = turma_id
                                  and (is_admin() or t.escola_id = escola_atual())));
create policy tp_gerir on public.turma_professores for all to authenticated
  using (pode_gerir_turma(turma_id)) with check (pode_gerir_turma(turma_id));

-- Cursos
create policy cursos_ler on public.cursos for select to authenticated
  using (is_equipe() or exists (select 1 from aluno_cursos ac
                                where ac.curso_id = cursos.id and ac.aluno_id = auth.uid()));
create policy cursos_admin on public.cursos for all to authenticated
  using (is_admin()) with check (is_admin());

-- Aulas
create policy aulas_ler on public.aulas for select to authenticated
  using (is_equipe() or (ativa and exists (select 1 from aluno_cursos ac
                                            where ac.curso_id = aulas.curso_id and ac.aluno_id = auth.uid())));
create policy aulas_gerir on public.aulas for all to authenticated
  using (is_equipe()) with check (is_equipe());

create policy deps_ler on public.aula_dependencias for select to authenticated using (true);
create policy deps_gerir on public.aula_dependencias for all to authenticated
  using (is_equipe()) with check (is_equipe());

-- Cursos do aluno e liberações
create policy ac_ler on public.aluno_cursos for select to authenticated
  using (aluno_id = auth.uid() or pode_gerir_aluno(aluno_id));
create policy ac_gerir on public.aluno_cursos for all to authenticated
  using (pode_gerir_aluno(aluno_id)) with check (pode_gerir_aluno(aluno_id));

create policy lib_ler on public.liberacoes_aula for select to authenticated
  using (aluno_id = auth.uid() or pode_gerir_aluno(aluno_id));
create policy lib_gerir on public.liberacoes_aula for all to authenticated
  using (pode_gerir_aluno(aluno_id)) with check (pode_gerir_aluno(aluno_id));

-- Submissões (escrita só pelas funções)
create policy sub_ler on public.submissoes for select to authenticated
  using (aluno_id = auth.uid() or pode_gerir_aluno(aluno_id));

-- Presenças (escrita só por registrar_login)
create policy pres_ler on public.presencas for select to authenticated
  using (aluno_id = auth.uid() or pode_gerir_aluno(aluno_id));

-- Semanas sem aula
create policy ssa_ler on public.semanas_sem_aula for select to authenticated
  using (is_admin() or escola_id = escola_atual());
create policy ssa_gerir on public.semanas_sem_aula for all to authenticated
  using (is_admin()
         or (papel_atual() = 'diretor' and escola_id = escola_atual())
         or (papel_atual() = 'professor' and turma_id is not null and exists (
               select 1 from turma_professores tp where tp.turma_id = semanas_sem_aula.turma_id
                 and tp.professor_id = auth.uid())))
  with check (is_admin()
         or (papel_atual() = 'diretor' and escola_id = escola_atual())
         or (papel_atual() = 'professor' and turma_id is not null and exists (
               select 1 from turma_professores tp where tp.turma_id = semanas_sem_aula.turma_id
                 and tp.professor_id = auth.uid())));

-- Alertas de falta vistos
create policy afv_ler on public.alertas_falta_vistos for select to authenticated
  using (pode_gerir_aluno(aluno_id));
create policy afv_criar on public.alertas_falta_vistos for insert to authenticated
  with check (pode_gerir_aluno(aluno_id) and visto_por = auth.uid());

-- Loja
create policy loja_ler on public.loja_itens for select to authenticated
  using (is_admin() or (escola_id = escola_atual() and (ativo or is_equipe())));
create policy loja_gerir on public.loja_itens for all to authenticated
  using (is_admin() or (papel_atual() = 'diretor' and escola_id = escola_atual()))
  with check (is_admin() or (papel_atual() = 'diretor' and escola_id = escola_atual()));

-- Compras e extrato (escrita só pelas funções)
create policy compras_ler on public.compras for select to authenticated
  using (aluno_id = auth.uid() or pode_gerir_aluno(aluno_id));
create policy gold_ler on public.transacoes_gold for select to authenticated
  using (aluno_id = auth.uid() or pode_gerir_aluno(aluno_id));

-- Funções: só usuários logados
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- =====================================================================
-- 12. Storage (arquivos da loja)
-- Caminho dos arquivos: <escola_id>/<nome-do-arquivo>
-- =====================================================================
insert into storage.buckets (id, name, public) values
  ('loja-imagens', 'loja-imagens', true),
  ('loja-arquivos', 'loja-arquivos', false)
on conflict (id) do nothing;

create policy loja_upload on storage.objects for insert to authenticated
  with check (bucket_id in ('loja-imagens', 'loja-arquivos')
              and (public.is_admin() or (public.papel_atual() = 'diretor'
                   and (storage.foldername(name))[1] = public.escola_atual()::text)));
create policy loja_alterar on storage.objects for update to authenticated
  using (bucket_id in ('loja-imagens', 'loja-arquivos')
         and (public.is_admin() or (public.papel_atual() = 'diretor'
              and (storage.foldername(name))[1] = public.escola_atual()::text)));
create policy loja_apagar on storage.objects for delete to authenticated
  using (bucket_id in ('loja-imagens', 'loja-arquivos')
         and (public.is_admin() or (public.papel_atual() = 'diretor'
              and (storage.foldername(name))[1] = public.escola_atual()::text)));
-- download do arquivo: equipe da escola ou aluno que comprou o item
create policy loja_baixar on storage.objects for select to authenticated
  using (bucket_id = 'loja-arquivos' and (
    public.is_admin()
    or (public.is_equipe() and (storage.foldername(name))[1] = public.escola_atual()::text)
    or exists (select 1 from public.compras c
               join public.loja_itens i on i.id = c.item_id
               where c.aluno_id = auth.uid() and i.arquivo_path = storage.objects.name)
  ));
