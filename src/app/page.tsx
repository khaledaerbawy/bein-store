import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import type { Category, Product, StoreSettings, StoreBrand, SiteBanner } from "@/lib/types";
import Storefront from "@/components/storefront";
import CartLink from "@/components/cart-link";
import ProductImage from "@/components/product-image";
import SystemBuilder from "@/components/system-builder";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bein-store.vercel.app").replace(/\/+$/, "");
const LOCAL_SEO_DESCRIPTION = "Bein Store (بين ستور) متجر إلكتروني لكاميرات المراقبة وأجهزة DVR وNVR وهيلوك وهيكفيجن والشبكات. تصفح الموديلات واسأل عن السعر والتوافر وإمكانية التوصيل إلى 6 أكتوبر والجيزة.";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  let title = "بين ستور | كاميرات مراقبة وDVR وNVR";
  let description = LOCAL_SEO_DESCRIPTION;
  if (supabase) {
    const { data } = await supabase.from("store_settings").select("store_name,page_title,meta_description").eq("id", "main").maybeSingle();
    if (data?.page_title?.trim()) title = data.page_title.trim();
    if (data?.meta_description?.trim()) description = data.meta_description.trim();
  }
  return {
    title,
    description,
    alternates: { canonical: "/" },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: { type: "website", locale: "ar_EG", url: SITE_URL, siteName: "Bein Store", title, description },
    twitter: { card: "summary_large_image", title, description }
  };
}

async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("categories").select("id,name_ar,name_en,slug,sort_order,description_ar,description_en,image_url,is_active").eq("is_active", true).order("sort_order", { ascending: true });
  if (error) { console.error("Category query failed:", error.message); return []; }
  return (data ?? []) as Category[];
}

async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("products").select("id,category_id,sku,slug,name_ar,name_en,brand,model,description_ar,description_en,specifications,price_egp,compare_at_price_egp,image_urls,is_active,is_featured").eq("is_active", true).not("price_egp", "is", null).order("is_featured", { ascending: false }).order("name_ar", { ascending: true });
  if (error) { console.error("Catalog query failed:", error.message); return []; }
  return (data ?? []) as Product[];
}

async function getBrands(): Promise<StoreBrand[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("store_brands").select("id,name,slug,logo_url,website_url,description,sort_order,is_active").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true });
  if (error) { console.error("Brand query failed:", error.message); return []; }
  return (data ?? []) as StoreBrand[];
}

async function getBanners(): Promise<SiteBanner[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("site_banners")
    .select("id,title,kicker,description,image_url,button_text,button_url,placement,background_color,text_color,sort_order,starts_at,ends_at,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) { console.error("Site banners query failed:", error.message); return []; }
  const now = Date.now();
  return ((data ?? []) as SiteBanner[]).filter((banner) => {
    const startsAt = banner.starts_at ? Date.parse(banner.starts_at) : null;
    const endsAt = banner.ends_at ? Date.parse(banner.ends_at) : null;
    return (startsAt === null || (Number.isFinite(startsAt) && startsAt <= now)) &&
      (endsAt === null || (Number.isFinite(endsAt) && endsAt > now));
  });
}

const categoryDetails: Record<string, { code: string; title: string; description: string }> = {
  "security-cameras": { code: "01", title: "كاميرات مراقبة", description: "داخلية وخارجية · IP وHD" },
  cameras: { code: "01", title: "كاميرات مراقبة", description: "داخلية وخارجية · IP وHD" },
  "ip-cameras": { code: "01", title: "كاميرات IP", description: "كاميرات شبكية وحلول احترافية" },
  recorders: { code: "02", title: "أجهزة التسجيل DVR / NVR", description: "لتسجيل أنظمة الكاميرات" },
  dvr: { code: "02", title: "أجهزة التسجيل DVR / NVR", description: "لتسجيل أنظمة الكاميرات" },
  nvr: { code: "02", title: "أجهزة التسجيل DVR / NVR", description: "لتسجيل كاميرات الشبكة" },
  storage: { code: "03", title: "هاردات تخزين", description: "تخزين مخصص للتسجيل المستمر" },
  networking: { code: "04", title: "شبكات وPoE", description: "سويتشات وتوصيلات الشبكة" },
  "cables-accessories": { code: "05", title: "كابلات وإكسسوارات", description: "مستلزمات التركيب والتشغيل" },
  accessories: { code: "05", title: "كابلات وإكسسوارات", description: "مستلزمات التركيب والتشغيل" },
  "installation-services": { code: "06", title: "خدمات التركيب", description: "تجهيز وتركيب أنظمة المراقبة" },
};

const categoriesFallback: Category[] = [
  { id: "fallback-cameras", name_ar: "كاميرات المراقبة", name_en: "Cameras", slug: "security-cameras", sort_order: 1 },
  { id: "fallback-recorders", name_ar: "أجهزة التسجيل", name_en: "Recorders", slug: "recorders", sort_order: 2 },
  { id: "fallback-storage", name_ar: "هاردات التخزين", name_en: "Storage", slug: "storage", sort_order: 3 },
  { id: "fallback-networking", name_ar: "شبكات وPoE", name_en: "Networking", slug: "networking", sort_order: 4 },
  { id: "fallback-accessories", name_ar: "كابلات وإكسسوارات", name_en: "Cables & accessories", slug: "cables-accessories", sort_order: 5 },
  { id: "fallback-installation", name_ar: "خدمات التركيب", name_en: "Installation services", slug: "installation-services", sort_order: 6 },
];

const defaultStoreSettings: StoreSettings = {
  id: "main", store_name: "Bein Store", logo_url: null, favicon_url: null,
  page_title: "بين ستور | كاميرات مراقبة وDVR وNVR",
  meta_description: "Bein Store (بين ستور) متجر إلكتروني لكاميرات المراقبة وأجهزة DVR وNVR وهيلوك وهيكفيجن والشبكات. تصفح الموديلات واسأل عن السعر والتوافر وإمكانية التوصيل إلى 6 أكتوبر والجيزة.",
  announcement_text: "مساعدة فنية في اختيار الموديل وتأكيد السعر قبل الطلب",
  categories_title: "تسوّق حسب القسم",
  categories_description: "وصل للقسم اللي محتاجه بسرعة.",
  catalog_title: "منتجاتنا",
  catalog_description: "صور واضحة، موديلات وأسعار معروضة، واختيار سهل للمنتج المناسب.",
  brands_title: "ماركات بنجهّز أنظمتها حسب احتياجك",
  services_kicker: "محتاج مساعدة؟",
  services_title: "مش متأكد تختار إيه؟",
  services_highlight: "نساعدك توصل للمناسب.",
  services_description: "اختيار النظام الصح بيعتمد على المكان، عدد الكاميرات، طريقة التسجيل، وسعة التخزين. ابعتلنا التفاصيل ونراجع معاك المكونات المطلوبة.",
  show_announcement: true, hero_badge: "كاميرات مراقبة وأنظمة أمنية",
  hero_title: "كل ما تحتاجه لنظام مراقبة", hero_title_highlight: "متكامل وآمن",
  hero_description: "كاميرات، أجهزة تسجيل، هاردات تخزين وشبكات. اختار المنتجات المناسبة للمكان، ولو محتار في الموديل أو التوصيل نساعدك قبل الطلب.",
  hero_image_url: null, hero_cta_text: "تسوّق المنتجات",
  show_hero: true, show_categories: true, show_catalog: true, show_brands: true, show_services: true,
  phone: null, whatsapp: null, address: null, show_phone: true, show_whatsapp: true, show_address: true,
  orders_enabled: true,
  orders_paused_message: "استقبال الطلبات متوقف مؤقتًا. تواصل مع المتجر للاستفسار.",
  shipping_fee_egp: 0,
  free_shipping_threshold_egp: null,
  minimum_order_egp: 0,
  whatsapp_order_confirmation: true,
  allow_order_notes: true,
  delivery_time_text: "موعد التوصيل ورسوم الشحن يتم تأكيدهما مع المتجر بعد مراجعة العنوان.",
  footer_text: "كاميرات مراقبة وأنظمة تسجيل وشبكات ومستلزمات تركيب، مع مساعدة في اختيار المكونات المناسبة.",
  primary_color: "#1766bf", accent_color: "#f1f6fa"
};
async function getStoreSettings(): Promise<StoreSettings> {
  const supabase = await createClient();
  if (!supabase) return defaultStoreSettings;
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", "main").maybeSingle();
  if (error || !data) {
    if (error) console.error("Store settings query failed:", error.message);
    return defaultStoreSettings;
  }
  return { ...defaultStoreSettings, ...data } as StoreSettings;
}


function renderSiteBanners(banners: SiteBanner[], placement: SiteBanner["placement"]) {
  const items = banners.filter((banner) => banner.placement === placement);
  if (!items.length) return null;
  return <section id={placement === "after_hero" ? "ad-space" : undefined} className={`site-promo-banners site-promo-banners-${placement}`} aria-label="عروض المتجر">
    {items.map((banner) => {
      const external = /^https?:\/\//i.test(banner.button_url ?? "");
      return <article className="site-promo-banner" key={banner.id} style={{ backgroundColor: banner.background_color, color: banner.text_color }}>
        <div className="site-promo-banner-copy">
          {banner.kicker && <small>{banner.kicker}</small>}
          <h2>{banner.title}</h2>
          {banner.description && <p>{banner.description}</p>}
          {banner.button_text && banner.button_url && <a className="site-promo-button" href={banner.button_url} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{banner.button_text} <span aria-hidden="true">←</span></a>}
        </div>
        {banner.image_url && <img src={banner.image_url} alt="" loading="lazy" />}
      </article>;
    })}
  </section>;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const [{ q = "", category: categorySlug = "" }, products, categories, site, brands, banners] = await Promise.all([searchParams, getProducts(), getCategories(), getStoreSettings(), getBrands(), getBanners()]);
  const initialCategoryId = categories.find((item) => item.slug === categorySlug)?.id ?? "all";
  const storePhone = site.show_phone ? (site.phone || process.env.NEXT_PUBLIC_STORE_PHONE || "").trim() : "";
  const storeWhatsapp = site.show_whatsapp ? (site.whatsapp || process.env.NEXT_PUBLIC_STORE_WHATSAPP || "").replace(/\D/g, "") : "";
  const storeAddress = site.show_address ? (site.address || process.env.NEXT_PUBLIC_STORE_ADDRESS || "").trim() : "";
  const whatsappUrl = storeWhatsapp ? `https://wa.me/${storeWhatsapp}` : "#contact";
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const shownCategories = categories.length ? categories : categoriesFallback;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "@id": `${SITE_URL}/#store`,
      name: site.store_name || "Bein Store",
      alternateName: ["بين ستور", "Bein Store"],
      url: SITE_URL,
      description: site.meta_description || LOCAL_SEO_DESCRIPTION,
      ...(storePhone ? { telephone: storePhone } : {}),
      ...(storeWhatsapp ? { contactPoint: { "@type": "ContactPoint", telephone: `+${storeWhatsapp}`, contactType: "customer service", availableLanguage: ["Arabic"] } } : {}),
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "كاميرات مراقبة وأجهزة تسجيل وشبكات",
        itemListElement: categories.slice(0, 12).map((category) => ({
          "@type": "OfferCatalog",
          name: category.name_ar,
          url: `${SITE_URL}/?category=${encodeURIComponent(category.slug)}#catalog`
        }))
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: site.store_name || "Bein Store",
      alternateName: "بين ستور",
      inLanguage: "ar-EG",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
        "query-input": "required name=search_term_string"
      }
    }
  ];
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "فين أشتري كاميرات مراقبة في 6 أكتوبر؟", acceptedAnswer: { "@type": "Answer", text: "تقدر تتصفح منتجات Bein Store على الموقع وتتواصل مع المتجر لتأكيد الموديل والسعر والتوافر ومواعيد التوصيل قبل اعتماد الطلب." } },
      { "@type": "Question", name: "هل عندكم كاميرات Hikvision وHiLook وأجهزة DVR وNVR؟", acceptedAnswer: { "@type": "Answer", text: "الموقع مخصص لعرض كاميرات المراقبة وأجهزة التسجيل والشبكات. راجع الكتالوج أو اسأل المتجر عن توافر الموديل المحدد قبل الطلب." } },
      { "@type": "Question", name: "بدور على بتاع دش في أكتوبر أو مستلزمات شبكات، أعمل إيه؟", acceptedAnswer: { "@type": "Answer", text: "تواصل مع Bein Store لتأكيد توافر مستلزمات الدش والشبكات والموديل المطلوب قبل الزيارة أو الطلب." } }
    ]
  };
  return <main className="storefront-page" dir="rtl" style={{ "--store-primary": site.primary_color, "--store-accent": site.accent_color } as React.CSSProperties}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData).replace(/</g, "\\u003c") }} />
    {site.show_announcement && <div className="utility-bar"><div className="utility-inner"><div className="utility-service-points"><span>{site.announcement_text}</span></div><div className="utility-links"><span>EGP · مصر</span><span className="utility-separator">|</span><a href={whatsappUrl} target={storeWhatsapp ? "_blank" : undefined} rel={storeWhatsapp ? "noreferrer" : undefined}>خدمة العملاء {storeWhatsapp ? "عبر واتساب ↗" : "↗"}</a></div></div></div>}
    <header className="store-header">
      <Link className="store-logo" href="/" aria-label={site.store_name + " الرئيسية"}>{site.logo_url ? <img className="logo-image" src={site.logo_url} alt={site.store_name} /> : <span className="logo-symbol">B<span>.</span></span>}<span className="logo-wordmark">{site.store_name}<small>SECURITY SYSTEMS</small></span></Link>
      <form className="header-search" action="/" method="get" role="search"><span className="header-search-icon" aria-hidden="true">⌕</span><input type="search" name="q" defaultValue={q} placeholder="ابحث بالموديل أو اسم الجهاز أو الحل المطلوب…" aria-label="ابحث في منتجات Bein Store" /><button type="submit">بحث</button></form>
      <div className="header-actions">{storeWhatsapp ? <a className="header-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="تواصل عبر واتساب"><span aria-hidden="true">◔</span><span><small>مساعدة فنية</small><b>تواصل معانا</b></span></a> : null}<CartLink /></div>
    </header>
    <nav className="store-nav-row" aria-label="القائمة الرئيسية"><a className="nav-all-categories" href="#system-builder">✳ كوّن نظامك</a><a href="#catalog">الكتالوج</a><a href="#categories">الأقسام</a><a href="#brands">الماركات</a><a href="#services">حلول المشروعات</a><a href="#ad-space">عروض مختارة</a><span className="nav-note">مساعدة فنية في اختيار الموديل</span></nav>
    {renderSiteBanners(banners, "after_hero")}
    {site.show_categories && <section className="category-section" id="categories"><div className="commerce-section-head"><div><span className="section-overline">ابدأ من احتياجك</span><h2>{site.categories_title}</h2><p className="section-subtitle">تصفح المكونات إذا كنت تعرف ما تحتاجه، أو ارجع لأداة تكوين النظام لتجميعها معًا.</p></div><a href="#system-builder" className="section-text-link">كوّن نظامًا متكاملًا ←</a></div><div className="category-card-grid">{shownCategories.map((category, index) => { const detail = categoryDetails[category.slug] ?? { code: String(index + 1).padStart(2, "0"), title: category.name_ar, description: "منتجات ومستلزمات القسم" }; const representativeProduct = products.find((product) => product.category_id === category.id && product.image_urls?.length) ?? null; return <a className="category-tile" href={"/?category=" + encodeURIComponent(category.slug) + "#catalog"} key={category.id}><span className="category-tile-image">{category.image_url ? <img className="category-photo" src={category.image_url} alt="" loading="lazy" /> : representativeProduct ? <ProductImage product={representativeProduct} className="category-photo" /> : <span className="category-image-fallback">BS</span>}</span><span className="category-tile-copy"><b>{category.name_ar || detail.title}</b><small>{category.description_ar || detail.description}</small></span><span className="category-tile-link">عرض المنتجات ←</span></a>; })}</div></section>}
    {renderSiteBanners(banners, "after_categories")}
    {site.show_catalog && <section className="catalog-section" id="catalog"><div className="commerce-section-head"><div><span className="section-overline">المكونات المتاحة</span><h2>{site.catalog_title}</h2><p className="section-subtitle">المنتجات المعروضة لا تعني وحدها أن كل المكونات متوافقة؛ راجع المواصفات قبل الطلب.</p></div><div className="catalog-meta"><span className="catalog-live-dot" /> {products.length} منتج · EGP</div></div>{!configured ? <div className="empty-state"><div className="empty-symbol">BS</div><h3>الكتالوج قيد التجهيز</h3><p>قاعدة بيانات المتجر لم تُربط بعد. بعد إعداد الربط ونشر المنتجات الفعلية، ستظهر هنا الأسعار والموديلات المتاحة.</p></div> : <Storefront products={products} categories={categories} initialQuery={q} initialCategoryId={initialCategoryId} />}</section>}
    {site.show_brands && <section className="brands-strip" id="brands" aria-label="الماركات المتاحة"><span className="brands-title">{site.brands_title}</span><div className="brand-logo-list">{brands.map((brand) => <div className="brand-logo-card" key={brand.id}>{brand.website_url ? <a href={brand.website_url} target="_blank" rel="noreferrer" aria-label={brand.name}>{brand.logo_url ? <img src={brand.logo_url} alt={brand.name} loading="lazy" /> : <span className="brand-managed-wordmark">{brand.name}</span>}</a> : brand.logo_url ? <img src={brand.logo_url} alt={brand.name} loading="lazy" /> : <span className="brand-managed-wordmark">{brand.name}</span>}</div>)}</div><span className="brands-note">تأكد من الموديل والتوافق قبل اعتماد الطلب</span></section>}
    {site.show_services && <section className="service-section" id="services"><div className="service-intro"><span className="section-overline">{site.services_kicker}</span><h2>{site.services_title}<br /><em>{site.services_highlight}</em></h2><p>{site.services_description}</p><a className="commerce-button commerce-button-orange" href={whatsappUrl} target={storeWhatsapp ? "_blank" : undefined} rel={storeWhatsapp ? "noreferrer" : undefined}>{storeWhatsapp ? "ناقش احتياجك معانا ↗" : "تواصل مع المتجر"}</a><Link className="local-seo-inline-link" href="/services/cameras-6-october">كاميرات مراقبة وشبكات في 6 أكتوبر ←</Link></div><div className="service-steps"><div className="service-step"><span>01</span><div><b>حدّد المكان والتغطية</b><p>بيت، محل، مكتب أو مشروع أكبر.</p></div></div><div className="service-step"><span>02</span><div><b>اختار الكاميرات والتسجيل</b><p>الدقة وعدد القنوات وطريقة التسجيل المناسبة.</p></div></div><div className="service-step"><span>03</span><div><b>احسب التخزين والشبكة</b><p>راجع مدة التسجيل ومتطلبات PoE والكابلات.</p></div></div><div className="service-step"><span>04</span><div><b>راجع التوافق مع مختص</b><p>نتأكد من المكونات قبل تجهيز الطلب.</p></div></div></div></section>}
    <section className="ad-slot" id="ad-space" aria-label="مساحة إعلانية للماركات والشركاء"><div className="ad-slot-mark">AD<span> / 02</span></div><div className="ad-slot-copy"><small>مساحة إعلانية للشركاء</small><b>ضع منتجك أو عرضك أمام جمهور يبحث عن حلول المراقبة والشبكات</b><span>مساحة منفصلة عن أداة تكوين النظام، جاهزة لربط بانرات معتمدة من لوحة الإدارة.</span></div><a href={whatsappUrl} target={storeWhatsapp ? "_blank" : undefined} rel={storeWhatsapp ? "noreferrer" : undefined}>استفسر عن الإعلان ↗</a></section>
    {renderSiteBanners(banners, "before_footer")}
    <section className="local-seo-section" aria-labelledby="local-seo-heading"><div className="section-heading"><div><span className="section-overline">BEIN STORE · ONLINE STORE</span><h2 id="local-seo-heading">كاميرات مراقبة وأجهزة تسجيل وشبكات</h2></div></div><p>بين ستور متجر إلكتروني لعرض كاميرات المراقبة وأجهزة التسجيل DVR وNVR والهاردات وسويتشات PoE وكابلات الشبكات. استخدم أداة تكوين النظام للحصول على قائمة أولية، ثم أكد رقم الموديل والسعر والتوافق والتوصيل مع المتجر قبل اعتماد الطلب.</p><nav className="local-seo-link-groups" aria-label="تصفح الأقسام والماركات"><div><h3>تصفح الأقسام</h3><ul>{categories.filter((category) => category.is_active !== false).map((category) => <li key={category.id}><Link href={"/categories/" + encodeURIComponent(category.slug)}>{category.name_ar}</Link></li>)}</ul></div><div><h3>تصفح الماركات</h3><ul>{brands.filter((brand) => brand.is_active).map((brand) => <li key={brand.id}><Link href={"/brands/" + encodeURIComponent(brand.slug)}>منتجات {brand.name}</Link></li>)}</ul></div></nav><div className="local-seo-faq"><details><summary>هل تكوين النظام يضمن التوافق؟</summary><p>لا، التكوين توصية أولية تعتمد على بيانات الكتالوج. يجب مراجعة الموديل وعدد القنوات والطاقة وسعة التخزين مع مختص قبل اعتماد المكونات.</p></details><details><summary>هل حساب التخزين نهائي؟</summary><p>التقدير تقريبي ويتغير حسب الترميز ومعدل الإطارات والحركة ونمط التسجيل وإعدادات الكاميرات. لا تعتمد عليه كحساب هندسي نهائي.</p></details><details><summary>هل السعر الظاهر عرض سعر نهائي؟</summary><p>راجع المتجر لتأكيد السعر والتوفر ورسوم الشحن قبل اعتماد الطلب.</p></details></div></section>
    <SystemBuilder products={products} categories={shownCategories} whatsappUrl={whatsappUrl} showPartnerOffers={!banners.some((banner) => banner.placement === "after_hero")} />
    <footer className="commerce-footer" id="contact"><div className="footer-main"><Link className="store-logo footer-store-logo" href="/">{site.logo_url ? <img className="logo-image" src={site.logo_url} alt={site.store_name} /> : <span className="logo-symbol">B<span>.</span></span>}<span className="logo-wordmark">{site.store_name}<small>SECURITY SYSTEMS</small></span></Link><p>{site.footer_text}</p></div><div className="footer-column"><b>تصفّح المتجر</b><a href="#system-builder">كوّن نظامك</a><a href="#catalog">المنتجات والأسعار</a><a href="#services">حلول المشروعات</a></div><div className="footer-column"><b>تواصل معانا</b>{storePhone && <a href={"tel:" + storePhone.replace(/[^+\d]/g, "")} dir="ltr">{storePhone}</a>}{storeWhatsapp && <a href={whatsappUrl} target="_blank" rel="noreferrer">واتساب</a>}{storeAddress && <span>{storeAddress}</span>}{!storePhone && !storeWhatsapp && !storeAddress && <span>بيانات التواصل هتظهر هنا بعد إعدادها.</span>}</div><div className="footer-bottom"><span>© {new Date().getFullYear()} {site.store_name}. جميع الحقوق محفوظة.</span><span>كاميرات · أجهزة تسجيل · شبكات · إكسسوارات</span></div></footer>
  </main>;
}
