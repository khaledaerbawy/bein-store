-- Database lifecycle integration test in a disposable PostgreSQL service.
-- No real customer data or production project is used.

DO $test$
DECLARE
  v_untracked_product uuid := '11111111-1111-4111-8111-111111111111';
  v_tracked_product uuid := '22222222-2222-4222-8222-222222222222';
  v_admin uuid := '33333333-3333-4333-8333-333333333333';
  v_order_number bigint;
  v_order_total numeric;
  v_order_id uuid;
  v_stock integer;
  v_status text;
  v_count integer;
BEGIN
  -- Public callers must not bypass the secret-checked wrapper via the legacy overload.
  IF has_function_privilege('anon', 'public.create_public_order(jsonb,jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.create_public_order(jsonb,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TEST FAILED: legacy two-argument checkout RPC is still callable by public roles';
  END IF;
  IF NOT has_function_privilege('anon', 'public.create_public_order(jsonb,jsonb,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TEST FAILED: secret-checked checkout wrapper must remain callable by the server anon client';
  END IF;
  IF has_function_privilege('anon', 'public.admin_update_order_status(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TEST FAILED: anonymous users must not execute the admin status RPC';
  END IF;

  INSERT INTO public.products(id, name_ar, sku, price_egp, is_active)
  VALUES
    (v_untracked_product, 'منتج اختبار غير مسجل المخزون', 'CI-NO-STOCK', 250, true),
    (v_tracked_product, 'منتج اختبار مخزون', 'CI-STOCK', 150, true);

  INSERT INTO public.inventory(product_id, quantity_on_hand)
  VALUES (v_tracked_product, 5);

  -- An active product with no inventory row must abort the entire order transaction.
  BEGIN
    PERFORM *
    FROM public.create_public_order(
      '{"customer_name":"CI Test","customer_phone":"01000000000","shipping_address":"Test address","city":"Cairo","notes":"Temporary CI test"}'::jsonb,
      jsonb_build_array(jsonb_build_object('product_id', v_untracked_product, 'quantity', 1))
    );
    RAISE EXCEPTION 'TEST FAILED: public checkout accepted a product without a stock row';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  SELECT count(*) INTO v_count FROM public.orders;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: rejected order left order rows behind';
  END IF;

  -- A tracked product can be ordered; price is calculated in the database and stock is deducted.
  SELECT order_number, total_egp
    INTO v_order_number, v_order_total
    FROM public.create_public_order(
      '{"customer_name":"CI Test","customer_phone":"01000000000","shipping_address":"Test address","city":"Cairo","notes":"Temporary CI test"}'::jsonb,
      jsonb_build_array(jsonb_build_object('product_id', v_tracked_product, 'quantity', 2))
    );

  IF v_order_total <> 300 THEN
    RAISE EXCEPTION 'TEST FAILED: expected order total 300, got %', v_order_total;
  END IF;

  SELECT id, status INTO v_order_id, v_status
  FROM public.orders WHERE order_number = v_order_number;

  IF v_order_id IS NULL OR v_status <> 'new' THEN
    RAISE EXCEPTION 'TEST FAILED: new order was not persisted correctly';
  END IF;

  SELECT quantity_on_hand INTO v_stock
  FROM public.inventory WHERE product_id = v_tracked_product;
  IF v_stock <> 3 THEN
    RAISE EXCEPTION 'TEST FAILED: expected stock 3 after sale, got %', v_stock;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.inventory_movements
  WHERE product_id = v_tracked_product
    AND reference = 'Order #' || v_order_number
    AND reason = 'بيع عبر المتجر'
    AND quantity_delta = -2;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: expected one negative inventory movement, got %', v_count;
  END IF;

  -- Simulate the authenticated admin identity used by the production status RPC.
  INSERT INTO public.admin_roles(user_id, is_active) VALUES (v_admin, true);
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);
  PERFORM public.admin_update_order_status(v_order_id, 'cancelled');

  SELECT status INTO v_status FROM public.orders WHERE id = v_order_id;
  SELECT quantity_on_hand INTO v_stock FROM public.inventory WHERE product_id = v_tracked_product;
  IF v_status <> 'cancelled' OR v_stock <> 5 THEN
    RAISE EXCEPTION 'TEST FAILED: cancellation should restore stock to 5 and mark order cancelled';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.inventory_movements
  WHERE product_id = v_tracked_product
    AND reference = 'Return for Order #' || v_order_number
    AND reason = 'إرجاع مخزون بعد إلغاء الطلب'
    AND quantity_delta = 2;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: expected one positive stock-restoration movement, got %', v_count;
  END IF;

  -- Repeating cancellation must not restore the same inventory twice.
  PERFORM public.admin_update_order_status(v_order_id, 'cancelled');
  SELECT quantity_on_hand INTO v_stock FROM public.inventory WHERE product_id = v_tracked_product;
  SELECT count(*) INTO v_count
  FROM public.inventory_movements
  WHERE product_id = v_tracked_product
    AND reference = 'Return for Order #' || v_order_number
    AND reason = 'إرجاع مخزون بعد إلغاء الطلب'
    AND quantity_delta = 2;

  IF v_stock <> 5 OR v_count <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: repeated cancellation must not restore stock twice';
  END IF;
END;
$test$;
