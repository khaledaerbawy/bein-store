import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/lib/types";
import Storefront from "@/components/storefront";
import SiteBrand from "@/components/site-brand";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bein-store.vercel.app").replace(/\/+$/, "");

async function getCategory(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("categories")
    .select("id,name_ar,name_en,slug,sort_order,description_ar,description_en,image_url,is_active")
    .eq("slug", slug).eq("is_active", true).maybeSingle();
  return (data as Category | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "القسم غير متاح | بين ستور", robots: { index: false, follow: true } };
  const title = category.name_ar + " | بين ستور";
  const description = (category.description_ar?.trim() || "تصفح " + category.name_ar + " من Bein Store، وقارن الموديلات والمواصفات وتأكد من السعر والتوافر قبل الطلب.").slice(0, 180);
  const url = SITE_URL + "/categories/" + encodeURIComponent(category.slug);
  return {
    title, description, alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: { type: "website", locale: "ar_EG", siteName: "Bein Store", url, title, description },
    twitter: { card: "summary", title, description }
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: categoryData } = await supabase.from("categories")
    .select("id,name_ar,name_en,slug,sort_order,description_ar,description_en,image_url,is_active")
    .eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!categoryData) notFound();
  const category = categoryData as Category;
  const { data, error } = await supabase.from("products")
    .select("id,category_id,sku,slug,name_ar,name_en,brand,model,description_ar,description_en,specifications,price_egp,compare_at_price_egp,image_urls,is_active,is_featured")
    .eq("category_id", category.id).eq("is_active", true).not("price_egp", "is", null)
    .order("is_featured", { ascending: false }).order("name_ar", { ascending: true });
  const products = (error ? [] : data ?? []) as Product[];
  const description = category.description_ar?.trim() || "تصفح " + category.name_ar + " من Bein Store، وراجع رقم الموديل والمواصفات والسعر المعلن، وتواصل مع المتجر لتأكيد التوافر قبل الطلب.";
  const url = SITE_URL + "/categories/" + encodeURIComponent(category.slug);
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name_ar + " | بين ستور",
    description,
    url,
    inLanguage: "ar-EG",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: SITE_URL + "/products/" + encodeURIComponent(product.slug),
        name: product.name_ar
      }))
    }
  };
  return <main className="subpage" dir="rtl">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c") }} />
    <header className="subpage-header"><SiteBrand className="brand" /><div className="subpage-header-actions"><Link href="/">الرئيسية</Link><Link className="subpage-cart-link" href="/#catalog">كل المنتجات</Link></div></header>
    <section className="section-wrap">
      <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span>›</span><span>{category.name_ar}</span></nav>
      <span className="section-overline">BEIN STORE · PRODUCT CATEGORY</span>
      <h1 className="page-title">{category.name_ar}</h1>
      <p className="detail-description">{description}</p>
      {products.length ? <Storefront products={products} categories={[category]} initialCategoryId={category.id} /> : <p>لا توجد منتجات متاحة في هذا القسم حاليًا. ارجع للكتالوج أو تواصل مع المتجر للتأكد من التوافر.</p>}
      <p className="local-seo-inline-link"><Link href="/#catalog">تصفح كل منتجات بين ستور ←</Link></p>
    </section>
  </main>;
}
