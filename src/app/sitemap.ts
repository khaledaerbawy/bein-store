import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bein-store.vercel.app").replace(/\/+$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL + "/", lastModified: now, changeFrequency: "daily", priority: 1 },
  ];

  const supabase = await createClient();
  if (!supabase) return entries;

  const [products, categories, brands] = await Promise.all([
    supabase.from("products").select("slug,updated_at").eq("is_active", true).gt("price_egp", 0).not("slug", "is", null),
    supabase.from("categories").select("slug").eq("is_active", true).not("slug", "is", null),
    supabase.from("store_brands").select("slug").eq("is_active", true).not("slug", "is", null),
  ]);

  for (const product of products.data ?? []) {
    if (!product.slug) continue;
    entries.push({
      url: SITE_URL + "/products/" + encodeURIComponent(product.slug),
      lastModified: product.updated_at ? new Date(product.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }
  for (const category of categories.data ?? []) {
    if (category.slug) entries.push({ url: SITE_URL + "/categories/" + encodeURIComponent(category.slug), changeFrequency: "weekly", priority: 0.6 });
  }
  for (const brand of brands.data ?? []) {
    if (brand.slug) entries.push({ url: SITE_URL + "/brands/" + encodeURIComponent(brand.slug), changeFrequency: "weekly", priority: 0.5 });
  }
  return entries;
}
