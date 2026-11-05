import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const sourceUrl = process.env.CCTV_DATA_URL || "https://raw.githubusercontent.com/ch-bas/cctv-camera-database/main/data/cameras.json";
const batchSize = Math.max(50, Math.min(500, Number(process.env.CCTV_BATCH_SIZE || 250)));
const response = await fetch(sourceUrl);
if (!response.ok) throw new Error(`Could not download source dataset: HTTP ${response.status}`);
const source = await response.json();
if (!Array.isArray(source) || source.length < 1000) throw new Error("Source dataset shape/count check failed; refusing import.");
const brands = new Map();
const rows = source.map((camera) => {
  if (!camera?.id || !camera?.brand || !camera?.model) return null;
  const slug = String(camera.brand).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
  brands.set(camera.brand, (brands.get(camera.brand) || 0) + 1);
  const power = Array.isArray(camera.power_source) ? camera.power_source : [camera.power?.method].filter(Boolean);
  const resolution = camera.resolution || {};
  return {
    id: String(camera.id), brand: String(camera.brand), model: String(camera.model),
    camera_type: camera.type || null,
    megapixels: Number.isFinite(Number(resolution.megapixels)) ? Number(resolution.megapixels) : null,
    resolution_label: resolution.label || null,
    power_source: power.map(String), connectivity: Array.isArray(camera.connectivity) ? camera.connectivity.map(String) : [],
    night_vision: camera.night_vision || {}, protocols: Array.isArray(camera.protocols) ? camera.protocols.map(String) : [],
    markets: Array.isArray(camera.markets) ? camera.markets.map(String) : [],
    features: Array.isArray(camera.features) ? camera.features.map(String) : [],
    sources: Array.isArray(camera.sources) ? camera.sources.map(String) : [],
    last_verified: camera.last_verified || null, specs: camera
  };
}).filter(Boolean);
if (rows.length < 1000) throw new Error("Too few valid camera rows; refusing import.");
console.log(`Importing ${rows.length} camera models across ${brands.size} brands in batches of ${batchSize}.`);
for (let i = 0; i < rows.length; i += batchSize) {
  const { error } = await supabase.from("cctv_cameras").upsert(rows.slice(i, i + batchSize), { onConflict: "id" });
  if (error) throw new Error(`Camera batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`);
  console.log(`Imported ${Math.min(i + batchSize, rows.length)} / ${rows.length}`);
}
const brandRows = [...brands.entries()].map(([name, camera_count]) => ({
  name, slug: name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `brand-${Buffer.from(name).toString("hex").slice(0,12)}`, camera_count
}));
for (let i = 0; i < brandRows.length; i += batchSize) {
  const { error } = await supabase.from("cctv_camera_brands").upsert(brandRows.slice(i, i + batchSize), { onConflict: "slug" });
  if (error) throw new Error(`Brand batch failed: ${error.message}`);
}
console.log(`Done. ${rows.length} cameras and ${brandRows.length} brands are now indexed.`);
