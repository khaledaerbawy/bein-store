"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/admin/admin-shell";

type Row = Record<string, unknown>;
type BackupTable = "products" | "categories" | "store_brands" | "site_banners" | "inventory" | "inventory_movements" | "orders" | "order_items" | "store_settings";
type ResponseRows = { data: unknown[] | null; error: { message: string } | null };
type Loader = { key: BackupTable; label: string; privateData?: boolean; run: (from: number, to: number) => PromiseLike<ResponseRows> };
type Dataset = { key: BackupTable; label: string; rows: Row[]; privateData?: boolean };
const dateLabel = (value?: string) => value ? new Date(value).toLocaleString("ar-EG") : "—";
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const rowValue = (value: unknown) => value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);

async function downloadRows(name: string, rows: Row[]) {
  if (!rows.length) return { error: "لا توجد بيانات لتصديرها في هذا القسم." };
  const keys = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const quote = (value: unknown) => {
    const cell = rowValue(value);
    return /[",\r\n]/.test(cell) ? '"' + cell.replace(/"/g, '""') + '"' : cell;
  };
  const csv = "\uFEFF" + [keys.map(quote).join(","), ...rows.map(row => keys.map(key => quote(row[key])).join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name + "-" + stamp() + ".csv";
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  return { error: "" };
}

function downloadJson(name: string, payload: unknown) {
  const blob = new Blob(["\uFEFF", JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name + "-" + stamp() + ".json";
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

export default function AdminToolsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [message, setMessage] = useState("");
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [lastChecked, setLastChecked] = useState("");
  const [imageMigrationBusy, setImageMigrationBusy] = useState(false);
  const [imageMigrationMessage, setImageMigrationMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    const supabase = createClient();
    if (!supabase) { setMessage("إعدادات Supabase ناقصة."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/admin/login"); return; }
    const { data: role, error: roleError } = await supabase.from("admin_roles").select("is_active").eq("user_id", user.id).maybeSingle();
    if (roleError || !role?.is_active) { await supabase.auth.signOut(); router.replace("/admin/login"); return; }
    setEmail(user.email ?? "");

    const loaders: Loader[] = [
      { key: "products", label: "المنتجات", run: (from,to) => supabase.from("products").select("*").order("name_ar").range(from,to) },
      { key: "categories", label: "الأقسام", run: (from,to) => supabase.from("categories").select("*").order("sort_order").range(from,to) },
      { key: "store_brands", label: "الماركات", run: (from,to) => supabase.from("store_brands").select("*").order("sort_order").range(from,to) },
      { key: "site_banners", label: "البانرات والعروض", run: (from,to) => supabase.from("site_banners").select("*").order("sort_order").range(from,to) },
      { key: "inventory", label: "أرصدة المخزون", run: (from,to) => supabase.from("inventory").select("*").range(from,to) },
      { key: "inventory_movements", label: "حركات المخزون", run: (from,to) => supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }).range(from,to) },
      { key: "orders", label: "الطلبات", privateData: true, run: (from,to) => supabase.from("orders").select("*").order("created_at", { ascending: false }).range(from,to) },
      { key: "order_items", label: "تفاصيل الطلبات", privateData: true, run: (from,to) => supabase.from("order_items").select("*").range(from,to) },
      { key: "store_settings", label: "إعدادات المتجر", run: (from,to) => supabase.from("store_settings").select("*").range(from,to) }
    ];
    try {
      const results = await Promise.all(loaders.map(async loader => {
        const all: Row[] = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await loader.run(from, from + 999);
          if (error) throw new Error(loader.label + ": " + error.message);
          const part = (data ?? []) as Row[];
          all.push(...part);
          if (part.length < 1000) break;
        }
        return { key: loader.key, label: loader.label, rows: all, privateData: loader.privateData };
      }));
      setDatasets(results);
      setLastChecked(new Date().toISOString());
    } catch (error) {
      setMessage("تعذر فحص بيانات المتجر: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const byKey = useMemo(() => Object.fromEntries(datasets.map(d => [d.key, d.rows])) as Partial<Record<BackupTable, Row[]>>, [datasets]);
  const counts = useMemo(() => {
    const products = byKey.products ?? [];
    const categories = byKey.categories ?? [];
    const brands = byKey.store_brands ?? [];
    const banners = byKey.site_banners ?? [];
    const inventory = byKey.inventory ?? [];
    const orders = byKey.orders ?? [];
    const now = Date.now();
    return {
      products: products.length,
      activeProducts: products.filter(p => p.is_active === true).length,
      missingPrice: products.filter(p => p.price_egp == null).length,
      missingModel: products.filter(p => !String(p.model ?? "").trim()).length,
      missingImages: products.filter(p => !Array.isArray(p.image_urls) || p.image_urls.length === 0).length,
      missingDescription: products.filter(p => !String(p.description_ar ?? "").trim()).length,
      categories: categories.length,
      categoriesWithoutImage: categories.filter(c => !String(c.image_url ?? "").trim()).length,
      brands: brands.length,
      banners: banners.length,
      liveBanners: banners.filter(b => b.is_active === true && (!b.starts_at || new Date(String(b.starts_at)).getTime() <= now) && (!b.ends_at || new Date(String(b.ends_at)).getTime() > now)).length,
      inventory: inventory.length,
      noStock: inventory.filter(i => Number(i.quantity_on_hand) <= 0).length,
      lowStock: inventory.filter(i => Number(i.quantity_on_hand) > 0 && Number(i.quantity_on_hand) <= Number(i.low_stock_threshold ?? 0)).length,
      orders: orders.length,
      newOrders: orders.filter(o => o.status === "new").length
    };
  }, [byKey]);

  async function exportCsv(dataset: Dataset) {
    setExporting(dataset.key); setMessage("");
    const result = await downloadRows(dataset.key, dataset.rows);
    setMessage(result.error || "تم تجهيز ملف CSV: " + dataset.label);
    setExporting("");
  }

  function exportBackup() {
    if (!datasets.length) { setMessage("حمّل بيانات المتجر أولًا قبل إنشاء النسخة الاحتياطية."); return; }
    downloadJson("bein-store-backup", {
      format: "bein-store-backup-v1",
      generated_at: new Date().toISOString(),
      note: "نسخة قراءة للتصدير والمراجعة. لا تُستورد تلقائيًا.",
      tables: Object.fromEntries(datasets.map(d => [d.key, d.rows]))
    });
    setMessage("تم تنزيل نسخة JSON من البيانات المتاحة لحساب الإدارة الحالي.");
  }

  async function migrateExternalImages() {
    if (imageMigrationBusy) return;
    const approved = window.confirm(
      "سيتم تنزيل صور المنتجات من مصادر معروفة ورفعها إلى product-images على دفعات. لن يتغير رابط أي صورة إلا بعد نجاح رفعها. ابدأ النقل الآن؟"
    );
    if (!approved) return;

    setImageMigrationBusy(true);
    setImageMigrationMessage("جارٍ فحص صور المنتجات...");
    let offset = 0;
    let total = 0;
    let uploaded = 0;
    let failed = 0;
    let skipped = 0;
    try {
      const previewResponse = await fetch("/api/admin/migrate-product-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offset: 0, dryRun: true })
      });
      const preview = await previewResponse.json();
      if (!previewResponse.ok) throw new Error(preview.error || "تعذر فحص الصور.");
      total = Number(preview.total) || 0;
      if (!total) {
        setImageMigrationMessage("لا توجد صور مسجلة تحتاج إلى فحص أو نقل.");
        return;
      }

      while (offset < total) {
        const response = await fetch("/api/admin/migrate-product-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "تعذر نقل دفعة الصور.");
        uploaded += Number(result.uploaded) || 0;
        failed += Number(result.failed) || 0;
        skipped += Number(result.skipped) || 0;
        const nextOffset = Number(result.nextOffset);
        if (!Number.isInteger(nextOffset) || nextOffset <= offset) break;
        offset = nextOffset;
        setImageMigrationMessage(
          "تمت معالجة " + offset.toLocaleString("ar-EG") + " من " + total.toLocaleString("ar-EG") +
          " صورة · تم النقل " + uploaded.toLocaleString("ar-EG") +
          " · فشل " + failed.toLocaleString("ar-EG") +
          " · تم تخطي " + skipped.toLocaleString("ar-EG") + "."
        );
        if (result.done) break;
      }

      setImageMigrationMessage(
        "انتهى فحص النقل: تم نقل " + uploaded.toLocaleString("ar-EG") +
        " صورة، وتخطي " + skipped.toLocaleString("ar-EG") +
        " صورة موجودة بالفعل، وفشل " + failed.toLocaleString("ar-EG") +
        " صورة. يمكن إعادة التشغيل لمحاولة نقل الصور التي فشلت؛ الروابط الناجحة لن تتكرر."
      );
      await load();
    } catch (error) {
      setImageMigrationMessage("توقف نقل الصور: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
    } finally {
      setImageMigrationBusy(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/admin/login"); router.refresh();
  }

  const qualityItems = [
    { title: "أسعار غير محددة", value: counts.missingPrice, detail: "منتجات لا تُعرض في واجهة البيع ما دام السعر فارغًا.", bad: counts.missingPrice > 0 },
    { title: "موديلات غير مكتملة", value: counts.missingModel, detail: "راجع رقم الموديل أو سجّل أنه غير متاح.", bad: counts.missingModel > 0 },
    { title: "منتجات بلا صور", value: counts.missingImages, detail: "أضف صورة مناسبة قبل نشر المنتج.", bad: counts.missingImages > 0 },
    { title: "أقسام بلا صورة مخصصة", value: counts.categoriesWithoutImage, detail: "واجهة القسم تستخدم صورة بديلة إن لم تُرفع صورة.", bad: counts.categoriesWithoutImage > 0 },
    { title: "بانرات فعّالة الآن", value: counts.liveBanners + " / " + counts.banners, detail: "البانرات المجدولة تظهر خلال فترة تفعيلها فقط.", bad: counts.banners === 0 },
    { title: "منتجات لها رصيد مسجل", value: counts.inventory + " / " + counts.products, detail: "لن يُخصم المخزون إلا للمنتجات المسجلة في جدول المخزون.", bad: counts.inventory === 0 }
  ];

  return <AdminShell title="الأدوات المتقدمة" subtitle="تصدير بيانات المتجر، تنزيل نسخة احتياطية، ومراجعة جاهزية الكتالوج والمخزون والعروض." userEmail={email} onSignOut={signOut}>
    <section className="admin-tools-page">
      <div className="admin-tools-hero"><div><small>BEIN STORE / ADMIN TOOLS</small><h2>بياناتك تحت السيطرة</h2><p>التصدير يتم من جلسة الإدارة الحالية مباشرة إلى جهازك. لا يتم إرسال النسخ إلى خدمة خارجية.</p></div><button type="button" disabled={loading || !datasets.length} onClick={exportBackup}>تنزيل نسخة JSON كاملة ↓</button></div>
      {loading ? <div className="admin-tools-loading">جارٍ فحص الجداول والصلاحيات...</div> : <>
        {message && <p className={message.startsWith("تم") ? "form-success" : "form-error"} role="status">{message}</p>}
        <div className="admin-tools-summary">
          <article><small>منتجات</small><b>{counts.products}</b><span>{counts.activeProducts} منشور</span></article>
          <article><small>أقسام</small><b>{counts.categories}</b><span>موجودة في قاعدة البيانات</span></article>
          <article><small>رصيد مخزون</small><b>{counts.inventory}</b><span>{counts.lowStock} قريب من النفاد · {counts.noStock} رصيد صفر</span></article>
          <article><small>طلبات</small><b>{counts.orders}</b><span>{counts.newOrders} طلب جديد</span></article>
        </div>
        <div className="admin-tools-section-heading"><div><h3>نقل الصور إلى التخزين</h3><p>ينقل الصور من مصادر صور المنتجات المسموحة إلى مساحة product-images، ثم يحفظ الرابط الجديد بعد نجاح الرفع. يتم النقل على دفعات صغيرة، دون إدخال أي روابط جديدة يدويًا.</p></div><button type="button" className="button button-secondary" disabled={imageMigrationBusy || loading} onClick={() => void migrateExternalImages()}>{imageMigrationBusy ? "جارٍ نقل الصور..." : "فحص ونقل الصور"}</button></div>
        {imageMigrationMessage && <p className={imageMigrationMessage.startsWith("انتهى فحص النقل:") || imageMigrationMessage.startsWith("لا توجد صور") ? "form-success" : "form-error"} role="status">{imageMigrationMessage}</p>}
        <div className="admin-tools-section-heading"><div><h3>جاهزية المتجر</h3><p>نتائج محسوبة من قاعدة البيانات الحالية، بدون بيانات تجريبية.</p></div><button type="button" onClick={() => void load()}>إعادة الفحص ↻</button></div>
        <div className="admin-tools-quality-grid">{qualityItems.map(item=><article key={item.title} className={item.bad?"needs-attention":""}><div><b>{item.title}</b><strong>{item.value}</strong></div><p>{item.detail}</p></article>)}</div>
        <div className="admin-tools-section-heading"><div><h3>تصدير الجداول</h3><p>ملفات CSV مناسبة للمراجعة في Excel. الأعمدة المتداخلة تُحفظ كنص JSON داخل الخلية.</p></div><span>آخر فحص: {dateLabel(lastChecked)}</span></div>
        <div className="admin-tools-export-list">{datasets.map(dataset=><article key={dataset.key}><div><b>{dataset.label}</b><small>{dataset.rows.length.toLocaleString("ar-EG")} سجل{dataset.privateData?" · بيانات عملاء خاصة":""}</small></div><button type="button" disabled={!dataset.rows.length || exporting===dataset.key} onClick={()=>void exportCsv(dataset)}>{exporting===dataset.key?"جارٍ التجهيز...":"تنزيل CSV ↓"}</button></article>)}</div>
        <div className="admin-tools-private-warning"><b>تنبيه خصوصية</b><p>تصدير الطلبات يتضمن أسماء العملاء وأرقامهم وعناوينهم وملاحظاتهم. احتفظ بالملفات في مكان آمن، ولا تشاركها علنًا. النسخة الاحتياطية ملف JSON للتنزيل فقط ولا تقوم باستعادة أو تعديل قاعدة البيانات تلقائيًا.</p></div>
      </>}
    </section>
  </AdminShell>;
}
