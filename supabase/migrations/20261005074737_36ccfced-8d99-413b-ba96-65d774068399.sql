
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.my_role() from public, anon;
revoke execute on function public.has_perm(text, text) from public, anon;
revoke execute on function public.is_dealer() from public, anon;
revoke execute on function public.next_doc_number(text) from public, anon;
revoke execute on function public.apply_inventory_txn() from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.my_role() to authenticated;
grant execute on function public.has_perm(text, text) to authenticated;
grant execute on function public.is_dealer() to authenticated;
grant execute on function public.next_doc_number(text) to authenticated;
create policy "no direct access" on public.doc_counters for select to authenticated using (false);
