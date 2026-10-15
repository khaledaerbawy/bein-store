"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/admin/admin-shell";
import type { SiteBanner } from "@/lib/types";

type Draft = {
  id?: string;
  title: string;
  kicker: string;
  description: string;
  image_url: string;
  button_text: string;
  button_url: string;
  placement: SiteBanner["placement"];
  background_color: string;
  text_color: string;
  sort_order: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};
const blank: Draft = {
  title: "", kicker: "", description: "", image_url: "", button_text: "تعرّف على المزيد",
  button_url: "#catalog", placement: "after_categories", background_color: "#f1f6fa",
  text_color: "#20384d", sort_order: "1", starts_at: "", ends_at: "", is_active: false
};
const localInputDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0,16);
};
const isoDate = (value: string) => value.trim() ? new Date(value).toISOString() : null;
const placementText: Record<SiteBanner["placement"], string> = {
  after_hero: "بعد البانر الرئيسي",
  after_categories: "بعد الأقسام",
  before_footer: "قبل الفوتر"
};

export default function AdminBannersPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [banners, setBanners] = useState<SiteBanner[]>([]);
  const [draft, setDraft] = useState<Draft>(blank);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const s = createClient();
    if (!s) { setMessage("إعدادات Supabase ناقصة."); setLoading(false); return; }
    const { data: { user } } = await s.auth.getUser();
    if (!user) { router.replace("/admin/login"); return; }
    const { data: role } = await s.from("admin_roles").select("is_active").eq("user_id", user.id).maybeSingle();
    if (!role?.is_active) { await s.auth.signOut(); router.replace("/admin/login"); return; }
    setEmail(user.email ?? "");
    setUserId(user.id);
    const { data, error } = await s.from("site_banners").select("*").order("placement", { ascending: true }).order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) setMessage("تعذر تحميل البانرات: " + error.message);
    else setBanners((data ?? []) as SiteBanner[]);
    setLoading(false);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  function edit(banner: SiteBanner) {
    setDraft({
      id: banner.id, title: banner.title, kicker: banner.kicker ?? "",
      description: banner.description ?? "", image_url: banner.image_url ?? "",
      button_text: banner.button_text ?? "", button_url: banner.button_url ?? "",
      placement: banner.placement, background_color: banner.background_color,
      text_color: banner.text_color, sort_order: String(banner.sort_order),
      starts_at: localInputDate(banner.starts_at), ends_at: localInputDate(banner.ends_at),
      is_active: banner.is_active
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) { setMessage("ارفع صورة JPG أو PNG أو WebP أو AVIF فقط."); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage("حجم الصورة يجب ألا يتجاوز 5 ميجابايت."); return; }
    const s = createClient();
    if (!s) { setMessage("إعدادات Supabase ناقصة."); return; }
    setUploading(true); setMessage("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `banners/${crypto.randomUUID()}.${ext}`;
    const { error } = await s.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) setMessage("تعذر رفع الصورة: " + error.message);
    else {
      const { data } = s.storage.from("product-images").getPublicUrl(path);
      setDraft(current => ({ ...current, image_url: data.publicUrl }));
      setMessage("تم رفع الصورة. احفظ البانر لتطبيقها.");
    }
    setUploading(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const s = createClient();
    if (!s) { setMessage("إعدادات Supabase ناقصة."); setBusy(false); return; }
    if (!draft.title.trim()) { setMessage("اكتب عنوان البانر."); setBusy(false); return; }
    const order = Number(draft.sort_order);
    if (!Number.isInteger(order) || order < 0) { setMessage("ترتيب العرض لازم يكون رقمًا صحيحًا غير سالب."); setBusy(false); return; }
    if (draft.button_url.trim() && !draft.button_url.startsWith("/") && !draft.button_url.startsWith("#") && !/^https?:\/\//i.test(draft.button_url.trim())) {
      setMessage("رابط الزر لازم يكون رابطًا داخليًا يبدأ بـ / أو #، أو رابطًا كاملًا يبدأ بـ https://.");
      setBusy(false); return;
    }
    const starts = draft.starts_at ? new Date(draft.starts_at) : null;
    const ends = draft.ends_at ? new Date(draft.ends_at) : null;
    if (starts && Number.isNaN(starts.getTime())) { setMessage("تاريخ بداية العرض غير صحيح."); setBusy(false); return; }
    if (ends && Number.isNaN(ends.getTime())) { setMessage("تاريخ انتهاء العرض غير صحيح."); setBusy(false); return; }
    if (starts && ends && ends <= starts) { setMessage("موعد انتهاء العرض لازم يكون بعد موعد بدايته."); setBusy(false); return; }

    const payload = {
      title: draft.title.trim(), kicker: draft.kicker.trim() || null,
      description: draft.description.trim() || null, image_url: draft.image_url.trim() || null,
      button_text: draft.button_text.trim() || null, button_url: draft.button_url.trim() || null,
      placement: draft.placement, background_color: draft.background_color,
      text_color: draft.text_color, sort_order: order,
      starts_at: isoDate(draft.starts_at), ends_at: isoDate(draft.ends_at),
      is_active: draft.is_active, updated_at: new Date().toISOString(),
      ...(draft.id ? {} : { created_by: userId || null })
    };
    const result = draft.id
      ? await s.from("site_banners").update(payload).eq("id", draft.id).select("id").single()
      : await s.from("site_banners").insert(payload).select("id").single();
    if (result.error) {
      setMessage("لم يتم حفظ البانر: " + result.error.message);
      setBusy(false); return;
    }
    setMessage(draft.id ? "تم حفظ تعديلات البانر." : "تم إنشاء البانر.");
    setDraft(blank);
    await load();
    setBusy(false);
    router.refresh();
  }

  async function toggle(banner: SiteBanner) {
    const s = createClient(); if (!s) return;
    const { error } = await s.from("site_banners").update({ is_active: !banner.is_active, updated_at: new Date().toISOString() }).eq("id", banner.id);
    setMessage(error ? "تعذر تغيير حالة البانر: " + error.message : (banner.is_active ? "تم إيقاف البانر." : "تم تفعيل البانر."));
    await load(); router.refresh();
  }

  async function remove(banner: SiteBanner) {
    if (!window.confirm(`حذف بانر «${banner.title}» نهائيًا؟`)) return;
    const s = createClient(); if (!s) return;
    const { error } = await s.from("site_banners").delete().eq("id", banner.id);
    setMessage(error ? "تعذر حذف البانر: " + error.message : "تم حذف البانر.");
    await load(); router.refresh();
  }

  async function move(banner: SiteBanner, direction: -1 | 1) {
    const siblings = banners.filter(b => b.placement === banner.placement).sort((a,b) => a.sort_order - b.sort_order);
    const index = siblings.findIndex(b => b.id === banner.id);
    const other = siblings[index + direction];
    if (!other) return;
    const s = createClient(); if (!s) return;
    const first = await s.from("site_banners").update({ sort_order: other.sort_order, updated_at: new Date().toISOString() }).eq("id", banner.id);
    const second = await s.from("site_banners").update({ sort_order: banner.sort_order, updated_at: new Date().toISOString() }).eq("id", other.id);
    setMessage(first.error || second.error ? "تعذر تغيير الترتيب. حاول مرة أخرى." : "تم تحديث ترتيب البانرات.");
    await load(); router.refresh();
  }

  async function signOut() {
    const s = createClient(); await s?.auth.signOut();
    router.replace("/admin/login"); router.refresh();
  }

  return <AdminShell title="البانرات والعروض" subtitle="أنشئ بانرات للصفحة الرئيسية، وحدد الصورة والرابط والألوان وموعد العرض." userEmail={email} onSignOut={signOut}>
    <div className="admin-banners-page">
      <form className="admin-category-form" onSubmit={save}>
        <div className="admin-category-form-head"><div><span>{draft.id ? "تعديل بانر" : "بانر جديد"}</span><h2>{draft.id ? "تعديل بانر أو عرض" : "إضافة بانر أو عرض"}</h2><p>يمكن جدولة العرض بموعد بداية ونهاية. البانر لا يظهر للعميل إلا إذا كان مفعّلًا وضمن فترة العرض.</p></div>{draft.id && <button type="button" className="admin-category-cancel" onClick={() => setDraft(blank)}>إلغاء التعديل</button>}</div>
        <div className="admin-banner-grid">
          <label>عنوان البانر *<input required maxLength={180} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="عرض على كاميرات المراقبة" /></label>
          <label>عنوان صغير أعلى البانر<input maxLength={100} value={draft.kicker} onChange={e => setDraft(d => ({ ...d, kicker: e.target.value }))} placeholder="عرض لفترة محدودة" /></label>
          <label className="wide-field">وصف العرض<textarea rows={3} maxLength={600} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="اكتب تفاصيل واضحة للعميل" /></label>
          <label className="wide-field">صورة البانر (اختياري)<input type="url" value={draft.image_url} onChange={e => setDraft(d => ({ ...d, image_url: e.target.value }))} placeholder="https://..." /><span>أو ارفع صورة من جهازك</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={uploadImage} disabled={uploading} /></label>
          <label>نص الزر<input maxLength={60} value={draft.button_text} onChange={e => setDraft(d => ({ ...d, button_text: e.target.value }))} placeholder="تسوّق العرض" /></label>
          <label>رابط الزر<input value={draft.button_url} onChange={e => setDraft(d => ({ ...d, button_url: e.target.value }))} placeholder="#catalog أو /?category=..." /></label>
          <label>مكان العرض<select value={draft.placement} onChange={e => setDraft(d => ({ ...d, placement: e.target.value as Draft["placement"] }))}>{Object.entries(placementText).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>ترتيب العرض<input type="number" min="0" step="1" value={draft.sort_order} onChange={e => setDraft(d => ({ ...d, sort_order: e.target.value }))} /></label>
          <label>لون الخلفية<input type="color" value={draft.background_color} onChange={e => setDraft(d => ({ ...d, background_color: e.target.value }))} /></label>
          <label>لون النص<input type="color" value={draft.text_color} onChange={e => setDraft(d => ({ ...d, text_color: e.target.value }))} /></label>
          <label>موعد بداية العرض<input type="datetime-local" value={draft.starts_at} onChange={e => setDraft(d => ({ ...d, starts_at: e.target.value }))} /></label>
          <label>موعد انتهاء العرض<input type="datetime-local" value={draft.ends_at} onChange={e => setDraft(d => ({ ...d, ends_at: e.target.value }))} /></label>
        </div>
        {draft.image_url && <div className="admin-category-image-preview"><img src={draft.image_url} alt="معاينة البانر" /><button type="button" onClick={() => setDraft(d => ({ ...d, image_url: "" }))}>إزالة الصورة</button></div>}
        <label className="admin-category-active"><input type="checkbox" checked={draft.is_active} onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))} /> تفعيل البانر ونشره ضمن فترة العرض</label>
        <div className="admin-category-actions"><button type="submit" disabled={busy || uploading}>{busy ? "جارٍ الحفظ..." : draft.id ? "حفظ تعديلات البانر" : "إنشاء البانر"}</button><span>يمكن إيقاف البانر من القائمة دون حذفه.</span></div>
        {message && <p className={message.startsWith("تم") ? "form-success" : "form-error"} role="status">{message}</p>}
      </form>
      <section className="admin-category-list-panel">
        <div className="admin-category-list-head"><div><h2>البانرات المسجلة ({banners.length})</h2><p>التفعيل وحده لا يكفي إذا لم يصل تاريخ البداية أو انتهى موعد العرض.</p></div><div className="admin-category-counts"><span><b>{banners.filter(b => b.is_active).length}</b> مفعّل</span><span><b>{banners.filter(b => !b.is_active).length}</b> متوقف</span></div></div>
        {loading ? <div className="admin-category-empty">جارٍ تحميل البانرات...</div> : banners.length === 0 ? <div className="admin-category-empty">لا توجد بانرات حتى الآن. أضف بانرًا من النموذج بالأعلى.</div> : <div className="admin-category-table-wrap"><table className="admin-category-table admin-banners-table"><thead><tr><th>البانر</th><th>مكان العرض</th><th>الجدولة</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{[...banners].sort((a,b)=>a.placement.localeCompare(b.placement)||a.sort_order-b.sort_order).map((b,index,ordered)=><tr key={b.id}><td><div className="admin-category-product-cell">{b.image_url?<img src={b.image_url} alt="" />:<span className="admin-category-no-image">Banner</span>}<span><b>{b.title}</b><small>{b.kicker || b.description || "بدون وصف"}</small></span></div></td><td>{placementText[b.placement]}</td><td><small>{b.starts_at ? new Date(b.starts_at).toLocaleString("ar-EG") : "بدون بداية"}<br/>{b.ends_at ? new Date(b.ends_at).toLocaleString("ar-EG") : "بدون نهاية"}</small></td><td><span className={b.is_active ? "admin-category-state visible" : "admin-category-state hidden"}>{b.is_active ? "مفعّل" : "متوقف"}</span></td><td><div className="admin-category-row-actions"><button type="button" disabled={index===0 || ordered[index-1]?.placement!==b.placement} onClick={() => void move(b,-1)}>↑</button><button type="button" disabled={index===ordered.length-1 || ordered[index+1]?.placement!==b.placement} onClick={() => void move(b,1)}>↓</button><button type="button" onClick={() => edit(b)}>تعديل</button><button type="button" onClick={() => void toggle(b)}>{b.is_active ? "إيقاف" : "تفعيل"}</button><button type="button" className="danger" onClick={() => void remove(b)}>حذف</button></div></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  </AdminShell>;
}
