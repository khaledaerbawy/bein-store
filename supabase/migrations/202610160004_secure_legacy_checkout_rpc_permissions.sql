-- Prevent direct public invocation of the legacy two-argument checkout RPC.
-- The server-only wrapper validates ORDER_RPC_SECRET and calls this function as its owner.
-- Keep the three-argument wrapper and admin status RPC grants unchanged to avoid breaking checkout/admin.
REVOKE ALL ON FUNCTION public.create_public_order(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.create_public_order(jsonb, jsonb) SET search_path = '';
