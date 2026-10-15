-- Free cloud-based Facebook Pages automation metadata.
-- Page access tokens are intentionally NOT stored in Postgres; keep them in GitHub Actions Secrets.
CREATE TABLE IF NOT EXISTS public.social_automation_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  brand_name text NOT NULL DEFAULT 'Bein Store',
  content_language text NOT NULL DEFAULT 'ar',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.social_automation_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.social_publish_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key text NOT NULL,
  page_slot smallint NOT NULL CHECK (page_slot BETWEEN 1 AND 3),
  page_id text NOT NULL,
  page_label text NOT NULL,
  caption text NOT NULL,
  topic_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'skipped')),
  meta_post_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (run_key, page_slot)
);

CREATE INDEX IF NOT EXISTS social_publish_logs_created_at_idx
  ON public.social_publish_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS social_publish_logs_status_idx
  ON public.social_publish_logs (status, created_at DESC);

ALTER TABLE public.social_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_publish_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.social_automation_settings TO authenticated;
GRANT SELECT ON public.social_publish_logs TO authenticated;

DROP POLICY IF EXISTS "Admins read social automation settings" ON public.social_automation_settings;
CREATE POLICY "Admins read social automation settings"
  ON public.social_automation_settings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = (SELECT auth.uid()) AND ar.is_active = true
  ));

DROP POLICY IF EXISTS "Admins update social automation settings" ON public.social_automation_settings;
CREATE POLICY "Admins update social automation settings"
  ON public.social_automation_settings FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = (SELECT auth.uid()) AND ar.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = (SELECT auth.uid()) AND ar.is_active = true
  ));

DROP POLICY IF EXISTS "Admins read social publish logs" ON public.social_publish_logs;
CREATE POLICY "Admins read social publish logs"
  ON public.social_publish_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.admin_roles ar
    WHERE ar.user_id = (SELECT auth.uid()) AND ar.is_active = true
  ));

-- No INSERT/UPDATE/DELETE grants or policies for authenticated users on publish logs.
-- The GitHub Actions service-role key is used only in the cloud runner and bypasses RLS.
