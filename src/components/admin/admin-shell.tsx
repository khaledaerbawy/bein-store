"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdminShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  userEmail?: string;
  onSignOut?: () => void;
};
const links = [
  { href: "/admin", label: "نظرة عامة", icon: "⌂" },
  { href: "/admin/products", label: "المنتجات والأسعار", icon: "▦" },
  { href: "/admin/categories", label: "الأقسام", icon: "▧" },
  { href: "/admin/brands", label: "الماركات", icon: "◇" },
  { href: "/admin/inventory", label: "المخزون وحركاته", icon: "▥" },
  { href: "/admin/orders", label: "الطلبات", icon: "▤" },
  { href: "/admin/settings", label: "هوية ومحتوى الموقع", icon: "⚙" },
];
export default function AdminShell({ children, title, subtitle, userEmail, onSignOut }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  async function handleSignOut() {
    if (onSignOut) { await onSignOut(); return; }
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }
  return (
    <div className="admin-shell-root" dir="rtl">
      <aside className="admin-shell-sidebar">
        <Link href="/admin" className="admin-shell-brand">
          <span className="admin-shell-logo">B<span>.</span></span>
          <span className="admin-shell-wordmark">BEIN <b>STORE</b><small>SECURITY SYSTEMS</small></span>
        </Link>
        <div className="admin-shell-workspace">
          <span className="admin-shell-workspace-icon">B</span>
          <span><b>Bein Store</b><small>مساحة الإدارة</small></span>
          <span className="admin-shell-chevron">⌄</span>
        </div>
        <div className="admin-shell-nav-label">القائمة الرئيسية</div>
        <nav className="admin-shell-nav" aria-label="قائمة لوحة الإدارة">
          {links.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={active ? "admin-shell-nav-link active" : "admin-shell-nav-link"}>
              <span className="admin-shell-nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
              {item.href === "/admin/orders" && <span className="admin-shell-nav-arrow">←</span>}
            </Link>;
          })}
        </nav>
        <Link href="/" className="admin-shell-store-link"><span>↗</span> عرض المتجر</Link>
        <div className="admin-shell-sidebar-bottom">
          <div className="admin-shell-help"><span className="admin-shell-help-icon">✦</span><b>محتاج مساعدة؟</b><p>تقدر تراجع بيانات المتجر وإدارة المنتجات والطلبات من هنا.</p><Link href="/admin/settings">إعدادات المتجر ←</Link></div>
          <div className="admin-shell-profile"><span className="admin-shell-avatar">هـ</span><span className="admin-shell-profile-text"><b>مسؤول المتجر</b><small>{userEmail || "صلاحيات الإدارة"}</small></span><button className="admin-shell-signout" onClick={() => void handleSignOut()} aria-label="تسجيل الخروج" title="تسجيل الخروج">↗</button></div>
        </div>
      </aside>
      <div className="admin-shell-main">
        <header className="admin-shell-topbar">
          <div className="admin-shell-topbar-title"><div className="admin-shell-breadcrumb">Bein Store <span>›</span> الإدارة <span>›</span> <b>{title}</b></div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
          <div className="admin-shell-topbar-actions"><span className="admin-shell-live"><i/> المتجر متصل</span><Link href="/" className="admin-shell-preview">↗ <span>معاينة المتجر</span></Link><span className="admin-shell-top-avatar">هـ</span></div>
        </header>
        <main className="admin-shell-content">{children}</main>
        <footer className="admin-shell-footer"><span>© {new Date().getFullYear()} Bein Store</span><span>لوحة إدارة المتجر · كاميرات مراقبة وشبكات</span></footer>
      </div>
    </div>
  );
}
