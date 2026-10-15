"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function checkUser() {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/admin/login");
        return;
      }
      const { data: role } = await supabase
        .from("admin_roles")
        .select("is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!role?.is_active) {
        await supabase.auth.signOut();
        router.push("/admin/login");
        return;
      }
      setEmail(user.email ?? "");
      setLoading(false);
    }
    checkUser();
  }, [router]);

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>جاري التحميل...</div>;

  const navItems = [
    { label: "نظرة عامة", href: "/admin", icon: "📊" },
    { label: "المنتجات", href: "/admin/products", icon: "📦" },
    { label: "الطلبات", href: "/admin/orders", icon: "🛒" },
    { label: "الإعدادات", href: "/admin/settings", icon: "⚙️" },
  ];

  return (
    <div className="admin-container" dir="rtl" style={{ display: 'flex', minHeight: '100vh', background: '#f7f8f5' }}>
      <aside className="admin-sidebar" style={{ width: '260px', background: '#15201d', color: 'white', display: 'flex', flexShrink: 0, flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link href="/" className="brand">
            <span className="brand-mark">B</span>
            <span>Bein <b>Store</b></span>
          </Link>
        </div>
        <nav style={{ flex: 1, padding: '20px 0' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 24px',
                color: pathname === item.href ? '#15201d' : '#b3c1b3',
                background: pathname === item.href ? '#b9f36b' : 'transparent',
                fontWeight: pathname === item.href ? 'bold' : 'normal',
                textDecoration: 'none'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '12px', color: '#6c7772', marginBottom: '10px', wordBreak: 'break-all' }}>{email}</div>
          <button
            onClick={signOut}
            style={{
              width: '100%',
              padding: '8px',
              background: 'transparent',
              border: '1px solid #6c7772',
              color: '#6c7772',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: '70px', background: 'white', borderBottom: '1px solid #e2e7e1', display: 'flex', alignItems: 'center', padding: '0 32px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{navItems.find(i => i.href === pathname)?.label || "لوحة الإدارة"}</h1>
        </header>
        <div style={{ padding: '32px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
