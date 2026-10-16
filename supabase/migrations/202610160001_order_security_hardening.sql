-- Bein Store security hardening phase 1.
-- Store a long random secret in Supabase Vault under the unique name
-- 'bein_store_order_rpc_secret' and add the identical value as server-only Vercel variable ORDER_RPC_SECRET.
-- Never put that value in source control.
-- This phase is backward-compatible: the old two-argument order RPC remains callable until phase 2.

CREATE TABLE IF NOT EXISTS public.order_rate_limits (
  client_key text PRIMARY KEY CHECK (client_key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL,
  hit_count integer NOT NULL CHECK (hit_count > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.order_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_order_rate_limit(
  p_internal_secret text,
  p_client_key text
)
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_expected_secret text;
  v_window_started timestamptz;
  v_hit_count integer;
  v_now timestamptz := clock_timestamp();
BEGIN
  SELECT decrypted_secret INTO v_expected_secret
  FROM vault.decrypted_secrets WHERE name = 'bein_store_order_rpc_secret' LIMIT 1;
  IF v_expected_secret IS NULL OR p_internal_secret IS DISTINCT FROM v_expected_secret THEN
    RAISE EXCEPTION 'ORDER_RPC_UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;
  IF p_client_key IS NULL OR p_client_key !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'INVALID_RATE_LIMIT_KEY' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.order_rate_limits AS current_limit (client_key, window_started_at, hit_count, updated_at)
  VALUES (p_client_key, v_now, 1, v_now)
  ON CONFLICT (client_key) DO UPDATE
    SET window_started_at = CASE
          WHEN current_limit.window_started_at <= v_now - interval '15 minutes' THEN v_now
          ELSE current_limit.window_started_at END,
        hit_count = CASE
          WHEN current_limit.window_started_at <= v_now - interval '15 minutes' THEN 1
          ELSE current_limit.hit_count + 1 END,
        updated_at = v_now
  RETURNING window_started_at, hit_count INTO v_window_started, v_hit_count;

  RETURN QUERY SELECT v_hit_count <= 10,
    GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_window_started + interval '15 minutes' - clock_timestamp())))::integer);
END;
$function$;
REVOKE ALL ON FUNCTION public.consume_order_rate_limit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_order_rate_limit(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_public_order(
  p_customer jsonb, p_items jsonb, p_internal_secret text
)
RETURNS TABLE (order_number bigint, total_egp numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_expected_secret text;
BEGIN
  SELECT decrypted_secret INTO v_expected_secret
  FROM vault.decrypted_secrets WHERE name = 'bein_store_order_rpc_secret' LIMIT 1;
  IF v_expected_secret IS NULL OR p_internal_secret IS DISTINCT FROM v_expected_secret THEN
    RAISE EXCEPTION 'ORDER_RPC_UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT legacy_order.order_number, legacy_order.total_egp
    FROM public.create_public_order(p_customer, p_items) AS legacy_order;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_public_order(jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_order(jsonb, jsonb, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.restore_order_inventory(p_order_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_order_number bigint; v_item record; v_return_reference text;
BEGIN
  SELECT order_number INTO v_order_number FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_return_reference := 'Return for Order #' || v_order_number;

  FOR v_item IN
    SELECT oi.product_id, SUM(oi.quantity)::integer AS quantity
    FROM public.order_items oi WHERE oi.order_id = p_order_id AND oi.product_id IS NOT NULL
    GROUP BY oi.product_id
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.inventory_movements im
      WHERE im.product_id = v_item.product_id AND im.reference = 'Order #' || v_order_number
        AND im.reason = 'بيع عبر المتجر' AND im.quantity_delta < 0
    ) AND NOT EXISTS (
      SELECT 1 FROM public.inventory_movements im
      WHERE im.product_id = v_item.product_id AND im.reference = v_return_reference
        AND im.reason = p_reason AND im.quantity_delta > 0
    ) THEN
      UPDATE public.inventory
      SET quantity_on_hand = quantity_on_hand + v_item.quantity, updated_at = clock_timestamp()
      WHERE product_id = v_item.product_id;
      IF FOUND THEN
        INSERT INTO public.inventory_movements(product_id, quantity_delta, reason, reference, created_by)
        VALUES (v_item.product_id, v_item.quantity, p_reason, v_return_reference, NULL);
      END IF;
    END IF;
  END LOOP;
END;
$function$;
REVOKE ALL ON FUNCTION public.restore_order_inventory(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id uuid, p_new_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_current_status text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = (SELECT auth.uid()) AND ar.is_active = true) THEN
    RAISE EXCEPTION 'ADMIN_ACCESS_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_new_status NOT IN ('new', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_ORDER_STATUS' USING ERRCODE = '22023';
  END IF;
  SELECT status INTO v_current_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_current_status = 'cancelled' AND p_new_status <> 'cancelled' THEN RAISE EXCEPTION 'ORDER_ALREADY_CANCELLED'; END IF;
  IF p_new_status = 'cancelled' AND v_current_status IN ('shipped', 'completed') THEN
    RAISE EXCEPTION 'ORDER_CANNOT_CANCEL_AFTER_SHIPMENT';
  END IF;
  UPDATE public.orders SET status = p_new_status, updated_at = clock_timestamp() WHERE id = p_order_id;
  IF p_new_status = 'cancelled' AND v_current_status <> 'cancelled' THEN
    PERFORM public.restore_order_inventory(p_order_id, 'إرجاع مخزون بعد إلغاء الطلب');
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.expire_stale_new_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_order record; v_expired integer := 0;
BEGIN
  FOR v_order IN
    SELECT o.id FROM public.orders o
    WHERE o.status = 'new' AND o.created_at < clock_timestamp() - interval '48 hours'
    ORDER BY o.created_at LIMIT 100 FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.orders SET status = 'cancelled', updated_at = clock_timestamp()
    WHERE id = v_order.id AND status = 'new';
    IF FOUND THEN
      PERFORM public.restore_order_inventory(v_order.id, 'إرجاع مخزون بعد انتهاء مهلة الطلب');
      v_expired := v_expired + 1;
    END IF;
  END LOOP;
  RETURN v_expired;
END;
$function$;
REVOKE ALL ON FUNCTION public.expire_stale_new_orders() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.run_order_security_maintenance()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  PERFORM public.expire_stale_new_orders();
  DELETE FROM public.order_rate_limits
  WHERE window_started_at < clock_timestamp() - interval '2 days';
END;
$function$;
REVOKE ALL ON FUNCTION public.run_order_security_maintenance() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $block$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bein-store-order-security-maintenance') THEN
    PERFORM cron.schedule('bein-store-order-security-maintenance', '15 * * * *', 'select public.run_order_security_maintenance();');
  END IF;
END
$block$;
