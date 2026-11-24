-- Contrato do aluno: o acesso vale de acesso_inicio até acesso_fim.
--  contrato     → N meses a partir da data de início (alterável pela coordenação)
--  experimental → 24 horas de acesso (aula experimental)
-- Aluno sem datas (cadastrado antes desta regra) continua com acesso, mas aparece
-- como "sem contrato" no painel para a coordenação regularizar.

create type public.tipo_acesso as enum ('contrato', 'experimental');

alter table public.perfis
  add column tipo_acesso    public.tipo_acesso,
  add column acesso_inicio  timestamptz,
  add column acesso_fim     timestamptz,
  add column contrato_meses smallint check (contrato_meses between 1 and 60),
  add constraint perfis_acesso_periodo check (acesso_fim is null or acesso_inicio is null or acesso_fim > acesso_inicio),
  add constraint perfis_acesso_so_aluno check (papel = 'aluno' or (tipo_acesso is null and acesso_inicio is null and acesso_fim is null));

create index on public.perfis (acesso_fim) where papel = 'aluno';

-- Aluno fora do período de acesso perde todas as permissões no banco
-- (além do bloqueio no login e no site).
create or replace function public.papel_atual()
returns public.papel language sql stable security definer set search_path = public as $$
  select papel from perfis
  where id = auth.uid() and ativo
    and (papel <> 'aluno' or (
      (acesso_inicio is null or acesso_inicio <= now()) and
      (acesso_fim is null or acesso_fim > now())))
$$;

-- Login de aluno fora do período não registra presença
create or replace function public.registrar_login()
returns void language plpgsql security definer set search_path = public as $$
declare v_papel papel;
begin
  update perfis set ultimo_login_em = now() where id = auth.uid() returning papel into v_papel;
  if v_papel = 'aluno' and papel_atual() = 'aluno' then
    insert into presencas (aluno_id, data)
    values (auth.uid(), agora_local()::date)
    on conflict (aluno_id, data) do nothing;
  end if;
end $$;

-- Coordenação/admin gravam o contrato (as policies de perfis já limitam à escola)
grant insert (tipo_acesso, acesso_inicio, acesso_fim, contrato_meses) on public.perfis to authenticated;
grant update (tipo_acesso, acesso_inicio, acesso_fim, contrato_meses) on public.perfis to authenticated;
