-- Independent technical reference catalog. Never mix this data with products, prices, or inventory.
create table if not exists public.cctv_cameras (
  id text primary key,
  brand text not null,
  model text not null,
  camera_type text,
  megapixels numeric,
  resolution_label text,
  power_source text[] not null default '{}',
  connectivity text[] not null default '{}',
  night_vision jsonb not null default '{}'::jsonb,
  protocols text[] not null default '{}',
  markets text[] not null default '{}',
  features text[] not null default '{}',
  sources text[] not null default '{}',
  last_verified date,
  specs jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(brand,'') || ' ' || coalesce(model,'') || ' ' || coalesce(id,''))
  ) stored,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cctv_cameras_brand_idx on public.cctv_cameras (brand);
create index if not exists cctv_cameras_type_idx on public.cctv_cameras (camera_type);
create index if not exists cctv_cameras_megapixels_idx on public.cctv_cameras (megapixels);
create index if not exists cctv_cameras_power_source_idx on public.cctv_cameras using gin (power_source);
create index if not exists cctv_cameras_connectivity_idx on public.cctv_cameras using gin (connectivity);
create index if not exists cctv_cameras_protocols_idx on public.cctv_cameras using gin (protocols);
create index if not exists cctv_cameras_search_idx on public.cctv_cameras using gin (search_vector);

create table if not exists public.cctv_camera_brands (
  slug text primary key,
  name text not null unique,
  camera_count integer not null default 0 check (camera_count >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists cctv_camera_brands_name_idx on public.cctv_camera_brands (name);

alter table public.cctv_cameras enable row level security;
alter table public.cctv_camera_brands enable row level security;

drop policy if exists "Public read CCTV reference catalog" on public.cctv_cameras;
create policy "Public read CCTV reference catalog"
  on public.cctv_cameras for select to anon, authenticated using (true);

drop policy if exists "Public read CCTV brand index" on public.cctv_camera_brands;
create policy "Public read CCTV brand index"
  on public.cctv_camera_brands for select to anon, authenticated using (true);

grant select on public.cctv_cameras, public.cctv_camera_brands to anon, authenticated;
