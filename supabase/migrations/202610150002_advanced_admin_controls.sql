-- Advanced admin controls: editable storefront settings, brands, stock ledger and checkout rules.
-- Idempotent on the existing project and suitable after the initial store schema migrations.

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS store_name text NOT NULL DEFAULT 'Bein Store',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS page_title text NOT NULL DEFAULT 'Bein Store | كاميرات المراقبة والشبكات',
  ADD COLUMN IF NOT EXISTS meta_description text NOT NULL DEFAULT 'متجر Bein Store لكاميرات المراقبة وأجهزة التسجيل والشبكات.',
  ADD COLUMN IF NOT EXISTS announcement_text text NOT NULL DEFAULT 'مساعدة فنية في اختيار الموديل وتأكيد السعر قبل الطلب',
  ADD COLUMN IF NOT EXISTS show_announcement boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hero_badge text NOT NULL DEFAULT 'كاميرات مراقبة وأنظمة أمنية',
  ADD COLUMN IF NOT EXISTS hero_title text NOT NULL DEFAULT 'كل ما تحتاجه لنظام مراقبة',
  ADD COLUMN IF NOT EXISTS hero_title_highlight text NOT NULL DEFAULT 'متكامل وآمن',
  ADD COLUMN IF NOT EXISTS hero_description text NOT NULL DEFAULT 'كاميرات، أجهزة تسجيل، هاردات تخزين وشبكات. اختار المنتجات المناسبة للمكان، ولو محتار في الموديل أو التوصيل نساعدك قبل الطلب.',
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS hero_cta_text text NOT NULL DEFAULT 'تسوّق المنتجات',
  ADD COLUMN IF NOT EXISTS show_hero boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_categories boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_catalog boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_brands boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_services boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS show_phone boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_whatsapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_address boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS footer_text text NOT NULL DEFAULT 'كاميرات مراقبة وأنظمة تسجيل وشبكات ومستلزمات تركيب، مع مساعدة في اختيار المكونات المناسبة.',
  ADD COLUMN IF NOT EXISTS primary_color text NOT NULL DEFAULT '#1766bf',
  ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '#f1f6fa',
  ADD COLUMN IF NOT EXISTS categories_title text NOT NULL DEFAULT 'تسوّق حسب القسم',
  ADD COLUMN IF NOT EXISTS categories_description text NOT NULL DEFAULT 'وصل للقسم اللي محتاجه بسرعة.',
  ADD COLUMN IF NOT EXISTS catalog_title text NOT NULL DEFAULT 'منتجاتنا',
  ADD COLUMN IF NOT EXISTS catalog_description text NOT NULL DEFAULT 'صور واضحة، موديلات وأسعار معروضة، واختيار سهل للمنتج المناسب.',
  ADD COLUMN IF NOT EXISTS brands_title text NOT NULL DEFAULT 'ماركات بنجهّز أنظمتها حسب احتياجك',
  ADD COLUMN IF NOT EXISTS services_kicker text NOT NULL DEFAULT 'محتاج مساعدة؟',
  ADD COLUMN IF NOT EXISTS services_title text NOT NULL DEFAULT 'مش متأكد تختار إيه؟',
  ADD COLUMN IF NOT EXISTS services_highlight text NOT NULL DEFAULT 'نساعدك توصل للمناسب.',
  ADD COLUMN IF NOT EXISTS services_description text NOT NULL DEFAULT 'اختيار النظام الصح بيعتمد على المكان، عدد الكاميرات، طريقة التسجيل، وسعة التخزين. ابعتلنا التفاصيل ونراجع معاك المكونات المطلوبة.',
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS orders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS orders_paused_message text NOT NULL DEFAULT 'استقبال الطلبات متوقف مؤقتًا. تواصل مع المتجر للاستفسار.',
  ADD COLUMN IF NOT EXISTS shipping_fee_egp numeric(12,2) NOT NULL DEFAULT 0 CHECK (shipping_fee_egp >= 0),
  ADD COLUMN IF NOT EXISTS free_shipping_threshold_egp numeric(12,2) CHECK (free_shipping_threshold_egp IS NULL OR free_shipping_threshold_egp >= 0),
  ADD COLUMN IF NOT EXISTS minimum_order_egp numeric(12,2) NOT NULL DEFAULT 0 CHECK (minimum_order_egp >= 0),
  ADD COLUMN IF NOT EXISTS whatsapp_order_confirmation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_order_notes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_time_text text NOT NULL DEFAULT 'موعد التوصيل ورسوم الشحن يتم تأكيدهما مع المتجر بعد مراجعة العنوان.';

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.store_settings TO authenticated;

DROP POLICY IF EXISTS "Public can read store settings" ON public.store_settings;
CREATE POLICY "Public can read store settings"
  ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins can insert store settings" ON public.store_settings;
CREATE POLICY "Admins can insert store settings"
  ON public.store_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = (SELECT auth.uid()) AND ar.is_active = true
  ));
DROP POLICY IF EXISTS "Admins can update store settings" ON public.store_settings;
CREATE POLICY "Admins can update store settings"
  ON public.store_settings FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = (SELECT auth.uid()) AND ar.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = (SELECT auth.uid()) AND ar.is_active = true
  ));

INSERT INTO public.store_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.store_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  logo_url text,
  website_url text,
  description text,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_brands ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.store_brands TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_brands TO authenticated;

DROP POLICY IF EXISTS "Public can read active store brands" ON public.store_brands;
CREATE POLICY "Public can read active store brands"
  ON public.store_brands FOR SELECT TO anon, authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = (SELECT auth.uid()) AND ar.is_active = true
  ));
DROP POLICY IF EXISTS "Admins manage store brands" ON public.store_brands;
CREATE POLICY "Admins manage store brands"
  ON public.store_brands FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = (SELECT auth.uid()) AND ar.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = (SELECT auth.uid()) AND ar.is_active = true
  ));

INSERT INTO public.store_brands (name, slug, logo_url, website_url, sort_order, is_active)
SELECT
  b.brand,
  COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(b.brand), '[^a-z0-9]+', '-', 'g')), ''), 'brand-' || SUBSTR(MD5(b.brand), 1, 8)),
  CASE b.brand
    WHEN 'Hikvision' THEN 'https://www.hikvision.com/content/dam/hikvision/uk/marketing-portal/logos/hikvision/Hikvision%20Logo.PNG'
    WHEN 'Dahua' THEN 'https://material.dahuasecurity.com/uploads/image/20200615/20200615135430_98836.png'
    ELSE NULL
  END,
  CASE b.brand
    WHEN 'Hikvision' THEN 'https://www.hikvision.com/'
    WHEN 'HiLook' THEN 'https://www.hikvision.com/en/products/HiLook/'
    WHEN 'Dahua' THEN 'https://www.dahuasecurity.com/'
    WHEN 'UNV' THEN 'https://www.uniview.com/'
    WHEN 'WD Purple' THEN 'https://www.westerndigital.com/products/internal-drives/wd-purple-sata-hdd'
    ELSE NULL
  END,
  ROW_NUMBER() OVER (ORDER BY b.brand)::integer,
  true
FROM (
  SELECT DISTINCT BTRIM(brand) AS brand
  FROM public.products
  WHERE brand IS NOT NULL AND BTRIM(brand) <> ''
) b
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_adjust_inventory(
  p_product_id uuid,
  p_new_quantity integer,
  p_low_stock_threshold integer DEFAULT 2,
  p_reason text DEFAULT 'manual_adjustment',
  p_reference text DEFAULT NULL
)
RETURNS TABLE (quantity_on_hand integer, low_stock_threshold integer, quantity_delta integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_old_quantity integer;
  v_had_row boolean;
  v_delta integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = (SELECT auth.uid()) AND ar.is_active = true
  ) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501'; END IF;

  IF p_new_quantity IS NULL OR p_new_quantity < 0 THEN
    RAISE EXCEPTION 'Quantity must be zero or higher' USING ERRCODE = '22023';
  END IF;
  IF p_low_stock_threshold IS NULL OR p_low_stock_threshold < 0 THEN
    RAISE EXCEPTION 'Quantity threshold must be zero or higher' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = p_product_id) THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT i.quantity_on_hand INTO v_old_quantity
  FROM public.inventory i WHERE i.product_id = p_product_id FOR UPDATE;
  v_had_row := FOUND;
  IF NOT v_had_row THEN v_old_quantity := 0; END IF;
  v_delta := p_new_quantity - v_old_quantity;

  INSERT INTO public.inventory (product_id, quantity_on_hand, low_stock_threshold, updated_at)
  VALUES (p_product_id, p_new_quantity, p_low_stock_threshold, now())
  ON CONFLICT (product_id) DO UPDATE
    SET quantity_on_hand = EXCLUDED.quantity_on_hand,
        low_stock_threshold = EXCLUDED.low_stock_threshold,
        updated_at = now();

  -- inventory_movements forbids zero delta; a zero opening balance is still valid inventory.
  IF v_delta <> 0 THEN
    INSERT INTO public.inventory_movements (product_id, quantity_delta, reason, reference, created_by)
    VALUES (
      p_product_id, v_delta,
      CASE WHEN NOT v_had_row THEN 'opening_balance' ELSE COALESCE(NULLIF(BTRIM(p_reason), ''), 'manual_adjustment') END,
      NULLIF(BTRIM(p_reference), ''),
      (SELECT auth.uid())
    );
  END IF;

  RETURN QUERY SELECT i.quantity_on_hand, i.low_stock_threshold, v_delta
  FROM public.inventory i WHERE i.product_id = p_product_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_adjust_inventory(uuid, integer, integer, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_inventory(uuid, integer, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_public_order(p_customer jsonb, p_items jsonb)
RETURNS TABLE (order_number bigint, total_egp numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order_id uuid;
  v_order_number bigint;
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_shipping_fee numeric(12,2) := 0;
  v_configured_shipping_fee numeric(12,2) := 0;
  v_free_shipping_threshold numeric(12,2);
  v_minimum_order numeric(12,2) := 0;
  v_orders_enabled boolean := true;
  v_paused_message text := 'استقبال الطلبات متوقف مؤقتًا. تواصل مع المتجر للاستفسار.';
  v_allow_order_notes boolean := true;
  v_item record;
  v_product record;
  v_stock integer;
  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
  v_shipping_address text;
  v_city text;
  v_notes text;
BEGIN
  IF jsonb_typeof(p_customer) <> 'object' OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'INVALID_ORDER';
  END IF;

  SELECT COALESCE(s.orders_enabled, true),
         COALESCE(s.orders_paused_message, 'استقبال الطلبات متوقف مؤقتًا. تواصل مع المتجر للاستفسار.'),
         COALESCE(s.shipping_fee_egp, 0),
         s.free_shipping_threshold_egp,
         COALESCE(s.minimum_order_egp, 0),
         COALESCE(s.allow_order_notes, true)
    INTO v_orders_enabled, v_paused_message, v_configured_shipping_fee,
         v_free_shipping_threshold, v_minimum_order, v_allow_order_notes
    FROM public.store_settings s WHERE s.id = 'main';

  v_orders_enabled := COALESCE(v_orders_enabled, true);
  v_paused_message := COALESCE(v_paused_message, 'استقبال الطلبات متوقف مؤقتًا. تواصل مع المتجر للاستفسار.');
  v_configured_shipping_fee := COALESCE(v_configured_shipping_fee, 0);
  v_minimum_order := COALESCE(v_minimum_order, 0);
  v_allow_order_notes := COALESCE(v_allow_order_notes, true);

  IF NOT v_orders_enabled THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDERS_PAUSED:' || v_paused_message;
  END IF;

  v_customer_name := LEFT(TRIM(COALESCE(p_customer->>'customer_name', '')), 120);
  v_customer_phone := LEFT(TRIM(COALESCE(p_customer->>'customer_phone', '')), 24);
  v_customer_email := NULLIF(LEFT(TRIM(COALESCE(p_customer->>'customer_email', '')), 180), '');
  v_shipping_address := LEFT(TRIM(COALESCE(p_customer->>'shipping_address', '')), 500);
  v_city := LEFT(TRIM(COALESCE(p_customer->>'city', '')), 100);
  v_notes := CASE WHEN v_allow_order_notes THEN NULLIF(LEFT(TRIM(COALESCE(p_customer->>'notes', '')), 1000), '') ELSE NULL END;
  IF LENGTH(v_customer_name) < 2 OR LENGTH(REGEXP_REPLACE(v_customer_phone, '[^0-9]', '', 'g')) < 8
     OR v_shipping_address = '' OR v_city = '' THEN RAISE EXCEPTION 'INVALID_CUSTOMER'; END IF;

  FOR v_item IN
    SELECT product_id, SUM(quantity)::integer AS quantity
    FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer)
    GROUP BY product_id
  LOOP
    IF v_item.product_id IS NULL OR v_item.quantity < 1 OR v_item.quantity > 99 THEN
      RAISE EXCEPTION 'INVALID_ITEM';
    END IF;
    SELECT p.id, p.name_ar, p.sku, p.price_egp INTO v_product
    FROM public.products p
    WHERE p.id = v_item.product_id AND p.is_active = true AND p.price_egp IS NOT NULL
    FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_UNAVAILABLE'; END IF;

    SELECT i.quantity_on_hand INTO v_stock
    FROM public.inventory i WHERE i.product_id = v_item.product_id FOR UPDATE;
    IF FOUND THEN
      IF v_stock < v_item.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;
      UPDATE public.inventory SET quantity_on_hand = quantity_on_hand - v_item.quantity, updated_at = now()
      WHERE product_id = v_item.product_id;
    END IF;
    v_subtotal := v_subtotal + (v_product.price_egp * v_item.quantity);
  END LOOP;

  IF v_subtotal < v_minimum_order THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_BELOW_MINIMUM:' || v_minimum_order::text;
  END IF;

  IF v_free_shipping_threshold IS NOT NULL AND v_subtotal >= v_free_shipping_threshold THEN v_shipping_fee := 0;
  ELSE v_shipping_fee := v_configured_shipping_fee;
  END IF;
  v_total := v_subtotal + v_shipping_fee;

  INSERT INTO public.orders(
    customer_name, customer_phone, customer_email, shipping_address, city, notes,
    language, status, currency, subtotal_egp, shipping_fee_egp, total_egp
  )
  VALUES (
    v_customer_name, v_customer_phone, v_customer_email, v_shipping_address, v_city, v_notes,
    'ar', 'new', 'EGP', v_subtotal, v_shipping_fee, v_total
  )
  RETURNING id, orders.order_number INTO v_order_id, v_order_number;

  FOR v_item IN
    SELECT product_id, SUM(quantity)::integer AS quantity
    FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer)
    GROUP BY product_id
  LOOP
    SELECT p.id, p.name_ar, p.sku, p.price_egp INTO v_product
    FROM public.products p WHERE p.id = v_item.product_id;
    INSERT INTO public.order_items(
      order_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_price_egp, line_total_egp
    )
    VALUES (
      v_order_id, v_product.id, v_product.name_ar, v_product.sku, v_item.quantity,
      v_product.price_egp, v_product.price_egp * v_item.quantity
    );
    IF EXISTS (SELECT 1 FROM public.inventory i WHERE i.product_id = v_item.product_id) THEN
      INSERT INTO public.inventory_movements(product_id, quantity_delta, reason, reference, created_by)
      VALUES (v_item.product_id, -v_item.quantity, 'بيع عبر المتجر', 'Order #' || v_order_number, auth.uid());
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_order_number, v_total;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_public_order(jsonb, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.create_public_order(jsonb, jsonb) TO anon, authenticated;
