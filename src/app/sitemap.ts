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

  const [productsResult, categoriesResult, brandsResult] = await Promise.all([
    supabase.from("products")
      .select("slug")
      .eq("is_active", true)
      .not("price_egp", "is", null)
      .order("name_ar", { ascending: true }),
    supabase.from("categories")
      .select("slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("store_brands")
      .select("slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
  ]);

  if (productsResult.error) console.error("Sitemap product query failed:", productsResult.error.message);
  if (categoriesResult.error) console.error("Sitemap category query failed:", categoriesResult.error.message);
  if (brandsResult.error) console.error("Sitemap brand query failed:", brandsResult.error.message);

  for (const category of categoriesResult.data ?? []) {
    if (!category.slug) continue;
    entries.push({
      url: SITE_URL + "/categories/" + encodeURIComponent(category.slug),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    });
  }

  for (const brand of brandsResult.data ?? []) {
    if (!brand.slug) continue;
    entries.push({
      url: SITE_URL + "/brands/" + encodeURIComponent(brand.slug),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    });
  }

  for (const product of productsResult.data ?? []) {
    // Include every active, priced product with a slug, even when optional SEO fields are incomplete.
    if (!product.slug) continue;
    entries.push({
      url: SITE_URL + "/products/" + encodeURIComponent(product.slug),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7
    });
  }

  return entries;
}
