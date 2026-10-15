import { createClient } from "@/lib/supabase/server";
import type { Category, Product, StoreSettings, StoreBrand } from "@/lib/types";
import Storefront from "@/components/storefront";
import CartLink from "@/components/cart-link";
import ProductImage from "@/components/product-image";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
  const { data, error } = await supabase.from("products").select("id,category_id,sku,slug,name_ar,name_en,brand,model,description_ar,description_en,specifications,price_egp,image_urls,is_active,is_featured").eq("is_active", true).not("price_egp", "is", null).order("is_featured", { ascending: false }).order("name_ar", { ascending: true });
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
  page_title: "Bein Store | كاميرات المراقبة والشبكات",
  meta_description: "متجر Bein Store لكاميرات المراقبة وأجهزة التسجيل والشبكات.",
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

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const [{ q = "", category: categorySlug = "" }, products, categories, site, brands] = await Promise.all([searchParams, getProducts(), getCategories(), getStoreSettings(), getBrands()]);
  const initialCategoryId = categories.find((item) => item.slug === categorySlug)?.id ?? "all";
  const storePhone = site.show_phone ? (site.phone || process.env.NEXT_PUBLIC_STORE_PHONE || "").trim() : "";
  const storeWhatsapp = site.show_whatsapp ? (site.whatsapp || process.env.NEXT_PUBLIC_STORE_WHATSAPP || "").replace(/\D/g, "") : "";
  const storeAddress = site.show_address ? (site.address || process.env.NEXT_PUBLIC_STORE_ADDRESS || "").trim() : "";
  const whatsappUrl = storeWhatsapp ? `https://wa.me/${storeWhatsapp}` : "#contact";
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const shownCategories = categories.length ? categories : categoriesFallback;
  const heroProduct = products.find((product) => product.brand === "Hikvision" && product.model?.startsWith("DS-2CD") && product.image_urls?.length) ?? products.find((product) => product.category_id === categories.find((item) => item.slug === "security-cameras")?.id && product.image_urls?.length) ?? products.find((product) => product.image_urls?.length) ?? null;
  const heroRecorder = products.find((product) => categories.find((item) => item.id === product.category_id)?.slug === "recorders" && product.image_urls?.length) ?? null;
  const heroStorage = products.find((product) => categories.find((item) => item.id === product.category_id)?.slug === "storage" && product.image_urls?.length) ?? null;
  return <main className="storefront-page" dir="rtl" style={{ "--store-primary": site.primary_color, "--store-accent": site.accent_color } as React.CSSProperties}>
    {site.show_announcement && <div className="utility-bar">
      <div className="utility-inner">
        <div className="utility-service-points"><span>{site.announcement_text}</span></div>
        <div className="utility-links"><span>EGP · مصر</span><span className="utility-separator">|</span><a href={whatsappUrl} target={storeWhatsapp ? "_blank" : undefined} rel={storeWhatsapp ? "noreferrer" : undefined}>خدمة العملاء {storeWhatsapp ? "عبر واتساب ↗" : "↗"}</a></div>
      </div>
    </div>}

    <header className="store-header">
      <Link className="store-logo" href="/" aria-label={site.store_name + " الرئيسية"}>{site.logo_url ? <img className="logo-image" src={site.logo_url} alt={site.store_name} /> : <span className="logo-symbol">B<span>.</span></span>}<span className="logo-wordmark">{site.store_name}<small>SECURITY SYSTEMS</small></span></Link>
      <form className="header-search" action="/" method="get" role="search">
        <span className="header-search-icon" aria-hidden="true">⌕</span>
        <input type="search" name="q" defaultValue={q} placeholder="ابحث باسم المنتج أو الموديل…" aria-label="ابحث في منتجات Bein Store" />
        <button type="submit">بحث</button>
      </form>
      <div className="header-actions">
        {storeWhatsapp ? <a className="header-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="تواصل عبر واتساب"><span className="whatsapp-glyph">◔</span><span><small>تواصل معانا</small><b>واتساب</b></span></a> : null}
        {storePhone ? <a className="header-phone" href={`tel:${storePhone.replace(/[^+\d]/g, "")}`}><span className="phone-mark" aria-hidden="true">☎</span><span><small>للاستفسارات والطلبات</small><b dir="ltr">{storePhone}</b></span></a> : !storeWhatsapp ? <a className="header-phone" href="#contact"><span className="phone-mark" aria-hidden="true">☎</span><span><small>خدمة العملاء</small><b>تواصل مع المتجر</b></span></a> : null}
        <CartLink />
      </div>
    </header>
    <nav className="store-nav-row" aria-label="القائمة الرئيسية">
      <a className="nav-all-categories" href="#categories"><span aria-hidden="true">☰</span> جميع الأقسام</a>
      {shownCategories.slice(0, 6).map((category) => <a key={category.id} href={`/?category=${encodeURIComponent(category.slug)}#catalog`}>{category.name_ar}</a>)}
      <a href="#services">حلول المشروعات</a>
      <span className="nav-note"><i /> مساعدة فنية في اختيار الموديل</span>
    </nav>

    {site.show_hero && (
    <section className="commerce-hero customer-commerce-hero">
      <div className="hero-main-copy">
        <div className="hero-kicker"><span /> {site.hero_badge}</div>
        <h1>{site.hero_title}<br /><em>{site.hero_title_highlight}</em></h1>
        <p>{site.hero_description}</p>
        <div className="commerce-hero-actions">
          <a className="commerce-button commerce-button-orange" href="#catalog">{site.hero_cta_text} <span aria-hidden="true">←</span></a>
          <a className="commerce-button commerce-button-outline" href={whatsappUrl} target={storeWhatsapp ? "_blank" : undefined} rel={storeWhatsapp ? "noreferrer" : undefined}>{storeWhatsapp ? "اسألنا على واتساب" : "تواصل مع المتجر"}</a>
        </div>
        <div className="customer-hero-benefits"><span>اختيار الموديل المناسب</span><span>مراجعة التوافق قبل الطلب</span><span>تأكيد السعر والتوفر</span></div>
      </div>
      <div className="customer-hero-products" aria-label="منتجات من كتالوج Bein Store">
        <div className="customer-hero-main-photo">
          {site.hero_image_url ? <img className="customer-hero-camera" src={site.hero_image_url} alt={site.store_name} /> : heroProduct ? <ProductImage product={heroProduct} className="customer-hero-camera" /> : <div className="customer-hero-photo-empty">كاميرات مراقبة</div>}
          <div className="customer-hero-photo-caption"><small>{heroProduct?.brand ?? site.store_name}</small><b>{heroProduct?.name_ar ?? site.store_name}</b></div>
        </div>
        <div className="customer-hero-secondary">
          {heroRecorder ? <div className="customer-hero-secondary-photo"><ProductImage product={heroRecorder} className="customer-hero-small-image" /><span>أجهزة التسجيل</span></div> : null}
          {heroStorage ? <div className="customer-hero-secondary-photo"><ProductImage product={heroStorage} className="customer-hero-small-image" /><span>هاردات التخزين</span></div> : null}
        </div>
      </div>
    </section>
    )}

    {site.show_categories && (
    <section className="category-section" id="categories">
      <div className="commerce-section-head"><div><span className="section-overline">تسوّق بسهولة</span><h2>{site.categories_title}</h2><p className="section-subtitle">{site.categories_description}</p></div><a href="#catalog" className="section-text-link">عرض الكتالوج <span>←</span></a></div>
      <div className="category-card-grid">
        {shownCategories.map((category, index) => {
          const detail = categoryDetails[category.slug] ?? { code: String(index + 1).padStart(2, "0"), title: category.name_ar, description: "منتجات ومستلزمات القسم" };
          const representativeProduct = products.find((product) => product.category_id === category.id && product.image_urls?.length) ?? null;
          return <a className="category-tile" href={`/?category=${encodeURIComponent(category.slug)}#catalog`} key={category.id}>
            <span className="category-tile-image">
              {category.image_url ? <img className="category-photo" src={category.image_url} alt="" loading="lazy" /> : representativeProduct ? <ProductImage product={representativeProduct} className="category-photo" /> : <span className="category-image-fallback">BS</span>}
            </span>
            <span className="category-tile-copy"><b>{category.name_ar || detail.title}</b><small>{category.description_ar || detail.description}</small></span>
            <span className="category-tile-link">عرض المنتجات <span>←</span></span>
          </a>;
        })}
      </div>
    </section>

    )}

    {site.show_catalog && (
    <section className="catalog-section" id="catalog">
      <div className="commerce-section-head"><div><span className="section-overline">كتالوج Bein Store</span><h2>{site.catalog_title}</h2><p className="section-subtitle">{site.catalog_description}</p></div><div className="catalog-meta"><span className="catalog-live-dot" /> {products.length} منتج · EGP</div></div>
      {!configured ? <div className="empty-state"><div className="empty-symbol">BS</div><h3>الكتالوج قيد التجهيز</h3><p>قاعدة بيانات المتجر لم تُربط بعد. بعد إعداد الربط ونشر المنتجات الفعلية، ستظهر هنا الأسعار والموديلات المتاحة.</p></div> : <Storefront products={products} categories={categories} initialQuery={q} initialCategoryId={initialCategoryId} />}
    </section>

    )}

    {site.show_brands && (
    <section className="brands-strip" id="brands" aria-label="الماركات المتاحة"><span className="brands-title">{site.brands_title}</span><div className="brand-logo-list">{brands.map(brand => <div className="brand-logo-card" key={brand.id}>{brand.website_url ? <a href={brand.website_url} target="_blank" rel="noreferrer" aria-label={brand.name}>{brand.logo_url ? <img src={brand.logo_url} alt={brand.name} loading="lazy" /> : <span className="brand-managed-wordmark">{brand.name}</span>}</a> : brand.logo_url ? <img src={brand.logo_url} alt={brand.name} loading="lazy" /> : <span className="brand-managed-wordmark">{brand.name}</span>}</div>)}</div><span className="brands-note">توافر كل موديل وسعره بيتأكد قبل الطلب</span></section>

    )}

    {site.show_services && (
    <section className="service-section" id="services">
      <div className="service-intro"><span className="section-overline">{site.services_kicker}</span><h2>{site.services_title}<br /><em>{site.services_highlight}</em></h2><p>{site.services_description}</p><a className="commerce-button commerce-button-orange" href={whatsappUrl} target={storeWhatsapp ? "_blank" : undefined} rel={storeWhatsapp ? "noreferrer" : undefined}>{storeWhatsapp ? "ناقش احتياجك معانا ↗" : "تواصل مع المتجر"}</a></div>
      <div className="service-steps"><div className="service-step"><span>01</span><div><b>حدّد المكان</b><p>بيت، محل، مكتب أو مشروع أكبر.</p></div></div><div className="service-step"><span>02</span><div><b>حدّد عدد الكاميرات</b><p>والأماكن الداخلية والخارجية المطلوب تغطيتها.</p></div></div><div className="service-step"><span>03</span><div><b>اختار طريقة التسجيل</b><p>DVR أو NVR مع سعة تخزين مناسبة.</p></div></div><div className="service-step"><span>04</span><div><b>راجع توافق المكونات</b><p>نتأكد من التوصيلات والملحقات قبل التجهيز.</p></div></div></div>
    </section>

    )}

    <footer className="commerce-footer" id="contact">
      <div className="footer-main"><Link className="store-logo footer-store-logo" href="/">{site.logo_url ? <img className="logo-image" src={site.logo_url} alt={site.store_name} /> : <span className="logo-symbol">B<span>.</span></span>}<span className="logo-wordmark">{site.store_name}<small>SECURITY SYSTEMS</small></span></Link><p>{site.footer_text}</p></div>
      <div className="footer-column"><b>تصفّح المتجر</b><a href="#categories">الأقسام</a><a href="#catalog">المنتجات والأسعار</a><a href="#services">حلول المشروعات</a></div>
      <div className="footer-column"><b>تواصل معانا</b>{storePhone && <a href={`tel:${storePhone.replace(/[^+\d]/g, "")}`} dir="ltr">{storePhone}</a>}{storeWhatsapp && <a href={whatsappUrl} target="_blank" rel="noreferrer">واتساب</a>}{storeAddress && <span>{storeAddress}</span>}{!storePhone && !storeWhatsapp && !storeAddress && <span>بيانات التواصل هتظهر هنا بعد إعدادها.</span>}</div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} {site.store_name}. جميع الحقوق محفوظة.</span><span>كاميرات · أجهزة تسجيل · شبكات · إكسسوارات</span><a href="/admin/login">دخول الإدارة</a></div>
    </footer>
  </main>;
}
