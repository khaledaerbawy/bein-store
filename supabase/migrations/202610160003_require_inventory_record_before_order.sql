-- Fail closed on new public orders when a product has no inventory ledger row.
-- The legacy order RPC silently skipped stock deductions when inventory was absent.
-- A BEFORE INSERT trigger on order_items aborts the whole order transaction in that case.
CREATE OR REPLACE FUNCTION public.require_tracked_inventory_for_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.product_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.inventory i WHERE i.product_id = NEW.product_id
     ) THEN
    RAISE EXCEPTION 'INVENTORY_NOT_CONFIGURED'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.require_tracked_inventory_for_order_item() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS require_tracked_inventory_for_order_item ON public.order_items;
CREATE TRIGGER require_tracked_inventory_for_order_item
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.require_tracked_inventory_for_order_item();
