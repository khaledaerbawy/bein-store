import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import "./../catalog.css";

type Params = Promise<{ id: string }>;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bein-store.vercel.app").replace(/\/+$/, "");

function pretty(value: string) {
  return value.replaceAll("_", " ");
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "غير متوفر في المصدر";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (Array.isArray(value)) return value.length ? value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join("، ") : "غير متوفر في المصدر";
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, item]) => pretty(key) + ": " + display(item)).join(" · ");
  return String(value);
}

async function getCamera(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("cctv_cameras")
    .select("id,brand,model,camera_type,megapixels,resolution_label,power_source,connectivity,night_vision,sources,last_verified,specs")
    .eq("id", id).maybeSingle();
  if (error) {
    console.error("CCTV camera detail query failed:", error.message);
    return null;
  }
  return data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const camera = await getCamera(id);
  if (!camera) return { title: "الموديل غير موجود | دليل كاميرات Bein Store", robots: { index: false, follow: true } };
  const title = camera.brand + " " + camera.model + " | المواصفات الفنية - Bein Store";
  const description = [camera.brand, camera.model, camera.resolution_label, camera.camera_type, "مواصفات كاميرا المراقبة ومصادرها"].filter(Boolean).join(" · ").slice(0, 180);
  return {
    title,
    description,
    alternates: { canonical: "/cctv-database/" + encodeURIComponent(camera.id) },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: { type: "article", locale: "ar_EG", siteName: "Bein Store", url: SITE_URL + "/cctv-database/" + encodeURIComponent(camera.id), title, description }
  };
}

export default async function CctvCameraDetail({ params }: { params: Params }) {
  const { id } = await params;
  const camera = await getCamera(id);
  if (!camera) notFound();
  const specs = (camera.specs ?? {}) as Record<string, unknown>;
  const sources = (Array.isArray(camera.sources) ? camera.sources : [])
    .filter((value: unknown): value is string => typeof value === "string" && (value.startsWith("https://") || value.startsWith("http://")));
  const groups = Object.entries(specs).filter(([key, value]) =>
    !["id", "brand", "model", "type", "resolution", "sources", "last_verified"].includes(key)
    && value !== null && value !== undefined && value !== ""
  );

  return <main className="cctv-page" dir="rtl">
    <header className="cctv-topbar"><Link href="/cctv-database" className="cctv-back">← العودة إلى الدليل</Link><Link href="/" aria-label="العودة إلى الصفحة الرئيسية">BEIN STORE <i>·</i> CAMERA DETAILS</Link></header>
    <article className="cctv-detail">
      <p className="cctv-eyebrow">{camera.brand} · {camera.camera_type || "كاميرا مراقبة"}</p>
      <h1>{camera.model}</h1>
      <p className="cctv-detail-sub">{camera.resolution_label || "المواصفات الفنية المتاحة للموديل"}</p>
      <div className="cctv-detail-highlights">
        {camera.megapixels != null && <div><small>الدقة</small><b>{camera.megapixels} MP</b></div>}
        {camera.power_source?.length > 0 && <div><small>مصدر الطاقة</small><b>{camera.power_source.join(" / ")}</b></div>}
        {camera.connectivity?.length > 0 && <div><small>الاتصال</small><b>{camera.connectivity.join(" / ")}</b></div>}
        {camera.night_vision?.type && <div><small>الرؤية الليلية</small><b>{camera.night_vision.type}</b></div>}
      </div>
      <h2>المواصفات الفنية</h2>
      <div className="cctv-spec-list">{groups.map(([key, value]) => <div key={key}><span>{pretty(key)}</span><b>{display(value)}</b></div>)}</div>
      {sources.length > 0 && <section className="cctv-source-list"><h2>مصادر المواصفات</h2><p>روابط المصدر كما وردت في قاعدة البيانات. راجع الشركة المصنّعة قبل اتخاذ قرار الشراء.</p><ul>{sources.map((url, index) => <li key={url}><a href={url} target="_blank" rel="noreferrer">المصدر {index + 1} ↗</a></li>)}</ul></section>}
      <p className="cctv-verified">آخر تحقق مسجل: {camera.last_verified || "غير محدد"}</p>
      <Link className="cctv-back" href="/cctv-database">← ابحث عن موديل آخر</Link>
    </article>
    <footer className="cctv-source">هذا الدليل مرجع فني مستقل، وليس منتجًا للبيع. لا توجد أسعار أو مخزون أو إضافة للسلة هنا. <a href="https://github.com/ch-bas/cctv-camera-database" target="_blank" rel="noreferrer">المصدر المفتوح (CC0)</a></footer>
  </main>;
}
