import { createClient } from "@/lib/supabase/server";
import type { Category, Product } from "@/lib/types";
import Storefront from "@/components/storefront";
import CartLink from "@/components/cart-link";

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
  return <main className="storefront-page" dir="rtl">
    <div className="utility-bar">
      <div className="utility-inner">
        <span>Bein Store — كاميرات مراقبة وشبكات وأنظمة أمنية</span>
        <div className="utility-links"><span>مصر</span><span className="utility-separator">|</span><a href="#contact">خدمة العملاء</a></div>
      </div>
    </div>

    <header className="store-header">
      <a className="store-logo" href="/" aria-label="Bein Store الرئيسية"><span className="logo-symbol">B<span>.</span></span><span className="logo-wordmark">BEIN <b>STORE</b><small>SECURITY SYSTEMS</small></span></a>
      <form className="header-search" action="/" method="get" role="search">
        <span className="header-search-icon" aria-hidden="true">⌕</span>
        <input type="search" name="q" defaultValue={q} placeholder="ابحث باسم المنتج أو الموديل…" aria-label="ابحث في منتجات Bein Store" />
        <button type="submit">بحث</button>
      </form>
      <div className="header-actions">{storePhone ? <a className="header-phone" href={`tel:${storePhone.replace(/[^+\d]/g, "")}`}><span className="phone-mark" aria-hidden="true">☎</span><span><small>للاستفسارات والطلبات</small><b dir="ltr">{storePhone}</b></span></a> : <a className="header-phone" href="#contact"><span className="phone-mark" aria-hidden="true">☎</span><span><small>خدمة العملاء</small><b>تواصل مع المتجر</b></span></a>}<CartLink /></div>
    </header>
    <nav className="store-nav-row" aria-label="القائمة الرئيسية">
      <a href="#categories">الأقسام</a><a href="#catalog">كل المنتجات</a><a href="#services">التركيب وحلول المشروعات</a><a href="#brands">الماركات</a><a href="#contact">تواصل معنا</a>
      <span className="nav-note"><i /> مساعدة في اختيار النظام المناسب</span>
    </nav>

    <section className="commerce-hero">
      <div className="hero-main-copy">
        <div className="hero-kicker"><span /> حلول مراقبة للمنازل والمحلات والشركات</div>
        <h1>كل مكوّنات نظام المراقبة،<br /><em>من مكان واحد.</em></h1>
        <p>كاميرات، أجهزة تسجيل، هاردات، سويتشات وكابلات. اختار حسب احتياجك، وراجع الموديل والمواصفات قبل الطلب.</p>
        <div className="commerce-hero-actions"><a className="commerce-button commerce-button-orange" href="#catalog">تصفّح المنتجات <span aria-hidden="true">←</span></a><a className="commerce-button commerce-button-outline" href={whatsappUrl} target={storeWhatsapp ? "_blank" : undefined} rel={storeWhatsapp ? "noreferrer" : undefined}>{storeWhatsapp ? "اسألنا على واتساب ↗" : "تواصل مع المتجر"}</a></div>
        <div className="hero-assurances"><span><b>01</b> اختيار حسب احتياجك</span><span><b>02</b> مساعدة قبل الشراء</span><span><b>03</b> تجهيز وتركيب</span></div>
      </div>
      <div className="hero-product-stage" aria-label="كاميرا مراقبة من Hikvision">
        <div className="hero-stage-top"><span>PRODUCT FOCUS</span><span>HIKVISION</span></div>
        <div className="hero-camera-wrap"><img src="https://assets.hikvision.com/prd/normal/all/image/sm000047165/%E5%8F%8C%E5%85%89%E5%8D%8A%E7%90%8361---%E5%9F%BA%E7%BA%BF---%E5%8F%B3%E4%BE%A7.png?eo-img.format=webp" alt="كاميرا مراقبة شبكية من Hikvision" /></div>
        <div className="hero-stage-bottom"><div><small>NETWORK CAMERA</small><b>كاميرات مراقبة IP</b></div><a href="#categories" aria-label="استكشف الأقسام">↙</a></div>
      </div>
    </section>

    <section className="service-ribbon" aria-label="خدمات Bein Store">
      <div><span className="ribbon-number">01</span><span><b>اختيار المكونات</b><small>مساعدة في تحديد الأجهزة المناسبة</small></span></div>
      <div><span className="ribbon-number">02</span><span><b>حلول للمشروعات</b><small>تجهيز الأنظمة حسب متطلبات المكان</small></span></div>
      <div><span className="ribbon-number">03</span><span><b>تركيب ودعم فني</b><small>تواصل معنا قبل وبعد التجهيز</small></span></div>
      <a href={whatsappUrl} target={storeWhatsapp ? "_blank" : undefined} rel={storeWhatsapp ? "noreferrer" : undefined}>{storeWhatsapp ? "تحدث مع فريقنا" : "تواصل مع المتجر"} <span>↗</span></a>
    </section>

    <section className="category-section" id="categories">
      <div className="commerce-section-head"><div><span className="section-overline">تسوّق حسب القسم</span><h2>دور على اللي محتاجه</h2><p className="section-subtitle">ابدأ بنوع الجهاز، وبعدها اختار الموديل المناسب.</p></div><a href="#catalog" className="section-text-link">عرض الكتالوج <span>←</span></a></div>
      <div className="category-card-grid">
        {shownCategories.map((category, index) => {
          const detail = categoryDetails[category.slug] ?? { code: String(index + 1).padStart(2, "0"), title: category.name_ar, description: "منتجات ومستلزمات القسم" };
          return <a className="category-tile" href={`/?category=${encodeURIComponent(category.slug)}#catalog`} key={category.id}>
            <span className="category-tile-top"><span>{detail.code}</span><span aria-hidden="true">↗</span></span>
            <span className="category-tile-index">{detail.code}</span>
            <span className="category-tile-copy"><b>{category.name_ar || detail.title}</b><small>{detail.description}</small></span>
            <span className="category-tile-link">تصفّح القسم <span>←</span></span>
          </a>;
        })}
      </div>
    </section>

    <section className="catalog-section" id="catalog">
      <div className="commerce-section-head"><div><span className="section-overline">كتالوج Bein Store</span><h2>المنتجات والأسعار</h2><p className="section-subtitle">ابحث بالموديل أو الماركة أو كود المنتج.</p></div><div className="catalog-meta"><span className="catalog-live-dot" /> الأسعار المعروضة تعتمد على بيانات المتجر</div></div>
      {!configured ? <div className="empty-state"><div className="empty-symbol">BS</div><h3>الكتالوج قيد التجهيز</h3><p>قاعدة بيانات المتجر لم تُربط بعد. بعد إعداد الربط ونشر المنتجات الفعلية، ستظهر هنا الأسعار والموديلات المتاحة.</p></div> : <Storefront products={products} categories={categories} initialQuery={q} initialCategoryId={initialCategoryId} />}
    </section>

    <section className="brands-strip" id="brands"><span className="brands-title">ماركات بنجهّز أنظمتها حسب احتياجك</span><div className="brand-word hikvision">HIKVISION</div><div className="brand-word hilook">HiLook</div><div className="brand-word unv">UNV</div><span className="brands-note">توافر كل موديل وسعره بيتأكد قبل الطلب</span></section>

    <section className="service-section" id="services">
      <div className="service-intro"><span className="section-overline">للبيوت والمحلات والشركات</span><h2>محتاج نظام كامل؟<br /><em>نساعدك ترتّب مكوّناته.</em></h2><p>اختيار النظام الصح بيعتمد على المكان، عدد الكاميرات، طريقة التسجيل، وسعة التخزين. ابعتلنا التفاصيل ونراجع معاك المكونات المطلوبة.</p><a className="commerce-button commerce-button-orange" href={whatsappUrl} target={storeWhatsapp ? "_blank" : undefined} rel={storeWhatsapp ? "noreferrer" : undefined}>{storeWhatsapp ? "ناقش احتياجك معانا ↗" : "تواصل مع المتجر"}</a></div>
      <div className="service-steps"><div className="service-step"><span>01</span><div><b>حدّد المكان</b><p>بيت، محل، مكتب أو مشروع أكبر.</p></div></div><div className="service-step"><span>02</span><div><b>حدّد عدد الكاميرات</b><p>والأماكن الداخلية والخارجية المطلوب تغطيتها.</p></div></div><div className="service-step"><span>03</span><div><b>اختار طريقة التسجيل</b><p>DVR أو NVR مع سعة تخزين مناسبة.</p></div></div><div className="service-step"><span>04</span><div><b>راجع توافق المكونات</b><p>نتأكد من التوصيلات والملحقات قبل التجهيز.</p></div></div></div>
    </section>

    <footer className="commerce-footer" id="contact">
      <div className="footer-main"><a className="store-logo footer-store-logo" href="/"><span className="logo-symbol">B<span>.</span></span><span className="logo-wordmark">BEIN <b>STORE</b><small>SECURITY SYSTEMS</small></span></a><p>كاميرات مراقبة وأنظمة تسجيل وشبكات ومستلزمات تركيب، مع مساعدة في اختيار المكونات المناسبة.</p></div>
      <div className="footer-column"><b>تصفّح المتجر</b><a href="#categories">الأقسام</a><a href="#catalog">المنتجات والأسعار</a><a href="#services">حلول المشروعات</a></div>
      <div className="footer-column"><b>تواصل معانا</b>{storePhone && <a href={`tel:${storePhone.replace(/[^+\d]/g, "")}`} dir="ltr">{storePhone}</a>}{storeWhatsapp && <a href={whatsappUrl} target="_blank" rel="noreferrer">واتساب</a>}{storeAddress && <span>{storeAddress}</span>}{!storePhone && !storeWhatsapp && !storeAddress && <span>بيانات التواصل هتظهر هنا بعد إعدادها.</span>}</div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} Bein Store. جميع الحقوق محفوظة.</span><span>كاميرات · أجهزة تسجيل · شبكات · إكسسوارات</span><a href="/admin/login">دخول الإدارة</a></div>
    </footer>
  </main>;
}
