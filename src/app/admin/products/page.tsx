"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Category, Product } from "@/lib/types";
import AdminShell from "@/components/admin/admin-shell";

type Draft = {
  id?: string;
  category_id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  sku: string;
  brand: string;
  model: string;
  description_ar: string;
  price_egp: string;
  image_urls: string[];
  is_active: boolean;
  is_featured: boolean;
  stock: string;
};
const blank: Draft = {
  category_id: "", name_ar: "", name_en: "", slug: "", sku: "", brand: "", model: "",
  description_ar: "", price_egp: "", image_urls: [], is_active: false, is_featured: false, stock: ""
};
const money = (n: number) => new Intl.NumberFormat("ar-EG").format(n) + " ج.م";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Draft>(blank);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const s = createClient();
    if (!s) { setMessage("إعدادات Supabase ناقصة."); setLoading(false); return; }
    const { data: { user } } = await s.auth.getUser();
    if (!user) { location.href = "/admin/login"; return; }
    const { data: role } = await s.from("admin_roles").select("is_active").eq("user_id", user.id).maybeSingle();
    if (!role?.is_active) { location.href = "/admin/login"; return; }
    const [productResult, categoryResult] = await Promise.all([
      s.from("products").select("id,category_id,sku,slug,name_ar,name_en,brand,model,description_ar,description_en,specifications,price_egp,image_urls,is_active,is_featured").order("created_at", { ascending: false }),
      s.from("categories").select("id,name_ar,name_en,slug,sort_order").order("sort_order", { ascending: true })
    ]);
    if (productResult.error) setMessage(productResult.error.message);
    else setProducts((productResult.data ?? []) as Product[]);
    if (categoryResult.error) setMessage(categoryResult.error.message);
    else setCategories((categoryResult.data ?? []) as Category[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  function edit(p: Product) {
    setDraft({ id: p.id, category_id: p.category_id ?? "", name_ar: p.name_ar, name_en: p.name_en,
      slug: p.slug, sku: p.sku ?? "", brand: p.brand ?? "", model: p.model ?? "",
      description_ar: p.description_ar ?? "", price_egp: p.price_egp == null ? "" : String(p.price_egp),
      image_urls: [...(p.image_urls ?? [])], is_active: p.is_active, is_featured: p.is_featured, stock: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function autoSlug(value: string) {
    return value.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-|-$/g, "");
  }
  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const invalid = files.find(file => !/^image\/(jpeg|png|webp|avif)$/.test(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) { setMessage("كل الصور لازم تكون JPG أو PNG أو WebP أو AVIF وحجم الواحدة 5 ميجابايت أو أقل."); return; }
    const s = createClient();
    if (!s) { setMessage("إعدادات Supabase ناقصة."); return; }
    setUploading(true); setMessage("");
    const uploaded: string[] = [];
    const failures: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `products/${crypto.randomUUID()}.${ext}`;
      const { error } = await s.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) failures.push(file.name);
      else { const { data } = s.storage.from("product-images").getPublicUrl(path); uploaded.push(data.publicUrl); }
    }
    if (uploaded.length) setDraft(d => ({ ...d, image_urls: [...d.image_urls, ...uploaded] }));
    setMessage(failures.length ? `تم رفع ${uploaded.length} صورة، وتعذر رفع: ${failures.join("، ")}` : `تم رفع ${uploaded.length} صورة. راجع المعاينة ثم احفظ المنتج.`);
    setUploading(false);
  }
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const s = createClient();
    if (!s) { setMessage("إعدادات Supabase ناقصة."); setBusy(false); return; }
    const price = draft.price_egp.trim() === "" ? null : Number(draft.price_egp);
    if (price !== null && (!Number.isFinite(price) || price < 0)) { setMessage("اكتب سعرًا صحيحًا أو اتركه فارغًا."); setBusy(false); return; }
    if (draft.is_active && price === null) { setMessage("أضف السعر المعتمد قبل نشر المنتج."); setBusy(false); return; }
    const payload = {
      category_id: draft.category_id || null,
      name_ar: draft.name_ar.trim(), name_en: draft.name_en.trim() || draft.name_ar.trim(),
      slug: draft.slug.trim() || autoSlug(draft.name_en || draft.name_ar), sku: draft.sku.trim() || null,
      brand: draft.brand.trim() || null, model: draft.model.trim() || null,
      description_ar: draft.description_ar.trim() || null, price_egp: price,
      image_urls: draft.image_urls.map(url => url.trim()).filter(Boolean),
      is_active: draft.is_active && price !== null, is_featured: draft.is_featured
    };
    const result = draft.id
      ? await s.from("products").update(payload).eq("id", draft.id).select("id").single()
      : await s.from("products").insert(payload).select("id").single();
    if (result.error) {
      setMessage(result.error.message.includes("products_slug_key") ? "الرابط المختصر مستخدم بالفعل. غيّره وحاول مرة أخرى." : result.error.message);
      setBusy(false); return;
    }
    const productId = draft.id ?? result.data.id;
    const stock = draft.stock.trim() === "" ? null : Number(draft.stock);
    if (stock !== null) {
      if (!Number.isInteger(stock) || stock < 0) { setMessage("تم حفظ المنتج، لكن كمية المخزون يجب أن تكون رقمًا صحيحًا غير سالب."); setBusy(false); await load(); return; }
      const { error: stockError } = await s.from("inventory").upsert({ product_id: productId, quantity_on_hand: stock, low_stock_threshold: 2 }, { onConflict: "product_id" });
      if (stockError) { setMessage(`تم حفظ المنتج، لكن لم يتم حفظ المخزون: ${stockError.message}`); setBusy(false); await load(); return; }
    }
    setMessage("تم حفظ المنتج."); setDraft(blank); await load(); setBusy(false);
  }
  async function remove(p: Product) {
    if (!confirm(`حذف المنتج «${p.name_ar}»؟ لا يمكن التراجع عن ذلك.`)) return;
    const s = createClient(); if (!s) return;
    const { error } = await s.from("products").delete().eq("id", p.id);
    setMessage(error ? error.message : "تم حذف المنتج."); await load();
  }
  async function toggle(p: Product) {
    if (!p.is_active && (p.price_egp === null || p.price_egp === undefined)) { setMessage("أضف سعرًا معتمدًا قبل نشر المنتج."); return; }
    const s = createClient(); if (!s) return;
    const { error } = await s.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    setMessage(error ? error.message : "تم تحديث حالة المنتج."); await load();
  }
  const field = (label: string, key: keyof Draft, props: InputHTMLAttributes<HTMLInputElement> = {}) =>
    <label>{label}<input value={String(draft[key] ?? "")} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))} {...props} /></label>;

  return <AdminShell title="المنتجات والأسعار" subtitle="إدارة الكتالوج والصور والأسعار وحالة ظهور المنتجات."><div className="admin-products-page">
    <section className="section-wrap admin-content-wrap">
      <form className="admin-product-form" onSubmit={save}>
        <h2>{draft.id ? "تعديل المنتج" : "إضافة منتج جديد"}</h2>
        <div className="admin-form-grid">
          <label>القسم<select value={draft.category_id} onChange={e => setDraft(d => ({ ...d, category_id: e.target.value }))}><option value="">بدون قسم</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></label>
          {field("اسم المنتج بالعربي *", "name_ar", { required: true, maxLength: 160 })}
          {field("اسم المنتج بالإنجليزي", "name_en", { maxLength: 160 })}
          {field("الرابط المختصر (Slug)", "slug", { placeholder: "hikvision-camera-2mp" })}
          {field("كود المنتج SKU", "sku", { maxLength: 80 })}
          {field("الماركة", "brand", { maxLength: 80 })}
          {field("الموديل", "model", { maxLength: 100 })}
          {field("السعر بالجنيه المصري (اتركه فارغًا للسعر عند الطلب)", "price_egp", { type: "number", min: "0", step: "0.01" })}
          <label className="wide-field">روابط صور المنتج (رابط في كل سطر)<textarea rows={3} value={draft.image_urls.join("\n")} onChange={e => setDraft(d => ({ ...d, image_urls: e.target.value.split("\n").map(url => url.trim()).filter(Boolean) }))} placeholder={"https://...\nhttps://..."} /></label>
          <label>رفع صور متعددة من الجهاز<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={uploadImages} disabled={uploading} />{uploading && <small>جارٍ رفع الصور...</small>}</label>
          {field("كمية المخزون (اختياري؛ فارغ = لا تغيّر المخزون)", "stock", { type: "number", min: "0", step: "1" })}
          <label className="wide-field">الوصف<textarea value={draft.description_ar} onChange={e => setDraft(d => ({ ...d, description_ar: e.target.value }))} rows={3} /></label>
        </div>
        {draft.image_urls.length > 0 && <div className="admin-product-gallery-preview">{draft.image_urls.map((url,index) => <div key={url+"-"+index}><img src={url} alt={`صورة المنتج ${index+1}`} /><span>الصورة {index+1}</span><button type="button" onClick={() => setDraft(d => ({ ...d, image_urls: d.image_urls.filter((_,i) => i !== index) }))}>إزالة</button></div>)}</div>}
        <div className="check-row"><label><input type="checkbox" checked={draft.is_active} onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))} /> نشر المنتج في المتجر</label><label><input type="checkbox" checked={draft.is_featured} onChange={e => setDraft(d => ({ ...d, is_featured: e.target.checked }))} /> منتج مميز</label></div>
        <div className="hero-actions"><button className="button button-primary" disabled={busy || uploading}>{busy ? "جارٍ الحفظ..." : draft.id ? "حفظ التعديلات" : "إضافة المنتج"}</button>{draft.id && <button type="button" className="button button-secondary" onClick={() => setDraft(blank)}>إلغاء التعديل</button>}</div>
        {message && <p className={message.includes("تم") ? "form-success" : "form-error"} role="status">{message}</p>}
        <p className="muted">لا يمكن نشر المنتج إذا كان السعر فارغًا. الصور تُرفع إلى مساحة تخزين عامة للعرض، والرفع والتعديل متاحان للمسؤولين فقط. لا يتم إنشاء مخزون افتراضي؛ اكتب الكمية فقط إذا كنت تريد تتبعها.</p>
      </form>
      <h2 className="admin-list-title">المنتجات المسجلة ({products.length})</h2>
      {loading ? <p>جارٍ تحميل المنتجات...</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>المنتج</th><th>السعر</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>
        {products.map(p => <tr key={p.id}><td><b>{p.name_ar}</b><small>{p.brand ?? ""} {p.model ?? ""} {p.sku ? `· ${p.sku}` : ""}</small></td><td>{p.price_egp === null ? "عند الطلب" : money(Number(p.price_egp))}</td><td><span className={p.is_active ? "status-active" : "status-inactive"}>{p.is_active ? "منشور" : "مخفي"}</span></td><td><div className="table-actions"><button onClick={() => edit(p)}>تعديل</button><button onClick={() => void toggle(p)}>{p.is_active ? "إخفاء" : "نشر"}</button><button className="danger-button" onClick={() => void remove(p)}>حذف</button></div></td></tr>)}
      </tbody></table>{!products.length && <p className="muted">لا توجد منتجات بعد. ابدأ بإضافة أول منتج.</p>}</div>}
    </section>
  </div></AdminShell>;
}
