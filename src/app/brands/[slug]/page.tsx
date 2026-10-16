import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product, StoreBrand } from "@/lib/types";
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

const brandDescription = (name: string) =>
  `تصفح منتجات ${name} في كتالوج بين ستور، وشاهد الصور ورقم الموديل والمواصفات المتاحة. راجع توافق الجهاز مع نظامك، وتأكد من السعر النهائي والتوافر وإمكانية التوصيل قبل تأكيد الطلب.`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) return { title: "الماركة غير متاحة | بين ستور", robots: { index: false, follow: true } };
  const title = `منتجات ${brand.name} | موديلات وأسعار | بين ستور`;
  const description = brandDescription(brand.name).slice(0, 180);
  const url = SITE_URL + "/brands/" + encodeURIComponent(brand.slug);
  return {
    title, description,
    keywords: [brand.name, "بين ستور", "كاميرات مراقبة", "موديلات " + brand.name, "أسعار " + brand.name],
    alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: { type: "website", locale: "ar_EG", siteName: "Bein Store", url, title, description, images: brand.logo_url ? [brand.logo_url] : undefined },
    twitter: { card: "summary", title, description, images: brand.logo_url ? [brand.logo_url] : undefined }
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();

  const [{ data: brandData }, { data: categoryData }, { data: brandListData }, { data: settingsData }] = await Promise.all([
    supabase.from("store_brands").select("id,name,slug,logo_url,website_url,description,sort_order,is_active")
      .eq("slug", slug).eq("is_active", true).maybeSingle(),
    supabase.from("categories").select("id,name_ar,name_en,slug,sort_order,description_ar,description_en,image_url,is_active")
      .eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from("store_brands").select("id,name,slug,logo_url,website_url,description,sort_order,is_active")
      .eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }),
    supabase.from("store_settings").select("whatsapp,show_whatsapp").eq("id", "main").maybeSingle()
  ]);
  if (!brandData) notFound();
  const brand = brandData as StoreBrand;
  const categories = (categoryData ?? []) as Category[];
  const allBrands = (brandListData ?? []) as StoreBrand[];

  const { data: productData, error } = await supabase.from("products")
    .select("id,category_id,sku,slug,name_ar,name_en,brand,model,description_ar,description_en,specifications,price_egp,compare_at_price_egp,image_urls,is_active,is_featured")
    .eq("brand", brand.name).eq("is_active", true).not("price_egp", "is", null)
    .order("is_featured", { ascending: false }).order("name_ar", { ascending: true });
  const products = (error ? [] : productData ?? []) as Product[];
  const productsWithModels = new Set(products.map(product => product.model?.trim()).filter(Boolean)).size;
  const shownCategoryIds = new Set(products.map(product => product.category_id));
  const brandCategories = categories.filter(category => shownCategoryIds.has(category.id));
  const description = brandDescription(brand.name);
  const url = SITE_URL + "/brands/" + encodeURIComponent(brand.slug);
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "منتجات " + brand.name + " | بين ستور",
    description, url, inLanguage: "ar-EG",
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem", position: index + 1,
        url: SITE_URL + "/products/" + encodeURIComponent(product.slug),
        name: product.name_ar
      }))
    }
  };
  const whatsapp = settingsData?.show_whatsapp ? String(settingsData.whatsapp || process.env.NEXT_PUBLIC_STORE_WHATSAPP || "").replace(/\D/g, "") : "";
  const contactMessage = "مرحبًا بين ستور، أريد الاستفسار عن منتجات " + brand.name + " والموديل والسعر والتوافر.";
  const contactHref = whatsapp ? "https://wa.me/" + whatsapp + "?text=" + encodeURIComponent(contactMessage) : "/#contact";
  const initials = brand.name.split(/\s+/).map(part => part[0]).slice(0, 3).join("").toUpperCase();

  return <main className="subpage brand-page" dir="rtl">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c") }} />
    <header className="subpage-header">
      <SiteBrand className="brand" />
      <div className="subpage-header-actions">
        <Link href="/">الرئيسية</Link>
        <Link className="subpage-cart-link" href="/#catalog">كل المنتجات</Link>
      </div>
    </header>
    <section className="section-wrap">
      <div className="brand-page-hero">
        <div className="brand-page-copy">
          <div className="brand-page-topline">
            <div className="brand-page-mark">{brand.logo_url ? <img src={brand.logo_url} alt={"شعار " + brand.name} /> : <span>{initials}</span>}</div>
            <div>
              <span className="brand-page-eyebrow">BEIN STORE · BRAND CATALOG</span>
              <nav className="brand-page-breadcrumbs" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span>›</span><Link href="/#brands">الماركات</Link><span>›</span><span>{brand.name}</span></nav>
            </div>
          </div>
          <h1>منتجات <span>{brand.name}</span> في بين ستور</h1>
          <p className="brand-page-intro">{description}</p>
          {brand.description?.trim() && <p className="brand-page-note">{brand.description.trim().slice(0, 260)}</p>}
          <div className="brand-page-pills">
            <span className="brand-page-pill">✓ عرض الموديلات المتاحة</span>
            <span className="brand-page-pill">✓ مواصفات وصور المنتج</span>
            <span className="brand-page-pill">✓ تأكيد السعر والتوافر قبل الطلب</span>
          </div>
          <div className="brand-page-actions">
            <a className="primary" href="#brand-products">تصفح منتجات {brand.name} <span aria-hidden="true">↓</span></a>
            <a href={contactHref} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noreferrer" : undefined}>اسأل عن موديل محدد <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="brand-page-aside" aria-label="ملخص الكتالوج">
          <div className="brand-page-metric"><strong>{products.length}</strong><span>منتج بسعر مدرج</span></div>
          <div className="brand-page-metric"><strong>{productsWithModels}</strong><span>موديل موضح رقمه</span></div>
          <div className="brand-page-metric"><strong>{brandCategories.length}</strong><span>قسم مرتبط بالماركة</span></div>
        </div>
      </div>

      <section className="brand-page-products" id="brand-products">
        <div className="brand-page-section-head">
          <div>
            <span className="section-overline">كتالوج {brand.name}</span>
            <h2>اختار المنتج المناسب</h2>
            <p>ابحث باسم المنتج أو رقم الموديل، أو صفِّ النتائج حسب القسم. الأسعار والتوافر النهائي يتم تأكيدهما قبل الطلب.</p>
          </div>
        </div>
        {brandCategories.length > 0 && <div className="brand-page-category-chips" aria-label="الأقسام المتاحة">{brandCategories.map(category => <Link key={category.id} href={"/categories/" + category.slug}>{category.name_ar} <span aria-hidden="true">↗</span></Link>)}</div>}
        {products.length
          ? <Storefront products={products} categories={categories} showBrandFilter={false} />
          : <div className="brand-page-empty"><h3>لا توجد منتجات متاحة لهذه الماركة حاليًا</h3><p>تقدر تستفسر عن الموديل المطلوب أو ترجع للكتالوج الرئيسي لمقارنة البدائل المتاحة.</p><div className="brand-page-actions"><a className="primary" href={contactHref} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noreferrer" : undefined}>اسأل عن التوافر</a><Link href="/#catalog">كل المنتجات</Link></div></div>}
      </section>

      {allBrands.filter(item => item.slug !== brand.slug).length > 0 && <section className="brand-page-related" aria-labelledby="related-brands-title">
        <span className="section-overline">اكتشف بدائل أخرى</span>
        <h2 id="related-brands-title">ماركات تانية في بين ستور</h2>
        <div className="brand-page-related-grid">
          {allBrands.filter(item => item.slug !== brand.slug).map(item => (
            <Link className="brand-page-related-card" key={item.id} href={"/brands/" + item.slug}>
              <span className="brand-page-related-logo">{item.logo_url ? <img src={item.logo_url} alt="" loading="lazy" /> : <span>{item.name.split(/\s+/).map(part => part[0]).slice(0, 3).join("").toUpperCase()}</span>}</span>
              <span><b>{item.name}</b><small>تصفح منتجات {item.name} ←</small></span>
            </Link>
          ))}
        </div>
      </section>}
      <p className="local-seo-inline-link"><Link href="/#brands">العودة إلى كل الماركات في بين ستور ←</Link></p>
    </section>
  </main>;
}
