-- O aluno continua vendo (e baixando) itens que comprou,
-- mesmo que a loja tire o item de venda depois.
create policy loja_ler_comprados on public.loja_itens for select to authenticated using (exists (select 1 from public.compras c where c.item_id = loja_itens.id and c.aluno_id = auth.uid()));
