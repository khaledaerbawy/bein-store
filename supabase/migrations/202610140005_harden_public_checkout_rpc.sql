-- Harden the public checkout RPC: prevent search_path-based object shadowing,
-- and ensure signed-in users cannot invoke the public-order function directly.
-- Anonymous execution remains required for guest checkout.
alter function public.create_public_order(jsonb, jsonb) set search_path = '';
revoke execute on function public.create_public_order(jsonb, jsonb) from public, authenticated;
grant execute on function public.create_public_order(jsonb, jsonb) to anon;
