import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Product, StoreBrand } from "@/lib/types";
import Storefront from "@/components/storefront";
import SiteBrand from "@/components/site-brand";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bein-store.vercel.app").replace(/\/+$/, "");

async function getBrand(slug: string): Promise<StoreBrand | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("store_brands")
    .select("id,name,slug,logo_url,website_url,description,sort_order,is_active")
    .eq("slug", slug).eq("is_active", true).maybeSingle();
  return (data as StoreBrand | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) return { title: "الماركة غير متاحة | بين ستور", robots: { index: false, follow: true } };
  const title = "منتجات " + brand.name + " | بين ستور";
  const description = (brand.description?.trim() || "تصفح منتجات " + brand.name + " في كتالوج Bein Store، وراجع رقم الموديل والمواصفات وتأكد من السعر والتوافر قبل الطلب.").slice(0, 180);
  const url = SITE_URL + "/brands/" + encodeURIComponent(brand.slug);
  return {
    title, description, alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: { type: "website", locale: "ar_EG", siteName: "Bein Store", url, title, description },
    twitter: { card: "summary", title, description }
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: brandData } = await supabase.from("store_brands")
    .select("id,name,slug,logo_url,website_url,description,sort_order,is_active")
    .eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!brandData) notFound();
  const brand = brandData as StoreBrand;
  const { data, error } = await supabase.from("products")
    .select("id,category_id,sku,slug,name_ar,name_en,brand,model,description_ar,description_en,specifications,price_egp,compare_at_price_egp,image_urls,is_active,is_featured")
    .eq("brand", brand.name).eq("is_active", true).not("price_egp", "is", null)
    .order("is_featured", { ascending: false }).order("name_ar", { ascending: true });
  const products = (error ? [] : data ?? []) as Product[];
  const description = brand.description?.trim() || "تصفح منتجات " + brand.name + " المعروضة في Bein Store. راجع الموديل والمواصفات، وتأكد من السعر والتوافر النهائي قبل اعتماد الطلب.";
  const url = SITE_URL + "/brands/" + encodeURIComponent(brand.slug);
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "منتجات " + brand.name + " | بين ستور",
    description, url, inLanguage: "ar-EG",
    mainEntity: { "@type": "ItemList", itemListElement: products.map((product, index) => ({
      "@type": "ListItem", position: index + 1,
      url: SITE_URL + "/products/" + encodeURIComponent(product.slug), name: product.name_ar
    })) }
  };
  return <main className="subpage" dir="rtl">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c") }} />
    <header className="subpage-header"><SiteBrand className="brand" /><div className="subpage-header-actions"><Link href="/">الرئيسية</Link><Link className="subpage-cart-link" href="/#catalog">كل المنتجات</Link></div></header>
    <section className="section-wrap">
      <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span>›</span><span>{brand.name}</span></nav>
      <span className="section-overline">BEIN STORE · BRAND CATALOG</span>
      <h1 className="page-title">منتجات {brand.name}</h1>
      <p className="detail-description">{description}</p>
      {products.length ? <Storefront products={products} categories={[]} /> : <p>لا توجد منتجات متاحة لهذه الماركة حاليًا. تواصل مع المتجر للتأكد من التوافر.</p>}
      <p className="local-seo-inline-link"><Link href="/#catalog">تصفح كل منتجات بين ستور ←</Link></p>
    </section>
  </main>;
}
