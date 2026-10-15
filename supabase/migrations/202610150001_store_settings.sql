CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name_ar TEXT DEFAULT 'Bein Store',
    store_name_en TEXT DEFAULT 'Bein Store',
    contact_phone TEXT,
    contact_whatsapp TEXT,
    contact_email TEXT,
    address_ar TEXT,
    hero_title_ar TEXT DEFAULT 'كل مكوّنات نظام المراقبة، من مكان واحد.',
    hero_subtitle_ar TEXT DEFAULT 'كاميرات، أجهزة تسجيل، هاردات، سويتشات وكابلات. اختار حسب احتياجك، وراجع الموديل والمواصفات قبل الطلب.',
    theme_primary_color TEXT DEFAULT '#e8752b',
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings
CREATE POLICY "Allow public read-only access to store_settings"
ON public.store_settings FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can update settings
CREATE POLICY "Allow admins to update store_settings"
ON public.store_settings FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE user_id = auth.uid() AND is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- Initial settings row
INSERT INTO public.store_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;
