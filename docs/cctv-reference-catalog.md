# CCTV reference catalog import

The public catalog is isolated from commerce data: it does not create products, prices, inventory, carts, or orders.

## Source and license
- Source: https://github.com/ch-bas/cctv-camera-database
- Dataset: `data/cameras.json` (about 73 MB in the checked source revision)
- Dataset license: CC0 1.0; trademarks and brand names remain the property of their owners.
- Every camera retains its original record in `specs`, source URLs, and last-verified date.

## Import
Use a trusted local terminal or CI job. Never add the service-role key to source control or a `NEXT_PUBLIC_*` variable.

```bash
SUPABASE_URL="https://YOUR_PROJECT.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="YOUR_SECRET_KEY" \
npm run import:cctv
```

Optional: set `CCTV_DATA_URL` to a pinned raw JSON URL and `CCTV_BATCH_SIZE` (50–500; default 250). The importer validates the downloaded shape, upserts by stable camera ID, and is safe to rerun. It does not delete rows missing from a newer upstream release; review upstream removals separately.

## Routes
- `/cctv-database`: searchable and filterable public catalog.
- `/cctv-database/[id]`: technical detail and original source links.

The source dataset is CC0 1.0. See the upstream LICENSE and verify official manufacturer documentation before purchase or installation.
