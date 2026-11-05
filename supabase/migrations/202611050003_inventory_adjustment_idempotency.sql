-- Idempotent admin stock adjustments.
-- The request receipt protects retries even when the requested quantity is unchanged
-- and therefore no non-zero ledger movement is needed.

CREATE TABLE IF NOT EXISTS public.inventory_adjustment_requests (
  idempotency_key text PRIMARY KEY
    CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 160),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  target_quantity integer NOT NULL CHECK (target_quantity >= 0),
  low_stock_threshold integer NOT NULL CHECK (low_stock_threshold >= 0),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 240),
  reference text,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_adjustment_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.inventory_adjustment_requests FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reject_inventory_adjustment_request_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'INVENTORY_ADJUSTMENT_REQUESTS_ARE_IMMUTABLE'
    USING ERRCODE = '55000';
END;
$function$;

DROP TRIGGER IF EXISTS inventory_adjustment_requests_no_update_delete
  ON public.inventory_adjustment_requests;
CREATE TRIGGER inventory_adjustment_requests_no_update_delete
BEFORE UPDATE OR DELETE ON public.inventory_adjustment_requests
FOR EACH ROW
EXECUTE FUNCTION public.reject_inventory_adjustment_request_mutation();

DROP TRIGGER IF EXISTS inventory_adjustment_requests_no_truncate
  ON public.inventory_adjustment_requests;
CREATE TRIGGER inventory_adjustment_requests_no_truncate
BEFORE TRUNCATE ON public.inventory_adjustment_requests
FOR EACH STATEMENT
EXECUTE FUNCTION public.reject_inventory_adjustment_request_mutation();

CREATE OR REPLACE FUNCTION public.admin_adjust_inventory_idempotent(
  p_product_id uuid,
  p_new_quantity integer,
  p_low_stock_threshold integer,
  p_reason text,
  p_reference text,
  p_idempotency_key text
)
RETURNS TABLE (
  quantity_on_hand integer,
  low_stock_threshold integer,
  quantity_delta integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_reason text := NULLIF(BTRIM(p_reason), '');
  v_reference text := NULLIF(BTRIM(p_reference), '');
  v_existing public.inventory_adjustment_requests%ROWTYPE;
  v_inserted_rows integer;
  v_created_product uuid;
  v_created_inventory boolean := false;
  v_old_quantity integer;
  v_delta integer;
  v_movement_type text;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = v_user_id AND ar.is_active = true
  ) THEN
    RAISE EXCEPTION 'ADMIN_ACCESS_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_product_id IS NULL
     OR p_new_quantity IS NULL OR p_new_quantity < 0
     OR p_low_stock_threshold IS NULL OR p_low_stock_threshold < 0
     OR v_reason IS NULL OR length(v_reason) > 240
     OR (v_reference IS NOT NULL AND length(v_reference) > 160)
     OR p_idempotency_key IS NULL
     OR length(btrim(p_idempotency_key)) < 8
     OR length(btrim(p_idempotency_key)) > 160
  THEN
    RAISE EXCEPTION 'INVALID_INVENTORY_ADJUSTMENT'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = p_product_id
  ) THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- A request receipt is written even for a zero-delta adjustment.
  -- ON CONFLICT waits for a concurrent request with the same key to commit.
  INSERT INTO public.inventory_adjustment_requests (
    idempotency_key, product_id, target_quantity, low_stock_threshold,
    reason, reference, requested_by
  )
  VALUES (
    btrim(p_idempotency_key), p_product_id, p_new_quantity,
    p_low_stock_threshold, v_reason, v_reference, v_user_id
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

  IF v_inserted_rows = 0 THEN
    SELECT * INTO v_existing
    FROM public.inventory_adjustment_requests r
    WHERE r.idempotency_key = btrim(p_idempotency_key)
    FOR UPDATE;

    IF v_existing.product_id IS DISTINCT FROM p_product_id
       OR v_existing.target_quantity IS DISTINCT FROM p_new_quantity
       OR v_existing.low_stock_threshold IS DISTINCT FROM p_low_stock_threshold
       OR v_existing.reason IS DISTINCT FROM v_reason
       OR v_existing.reference IS DISTINCT FROM v_reference
       OR v_existing.requested_by IS DISTINCT FROM v_user_id
    THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED'
        USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT i.quantity_on_hand, i.low_stock_threshold, 0
    FROM public.inventory i
    WHERE i.product_id = p_product_id;
    RETURN;
  END IF;

  INSERT INTO public.inventory (
    product_id, quantity_on_hand, low_stock_threshold, updated_at
  )
  VALUES (p_product_id, 0, p_low_stock_threshold, clock_timestamp())
  ON CONFLICT (product_id) DO NOTHING
  RETURNING product_id INTO v_created_product;
  v_created_inventory := FOUND;

  SELECT i.quantity_on_hand INTO v_old_quantity
  FROM public.inventory i
  WHERE i.product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVENTORY_ROW_COULD_NOT_BE_CREATED';
  END IF;

  v_delta := p_new_quantity - v_old_quantity;

  IF v_delta <> 0 THEN
    v_movement_type := CASE
      WHEN v_created_inventory AND v_delta > 0 THEN 'opening'
      WHEN v_delta > 0 THEN 'adjustment_in'
      ELSE 'adjustment_out'
    END;

    INSERT INTO public.inventory_movements (
      product_id, quantity_delta, reason, reference, created_by,
      movement_type, source_type, source_id, idempotency_key
    )
    VALUES (
      p_product_id, v_delta, v_reason, v_reference, v_user_id,
      v_movement_type, 'stock_adjustment', btrim(p_idempotency_key),
      'admin-adjustment:' || btrim(p_idempotency_key)
    );
  END IF;

  UPDATE public.inventory
  SET quantity_on_hand = p_new_quantity,
      low_stock_threshold = p_low_stock_threshold,
      updated_at = clock_timestamp()
  WHERE product_id = p_product_id;

  RETURN QUERY
  SELECT i.quantity_on_hand, i.low_stock_threshold, v_delta
  FROM public.inventory i
  WHERE i.product_id = p_product_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_adjust_inventory_idempotent(uuid, integer, integer, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_inventory_idempotent(uuid, integer, integer, text, text, text)
  TO authenticated;
