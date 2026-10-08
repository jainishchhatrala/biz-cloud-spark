ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS kg_per_meter numeric;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS scrap_stock numeric NOT NULL DEFAULT 0;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS entry_unit text;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS entry_qty numeric;
ALTER TABLE public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_txn_type_check;
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_txn_type_check CHECK (txn_type in ('IN','OUT','ADJUSTMENT','SCRAP','SCRAP_SALE'));
CREATE OR REPLACE FUNCTION public.apply_inventory_txn()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare cur numeric; scr numeric;
begin
  select current_stock, scrap_stock into cur, scr from public.inventory_items where id = new.item_id for update;
  if not found then raise exception 'Inventory item not found'; end if;
  if new.txn_type in ('OUT','SCRAP') and cur - new.quantity < 0 and not new.allow_negative then
    raise exception 'Insufficient stock. Current %, requested %.', cur, new.quantity;
  end if;
  if new.txn_type = 'SCRAP_SALE' and scr - new.quantity < 0 and not new.allow_negative then
    raise exception 'Insufficient scrap. Current %, requested %.', scr, new.quantity;
  end if;
  update public.inventory_items set
    current_stock = case
      when new.txn_type = 'IN' then cur + new.quantity
      when new.txn_type in ('OUT','SCRAP') then cur - new.quantity
      when new.txn_type = 'ADJUSTMENT' then new.quantity
      else cur end,
    scrap_stock = case
      when new.txn_type = 'SCRAP' then scr + new.quantity
      when new.txn_type = 'SCRAP_SALE' then scr - new.quantity
      else scr end
  where id = new.item_id;
  return new;
end $function$;