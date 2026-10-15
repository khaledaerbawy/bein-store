import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import ProductDetailActions from "@/components/product-detail-actions";
import ProductGallery from "@/components/product-gallery";
import SiteBrand from "@/components/site-brand";
export const dynamic = "force-dynamic";
const specificationLabels: Record<string, string> = {
  resolution: "الدقة",
  lens: "العدسة",
  poe: "دعم PoE",
  ir_range_m: "مدى الأشعة تحت الحمراء",
  protection: "درجة الحماية",
  compression: "ضغط الفيديو",
  capacity: "السعة",
  sensor: "المستشعر",
  audio: "الصوت",
  type: "النوع",
  ports: "عدد المنافذ",
  power: "الطاقة",
  cable_type: "نوع الكابل",
  storage: "التخزين",
  channels: "عدد القنوات"
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bein-store.vercel.app").replace(/\/+$/, "");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  if (!supabase) return { title: "منتجات كاميرات المراقبة | بين ستور", robots: { index: false, follow: false } };
  const { data } = await supabase.from("products")
    .select("slug,name_ar,name_en,brand,model,description_ar,description_en,image_urls,price_egp,is_active,specifications")
    .eq("slug", slug).eq("is_active", true).not("price_egp", "is", null).maybeSingle();
  if (!data) return { title: "المنتج غير متاح | بين ستور", robots: { index: false, follow: false } };
  const description = [data.name_ar, data.brand, data.model, data.description_ar].filter(Boolean).join(" — ").slice(0, 180)
    || "منتجات كاميرات المراقبة وأجهزة التسجيل والشبكات من Bein Store. اسأل عن السعر والتوافر والتوصيل.";
  const titleParts = [data.name_ar];
  if (data.brand && !data.name_ar.toLocaleLowerCase().includes(data.brand.toLocaleLowerCase())) titleParts.push(data.brand);
  if (data.model && !data.name_ar.toLocaleLowerCase().includes(data.model.toLocaleLowerCase())) titleParts.push(data.model);
  const title = titleParts.join(" | ") + " | بين ستور";
  const url = `${SITE_URL}/products/${encodeURIComponent(data.slug)}`;
  const indexable = Boolean(data.model?.trim())
    && Boolean(data.description_ar?.trim())
    && Array.isArray(data.image_urls) && data.image_urls.length > 0;
  return {
    title, description,
    alternates: { canonical: url },
    robots: { index: indexable, follow: true, googleBot: { index: indexable, follow: true, "max-image-preview": "large" } },
    openGraph: { type: "website", locale: "ar_EG", siteName: "Bein Store", url, title, description, images: (data.image_urls ?? []).slice(0, 4).map((image: string) => ({ url: image, alt: data.name_ar })) },
    twitter: { card: "summary_large_image", title, description, images: (data.image_urls ?? []).slice(0, 1) }
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data, error } = await supabase.from("products").select("id,category_id,sku,slug,name_ar,name_en,brand,model,description_ar,description_en,specifications,price_egp,compare_at_price_egp,image_urls,is_active,is_featured").eq("slug", slug).eq("is_active", true).not("price_egp", "is", null).maybeSingle();
  if (error || !data) notFound();
  const p = data as Product;
  const money = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(Number(p.price_egp));
  const compareMoney = p.compare_at_price_egp != null ? new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(Number(p.compare_at_price_egp)) : null;
  const internalSpecificationKey = (key: string) => /^(price_|image_source_|internal_)/i.test(key);
  const priceStatus = p.specifications?.price_status;
  const priceNeedsConfirmation = typeof priceStatus === "string" && priceStatus !== "confirmed";
  const priceStatusLabel = priceStatus === "provisional_estimate" ? "سعر مبدئي — يُؤكَّد مع المتجر قبل الطلب" : priceStatus === "market_reference_variant" ? "سعر مرجعي لموديل مشابه — يُؤكَّد قبل الطلب" : "سعر مرجعي — يُؤكَّد مع المتجر قبل الطلب";
  const specifications = Object.entries(p.specifications ?? {}).filter(([key, value]) => !internalSpecificationKey(key) && key.trim() && value !== null && value !== undefined && String(value).trim() !== "");
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name_ar,
    description: p.description_ar || `${p.name_ar} من Bein Store — كاميرات مراقبة وأجهزة تسجيل وشبكات في 6 أكتوبر، الجيزة.`,
    sku: p.sku || undefined,
    mpn: p.model || undefined,
    image: p.image_urls?.length ? p.image_urls : undefined,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    url: `${SITE_URL}/products/${encodeURIComponent(p.slug)}`,
    ...(priceStatus === "confirmed" ? { offers: { "@type": "Offer", priceCurrency: "EGP", price: Number(p.price_egp).toFixed(2), url: `${SITE_URL}/products/${encodeURIComponent(p.slug)}`, itemCondition: "https://schema.org/NewCondition" } } : {})
  };
  return <main className="subpage product-page" dir="rtl"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData).replace(/</g, "\\u003c") }} /><header className="subpage-header"><SiteBrand className="brand" /><div className="subpage-header-actions"><Link href="/#catalog">مواصلة التسوق ←</Link><Link className="subpage-cart-link" href="/cart">عرض السلة</Link></div></header>
    <section className="section-wrap product-detail-wrap"><div className="breadcrumbs"><Link href="/">الرئيسية</Link> <span>›</span> <Link href="/#catalog">المنتجات</Link> <span>›</span> <span>{p.name_ar}</span></div>
      <article className="product-detail"><ProductGallery product={p} />
        <div className="detail-copy"><span className="product-brand-pill">{p.brand ?? "BEIN STORE"}</span><h1 className="page-title">{p.name_ar}</h1>{p.model && <p className="product-model">الموديل: <b dir="ltr">{p.model}</b></p>}{p.sku && <p className="product-model">كود المنتج: {p.sku}</p>}
          <div className="detail-price-row"><div className="detail-price-stack">{compareMoney && Number(p.compare_at_price_egp) > Number(p.price_egp) && <del className="detail-price-old">{compareMoney}</del>}<strong className="detail-price">{money}</strong>{priceNeedsConfirmation && <small className="product-model">{priceStatusLabel}</small>}{compareMoney && Number(p.compare_at_price_egp) > Number(p.price_egp) && <span className="detail-sale-label">سعر العرض</span>}</div><span className="detail-stock"><i/> متاح للطلب — التأكيد مع المتجر</span></div>{p.description_ar && <p className="detail-description">{p.description_ar}</p>}{specifications.length > 0 && <section className="detail-specifications"><h2>المواصفات الفنية</h2><dl>{specifications.map(([key,value])=><div className="detail-spec-row" key={key}><dt>{specificationLabels[key] ?? key.replace(/_/g, " ")}</dt><dd>{String(value)}</dd></div>)}</dl></section>}
          <ul className="detail-highlights"><li>مساعدة في اختيار الموديل المناسب</li><li>تأكيد التوافق والتوافر قبل تجهيز الطلب</li><li>خيار إتمام الطلب ومتابعته عبر واتساب عند تفعيله</li></ul><ProductDetailActions product={p}/><p className="detail-delivery-note">رسوم الشحن والتوافر النهائي يتم تأكيدهما مع المتجر قبل اعتماد الطلب.</p>
        </div></article></section></main>;
}
