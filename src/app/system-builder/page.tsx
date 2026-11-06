import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import SystemCostBuilder from "@/components/system-cost-builder";
import "./builder.css";

export const metadata: Metadata = {
  title: "صمّم نظام المراقبة واحسب التكلفة | Bein Store",
  description: "كوّن نظام كاميرات المراقبة حسب المكان وعدد الكاميرات، واختر الأجهزة من منتجات Bein Store واحسب التكلفة التقديرية.",
  alternates: { canonical: "/system-builder" },
  robots: { index: true, follow: true }
};

type Product = {
  id: string; slug: string; name_ar: string; brand: string | null; model: string | null;
  price_egp: number; image_urls: string[] | null; category_slug: string | null;
  specifications: Record<string, unknown> | null;
};

export default async function SystemBuilderPage() {
  const supabase = await createClient();
  let products: Product[] = [];
  if (supabase) {
    const { data, error } = await supabase.from("products")
      .select("id,slug,name_ar,brand,model,price_egp,image_urls,category_id,specifications")
      .eq("is_active", true).not("price_egp", "is", null)
      .order("name_ar").limit(300);
    if (error) console.error("System builder product lookup failed:", error.message);
    const rows = data ?? [];
    const ids = Array.from(new Set(rows.map((p) => p.category_id).filter((id): id is string => Boolean(id))));
    const { data: categories } = ids.length
      ? await supabase.from("categories").select("id,slug").in("id", ids)
      : { data: [] as {id:string;slug:string}[] };
    const slugs = new Map((categories ?? []).map((c) => [c.id, c.slug]));
    products = rows.map((p) => ({
      id: p.id, slug: p.slug, name_ar: p.name_ar, brand: p.brand, model: p.model,
      price_egp: Number(p.price_egp), image_urls: p.image_urls,
      category_slug: slugs.get(p.category_id) ?? null,
      specifications: p.specifications as Record<string, unknown> | null
    }));
  }
  return <SystemCostBuilder products={products} />;
}
