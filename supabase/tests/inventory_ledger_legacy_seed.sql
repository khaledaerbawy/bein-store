-- Seed one historical movement before the ledger migration to verify safe backfill.
INSERT INTO public.products(id, name_ar, sku, price_egp, is_active)
VALUES ('55555555-5555-4555-8555-555555555555', 'منتج تاريخي للاختبار', 'CI-LEGACY', 75, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inventory(product_id, quantity_on_hand)
VALUES ('55555555-5555-4555-8555-555555555555', 4)
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO public.inventory_movements(product_id, quantity_delta, reason, reference)
VALUES ('55555555-5555-4555-8555-555555555555', 4, 'historical opening adjustment', 'legacy CI seed');
