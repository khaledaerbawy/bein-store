-- Integration test for 202610160003_require_inventory_record_before_order.sql
-- This test runs only in the ephemeral PostgreSQL service in GitHub Actions.

DO $test$
DECLARE
  v_missing_stock_product uuid := '11111111-1111-4111-8111-111111111111';
  v_tracked_product uuid := '22222222-2222-4222-8222-222222222222';
BEGIN
  BEGIN
    INSERT INTO public.order_items(product_id) VALUES (v_missing_stock_product);
    RAISE EXCEPTION 'TEST FAILED: order item was accepted without an inventory row';
  EXCEPTION
    WHEN check_violation THEN
      -- Expected: the trigger rejects inventory that has not been initialized.
      NULL;
  END;

  INSERT INTO public.inventory(product_id, quantity_on_hand)
  VALUES (v_tracked_product, 7);

  INSERT INTO public.order_items(product_id) VALUES (v_tracked_product);

  IF NOT EXISTS (
    SELECT 1
      FROM public.order_items
     WHERE product_id = v_tracked_product
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: a product with a stock record was rejected';
  END IF;
END;
$test$;
