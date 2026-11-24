-- Cadeia de aulas automática
-- * camada (coluna do mapa), ordem (posição na coluna) e nº da missão passam a ser
--   calculados pelos pré-requisitos — ninguém precisa mais digitar.
-- * remover_aula: tira a aula da cadeia ligando quem dependia dela aos pré-requisitos dela.
-- * inserir_aula_depois: encaixa uma aula logo depois de outra, no meio da cadeia.

-- Recalcula camada / ordem / nº da missão de todas as aulas de um curso
create or replace function public.reorganizar_curso(p_curso uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_nivel int := 0; v_max int;
begin
  -- camada = maior distância até uma aula sem pré-requisito
  with recursive prof(id, nivel) as (
    select a.id, 0 from aulas a
    where a.curso_id = p_curso
      and not exists (select 1 from aula_dependencias d where d.aula_id = a.id)
    union all
    select d.aula_id, p.nivel + 1
    from prof p join aula_dependencias d on d.depende_de_id = p.id
    where p.nivel < 200
  )
  update aulas a set camada = n.nivel
  from (select id, max(nivel) as nivel from prof group by id) n
  where a.id = n.id;

  -- ordem dentro da camada: alinhada com o pré-requisito (evita linhas cruzadas)
  select coalesce(max(camada), 0) into v_max from aulas where curso_id = p_curso;
  while v_nivel <= v_max loop
    update aulas a set ordem = x.pos
    from (
      select b.id,
             row_number() over (
               order by coalesce((select min(p.ordem) from aula_dependencias d join aulas p on p.id = d.depende_de_id
                                  where d.aula_id = b.id), 0),
                        b.numero_missao, b.criado_em) - 1 as pos
      from aulas b where b.curso_id = p_curso and b.camada = v_nivel
    ) x
    where a.id = x.id;
    v_nivel := v_nivel + 1;
  end loop;

  -- nº da missão: sequência pelo mapa (aulas ativas primeiro)
  update aulas a set numero_missao = x.seq
  from (
    select id, row_number() over (order by (not ativa), camada, ordem, criado_em) as seq
    from aulas where curso_id = p_curso
  ) x
  where a.id = x.id;
end $$;

-- Remove a aula da cadeia. Sem histórico de entregas: exclui. Com histórico: arquiva (inativa).
create or replace function public.remover_aula(p_aula uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_curso uuid; v_resultado text;
begin
  if coalesce(papel_atual() not in ('admin', 'diretor'), true) then
    raise exception 'Sem permissão para remover aulas';
  end if;
  select curso_id into v_curso from aulas where id = p_aula;
  if v_curso is null then raise exception 'Aula não encontrada'; end if;

  -- quem dependia dela passa a depender dos pré-requisitos dela
  insert into aula_dependencias (aula_id, depende_de_id)
  select f.aula_id, p.depende_de_id
  from aula_dependencias f
  join aula_dependencias p on p.aula_id = p_aula
  where f.depende_de_id = p_aula and f.aula_id <> p.depende_de_id
  on conflict do nothing;
  delete from aula_dependencias where aula_id = p_aula or depende_de_id = p_aula;

  if exists (select 1 from submissoes where aula_id = p_aula) then
    update aulas set ativa = false where id = p_aula;
    v_resultado := 'arquivada';
  else
    delete from aulas where id = p_aula;
    v_resultado := 'excluida';
  end if;

  perform reorganizar_curso(v_curso);
  return v_resultado;
end $$;

-- Encaixa p_nova logo depois de p_anterior: o que vinha depois de p_anterior passa a vir depois de p_nova
create or replace function public.inserir_aula_depois(p_nova uuid, p_anterior uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_curso uuid;
begin
  if not is_equipe() then raise exception 'Sem permissão'; end if;
  select curso_id into v_curso from aulas where id = p_nova;
  if v_curso is null or v_curso <> (select curso_id from aulas where id = p_anterior) then
    raise exception 'As aulas precisam ser do mesmo curso';
  end if;

  delete from aula_dependencias where aula_id = p_nova;
  -- seguidoras de p_anterior passam a depender de p_nova
  insert into aula_dependencias (aula_id, depende_de_id)
  select aula_id, p_nova from aula_dependencias
  where depende_de_id = p_anterior and aula_id <> p_nova
  on conflict do nothing;
  delete from aula_dependencias where depende_de_id = p_anterior and aula_id <> p_nova;
  insert into aula_dependencias (aula_id, depende_de_id) values (p_nova, p_anterior);

  perform reorganizar_curso(v_curso);
end $$;

-- Equipe pode pedir a reorganização depois de criar/editar
create or replace function public.reorganizar_curso_equipe(p_curso uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_equipe() then raise exception 'Sem permissão'; end if;
  perform reorganizar_curso(p_curso);
end $$;

revoke execute on function public.reorganizar_curso(uuid) from public, anon, authenticated;
revoke execute on function public.remover_aula(uuid) from public, anon;
revoke execute on function public.inserir_aula_depois(uuid, uuid) from public, anon;
revoke execute on function public.reorganizar_curso_equipe(uuid) from public, anon;
grant execute on function public.remover_aula(uuid) to authenticated;
grant execute on function public.inserir_aula_depois(uuid, uuid) to authenticated;
grant execute on function public.reorganizar_curso_equipe(uuid) to authenticated;

-- Organiza os cursos que já existem
select public.reorganizar_curso(id) from public.cursos;
