# CCTV system planner — integration notes

## Current implementation

The feature is isolated on `feat/cctv-system-planner` and adds `/system-planner`.

- The calculation engine is based on `skiptdouglas/cctv-storage-calculator` v0.12.0.
- The upstream engine is MIT-licensed; its original source is retained in `src/lib/cctv/calc.js` and the notice is recorded in `src/lib/cctv/THIRD_PARTY_NOTICES.md`.
- The Arabic interface calculates estimated storage, retention, recorder inbound bandwidth, and PoE power/switch count.
- Camera model search reads from the existing `cctv_cameras` reference catalog. Selecting a catalog model maps its megapixel value to the nearest supported planning bucket; the operator can override the resolution.
- Related commerce items are read from active, priced `products` and the category catalog. They are recommendations only; the planner does not claim a product is compatible unless the exact manufacturer specs are checked.
- Inventory quantities are fetched only after verifying the signed-in user has an active `admin_roles` row. Public visitors never receive inventory quantities. The planner only reads inventory; it does not change stock or create inventory movements.
- The planner does not create orders, change prices, add products, update inventory, or write to the CCTV reference catalog.
- No database migration is required for this first iteration.

## Data integrity boundary

Keep these domains separate:

1. `cctv_cameras` and `cctv_camera_brands`: technical reference data only.
2. `products`, `categories`, and `inventory`: actual commercial catalog and stock.
3. Calculator state/results: temporary browser state until the customer copies or sends a quote request.

Never create a product, price, stock row, or order automatically from a camera reference record. A reference model may not be sold by Bein Store.

## Calculation limitations

- Generic planning bitrates are estimates. Use a measured camera bitrate or manufacturer calculator for final design.
- Camera megapixels are mapped to a supported resolution bucket; unusual aspect ratios, multi-sensor cameras, and model-specific frame-rate limits need manual review.
- PoE consumption is estimated unless a verified per-model wattage is supplied.
- The suggested switch count uses 80% of the selected PoE budget and does not yet design port count, uplink capacity, cable length, or switch topology.
- Recorder bandwidth is a planning minimum; verify the exact NVR/DVR recording and decoding limits and drive-bay compatibility.
- RAID recommendations are planning output, not a guarantee of data protection or recorder support.

## RTSP database — license hold

Candidate source: https://github.com/eduard256/StrixCamDB

Its README reports 3,600+ brands, model-specific RTSP path patterns, protocol/port data, preset patterns, and an OUI mapping. The database is licensed CC BY-NC 4.0; its license explicitly restricts reuse of all or substantial database contents to non-commercial purposes. Commercial use requires separate permission from the rights holder. Therefore, no StrixCamDB data is copied, imported, bundled, or served by Bein Store in this branch.

Before any commercial integration:
- obtain written commercial permission or a commercial license covering the database and derivative use;
- verify attribution and change-notice requirements;
- review source provenance because the README says much of the database originated from ispyconnect.com;
- design a safe lookup-only feature. Do not add automatic scanning, brute-force credential attempts, or expose credentials in URLs/logs.

## Next validation steps

- Run `npm run lint`, `npx tsc --noEmit`, `npm run test:cctv`, and `npm run build`.
- Test as a public visitor and as an active admin; confirm only the admin sees stock counts.
- Confirm the planner cannot write to commerce or reference tables.
- Compare representative 2 MP, 4 MP, and 8 MP designs against manufacturer calculators and the upstream SOP worked example.
- Review mobile layout and Arabic RTL rendering before merging.
