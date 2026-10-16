-- Apply only after the new Next.js order route is live and verified.
REVOKE ALL ON FUNCTION public.create_public_order(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_order(jsonb, jsonb, text) TO anon, authenticated;
