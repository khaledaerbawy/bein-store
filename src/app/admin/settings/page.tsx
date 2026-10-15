"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/admin/admin-shell";
import type { StoreSettings } from "@/lib/types";

type SettingsDraft = Omit<StoreSettings, "updated_at" | "updated_by">;
const defaults: SettingsDraft = {
  id: "main",
  store_name: "Bein Store",
  logo_url: null,
  favicon_url: null,
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
  show_announcement: true,
  hero_badge: "كاميرات مراقبة وأنظمة أمنية",
  hero_title: "كل ما تحتاجه لنظام مراقبة",
  hero_title_highlight: "متكامل وآمن",
  hero_description: "كاميرات، أجهزة تسجيل، هاردات تخزين وشبكات. اختار المنتجات المناسبة للمكان، ولو محتار في الموديل أو التوصيل نساعدك قبل الطلب.",
  hero_image_url: null,
  hero_cta_text: "تسوّق المنتجات",
  show_hero: true,
  show_categories: true,
  show_catalog: true,
  show_brands: true,
  show_services: true,
  phone: null,
  whatsapp: null,
  address: null,
  show_phone: true,
  show_whatsapp: true,
  show_address: true,
  orders_enabled: true,
  orders_paused_message: "استقبال الطلبات متوقف مؤقتًا. تواصل مع المتجر للاستفسار.",
  shipping_fee_egp: 0,
  free_shipping_threshold_egp: null,
  minimum_order_egp: 0,
  whatsapp_order_confirmation: true,
  allow_order_notes: true,
  delivery_time_text: "موعد التوصيل ورسوم الشحن يتم تأكيدهما مع المتجر بعد مراجعة العنوان.",
  footer_text: "كاميرات مراقبة وأنظمة تسجيل وشبكات ومستلزمات تركيب، مع مساعدة في اختيار المكونات المناسبة.",
  primary_color: "#1766bf",
  accent_color: "#f1f6fa"
};
const text = (value: string | null | undefined) => value ?? "";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState<SettingsDraft>(defaults);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingField, setUploadingField] = useState<keyof SettingsDraft | null>(null);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"identity" | "homepage" | "contact" | "orders">("identity");

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) { setMessage("إعدادات Supabase ناقصة."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/admin/login"); return; }
    const { data: role } = await supabase.from("admin_roles").select("is_active").eq("user_id", user.id).maybeSingle();
    if (!role?.is_active) { await supabase.auth.signOut(); router.replace("/admin/login"); return; }
    setEmail(user.email ?? "");
    setUserId(user.id);
    const { data, error } = await supabase.from("store_settings").select("*").eq("id", "main").maybeSingle();
    if (error) setMessage("تعذر تحميل إعدادات الموقع: " + error.message);
    else if (data) {
      const loaded = { ...defaults, ...data, id: "main" } as SettingsDraft;
      if (!loaded.phone) loaded.phone = process.env.NEXT_PUBLIC_STORE_PHONE?.trim() || null;
      if (!loaded.whatsapp) loaded.whatsapp = process.env.NEXT_PUBLIC_STORE_WHATSAPP?.trim() || null;
      if (!loaded.address) loaded.address = process.env.NEXT_PUBLIC_STORE_ADDRESS?.trim() || null;
      setForm(loaded);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  function update<K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>, key: "logo_url" | "favicon_url" | "hero_image_url") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) { setMessage("ارفع صورة JPG أو PNG أو WebP أو AVIF فقط."); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage("حجم الصورة يجب ألا يتجاوز 5 ميجابايت."); return; }
    const supabase = createClient();
    if (!supabase) { setMessage("إعدادات Supabase ناقصة."); return; }
    setUploadingField(key); setMessage("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `site/${key.replace("_url", "")}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) setMessage("تعذر رفع الصورة: " + error.message);
    else {
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      update(key, data.publicUrl);
      setMessage("تم رفع الصورة. اضغط «حفظ التغييرات» لتطبيقها على الموقع.");
    }
    setUploadingField(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const supabase = createClient();
    if (!supabase) { setMessage("إعدادات Supabase ناقصة."); setBusy(false); return; }
    const payload = {
      ...form,
      id: "main",
      store_name: form.store_name.trim() || "Bein Store",
      page_title: form.page_title.trim() || form.store_name.trim() || "Bein Store",
      meta_description: form.meta_description.trim(),
      whatsapp: form.whatsapp?.trim() || null,
      phone: form.phone?.trim() || null,
      address: form.address?.trim() || null,
      logo_url: form.logo_url?.trim() || null,
      favicon_url: form.favicon_url?.trim() || null,
      hero_image_url: form.hero_image_url?.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: userId || null
    };
    const { error } = await supabase.from("store_settings").upsert(payload, { onConflict: "id" });
    if (error) setMessage("لم يتم حفظ الإعدادات: " + error.message);
    else {
      setMessage("تم حفظ التغييرات في قاعدة البيانات. التحديثات تظهر في المتجر بعد إعادة تحميل الصفحة.");
      router.refresh();
    }
    setBusy(false);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const imageField = (label: string, key: "logo_url" | "favicon_url" | "hero_image_url", hint: string) => (
    <div className="settings-image-control">
      <div className="settings-image-heading"><b>{label}</b><small>{hint}</small></div>
      <label className="settings-upload-button">
        <span>{uploadingField === key ? "جارٍ الرفع..." : "اختيار صورة من الجهاز"}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploadingField !== null} onChange={event => void uploadImage(event, key)} />
      </label>
      <label className="settings-url-field">أو رابط صورة مباشر<input type="url" value={text(form[key])} onChange={event => update(key, event.target.value || null)} placeholder="https://..." /></label>
      {form[key] && <div className="settings-preview"><img src={form[key] as string} alt={"معاينة " + label} /><button type="button" onClick={() => update(key, null)}>إزالة الصورة</button></div>}
    </div>
  );

  const visibility = [
    { key: "show_announcement" as const, label: "شريط التنبيه العلوي", hint: "رسالة صغيرة أعلى الموقع" },
    { key: "show_hero" as const, label: "البانر الرئيسي", hint: "عنوان الصفحة والصورة الرئيسية" },
    { key: "show_categories" as const, label: "أقسام المتجر", hint: "بطاقات الأقسام أسفل البانر" },
    { key: "show_catalog" as const, label: "كتالوج المنتجات", hint: "قائمة المنتجات والأسعار" },
    { key: "show_brands" as const, label: "شريط الماركات", hint: "الماركات المتاحة بالمتجر" },
    { key: "show_services" as const, label: "قسم المساعدة والتركيب", hint: "معلومات مساعدة العميل" }
  ];

  return <AdminShell title="هوية ومحتوى الموقع" subtitle="غيّر اسم المتجر والشعار ومحتوى الصفحة الرئيسية وبيانات التواصل، ثم احفظ لنشرها في واجهة العميل." userEmail={email} onSignOut={signOut}>
    <section className="settings-editor-page">
      <div className="settings-editor-intro"><div><span>إدارة واجهة العميل</span><h2>الموقع بتاعك، تحت تحكمك</h2><p>التغييرات هنا تُحفظ في Supabase وتُستخدم في واجهة المتجر. مفيش زر شكلي أو حفظ محلي بس.</p></div><div className="settings-live-indicator"><i/> إعدادات مباشرة</div></div>
      <form onSubmit={save}>
        <div className="settings-editor-tabs" role="tablist" aria-label="إعدادات الموقع">
          <button type="button" className={tab === "identity" ? "active" : ""} onClick={() => setTab("identity")}>الهوية واسم الموقع</button>
          <button type="button" className={tab === "homepage" ? "active" : ""} onClick={() => setTab("homepage")}>الصفحة الرئيسية</button>
          <button type="button" className={tab === "contact" ? "active" : ""} onClick={() => setTab("contact")}>التواصل والفوتر</button>
          <button type="button" className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>الطلبات والشحن</button>
        </div>
        {loading ? <div className="settings-editor-empty">جارٍ تحميل الإعدادات...</div> : <>
          {tab === "identity" && <div className="settings-editor-grid">
            <article className="settings-editor-card"><div className="settings-editor-card-head"><span>01</span><div><h3>اسم وهوية المتجر</h3><p>تظهر في رأس الصفحة وعلامة التبويب ووصف الموقع.</p></div></div>
              <label>اسم المتجر<input value={form.store_name} onChange={e => update("store_name", e.target.value)} required maxLength={100} placeholder="Bein Store" /></label>
              <label>عنوان الصفحة في المتصفح ومحركات البحث<input value={form.page_title} onChange={e => update("page_title", e.target.value)} maxLength={160} required /></label>
              <label>وصف الموقع<input value={form.meta_description} onChange={e => update("meta_description", e.target.value)} maxLength={320} /></label>
              {imageField("شعار الموقع", "logo_url", "PNG أو JPG أو WebP · يظهر بجانب اسم المتجر")}
              {imageField("أيقونة المتصفح (Favicon)", "favicon_url", "يفضّل صورة مربعة واضحة")}
            </article>
            <article className="settings-editor-card"><div className="settings-editor-card-head"><span>02</span><div><h3>ألوان الهوية</h3><p>اختار اللون الأساسي ولون خلفية البانر، مع معاينة مباشرة.</p></div></div>
              <div className="settings-color-fields"><label>اللون الأساسي<input type="color" value={form.primary_color} onChange={e => update("primary_color", e.target.value)} /><small>{form.primary_color}</small></label><label>خلفية البانر<input type="color" value={form.accent_color} onChange={e => update("accent_color", e.target.value)} /><small>{form.accent_color}</small></label></div>
              <div className="settings-brand-preview" style={{ borderColor: form.primary_color, background: form.accent_color }}><div>{form.logo_url ? <img src={form.logo_url} alt="الشعار" /> : <b className="settings-brand-monogram">B.</b>}<span>{form.store_name || "اسم المتجر"}<small>معاينة الهوية</small></span></div><button type="button" style={{ background: form.primary_color }}>زر رئيسي</button></div>
            </article>
          </div>}
          {tab === "homepage" && <div className="settings-editor-grid">
            <article className="settings-editor-card settings-wide"><div className="settings-editor-card-head"><span>03</span><div><h3>محتوى البانر الرئيسي</h3><p>غيّر الرسالة والصورة وزر التصفح الذي يظهر أول ما العميل يفتح الموقع.</p></div></div>
              <label>وسم صغير أعلى العنوان<input value={form.hero_badge} onChange={e => update("hero_badge", e.target.value)} maxLength={120} /></label>
              <label>العنوان الرئيسي<input value={form.hero_title} onChange={e => update("hero_title", e.target.value)} maxLength={180} /></label>
              <label>السطر المميز<input value={form.hero_title_highlight} onChange={e => update("hero_title_highlight", e.target.value)} maxLength={180} /></label>
              <label>وصف البانر<textarea rows={3} value={form.hero_description} onChange={e => update("hero_description", e.target.value)} maxLength={700} /></label>
              <label>نص زر البانر<input value={form.hero_cta_text} onChange={e => update("hero_cta_text", e.target.value)} maxLength={50} /></label>
              {imageField("صورة البانر (اختياري)", "hero_image_url", "إذا تركتها فارغة يستخدم الموقع صور المنتجات المتاحة")}
              <div className="settings-home-preview"><div><small>{form.hero_badge}</small><h3>{form.hero_title}<br/><em>{form.hero_title_highlight}</em></h3><p>{form.hero_description}</p><button type="button" style={{ background: form.primary_color }}>{form.hero_cta_text}</button></div>{form.hero_image_url && <img src={form.hero_image_url} alt="معاينة البانر" />}</div>
            </article>
            <article className="settings-editor-card"><div className="settings-editor-card-head"><span>05</span><div><h3>عناوين الأقسام والكلام الظاهر للعميل</h3><p>عدّل عناوين أجزاء الصفحة الرئيسية والوصف المختصر لكل جزء.</p></div></div>
              <label>عنوان الأقسام<input value={form.categories_title} onChange={e => update("categories_title", e.target.value)} maxLength={140} /></label>
              <label>وصف قسم الأقسام<textarea rows={2} value={form.categories_description} onChange={e => update("categories_description", e.target.value)} maxLength={300} /></label>
              <label>عنوان المنتجات<input value={form.catalog_title} onChange={e => update("catalog_title", e.target.value)} maxLength={140} /></label>
              <label>وصف قسم المنتجات<textarea rows={2} value={form.catalog_description} onChange={e => update("catalog_description", e.target.value)} maxLength={300} /></label>
              <label>النص فوق الماركات<input value={form.brands_title} onChange={e => update("brands_title", e.target.value)} maxLength={160} /></label>
              <label>عنوان صغير لقسم المساعدة<input value={form.services_kicker} onChange={e => update("services_kicker", e.target.value)} maxLength={100} /></label>
              <label>عنوان المساعدة<input value={form.services_title} onChange={e => update("services_title", e.target.value)} maxLength={150} /></label>
              <label>السطر الثاني المميز<input value={form.services_highlight} onChange={e => update("services_highlight", e.target.value)} maxLength={150} /></label>
              <label>وصف قسم المساعدة<textarea rows={3} value={form.services_description} onChange={e => update("services_description", e.target.value)} maxLength={600} /></label>
            </article>
            <article className="settings-editor-card"><div className="settings-editor-card-head"><span>04</span><div><h3>التحكم في ظهور أجزاء الموقع</h3><p>إخفاء أو إظهار أي قسم بدون حذف محتواه.</p></div></div>
              <label>نص الشريط العلوي<input value={form.announcement_text} onChange={e => update("announcement_text", e.target.value)} maxLength={180} /></label>
              <div className="settings-visibility-list">{visibility.map(item => <label className="settings-visibility-row" key={item.key}><span><b>{item.label}</b><small>{item.hint}</small></span><input type="checkbox" checked={form[item.key]} onChange={e => update(item.key, e.target.checked)} /></label>)}</div>
            </article>
          </div>}
          {tab === "contact" && <div className="settings-editor-grid">
            <article className="settings-editor-card"><div className="settings-editor-card-head"><span>05</span><div><h3>بيانات التواصل</h3><p>تظهر في الترويسة والفوتر وأزرار التواصل.</p></div></div>
              <label>رقم الهاتف<input type="tel" value={text(form.phone)} onChange={e => update("phone", e.target.value || null)} placeholder="+20..." /></label>
              <label>رقم واتساب مع كود الدولة<input type="tel" value={text(form.whatsapp)} onChange={e => update("whatsapp", e.target.value || null)} placeholder="2010xxxxxxxx" /></label>
              <label>عنوان المتجر<input value={text(form.address)} onChange={e => update("address", e.target.value || null)} placeholder="العنوان (اختياري)" /></label>
              <div className="settings-visibility-list settings-contact-visibility">
                <label className="settings-visibility-row"><span><b>إظهار رقم الهاتف</b><small>عرض الهاتف في رأس الموقع والفوتر</small></span><input type="checkbox" checked={form.show_phone} onChange={e => update("show_phone", e.target.checked)} /></label>
                <label className="settings-visibility-row"><span><b>إظهار واتساب</b><small>إظهار زر التواصل وإرسال الطلبات عبر واتساب</small></span><input type="checkbox" checked={form.show_whatsapp} onChange={e => update("show_whatsapp", e.target.checked)} /></label>
                <label className="settings-visibility-row"><span><b>إظهار العنوان</b><small>عرض عنوان المتجر في الفوتر</small></span><input type="checkbox" checked={form.show_address} onChange={e => update("show_address", e.target.checked)} /></label>
              </div>
            </article>
            <article className="settings-editor-card"><div className="settings-editor-card-head"><span>06</span><div><h3>نص التذييل (Footer)</h3><p>الكلام التعريفي في أسفل الموقع.</p></div></div>
              <label>النص التعريفي<textarea rows={4} value={form.footer_text} onChange={e => update("footer_text", e.target.value)} maxLength={600} /></label>
              <p className="settings-help-text">اسم المتجر وحقوق النشر يتحدثان تلقائيًا عند تغيير اسم المتجر.</p>
            </article>
          </div>}
          {tab === "orders" && <div className="settings-editor-grid">
            <article className="settings-editor-card">
              <div className="settings-editor-card-head"><span>07</span><div><h3>استقبال الطلبات</h3><p>تحكم في إتاحة إرسال طلب جديد وطريقة متابعة العميل بعد التسجيل.</p></div></div>
              <div className="settings-visibility-list">
                <label className="settings-visibility-row"><span><b>استقبال طلبات جديدة</b><small>إيقافه يمنع تسجيل طلبات جديدة من الموقع، مع بقاء المنتجات ظاهرة.</small></span><input type="checkbox" checked={form.orders_enabled} onChange={e => update("orders_enabled", e.target.checked)} /></label>
                <label className="settings-visibility-row"><span><b>متابعة الطلب عبر واتساب</b><small>يفتح محادثة واتساب بعد تسجيل الطلب إذا كان رقم واتساب ظاهرًا.</small></span><input type="checkbox" checked={form.whatsapp_order_confirmation} onChange={e => update("whatsapp_order_confirmation", e.target.checked)} /></label>
                <label className="settings-visibility-row"><span><b>السماح بملاحظات العميل</b><small>إظهار خانة الملاحظات في إتمام الطلب.</small></span><input type="checkbox" checked={form.allow_order_notes} onChange={e => update("allow_order_notes", e.target.checked)} /></label>
              </div>
              <label>الرسالة التي تظهر عند إيقاف استقبال الطلبات<textarea rows={3} value={form.orders_paused_message} onChange={e => update("orders_paused_message", e.target.value)} maxLength={400} /></label>
              <label>رسالة الشحن والتوصيل في صفحة إتمام الطلب<textarea rows={3} value={form.delivery_time_text} onChange={e => update("delivery_time_text", e.target.value)} maxLength={400} /></label>
            </article>
            <article className="settings-editor-card">
              <div className="settings-editor-card-head"><span>08</span><div><h3>الشحن والحد الأدنى للطلب</h3><p>القيم دي تدخل في حساب إجمالي الطلب في قاعدة البيانات. اترك حد الشحن المجاني فارغًا لتعطيله.</p></div></div>
              <label>رسوم الشحن بالجنيه<input type="number" min="0" step="0.01" required value={form.shipping_fee_egp} onChange={e => update("shipping_fee_egp", Number(e.target.value))} /></label>
              <label>حد الشحن المجاني بالجنيه (اختياري)<input type="number" min="0" step="0.01" value={form.free_shipping_threshold_egp == null ? "" : String(form.free_shipping_threshold_egp)} onChange={e => update("free_shipping_threshold_egp", e.target.value.trim() === "" ? null : Number(e.target.value))} placeholder="اتركه فارغًا إذا لم يوجد" /></label>
              <label>الحد الأدنى لقيمة الطلب بالجنيه<input type="number" min="0" step="0.01" required value={form.minimum_order_egp} onChange={e => update("minimum_order_egp", Number(e.target.value))} /></label>
              <div className="settings-home-preview"><div><small>معاينة الإعدادات</small><h3>الشحن: {new Intl.NumberFormat("ar-EG").format(form.shipping_fee_egp || 0)} ج.م</h3><p>{form.free_shipping_threshold_egp == null ? "لا يوجد حد للشحن المجاني." : "شحن مجاني عند وصول قيمة المنتجات إلى " + new Intl.NumberFormat("ar-EG").format(form.free_shipping_threshold_egp) + " ج.م."}</p><p>الحد الأدنى للطلب: {new Intl.NumberFormat("ar-EG").format(form.minimum_order_egp || 0)} ج.م</p></div></div>
              <p className="settings-help-text">الدفع الإلكتروني غير مفعّل. هذه الإعدادات تتحكم في الشحن وقواعد تسجيل الطلب ومتابعته فقط.</p>
            </article>
          </div>}
          {message && <p className={message.startsWith("تم") ? "form-success" : "form-error"} role="status">{message}</p>}
          <div className="settings-editor-savebar"><span>تأكد من حفظ التغييرات قبل مغادرة الصفحة.</span><button type="submit" disabled={busy || uploadingField !== null}>{busy ? "جارٍ الحفظ..." : "حفظ التغييرات"}</button><a href="/" target="_blank" rel="noreferrer">معاينة المتجر ↗</a></div>
        </>}
      </form>
    </section>
  </AdminShell>;
}
