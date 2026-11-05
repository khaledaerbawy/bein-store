-- Idempotent admin inventory adjustment tests in disposable PostgreSQL only.

DO $test$
DECLARE
  v_admin uuid := '66666666-6666-4666-8666-666666666666';
  v_non_admin uuid := '77777777-7777-4777-8777-777777777777';
  v_product uuid := '88888888-8888-4888-8888-888888888888';
  v_quantity integer;
  v_threshold integer;
  v_delta integer;
  v_count integer;
BEGIN
  INSERT INTO auth.users(id) VALUES (v_admin), (v_non_admin)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.admin_roles(user_id, is_active) VALUES (v_admin, true)
  ON CONFLICT (user_id) DO UPDATE SET is_active = true;
  INSERT INTO public.products(id, name_ar, sku, price_egp, is_active)
  VALUES (v_product, 'منتج تعديل المخزون', 'CI-ADJUST-IDEMPOTENT', 120, true)
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);

  SELECT quantity_on_hand, low_stock_threshold, quantity_delta
  INTO v_quantity, v_threshold, v_delta
  FROM public.admin_adjust_inventory_idempotent(
    v_product, 12, 2, 'توريد', 'CI-INV-001', 'ci-adjustment-key-1'
  );

  IF v_quantity <> 12 OR v_threshold <> 2 OR v_delta <> 12 THEN
    RAISE EXCEPTION 'TEST FAILED: first adjustment did not set expected stock';
  END IF;

  -- Repeating the same request must not add stock a second time.
  SELECT quantity_on_hand, low_stock_threshold, quantity_delta
  INTO v_quantity, v_threshold, v_delta
  FROM public.admin_adjust_inventory_idempotent(
    v_product, 12, 2, 'توريد', 'CI-INV-001', 'ci-adjustment-key-1'
  );

  SELECT count(*) INTO v_count
  FROM public.inventory_movements
  WHERE idempotency_key = 'admin-adjustment:ci-adjustment-key-1';

  IF v_quantity <> 12 OR v_delta <> 0 OR v_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: retry applied the same adjustment more than once';
  END IF;

  -- Reusing the same key with a different payload must be rejected.
  BEGIN
    PERFORM * FROM public.admin_adjust_inventory_idempotent(
      v_product, 15, 2, 'توريد', 'CI-INV-001', 'ci-adjustment-key-1'
    );
    RAISE EXCEPTION 'TEST FAILED: changed payload reused an idempotency key';
  EXCEPTION
    WHEN SQLSTATE '22023' THEN NULL;
  END;

  -- A zero-delta request is still recorded and cannot be replayed later to reset stock.
  PERFORM * FROM public.admin_adjust_inventory_idempotent(
    v_product, 12, 2, 'مراجعة رصيد', 'CI-INV-002', 'ci-adjustment-zero-1'
  );
  UPDATE public.inventory SET quantity_on_hand = 14 WHERE product_id = v_product;
  SELECT quantity_on_hand, quantity_delta
  INTO v_quantity, v_delta
  FROM public.admin_adjust_inventory_idempotent(
    v_product, 12, 2, 'مراجعة رصيد', 'CI-INV-002', 'ci-adjustment-zero-1'
  );

  IF v_quantity <> 14 OR v_delta <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: zero-delta retry modified later inventory';
  END IF;

  -- Non-admin callers cannot use the SECURITY DEFINER function.
  PERFORM set_config('request.jwt.claim.sub', v_non_admin::text, true);
  BEGIN
    PERFORM * FROM public.admin_adjust_inventory_idempotent(
      v_product, 20, 2, 'محاولة غير مصرح بها', NULL, 'ci-non-admin-key'
    );
    RAISE EXCEPTION 'TEST FAILED: non-admin adjustment was accepted';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  -- Idempotency receipts are append-only too.
  BEGIN
    UPDATE public.inventory_adjustment_requests
    SET reason = 'tampered'
    WHERE idempotency_key = 'ci-adjustment-key-1';
    RAISE EXCEPTION 'TEST FAILED: adjustment request UPDATE was accepted';
  EXCEPTION
    WHEN SQLSTATE '55000' THEN NULL;
  END;
END;
$test$;
