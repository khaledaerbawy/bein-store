"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/admin/admin-shell";

const environmentSettings = [
  { name: "NEXT_PUBLIC_STORE_PHONE", label: "رقم الهاتف", value: process.env.NEXT_PUBLIC_STORE_PHONE },
  { name: "NEXT_PUBLIC_STORE_WHATSAPP", label: "رقم واتساب الطلبات", value: process.env.NEXT_PUBLIC_STORE_WHATSAPP },
  { name: "NEXT_PUBLIC_STORE_ADDRESS", label: "عنوان المتجر", value: process.env.NEXT_PUBLIC_STORE_ADDRESS },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      if (!supabase) { router.replace("/admin/login"); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/admin/login"); return; }
      const { data: role } = await supabase.from("admin_roles").select("is_active").eq("user_id", user.id).maybeSingle();
      if (!role?.is_active) { await supabase.auth.signOut(); router.replace("/admin/login"); return; }
      if (mounted) { setEmail(user.email ?? ""); setChecking(false); }
    })();
    return () => { mounted = false; };
  }, [router]);

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return <AdminShell title="إعدادات المتجر" subtitle="مراجعة إعدادات الاتصال وطريقة نشر الموقع." userEmail={email} onSignOut={signOut}>
    <section className="admin-settings-page">
      {checking ? <div className="empty-state">جارٍ التحقق من الصلاحيات...</div> : <>
        <article className="admin-settings-panel">
          <div className="admin-settings-panel-head"><div><h2>بيانات التواصل</h2><p>القيم الحالية المضمّنة وقت نشر الموقع.</p></div><span>01</span></div>
          <div className="admin-settings-fields">
            {environmentSettings.map(setting => <div className="admin-setting-field" key={setting.name}>
              <div><b>{setting.label}</b><small>{setting.name}</small></div>
              <output>{setting.value?.trim() || "غير مضبوط"}</output>
            </div>)}
          </div>
          <p className="admin-settings-note">تُدار هذه القيم من متغيرات البيئة في Vercel، وليس من المتصفح، حتى لا تُحفظ التغييرات محليًا أو بشكل وهمي. بعد تعديلها في Vercel يلزم نشر جديد حتى تظهر للعملاء.</p>
          <a className="admin-settings-action" href="https://vercel.com/khaledaerbawy1-1561/bein-store/settings/environment-variables" target="_blank" rel="noreferrer">فتح إعدادات المتغيرات في Vercel ↗</a>
        </article>
        <article className="admin-settings-panel">
          <div className="admin-settings-panel-head"><div><h2>الاتصال والخدمات</h2><p>معلومات تشغيل الموقع.</p></div><span>02</span></div>
          <div className="admin-settings-fields">
            <div className="admin-setting-field"><div><b>قاعدة البيانات وتسجيل الدخول</b><small>Supabase</small></div><output className="admin-setting-status">مُعدّة من إعدادات النشر</output></div>
            <div className="admin-setting-field"><div><b>نشر الموقع</b><small>Vercel · فرع main</small></div><output className="admin-setting-status">الإصدارات تُنشر من GitHub</output></div>
            <div className="admin-setting-field"><div><b>صور المنتجات</b><small>Storage bucket: product-images</small></div><output className="admin-setting-status">الرفع للمسؤولين فقط</output></div>
          </div>
          <div className="admin-settings-links"><Link href="/admin/products">إدارة المنتجات ←</Link><Link href="/admin/orders">متابعة الطلبات ←</Link><Link href="/">فتح واجهة المتجر ↗</Link></div>
        </article>
      </>}
    </section>
  </AdminShell>;
}
