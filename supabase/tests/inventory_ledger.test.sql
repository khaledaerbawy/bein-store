-- Inventory ledger invariants, executed only against the disposable CI database.

DO $test$
DECLARE
  v_product uuid := '44444444-4444-4444-8444-444444444444';
  v_movement_id uuid;
  v_key text := 'ci-ledger-idempotency-key';
  v_count integer;
  v_type text;
  v_source text;
BEGIN
  INSERT INTO public.products(id, name_ar, sku, price_egp, is_active)
  VALUES (v_product, 'منتج اختبار دفتر المخزون', 'CI-LEDGER', 100, true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.inventory(product_id, quantity_on_hand)
  VALUES (v_product, 8)
  ON CONFLICT (product_id) DO NOTHING;

  -- Old callers that do not yet pass metadata still receive normalized metadata.
  INSERT INTO public.inventory_movements(product_id, quantity_delta, reason, reference)
  VALUES (v_product, 2, 'manual_adjustment', 'CI opening test')
  RETURNING id, movement_type, source_type
  INTO v_movement_id, v_type, v_source;

  IF v_type <> 'adjustment_in' OR v_source <> 'stock_adjustment' THEN
    RAISE EXCEPTION 'TEST FAILED: legacy insert was not normalized';
  END IF;

  -- Explicit idempotency keys are globally unique.
  INSERT INTO public.inventory_movements(
    product_id, quantity_delta, reason, reference,
    movement_type, source_type, source_id, idempotency_key
  ) VALUES (
    v_product, -1, 'CI idempotency test', 'CI source',
    'adjustment_out', 'stock_adjustment', 'ci-source-1', v_key
  );

  BEGIN
    INSERT INTO public.inventory_movements(
      product_id, quantity_delta, reason, reference,
      movement_type, source_type, source_id, idempotency_key
    ) VALUES (
      v_product, -1, 'CI duplicate test', 'CI source',
      'adjustment_out', 'stock_adjustment', 'ci-source-1', v_key
    );
    RAISE EXCEPTION 'TEST FAILED: duplicate idempotency key was accepted';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  SELECT count(*) INTO v_count
  FROM public.inventory_movements
  WHERE idempotency_key = v_key;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: idempotency key should have exactly one row';
  END IF;

  -- UPDATE, DELETE, and TRUNCATE must all be rejected, including privileged SQL callers.
  BEGIN
    UPDATE public.inventory_movements
    SET reason = 'tampered'
    WHERE id = v_movement_id;
    RAISE EXCEPTION 'TEST FAILED: UPDATE was accepted';
  EXCEPTION
    WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    DELETE FROM public.inventory_movements WHERE id = v_movement_id;
    RAISE EXCEPTION 'TEST FAILED: DELETE was accepted';
  EXCEPTION
    WHEN SQLSTATE '55000' THEN NULL;
  END;

  BEGIN
    EXECUTE 'TRUNCATE TABLE public.inventory_movements';
    RAISE EXCEPTION 'TEST FAILED: TRUNCATE was accepted';
  EXCEPTION
    WHEN SQLSTATE '55000' THEN NULL;
  END;

  SELECT count(*) INTO v_count
  FROM public.inventory_movements
  WHERE id = v_movement_id;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: immutable movement disappeared';
  END IF;

  -- The existing checkout and cancellation movements are normalized too.
  IF EXISTS (
    SELECT 1 FROM public.inventory_movements
    WHERE reason = 'بيع عبر المتجر'
      AND movement_type <> 'sale_delivery'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: checkout movement was not classified';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.inventory_movements
    WHERE reason LIKE 'إرجاع مخزون%'
      AND movement_type <> 'sales_return'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: cancellation movement was not classified';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.inventory_movements
    WHERE movement_type = 'sales_return'
      AND reverses_movement_id IS NULL
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: sales return is not linked to its original sale';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_movements
    WHERE product_id = '55555555-5555-4555-8555-555555555555'
      AND movement_type = 'legacy'
      AND source_type = 'legacy'
      AND source_id = id::text
      AND idempotency_key = 'legacy:' || id::text
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: historical movement was not safely backfilled';
  END IF;
END;
$test$;
