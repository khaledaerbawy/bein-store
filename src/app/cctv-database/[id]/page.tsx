import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import "./../catalog.css";

type Params = Promise<{ id: string }>;
function pretty(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "غير متوفر في المصدر";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (Array.isArray(value)) return value.length ? value.map((v) => typeof v === "object" ? JSON.stringify(v) : String(v)).join("، ") : "غير متوفر في المصدر";
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([k,v]) => `${pretty(k)}: ${display(v)}`).join(" · ");
  return String(value);
}
export default async function CctvCameraDetail({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: camera, error } = await supabase.from("cctv_cameras").select("*").eq("id", id).maybeSingle();
  if (error || !camera) notFound();
  const specs = (camera.specs ?? {}) as Record<string, unknown>;
  const sources = Array.isArray(camera.sources) ? camera.sources : [];
  const groups = Object.entries(specs).filter(([key, value]) => !["id","brand","model","type","resolution","sources","last_verified"].includes(key) && value !== null && value !== undefined && value !== "");
  return <main className="cctv-page" dir="rtl">
    <header className="cctv-topbar"><Link href="/cctv-database" className="cctv-back">← العودة إلى الدليل</Link><span>BEIN STORE <i>·</i> CAMERA DETAILS</span></header>
    <article className="cctv-detail">
      <p className="cctv-eyebrow">{camera.brand} · {camera.camera_type || "كاميرا مراقبة"}</p>
      <h1>{camera.model}</h1>
      <p className="cctv-detail-sub">{camera.resolution_label || "المواصفات الفنية المتاحة للموديل"}</p>
      <div className="cctv-detail-highlights">
        {camera.megapixels && <div><small>الدقة</small><b>{camera.megapixels} MP</b></div>}
        {camera.power_source?.length > 0 && <div><small>مصدر الطاقة</small><b>{camera.power_source.join(" / ")}</b></div>}
        {camera.connectivity?.length > 0 && <div><small>الاتصال</small><b>{camera.connectivity.join(" / ")}</b></div>}
        {camera.night_vision?.type && <div><small>الرؤية الليلية</small><b>{camera.night_vision.type}</b></div>}
      </div>
      <h2>المواصفات الفنية</h2>
      <div className="cctv-spec-list">{groups.map(([key,value]) => <div key={key}><span>{pretty(key)}</span><b>{display(value)}</b></div>)}</div>
      {sources.length > 0 && <section className="cctv-source-list"><h2>مصادر المواصفات</h2><p>روابط المصدر كما وردت في قاعدة البيانات. راجع الشركة المصنّعة قبل اتخاذ قرار الشراء.</p><ul>{sources.map((url: string, i: number) => <li key={url}><a href={url} target="_blank" rel="noreferrer">المصدر {i + 1} ↗</a></li>)}</ul></section>}
      <p className="cctv-verified">آخر تحقق مسجل: {camera.last_verified || "غير محدد"}</p>
    </article>
    <footer className="cctv-source">هذا الدليل مرجع فني مستقل، وليس منتجًا للبيع. لا توجد أسعار أو مخزون أو إضافة للسلة هنا. <a href="https://github.com/ch-bas/cctv-camera-database" target="_blank" rel="noreferrer">المصدر المفتوح (CC0)</a></footer>
  </main>;
}
