import { createClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/lib/types";
import Storefront from "@/components/storefront";
import CartLink from "@/components/cart-link";
import ProductImage from "@/components/product-image";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("categories").select("id,name_ar,name_en,slug,sort_order").eq("is_active", true).order("sort_order", { ascending: true });
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

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const [{ q = "", category: categorySlug = "" }, products, categories] = await Promise.all([searchParams, getProducts(), getCategories()]);
  const initialCategoryId = categories.find((item) => item.slug === categorySlug)?.id ?? "all";
  const storePhone = process.env.NEXT_PUBLIC_STORE_PHONE?.trim();
  const storeWhatsapp = (process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? "").replace(/\D/g, "");
  const storeAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS?.trim();
  const whatsappUrl = storeWhatsapp ? `https://wa.me/${storeWhatsapp}` : "#contact";
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const shownCategories = categories.length ? categories : categoriesFallback;
  const heroProduct = products.find((product) => product.brand === "Hikvision" && product.model?.startsWith("DS-2CD") && product.image_urls?.length) ?? products.find((product) => product.category_id === categories.find((item) => item.slug === "security-cameras")?.id && product.image_urls?.length) ?? products.find((product) => product.image_urls?.length) ?? null;
  const heroRecorder = products.find((product) => categories.find((item) => item.id === product.category_id)?.slug === "recorders" && product.image_urls?.length) ?? null;
  const heroStorage = products.find((product) => categories.find((item) => item.id === product.category_id)?.slug === "storage" && product.image_urls?.length) ?? null;
  return <main className="storefront-page" dir="rtl">
    <div className="utility-bar">
      <div className="utility-inner">
        <div className="utility-service-points"><span>مراجعة الموديل والتوافق قبل الطلب</span><span>تأكيد السعر والتوفر مع المتجر</span><span>مساعدة فنية لاختيار مكونات النظام</span></div>
        <div className="utility-links"><span>EGP · مصر</span><span className="utility-separator">|</span><a href={whatsappUrl} target={storeWhatsapp ? "_blank" : undefined} rel={storeWhatsapp ? "noreferrer" : undefined}>خدمة العملاء {storeWhatsapp ? "عبر واتساب ↗" : "↗"}</a></div>
      </div>
    </div>

    <header className="store-header">
      <Link className="store-logo" href="/" aria-label="Bein Store الرئيسية"><span className="logo-symbol">B<span>.</span></span><span className="logo-wordmark">BEIN <b>STORE</b><small>SECURITY SYSTEMS</small></span></Link>
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

    <section className="commerce-hero customer-commerce-hero">
      <div className="hero-main-copy">
        <div className="hero-kicker"><span /> كاميرات مراقبة وأنظمة أمنية</div>
        <h1>كل ما تحتاجه لنظام مراقبة<br /><em>متكامل وآمن</em></h1>
        <p>كاميرات، أجهزة تسجيل، هاردات تخزين وشبكات. اختار المنتجات المناسبة للمكان، ولو محتار في الموديل أو التوصيل نساعدك قبل الطلب.</p>
        <div className="commerce-hero-actions">
          <a className="commerce-button commerce-button-orange" href="#catalog">تسوّق المنتجات <span aria-hidden="true">←</span></a>
          <a className="commerce-button commerce-button-outline" href={whatsappUrl} target={storeWhatsapp ? "_blank" : undefined} rel={storeWhatsapp ? "noreferrer" : undefined}>{storeWhatsapp ? "اسألنا على واتساب" : "تواصل مع المتجر"}</a>
        </div>
        <div className="customer-hero-benefits"><span>اختيار الموديل المناسب</span><span>مراجعة التوافق قبل الطلب</span><span>تأكيد السعر والتوفر</span></div>
      </div>
      <div className="customer-hero-products" aria-label="منتجات من كتالوج Bein Store">
        <div className="customer-hero-main-photo">
          {heroProduct ? <ProductImage product={heroProduct} className="customer-hero-camera" /> : <div className="customer-hero-photo-empty">كاميرات مراقبة</div>}
          <div className="customer-hero-photo-caption"><small>{heroProduct?.brand ?? "Bein Store"}</small><b>{heroProduct?.name_ar ?? "كاميرات وأنظمة مراقبة"}</b></div>
        </div>
        <div className="customer-hero-secondary">
          {heroRecorder ? <div className="customer-hero-secondary-photo"><ProductImage product={heroRecorder} className="customer-hero-small-image" /><span>أجهزة التسجيل</span></div> : null}
          {heroStorage ? <div className="customer-hero-secondary-photo"><ProductImage product={heroStorage} className="customer-hero-small-image" /><span>هاردات التخزين</span></div> : null}
        </div>
      </div>
    </section>

    <section className="category-section" id="categories">
      <div className="commerce-section-head"><div><span className="section-overline">تسوّق بسهولة</span><h2>تسوّق حسب القسم</h2><p className="section-subtitle">وصل للقسم اللي محتاجه بسرعة.</p></div><a href="#catalog" className="section-text-link">عرض الكتالوج <span>←</span></a></div>
      <div className="category-card-grid">
        {shownCategories.map((category, index) => {
          const detail = categoryDetails[category.slug] ?? { code: String(index + 1).padStart(2, "0"), title: category.name_ar, description: "منتجات ومستلزمات القسم" };
          const representativeProduct = products.find((product) => product.category_id === category.id && product.image_urls?.length) ?? null;
          return <a className="category-tile" href={`/?category=${encodeURIComponent(category.slug)}#catalog`} key={category.id}>
            <span className="category-tile-image">
              {representativeProduct ? <ProductImage product={representativeProduct} className="category-photo" /> : <span className="category-image-fallback">{detail.code}</span>}
            </span>
            <span className="category-tile-copy"><b>{category.name_ar || detail.title}</b><small>{detail.description}</small></span>
            <span className="category-tile-link">عرض المنتجات <span>←</span></span>
          </a>;
        })}
      </div>
    </section>

    <section className="catalog-section" id="catalog">
      <div className="commerce-section-head"><div><span className="section-overline">كتالوج Bein Store</span><h2>منتجاتنا</h2><p className="section-subtitle">صور واضحة، موديلات وأسعار معروضة، واختيار سهل للمنتج المناسب.</p></div><div className="catalog-meta"><span className="catalog-live-dot" /> {products.length} منتج · EGP</div></div>
      {!configured ? <div className="empty-state"><div className="empty-symbol">BS</div><h3>الكتالوج قيد التجهيز</h3><p>قاعدة بيانات المتجر لم تُربط بعد. بعد إعداد الربط ونشر المنتجات الفعلية، ستظهر هنا الأسعار والموديلات المتاحة.</p></div> : <Storefront products={products} categories={categories} initialQuery={q} initialCategoryId={initialCategoryId} />}
    </section>

    <section className="brands-strip" id="brands" aria-label="الماركات المتاحة"><span className="brands-title">ماركات بنجهّز أنظمتها حسب احتياجك</span><div className="brand-logo-list"><div className="brand-logo-card"><img src="https://www.hikvision.com/content/dam/hikvision/uk/marketing-portal/logos/hikvision/Hikvision%20Logo.PNG" alt="Hikvision" loading="lazy" /></div><div className="brand-logo-card brand-wordmark-hilook" aria-label="HiLook"><span>HiLook</span></div><div className="brand-logo-card"><img src="https://material.dahuasecurity.com/uploads/image/20200615/20200615135430_98836.png" alt="Dahua Technology" loading="lazy" /></div><div className="brand-logo-card brand-wordmark-unv" aria-label="UNV Uniview"><span>UNV</span><small>UNIVIEW</small></div></div><span className="brands-note">توافر كل موديل وسعره بيتأكد قبل الطلب</span></section>

    <section className="service-section" id="services">
      <div className="service-intro"><span className="section-overline">محتاج مساعدة؟</span><h2>مش متأكد تختار إيه؟<br /><em>نساعدك توصل للمناسب.</em></h2><p>اختيار النظام الصح بيعتمد على المكان، عدد الكاميرات، طريقة التسجيل، وسعة التخزين. ابعتلنا التفاصيل ونراجع معاك المكونات المطلوبة.</p><a className="commerce-button commerce-button-orange" href={whatsappUrl} target={storeWhatsapp ? "_blank" : undefined} rel={storeWhatsapp ? "noreferrer" : undefined}>{storeWhatsapp ? "ناقش احتياجك معانا ↗" : "تواصل مع المتجر"}</a></div>
      <div className="service-steps"><div className="service-step"><span>01</span><div><b>حدّد المكان</b><p>بيت، محل، مكتب أو مشروع أكبر.</p></div></div><div className="service-step"><span>02</span><div><b>حدّد عدد الكاميرات</b><p>والأماكن الداخلية والخارجية المطلوب تغطيتها.</p></div></div><div className="service-step"><span>03</span><div><b>اختار طريقة التسجيل</b><p>DVR أو NVR مع سعة تخزين مناسبة.</p></div></div><div className="service-step"><span>04</span><div><b>راجع توافق المكونات</b><p>نتأكد من التوصيلات والملحقات قبل التجهيز.</p></div></div></div>
    </section>

    <footer className="commerce-footer" id="contact">
      <div className="footer-main"><Link className="store-logo footer-store-logo" href="/"><span className="logo-symbol">B<span>.</span></span><span className="logo-wordmark">BEIN <b>STORE</b><small>SECURITY SYSTEMS</small></span></Link><p>كاميرات مراقبة وأنظمة تسجيل وشبكات ومستلزمات تركيب، مع مساعدة في اختيار المكونات المناسبة.</p></div>
      <div className="footer-column"><b>تصفّح المتجر</b><a href="#categories">الأقسام</a><a href="#catalog">المنتجات والأسعار</a><a href="#services">حلول المشروعات</a></div>
      <div className="footer-column"><b>تواصل معانا</b>{storePhone && <a href={`tel:${storePhone.replace(/[^+\d]/g, "")}`} dir="ltr">{storePhone}</a>}{storeWhatsapp && <a href={whatsappUrl} target="_blank" rel="noreferrer">واتساب</a>}{storeAddress && <span>{storeAddress}</span>}{!storePhone && !storeWhatsapp && !storeAddress && <span>بيانات التواصل هتظهر هنا بعد إعدادها.</span>}</div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} Bein Store. جميع الحقوق محفوظة.</span><span>كاميرات · أجهزة تسجيل · شبكات · إكسسوارات</span><a href="/admin/login">دخول الإدارة</a></div>
    </footer>
  </main>;
}
