-- Apply only after the new Next.js order route is live and verified.
-- Close both public overloads' direct mutation surface: writes must go through
-- the secret-gated create_public_order wrapper or the admin status RPC.
REVOKE ALL ON FUNCTION public.create_public_order(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.orders FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.order_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.orders TO anon, authenticated;
GRANT SELECT ON TABLE public.order_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_order(jsonb, jsonb, text) TO anon, authenticated;
