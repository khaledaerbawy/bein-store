"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/admin/admin-shell";
import type { Category } from "@/lib/types";

type CategoryDraft = {
  id?: string;
  name_ar: string;
  name_en: string;
  slug: string;
  description_ar: string;
  image_url: string;
  sort_order: string;
  is_active: boolean;
};
const blank: CategoryDraft = { name_ar: "", name_en: "", slug: "", description_ar: "", image_url: "", sort_order: "1", is_active: true };
const makeSlug = (value: string) => value.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-|-$/g, "");

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<CategoryDraft>(blank);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) { setMessage("إعدادات Supabase ناقصة."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/admin/login"); return; }
    const { data: role } = await supabase.from("admin_roles").select("is_active").eq("user_id", user.id).maybeSingle();
    if (!role?.is_active) { await supabase.auth.signOut(); router.replace("/admin/login"); return; }
    setEmail(user.email ?? "");
    const [categoryResult, productResult] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("products").select("id,category_id")
    ]);
    if (categoryResult.error) setMessage("تعذر تحميل الأقسام: " + categoryResult.error.message);
    else setCategories((categoryResult.data ?? []) as Category[]);
    if (productResult.error) setMessage("تعذر حساب المنتجات المرتبطة بالأقسام: " + productResult.error.message);
    else {
      const counts: Record<string, number> = {};
      (productResult.data ?? []).forEach(row => { if (row.category_id) counts[row.category_id] = (counts[row.category_id] ?? 0) + 1; });
      setProductCounts(counts);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  function edit(category: Category) {
    setDraft({
      id: category.id,
      name_ar: category.name_ar,
      name_en: category.name_en,
      slug: category.slug,
      description_ar: category.description_ar ?? "",
      image_url: category.image_url ?? "",
      sort_order: String(category.sort_order ?? 0),
      is_active: category.is_active ?? false
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMessage("");
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) { setMessage("ارفع صورة JPG أو PNG أو WebP أو AVIF فقط."); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage("حجم الصورة يجب ألا يتجاوز 5 ميجابايت."); return; }
    const supabase = createClient();
    if (!supabase) { setMessage("إعدادات Supabase ناقصة."); return; }
    setUploading(true); setMessage("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `categories/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
    if (error) setMessage("تعذر رفع الصورة: " + error.message);
    else {
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setDraft(current => ({ ...current, image_url: data.publicUrl }));
      setMessage("تم رفع صورة القسم. احفظ القسم لتطبيقها.");
    }
    setUploading(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const supabase = createClient();
    if (!supabase) { setMessage("إعدادات Supabase ناقصة."); setBusy(false); return; }
    const sortOrder = Number(draft.sort_order);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) { setMessage("ترتيب القسم لازم يكون رقمًا صحيحًا غير سالب."); setBusy(false); return; }
    const payload = {
      name_ar: draft.name_ar.trim(),
      name_en: draft.name_en.trim() || draft.name_ar.trim(),
      slug: draft.slug.trim() || makeSlug(draft.name_en || draft.name_ar),
      description_ar: draft.description_ar.trim() || null,
      image_url: draft.image_url.trim() || null,
      sort_order: sortOrder,
      is_active: draft.is_active,
      updated_at: new Date().toISOString()
    };
    if (!payload.name_ar) { setMessage("اكتب اسم القسم بالعربي."); setBusy(false); return; }
    const result = draft.id
      ? await supabase.from("categories").update(payload).eq("id", draft.id).select("id").single()
      : await supabase.from("categories").insert(payload).select("id").single();
    if (result.error) {
      setMessage(result.error.message.includes("categories_slug_key") ? "الرابط المختصر مستخدم بالفعل. غيّره وحاول مرة أخرى." : "لم يتم حفظ القسم: " + result.error.message);
      setBusy(false); return;
    }
    setMessage(draft.id ? "تم حفظ تعديلات القسم." : "تم إنشاء القسم.");
    setDraft(blank); await load(); setBusy(false);
  }

  async function toggle(category: Category) {
    const supabase = createClient(); if (!supabase) return;
    const { error } = await supabase.from("categories").update({ is_active: !(category.is_active ?? false), updated_at: new Date().toISOString() }).eq("id", category.id);
    setMessage(error ? "تعذر تغيير ظهور القسم: " + error.message : ((category.is_active ?? false) ? "تم إخفاء القسم عن المتجر." : "تم إظهار القسم في المتجر."));
    await load();
  }

  async function remove(category: Category) {
    const count = productCounts[category.id] ?? 0;
    if (count > 0) {
      setMessage(`لا يمكن حذف القسم لأنه مرتبط بـ ${count} منتج. انقل المنتجات إلى قسم آخر أولًا، أو أخفِ القسم بدل حذفه.`);
      return;
    }
    if (!window.confirm(`حذف قسم «${category.name_ar}» نهائيًا؟`)) return;
    const supabase = createClient(); if (!supabase) return;
    const { error } = await supabase.from("categories").delete().eq("id", category.id);
    setMessage(error ? "تعذر حذف القسم: " + error.message : "تم حذف القسم.");
    await load();
  }

  async function move(category: Category, direction: -1 | 1) {
    const ordered = [...categories].sort((a,b) => a.sort_order - b.sort_order);
    const index = ordered.findIndex(c => c.id === category.id);
    const other = ordered[index + direction];
    if (!other) return;
    const supabase = createClient(); if (!supabase) return;
    const { error: firstError } = await supabase.from("categories").update({ sort_order: other.sort_order, updated_at: new Date().toISOString() }).eq("id", category.id);
    const { error: secondError } = await supabase.from("categories").update({ sort_order: category.sort_order, updated_at: new Date().toISOString() }).eq("id", other.id);
    setMessage(firstError || secondError ? "تعذر تغيير ترتيب الأقسام. حاول مرة أخرى." : "تم تحديث ترتيب الأقسام.");
    await load();
  }

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return <AdminShell title="إدارة الأقسام" subtitle="أضف الأقسام، غيّر صورها وترتيبها، أو أخفِها عن واجهة المتجر." userEmail={email} onSignOut={signOut}>
    <section className="admin-categories-page">
      <form className="admin-category-form" onSubmit={save}>
        <div className="admin-category-form-head"><div><span>{draft.id ? "تعديل قسم" : "قسم جديد"}</span><h2>{draft.id ? "عدّل بيانات القسم" : "أضف قسمًا للمتجر"}</h2><p>الأقسام النشطة فقط تظهر للعميل، والمنتجات المرتبطة تظل محفوظة عند إخفاء القسم.</p></div>{draft.id && <button type="button" className="admin-category-cancel" onClick={() => setDraft(blank)}>إلغاء التعديل</button>}</div>
        <div className="admin-category-grid">
          <label>اسم القسم بالعربي *<input required maxLength={120} value={draft.name_ar} onChange={e => setDraft(d => ({ ...d, name_ar: e.target.value }))} placeholder="كاميرات المراقبة" /></label>
          <label>اسم القسم بالإنجليزي<input maxLength={120} value={draft.name_en} onChange={e => setDraft(d => ({ ...d, name_en: e.target.value }))} placeholder="Security Cameras" /></label>
          <label>الرابط المختصر (Slug)<input maxLength={120} value={draft.slug} onChange={e => setDraft(d => ({ ...d, slug: e.target.value }))} placeholder="security-cameras" /></label>
          <label>ترتيب الظهور<input required type="number" min="0" step="1" value={draft.sort_order} onChange={e => setDraft(d => ({ ...d, sort_order: e.target.value }))} /></label>
          <label className="admin-category-description">وصف قصير للعميل<textarea rows={3} maxLength={240} value={draft.description_ar} onChange={e => setDraft(d => ({ ...d, description_ar: e.target.value }))} placeholder="وصف يظهر على بطاقة القسم" /></label>
          <label className="admin-category-image-input">رابط صورة القسم<input type="url" value={draft.image_url} onChange={e => setDraft(d => ({ ...d, image_url: e.target.value }))} placeholder="https://..." /><span>أو ارفع صورة من الجهاز</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={uploadImage} /></label>
        </div>
        {draft.image_url && <div className="admin-category-image-preview"><img src={draft.image_url} alt="معاينة صورة القسم" /><button type="button" onClick={() => setDraft(d => ({ ...d, image_url: "" }))}>إزالة الصورة</button></div>}
        <label className="admin-category-active"><input type="checkbox" checked={draft.is_active} onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))} /> نشر القسم في واجهة المتجر</label>
        <div className="admin-category-actions"><button type="submit" disabled={busy || uploading}>{busy ? "جارٍ الحفظ..." : draft.id ? "حفظ تعديلات القسم" : "إنشاء القسم"}</button><span>الحفظ يُحدّث قاعدة البيانات مباشرة.</span></div>
        {message && <p className={message.startsWith("تم") ? "form-success" : "form-error"} role="status">{message}</p>}
      </form>
      <section className="admin-category-list-panel">
        <div className="admin-category-list-head"><div><h2>أقسام المتجر ({categories.length})</h2><p>رتّب الأقسام من الأسهم. الإخفاء لا يحذف القسم أو المنتجات الموجودة فيه.</p></div><div className="admin-category-counts"><span><b>{categories.filter(c => c.is_active).length}</b> ظاهرة</span><span><b>{categories.filter(c => !c.is_active).length}</b> مخفية</span></div></div>
        {loading ? <div className="admin-category-empty">جارٍ تحميل الأقسام...</div> : categories.length === 0 ? <div className="admin-category-empty">مفيش أقسام لسه. أنشئ أول قسم من النموذج بالأعلى.</div> : <div className="admin-category-table-wrap"><table className="admin-category-table"><thead><tr><th>القسم</th><th>المنتجات</th><th>الترتيب</th><th>الحالة</th><th>التحكم</th></tr></thead><tbody>{[...categories].sort((a,b)=>a.sort_order-b.sort_order).map((c,index)=><tr key={c.id}><td><div className="admin-category-product-cell">{c.image_url?<img src={c.image_url} alt="" />:<span className="admin-category-no-image">صورة</span>}<span><b>{c.name_ar}</b><small>{c.slug}</small></span></div></td><td>{productCounts[c.id] ?? 0}</td><td>{c.sort_order}</td><td><span className={c.is_active ? "admin-category-state visible" : "admin-category-state hidden"}>{c.is_active ? "ظاهر" : "مخفي"}</span></td><td><div className="admin-category-row-actions"><button type="button" onClick={() => void move(c,-1)} disabled={index===0} aria-label="تحريك لأعلى">↑</button><button type="button" onClick={() => void move(c,1)} disabled={index===categories.length-1} aria-label="تحريك لأسفل">↓</button><button type="button" onClick={() => edit(c)}>تعديل</button><button type="button" onClick={() => void toggle(c)}>{c.is_active ? "إخفاء" : "إظهار"}</button><button type="button" className="danger" onClick={() => void remove(c)}>حذف</button></div></td></tr>)}</tbody></table></div>}
      </section>
    </section>
  </AdminShell>;
}
