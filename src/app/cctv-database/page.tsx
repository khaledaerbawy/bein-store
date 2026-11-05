import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import "./catalog.css";

type SearchParams = Promise<{ q?: string; brand?: string; type?: string; mp?: string; page?: string }>;
const PAGE_SIZE = 24;
const TYPES = ["bullet", "dome", "turret", "ptz", "fisheye", "box", "thermal", "doorbell", "cube"];

function safeFilter(value: string) {
  return value.replace(/[,%()"'\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export default async function CctvDatabasePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = safeFilter(params.q ?? "");
  const brand = (params.brand ?? "").slice(0, 100);
  const type = (params.type ?? "").slice(0, 40);
  const mp = Number(params.mp ?? 0);
  const page = Math.max(1, Math.min(10000, Number(params.page ?? 1) || 1));
  const supabase = await createClient();

  let cameras: any[] = [];
  let total = 0;
  let brands: any[] = [];
  let unavailable = !supabase;
  if (supabase) {
    const [brandResult, countResult] = await Promise.all([
      supabase.from("cctv_camera_brands").select("slug,name,camera_count").order("name").limit(500)
    ]);
    brands = brandResult.data ?? [];
    let query = supabase.from("cctv_cameras")
      .select("id,brand,model,camera_type,megapixels,resolution_label,power_source,connectivity,night_vision", { count: "exact" })
      .order("brand").order("model");
    if (q) query = query.or(`brand.ilike.%${q}%,model.ilike.%${q}%,id.ilike.%${q}%`);
    if (brand) query = query.eq("brand", brand);
    if (type) query = query.eq("camera_type", type);
    if (mp > 0) query = query.gte("megapixels", mp);
    const result = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    cameras = result.data ?? [];
    if (result.error || brandResult.error) unavailable = true;
    total = result.count ?? 0;
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  function pageHref(nextPage: number) {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (brand) next.set("brand", brand);
    if (type) next.set("type", type);
    if (mp > 0) next.set("mp", String(mp));
    next.set("page", String(nextPage));
    return `/cctv-database?${next.toString()}`;
  }

  return <main className="cctv-page" dir="rtl">
    <header className="cctv-topbar">
      <Link href="/" className="cctv-back">← العودة إلى Bein Store</Link>
      <span>BEIN STORE <i>·</i> CCTV KNOWLEDGE BASE</span>
    </header>
    <section className="cctv-intro">
      <p className="cctv-eyebrow">مرجع فني مستقل · مواصفات موثقة بمصادرها</p>
      <h1>دليل كاميرات <em>المراقبة</em></h1>
      <p>ابحث عن الموديل، راجع المواصفات الفنية، وقارن خيارات التوصيل والرؤية الليلية قبل اختيار النظام المناسب.</p>
      <div className="cctv-count"><strong>{total.toLocaleString("en-US")}</strong><span>موديل في الدليل</span><strong>{brands.length.toLocaleString("en-US")}</strong><span>ماركة</span></div>
    </section>
    <section className="cctv-browser">
      <form className="cctv-filters" action="/cctv-database">
        <label className="cctv-search">ابحث بالماركة أو الموديل<input name="q" defaultValue={q} placeholder="مثال: Hikvision DS-2CD..." /></label>
        <label>الماركة<select name="brand" defaultValue={brand}><option value="">كل الماركات</option>{brands.map((b) => <option key={b.slug} value={b.name}>{b.name} ({b.camera_count})</option>)}</select></label>
        <label>نوع الكاميرا<select name="type" defaultValue={type}><option value="">كل الأنواع</option>{TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select></label>
        <label>الدقة من<select name="mp" defaultValue={mp || ""}><option value="">كل الدقات</option><option value="2">2 MP فأعلى</option><option value="4">4 MP فأعلى</option><option value="5">5 MP فأعلى</option><option value="8">8 MP / 4K فأعلى</option><option value="12">12 MP فأعلى</option></select></label>
        <button type="submit">عرض النتائج <span>←</span></button>
      </form>
      {unavailable ? <div className="cctv-empty"><h2>الدليل قيد التجهيز</h2><p>تم تجهيز قاعدة البيانات، وسيظهر المحتوى هنا بعد استيراد ملفات الموديلات.</p></div> :
      cameras.length === 0 ? <div className="cctv-empty"><h2>لا توجد موديلات مطابقة</h2><p>جرّب تغيير كلمة البحث أو إزالة أحد الفلاتر.</p></div> :
      <>
        <div className="cctv-results-head"><span>نتائج البحث</span><b>{total.toLocaleString("en-US")} موديل</b></div>
        <div className="cctv-grid">{cameras.map((camera) => <Link className="cctv-camera-card" href={`/cctv-database/${encodeURIComponent(camera.id)}`} key={camera.id}>
          <div className="cctv-card-top"><span>{camera.brand}</span><small>{camera.camera_type || "كاميرا مراقبة"}</small></div>
          <h2>{camera.model}</h2>
          <div className="cctv-card-specs">
            {camera.resolution_label && <span>{camera.resolution_label}</span>}
            {camera.megapixels && <span>{camera.megapixels} MP</span>}
            {camera.connectivity?.slice(0, 2).map((v: string) => <span key={v}>{v}</span>)}
            {camera.power_source?.some((v: string) => v.toLowerCase().includes("poe")) && <span>PoE</span>}
          </div>
          <div className="cctv-card-foot">عرض المواصفات <b>←</b></div>
        </Link>)}</div>
        <nav className="cctv-pagination" aria-label="صفحات النتائج">
          {page > 1 && <Link href={pageHref(page - 1)}>السابق</Link>}
          <span>صفحة {page} من {pages}</span>
          {page < pages && <Link href={pageHref(page + 1)}>التالي</Link>}
        </nav>
      </>}
    </section>
    <footer className="cctv-source">البيانات الفنية من مشروع <a href="https://github.com/ch-bas/cctv-camera-database" target="_blank" rel="noreferrer">CCTV Camera Database</a> · مرجع للمعلومات فقط، وليست تأكيدًا للتوافق أو التوافر التجاري. راجع دائمًا ملف الشركة المصنّعة قبل الشراء.</footer>
  </main>;
}
