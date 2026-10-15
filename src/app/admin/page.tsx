"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/admin/admin-shell";

type RecentOrder = { id: string; order_number: number; customer_name: string; status: string; total_egp: number; created_at: string };
type MetricState = { products: number | null; activeProducts: number | null; pendingOrders: number | null; completedSales: number | null };
const money = (value: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(value) + " ج.م";
const statusLabel: Record<string, string> = { new: "جديد", confirmed: "تم التأكيد", preparing: "قيد التجهيز", shipped: "تم الشحن", completed: "مكتمل", cancelled: "ملغي" };
const statusClass: Record<string, string> = { new: "new", confirmed: "working", preparing: "working", shipped: "shipped", completed: "done", cancelled: "muted" };

export default function AdminHome() {
  const router = useRouter();
  const [status, setStatus] = useState("جارٍ التحقق من الصلاحيات...");
  const [email, setEmail] = useState("");
  const [metrics, setMetrics] = useState<MetricState>({ products: null, activeProducts: null, pendingOrders: null, completedSales: null });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataNotice, setDataNotice] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      if (!supabase) { if (active) setStatus("إعدادات Supabase ناقصة."); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/admin/login"); return; }
      const { data: role } = await supabase.from("admin_roles").select("role,is_active").eq("user_id", user.id).maybeSingle();
      if (!role?.is_active) { await supabase.auth.signOut(); router.replace("/admin/login"); return; }
      if (active) { setEmail(user.email ?? ""); setStatus("تم التحقق من صلاحيات الإدارة"); }
      const [productCount, activeCount, pendingCount, latest, completed] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["new", "confirmed", "preparing"]),
        supabase.from("orders").select("id,order_number,customer_name,status,total_egp,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("orders").select("total_egp").eq("status", "completed")
      ]);
      if (!active) return;
      setMetrics({
        products: productCount.error ? null : productCount.count ?? 0,
        activeProducts: activeCount.error ? null : activeCount.count ?? 0,
        pendingOrders: pendingCount.error ? null : pendingCount.count ?? 0,
        completedSales: completed.error ? null : (completed.data ?? []).reduce((sum, order) => sum + (Number(order.total_egp) || 0), 0)
      });
      if (latest.error) setDataNotice("تعذر تحميل أحدث الطلبات حاليًا. راجع صلاحيات قاعدة البيانات.");
      else setRecentOrders((latest.data ?? []) as RecentOrder[]);
      if ([productCount, activeCount, pendingCount, completed].some(result => result.error)) setDataNotice("بعض مؤشرات المتجر لم تتوفر. راجع صلاحيات القراءة في Supabase.");
      setLoadingData(false);
    })();
    return () => { active = false; };
  }, [router]);

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }
  const number = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("ar-EG").format(value);
  const stats = [
    { label: "إجمالي المنتجات", value: number(metrics.products), note: "كل الأصناف المسجلة", icon: "▦" },
    { label: "منتجات منشورة", value: number(metrics.activeProducts), note: "تظهر في الكتالوج", icon: "◈" },
    { label: "طلبات تحتاج متابعة", value: number(metrics.pendingOrders), note: "جديد أو قيد التجهيز", icon: "▤" },
    { label: "قيمة الطلبات المكتملة", value: metrics.completedSales === null ? "—" : money(metrics.completedSales), note: "إجمالي الطلبات المكتملة", icon: "↗" },
  ];
  return (
    <AdminShell title="لوحة التحكم" subtitle="ملخص موثوق لحركة المتجر والكتالوج والطلبات." userEmail={email} onSignOut={signOut}>
      <section className="admin-dashboard-content">
        <div className="admin-dashboard-welcome">
          <div className="admin-dashboard-welcome-copy">
            <span className="admin-dashboard-overline">BEIN STORE · CONTROL CENTER</span>
            <h2>أهلاً بك في <em>Bein Store</em></h2>
            <p>{status}. تابع الكتالوج والطلبات من مساحة واحدة.</p>
            <div className="admin-dashboard-welcome-actions"><Link href="/admin/products">إدارة المنتجات <span>←</span></Link><Link className="secondary" href="/">معاينة المتجر ↗</Link></div>
          </div>
          <div className="admin-dashboard-art" aria-hidden="true"><div className="admin-dashboard-camera">◉</div></div>
        </div>
        <div className="admin-dashboard-stats">
          {stats.map(stat => <article className="admin-dashboard-stat" key={stat.label}><div className="admin-dashboard-stat-top"><span>{stat.label}</span><span className="admin-dashboard-stat-icon">{stat.icon}</span></div><strong>{loadingData && stat.value === "—" ? "…" : stat.value}</strong><small>{stat.note}</small></article>)}
        </div>
        <div className="admin-dashboard-columns">
          <section className="admin-dashboard-panel">
            <div className="admin-dashboard-panel-heading"><div><h2>أحدث الطلبات</h2><p>آخر الطلبات المسجلة في قاعدة بيانات المتجر</p></div><Link href="/admin/orders">عرض الكل ←</Link></div>
            {loadingData ? <div className="admin-dashboard-empty">جارٍ تحميل الطلبات…</div> : recentOrders.length === 0 ? <div className="admin-dashboard-empty">لا توجد طلبات مسجلة حتى الآن.</div> : <div className="admin-dashboard-table-wrap"><table className="admin-dashboard-table"><thead><tr><th>رقم الطلب</th><th>العميل</th><th>التاريخ</th><th>القيمة</th><th>الحالة</th></tr></thead><tbody>{recentOrders.map(order => <tr key={order.id}><td><b className="admin-dashboard-order-number">#{order.order_number}</b></td><td><b>{order.customer_name}</b></td><td>{new Date(order.created_at).toLocaleDateString("ar-EG")}</td><td><b>{money(Number(order.total_egp) || 0)}</b></td><td><span className={"admin-dashboard-status " + (statusClass[order.status] ?? "muted")}>{statusLabel[order.status] ?? order.status}</span></td></tr>)}</tbody></table></div>}
          </section>
          <section className="admin-dashboard-panel">
            <div className="admin-dashboard-panel-heading"><div><h2>إجراءات سريعة</h2><p>اختصارات للمهام الأساسية</p></div></div>
            <div className="admin-dashboard-shortcuts">
              <Link className="admin-dashboard-shortcut" href="/admin/products"><span className="admin-dashboard-shortcut-icon">＋</span><span><b>إضافة أو تعديل منتج</b><small>الاسم، الصورة، الموديل والسعر</small></span><span>←</span></Link>
              <Link className="admin-dashboard-shortcut" href="/admin/orders"><span className="admin-dashboard-shortcut-icon">▤</span><span><b>مراجعة الطلبات</b><small>متابعة الحالة وتفاصيل العميل</small></span><span>←</span></Link>
              <Link className="admin-dashboard-shortcut" href="/admin/categories"><span className="admin-dashboard-shortcut-icon">▧</span><span><b>إدارة الأقسام</b><small>أضف قسمًا ورتّب ظهوره</small></span><span>←</span></Link>
              <Link className="admin-dashboard-shortcut" href="/admin/brands"><span className="admin-dashboard-shortcut-icon">◇</span><span><b>إدارة الماركات</b><small>الشعارات والترتيب والظهور</small></span><span>←</span></Link>
              <Link className="admin-dashboard-shortcut" href="/admin/inventory"><span className="admin-dashboard-shortcut-icon">▥</span><span><b>المخزون وحركاته</b><small>الكميات والتنبيهات وسجل التعديل</small></span><span>←</span></Link>
              <Link className="admin-dashboard-shortcut" href="/admin/settings"><span className="admin-dashboard-shortcut-icon">⚙</span><span><b>إعدادات المتجر</b><small>معلومات الاتصال والتفضيلات</small></span><span>←</span></Link>
            </div>
          </section>
        </div>
        <div className="admin-dashboard-note"><b>تنبيه:</b><span>السعر النهائي والتوافر يجب تأكيدهما مع العميل قبل اعتماد الطلب. مؤشرات اللوحة أعلاه تُقرأ من قاعدة بيانات المتجر، ولا تستخدم أرقام مبيعات تجريبية.</span></div>
        {dataNotice && <p className="form-error" role="status">{dataNotice}</p>}
      </section>
    </AdminShell>
  );
}
