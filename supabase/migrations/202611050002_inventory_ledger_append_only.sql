-- Append-only inventory ledger metadata and database-level invariants.
-- Safe for existing rows: legacy movements are backfilled with stable per-row keys.
-- This migration is intended for review and disposable CI only until separately approved.

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS movement_type text,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS reverses_movement_id uuid;

UPDATE public.inventory_movements
SET movement_type = COALESCE(movement_type, 'legacy'),
    source_type = COALESCE(source_type, 'legacy'),
    source_id = COALESCE(source_id, id::text),
    idempotency_key = COALESCE(idempotency_key, 'legacy:' || id::text)
WHERE movement_type IS NULL
   OR source_type IS NULL
   OR source_id IS NULL
   OR idempotency_key IS NULL;

ALTER TABLE public.inventory_movements
  ALTER COLUMN movement_type SET NOT NULL,
  ALTER COLUMN source_type SET NOT NULL,
  ALTER COLUMN source_id SET NOT NULL,
  ALTER COLUMN idempotency_key SET NOT NULL;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_movements'::regclass
      AND conname = 'inventory_movements_source_type_check'
  ) THEN
    ALTER TABLE public.inventory_movements
      ADD CONSTRAINT inventory_movements_source_type_check
      CHECK (length(btrim(source_type)) > 0 AND length(btrim(source_id)) > 0 AND length(btrim(idempotency_key)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_movements'::regclass
      AND conname = 'inventory_movements_type_check'
  ) THEN
    ALTER TABLE public.inventory_movements
      ADD CONSTRAINT inventory_movements_type_check
      CHECK (movement_type IN (
        'legacy', 'opening', 'purchase_receipt', 'sale_delivery',
        'sales_return', 'purchase_return', 'adjustment_in',
        'adjustment_out', 'transfer_in', 'transfer_out'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_movements'::regclass
      AND conname = 'inventory_movements_direction_check'
  ) THEN
    ALTER TABLE public.inventory_movements
      ADD CONSTRAINT inventory_movements_direction_check
      CHECK (
        movement_type = 'legacy'
        OR (movement_type IN ('opening', 'purchase_receipt', 'sales_return', 'adjustment_in', 'transfer_in') AND quantity_delta > 0)
        OR (movement_type IN ('sale_delivery', 'purchase_return', 'adjustment_out', 'transfer_out') AND quantity_delta < 0)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_movements'::regclass
      AND conname = 'inventory_movements_reversal_fk'
  ) THEN
    ALTER TABLE public.inventory_movements
      ADD CONSTRAINT inventory_movements_reversal_fk
      FOREIGN KEY (reverses_movement_id)
      REFERENCES public.inventory_movements(id)
      ON DELETE RESTRICT;
  END IF;
END
$migration$;

-- Preserve immutable audit references when an auth user is deleted.
-- SET NULL would attempt to UPDATE an append-only ledger row.
DO $foreign_key$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory_movements'::regclass
      AND conname = 'inventory_movements_created_by_fkey'
  ) THEN
    ALTER TABLE public.inventory_movements
      DROP CONSTRAINT inventory_movements_created_by_fkey;
    ALTER TABLE public.inventory_movements
      ADD CONSTRAINT inventory_movements_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;
END
$foreign_key$;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_idempotency_key_uidx
  ON public.inventory_movements(idempotency_key);
CREATE INDEX IF NOT EXISTS inventory_movements_source_idx
  ON public.inventory_movements(source_type, source_id);

CREATE OR REPLACE FUNCTION public.prepare_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_reference text := COALESCE(NULLIF(BTRIM(NEW.reference), ''), '');
  v_reason text := COALESCE(NULLIF(BTRIM(NEW.reason), ''), 'Inventory movement');
  v_original_movement_id uuid;
BEGIN
  IF NEW.movement_type IS NULL THEN
    IF v_reason = 'بيع عبر المتجر' AND v_reference LIKE 'Order #%'
       AND NEW.quantity_delta < 0 THEN
      NEW.movement_type := 'sale_delivery';
    ELSIF v_reason LIKE 'إرجاع مخزون%' AND v_reference LIKE 'Return for Order #%'
       AND NEW.quantity_delta > 0 THEN
      NEW.movement_type := 'sales_return';
    ELSIF v_reason = 'opening_balance' AND NEW.quantity_delta > 0 THEN
      NEW.movement_type := 'opening';
    ELSIF NEW.quantity_delta > 0 THEN
      NEW.movement_type := 'adjustment_in';
    ELSE
      NEW.movement_type := 'adjustment_out';
    END IF;
  END IF;

  IF NEW.source_type IS NULL THEN
    NEW.source_type := CASE NEW.movement_type
      WHEN 'sale_delivery' THEN 'sales_order'
      WHEN 'sales_return' THEN 'sales_order_cancellation'
      WHEN 'opening' THEN 'opening_balance'
      WHEN 'purchase_receipt' THEN 'purchase_receipt'
      WHEN 'purchase_return' THEN 'purchase_return'
      WHEN 'transfer_in' THEN 'stock_transfer'
      WHEN 'transfer_out' THEN 'stock_transfer'
      ELSE 'stock_adjustment'
    END;
  END IF;

  IF NEW.source_id IS NULL THEN
    NEW.source_id := COALESCE(NULLIF(v_reference, ''), NEW.id::text);
  END IF;

  IF NEW.idempotency_key IS NULL THEN
    NEW.idempotency_key := CASE NEW.movement_type
      WHEN 'sale_delivery' THEN 'sale:' || NEW.product_id::text || ':' || v_reference
      WHEN 'sales_return' THEN 'return:' || NEW.product_id::text || ':' || v_reference || ':' || v_reason
      ELSE 'movement:' || NEW.id::text
    END;
  END IF;

  IF NEW.movement_type = 'sales_return'
     AND NEW.reverses_movement_id IS NULL
     AND v_reference LIKE 'Return for Order #%'
  THEN
    SELECT im.id INTO v_original_movement_id
    FROM public.inventory_movements im
    WHERE im.product_id = NEW.product_id
      AND im.reference = replace(v_reference, 'Return for Order #', 'Order #')
      AND im.movement_type = 'sale_delivery'
      AND im.quantity_delta < 0
    ORDER BY im.created_at DESC
    LIMIT 1;
    NEW.reverses_movement_id := v_original_movement_id;
  END IF;

  NEW.reason := v_reason;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_inventory_movement_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'INVENTORY_LEDGER_IS_APPEND_ONLY'
    USING ERRCODE = '55000';
END;
$function$;

DROP TRIGGER IF EXISTS prepare_inventory_movement ON public.inventory_movements;
CREATE TRIGGER prepare_inventory_movement
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.prepare_inventory_movement();

DROP TRIGGER IF EXISTS inventory_movements_no_update_delete ON public.inventory_movements;
CREATE TRIGGER inventory_movements_no_update_delete
BEFORE UPDATE OR DELETE ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION public.reject_inventory_movement_mutation();

DROP TRIGGER IF EXISTS inventory_movements_no_truncate ON public.inventory_movements;
CREATE TRIGGER inventory_movements_no_truncate
BEFORE TRUNCATE ON public.inventory_movements
FOR EACH STATEMENT
EXECUTE FUNCTION public.reject_inventory_movement_mutation();

COMMENT ON COLUMN public.inventory_movements.movement_type IS
  'Normalized movement classification; legacy preserves historical rows.';
COMMENT ON COLUMN public.inventory_movements.source_type IS
  'Domain document type that originated this movement.';
COMMENT ON COLUMN public.inventory_movements.source_id IS
  'Stable identifier/reference of the originating domain document.';
COMMENT ON COLUMN public.inventory_movements.idempotency_key IS
  'Unique key preventing duplicate ledger entries for the same source event.';
COMMENT ON COLUMN public.inventory_movements.reverses_movement_id IS
  'Original movement reversed by this compensating movement, when applicable.';
