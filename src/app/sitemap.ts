import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bein-store.vercel.app").replace(/\/+$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: SITE_URL + "/services/cameras-6-october", lastModified: now, changeFrequency: "monthly", priority: 0.85 }
  ];

  const supabase = await createClient();
  if (!supabase) return entries;

  const { data, error } = await supabase
    .from("products")
    .select("slug,model,description_ar,image_urls,specifications")
    .eq("is_active", true)
    .not("price_egp", "is", null)
    .order("name_ar", { ascending: true });

  if (error) {
    console.error("Sitemap product query failed:", error.message);
    return entries;
  }

  for (const product of data ?? []) {
    const indexable = Boolean(product.model?.trim())
      && Boolean(product.description_ar?.trim())
      && Array.isArray(product.image_urls) && product.image_urls.length > 0;
    if (!product.slug || !indexable) continue;
    entries.push({
      url: `${SITE_URL}/products/${encodeURIComponent(product.slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7
    });
  }

  return entries;
}
