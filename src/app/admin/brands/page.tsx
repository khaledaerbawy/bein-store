"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/admin/admin-shell";

type StoreBrand = { id: string; name: string; slug: string; logo_url: string | null; website_url: string | null; description: string | null; sort_order: number; is_active: boolean };
type Draft = { id?: string; original_name: string; name: string; slug: string; logo_url: string; website_url: string; description: string; sort_order: string; is_active: boolean };
const blank: Draft = { original_name: "", name: "", slug: "", logo_url: "", website_url: "", description: "", sort_order: "1", is_active: true };
const makeSlug = (v: string) => v.trim().toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminBrandsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [brands, setBrands] = useState<StoreBrand[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
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
    const [brandResult, productResult] = await Promise.all([
      s.from("store_brands").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
      s.from("products").select("brand")
    ]);
    if (brandResult.error) setMessage("تعذر تحميل الماركات: " + brandResult.error.message);
    else setBrands((brandResult.data ?? []) as StoreBrand[]);
    if (productResult.error) setMessage("تعذر حساب المنتجات المرتبطة بالماركات: " + productResult.error.message);
    else {
      const counts: Record<string, number> = {};
      (productResult.data ?? []).forEach(row => { if (row.brand) counts[row.brand] = (counts[row.brand] ?? 0) + 1; });
      setProductCounts(counts);
    }
    setLoading(false);
  }, [router]);
  useEffect(() => { void load(); }, [load]);

  function edit(brand: StoreBrand) {
    setDraft({ id: brand.id, original_name: brand.name, name: brand.name, slug: brand.slug, logo_url: brand.logo_url ?? "", website_url: brand.website_url ?? "", description: brand.description ?? "", sort_order: String(brand.sort_order), is_active: brand.is_active });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|avif|svg\+xml)$/.test(file.type)) { setMessage("ارفع شعار PNG أو JPG أو WebP أو SVG."); return; }
    if (file.size > 3 * 1024 * 1024) { setMessage("حجم الشعار يجب ألا يتجاوز 3 ميجابايت."); return; }
    const s = createClient(); if (!s) { setMessage("إعدادات Supabase ناقصة."); return; }
    setUploading(true); setMessage("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `brands/${crypto.randomUUID()}.${ext}`;
    const { error } = await s.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) setMessage("تعذر رفع الشعار: " + error.message);
    else { const { data } = s.storage.from("product-images").getPublicUrl(path); setDraft(d => ({ ...d, logo_url: data.publicUrl })); setMessage("تم رفع الشعار. احفظ الماركة لتطبيقه."); }
    setUploading(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const s = createClient(); if (!s) { setMessage("إعدادات Supabase ناقصة."); setBusy(false); return; }
    const order = Number(draft.sort_order);
    if (!draft.name.trim()) { setMessage("اكتب اسم الماركة."); setBusy(false); return; }
    if (!Number.isInteger(order) || order < 0) { setMessage("ترتيب العرض لازم يكون رقمًا صحيحًا غير سالب."); setBusy(false); return; }
    if (draft.website_url.trim() && !/^https?:\/\//i.test(draft.website_url.trim())) { setMessage("رابط الموقع لازم يبدأ بـ https:// أو http://"); setBusy(false); return; }
    const payload = { name: draft.name.trim(), slug: draft.slug.trim() || makeSlug(draft.name), logo_url: draft.logo_url.trim() || null, website_url: draft.website_url.trim() || null, description: draft.description.trim() || null, sort_order: order, is_active: draft.is_active, updated_at: new Date().toISOString() };
    const result = draft.id
      ? await s.from("store_brands").update(payload).eq("id", draft.id).select("id").single()
      : await s.from("store_brands").insert(payload).select("id").single();
    if (result.error) { setMessage("لم يتم حفظ الماركة: " + result.error.message); setBusy(false); return; }
    if (draft.id && draft.original_name !== payload.name) {
      const { error: productError } = await s.from("products").update({ brand: payload.name }).eq("brand", draft.original_name);
      if (productError) { setMessage("تم حفظ اسم الماركة، لكن تعذر تحديث أسماء منتجاتها: " + productError.message); await load(); setBusy(false); return; }
    }
    setMessage(draft.id ? "تم حفظ الماركة وتحديث منتجاتها." : "تمت إضافة الماركة.");
    setDraft(blank); await load(); setBusy(false);
  }

  async function toggle(brand: StoreBrand) {
    const s = createClient(); if (!s) return;
    const { error } = await s.from("store_brands").update({ is_active: !brand.is_active, updated_at: new Date().toISOString() }).eq("id", brand.id);
    setMessage(error ? "تعذر تغيير ظهور الماركة: " + error.message : (brand.is_active ? "تم إخفاء الماركة من شريط الماركات." : "تم إظهار الماركة في شريط الماركات."));
    await load();
  }

  async function remove(brand: StoreBrand) {
    if (!window.confirm(`حذف إعدادات عرض ماركة «${brand.name}»؟ لن يتم حذف المنتجات المسجلة باسمها.`)) return;
    const s = createClient(); if (!s) return;
    const { error } = await s.from("store_brands").delete().eq("id", brand.id);
    setMessage(error ? "تعذر حذف إعداد الماركة: " + error.message : "تم حذف إعداد الماركة. المنتجات نفسها لم تُحذف.");
    await load();
  }

  async function move(brand: StoreBrand, direction: -1 | 1) {
    const ordered = [...brands].sort((a,b)=>a.sort_order-b.sort_order);
    const index = ordered.findIndex(x=>x.id===brand.id); const other=ordered[index+direction]; if(!other) return;
    const s=createClient(); if(!s) return;
    const a=await s.from("store_brands").update({sort_order:other.sort_order,updated_at:new Date().toISOString()}).eq("id",brand.id);
    const b=await s.from("store_brands").update({sort_order:brand.sort_order,updated_at:new Date().toISOString()}).eq("id",other.id);
    setMessage(a.error||b.error?"تعذر تغيير الترتيب. حاول مرة أخرى.":"تم تحديث ترتيب الماركات.");
    await load();
  }

  async function signOut() { const s=createClient(); await s?.auth.signOut(); router.replace("/admin/login"); router.refresh(); }

  return <AdminShell title="إدارة الماركات" subtitle="تحكم في أسماء الماركات وشعاراتها وترتيبها وظهورها في واجهة المتجر." userEmail={email} onSignOut={signOut}>
    <div className="admin-brands-page">
      <form className="admin-category-form" onSubmit={save}>
        <div className="admin-category-form-head"><div><span>{draft.id ? "تعديل ماركة" : "ماركة جديدة"}</span><h2>{draft.id ? "عدّل بيانات الماركة" : "أضف ماركة للمتجر"}</h2><p>تغيير اسم الماركة يحدّث حقل الماركة في المنتجات المرتبطة بالاسم القديم.</p></div>{draft.id && <button type="button" className="admin-category-cancel" onClick={()=>setDraft(blank)}>إلغاء التعديل</button>}</div>
        <div className="admin-category-grid">
          <label>اسم الماركة *<input required maxLength={100} value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Hikvision" /></label>
          <label>الرابط المختصر<input maxLength={120} value={draft.slug} onChange={e=>setDraft(d=>({...d,slug:e.target.value}))} placeholder="hikvision" /></label>
          <label>رابط الموقع الرسمي<input type="url" value={draft.website_url} onChange={e=>setDraft(d=>({...d,website_url:e.target.value}))} placeholder="https://..." /></label>
          <label>ترتيب العرض<input type="number" min="0" step="1" value={draft.sort_order} onChange={e=>setDraft(d=>({...d,sort_order:e.target.value}))} /></label>
          <label className="wide-field">وصف مختصر<input maxLength={240} value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))} placeholder="وصف اختياري" /></label>
          <label className="wide-field">رابط الشعار<input type="url" value={draft.logo_url} onChange={e=>setDraft(d=>({...d,logo_url:e.target.value}))} placeholder="https://..." /><span>أو ارفع شعارًا من جهازك</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" onChange={uploadLogo} disabled={uploading}/></label>
        </div>
        {draft.logo_url && <div className="admin-category-image-preview"><img src={draft.logo_url} alt="معاينة الشعار"/><button type="button" onClick={()=>setDraft(d=>({...d,logo_url:""}))}>إزالة الشعار</button></div>}
        <label className="admin-category-active"><input type="checkbox" checked={draft.is_active} onChange={e=>setDraft(d=>({...d,is_active:e.target.checked}))}/> عرض الماركة في واجهة المتجر</label>
        <div className="admin-category-actions"><button type="submit" disabled={busy||uploading}>{busy?"جارٍ الحفظ...":draft.id?"حفظ تعديلات الماركة":"إضافة الماركة"}</button><span>حفظ الإعدادات لا يحذف أي منتج.</span></div>
        {message && <p className={message.startsWith("تم")?"form-success":"form-error"} role="status">{message}</p>}
      </form>
      <section className="admin-category-list-panel">
        <div className="admin-category-list-head"><div><h2>الماركات ({brands.length})</h2><p>تعرض الماركات النشطة فقط في شريط الماركات للعميل.</p></div><div className="admin-category-counts"><span><b>{brands.filter(b=>b.is_active).length}</b> ظاهرة</span><span><b>{brands.reduce((sum,b)=>sum+(productCounts[b.name]??0),0)}</b> منتجات مرتبطة</span></div></div>
        {loading?<div className="admin-category-empty">جارٍ التحميل...</div>:<div className="admin-category-table-wrap"><table className="admin-category-table"><thead><tr><th>الماركة</th><th>المنتجات</th><th>الترتيب</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{[...brands].sort((a,b)=>a.sort_order-b.sort_order).map((b,index)=><tr key={b.id}><td><div className="admin-category-product-cell">{b.logo_url?<img src={b.logo_url} alt=""/>:<span className="admin-category-no-image">Logo</span>}<span><b>{b.name}</b><small>{b.slug}</small></span></div></td><td>{productCounts[b.name]??0}</td><td>{b.sort_order}</td><td><span className={b.is_active?"admin-category-state visible":"admin-category-state hidden"}>{b.is_active?"ظاهرة":"مخفية"}</span></td><td><div className="admin-category-row-actions"><button type="button" disabled={index===0} onClick={()=>void move(b,-1)}>↑</button><button type="button" disabled={index===brands.length-1} onClick={()=>void move(b,1)}>↓</button><button type="button" onClick={()=>edit(b)}>تعديل</button><button type="button" onClick={()=>void toggle(b)}>{b.is_active?"إخفاء":"إظهار"}</button><button type="button" className="danger" onClick={()=>void remove(b)}>حذف</button></div></td></tr>)}</tbody></table>{brands.length===0&&!loading&&<div className="admin-category-empty">لم تتم إضافة ماركات بعد.</div>}</div>}
      </section>
    </div>
  </AdminShell>;
}
