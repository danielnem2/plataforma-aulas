-- Só o ADM cria, edita, remove e reorganiza aulas.
-- Professor e coordenador apenas veem as aulas e enviam dúvidas (revisoes_aula).

drop policy aulas_gerir on public.aulas;
create policy aulas_gerir on public.aulas for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy deps_gerir on public.aula_dependencias;
create policy deps_gerir on public.aula_dependencias for all to authenticated
  using (is_admin()) with check (is_admin());

create or replace function public.remover_aula(p_aula uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_curso uuid; v_resultado text;
begin
  if not is_admin() then raise exception 'Só o ADM remove aulas'; end if;
  select curso_id into v_curso from aulas where id = p_aula;
  if v_curso is null then raise exception 'Aula não encontrada'; end if;

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

create or replace function public.inserir_aula_depois(p_nova uuid, p_anterior uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_curso uuid;
begin
  if not is_admin() then raise exception 'Só o ADM organiza aulas'; end if;
  select curso_id into v_curso from aulas where id = p_nova;
  if v_curso is null or v_curso <> (select curso_id from aulas where id = p_anterior) then
    raise exception 'As aulas precisam ser do mesmo curso';
  end if;

  delete from aula_dependencias where aula_id = p_nova;
  insert into aula_dependencias (aula_id, depende_de_id)
  select aula_id, p_nova from aula_dependencias
  where depende_de_id = p_anterior and aula_id <> p_nova
  on conflict do nothing;
  delete from aula_dependencias where depende_de_id = p_anterior and aula_id <> p_nova;
  insert into aula_dependencias (aula_id, depende_de_id) values (p_nova, p_anterior);

  perform reorganizar_curso(v_curso);
end $$;

create or replace function public.reorganizar_curso_equipe(p_curso uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Só o ADM organiza aulas'; end if;
  perform reorganizar_curso(p_curso);
end $$;
