CREATE OR REPLACE FUNCTION public.reapply_inventory_txn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare cur numeric; scr numeric;
begin
  -- reverse old effect
  select current_stock, scrap_stock into cur, scr from public.inventory_items where id = old.item_id for update;
  if found then
    update public.inventory_items set
      current_stock = case when old.txn_type='IN' then cur - old.quantity
        when old.txn_type in ('OUT','SCRAP') then cur + old.quantity else cur end,
      scrap_stock = case when old.txn_type='SCRAP' then scr - old.quantity
        when old.txn_type='SCRAP_SALE' then scr + old.quantity else scr end
    where id = old.item_id;
  end if;
  -- apply new effect
  select current_stock, scrap_stock into cur, scr from public.inventory_items where id = new.item_id for update;
  if not found then raise exception 'Inventory item not found'; end if;
  if new.txn_type in ('OUT','SCRAP') and cur - new.quantity < 0 and not new.allow_negative then
    raise exception 'Insufficient stock. Current %, requested %.', cur, new.quantity;
  end if;
  if new.txn_type = 'SCRAP_SALE' and scr - new.quantity < 0 and not new.allow_negative then
    raise exception 'Insufficient scrap. Current %, requested %.', scr, new.quantity;
  end if;
  update public.inventory_items set
    current_stock = case when new.txn_type='IN' then cur + new.quantity
      when new.txn_type in ('OUT','SCRAP') then cur - new.quantity
      when new.txn_type='ADJUSTMENT' then new.quantity else cur end,
    scrap_stock = case when new.txn_type='SCRAP' then scr + new.quantity
      when new.txn_type='SCRAP_SALE' then scr - new.quantity else scr end
  where id = new.item_id;
  return new;
end $$;
REVOKE EXECUTE ON FUNCTION public.reapply_inventory_txn() FROM anon, public;
CREATE TRIGGER trg_reapply_inventory_txn AFTER UPDATE OF item_id, txn_type, quantity ON public.inventory_transactions
FOR EACH ROW EXECUTE FUNCTION public.reapply_inventory_txn();
GRANT UPDATE ON public.inventory_transactions TO authenticated;
CREATE POLICY "txn update" ON public.inventory_transactions FOR UPDATE TO authenticated
USING (public.has_perm('inventory','edit')) WITH CHECK (public.has_perm('inventory','edit'));