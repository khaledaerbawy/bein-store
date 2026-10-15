"use client";
import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    newOrders: 0,
    categories: 0
  });

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      if (!supabase) return;
      
      const [productsRes, ordersRes, categoriesRes, newOrdersRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new")
      ]);

      setStats({
        products: productsRes.count ?? 0,
        orders: ordersRes.count ?? 0,
        categories: categoriesRes.count ?? 0,
        newOrders: newOrdersRes.count ?? 0
      });
    }
    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <div className="stat-card" style={{ background: 'white', padding: '24px', border: '1px solid #e2e7e1', borderRadius: '12px' }}>
          <div style={{ color: '#6c7772', fontSize: '14px', marginBottom: '8px' }}>إجمالي المنتجات</div>
          <div style={{ fontSize: '32px', fontWeight: 900 }}>{stats.products}</div>
          <Link href="/admin/products" style={{ display: 'block', marginTop: '12px', fontSize: '12px', color: '#15201d', fontWeight: 'bold' }}>إدارة المنتجات ←</Link>
        </div>
        <div className="stat-card" style={{ background: 'white', padding: '24px', border: '1px solid #e2e7e1', borderRadius: '12px' }}>
          <div style={{ color: '#6c7772', fontSize: '14px', marginBottom: '8px' }}>إجمالي الطلبات</div>
          <div style={{ fontSize: '32px', fontWeight: 900 }}>{stats.orders}</div>
          <Link href="/admin/orders" style={{ display: 'block', marginTop: '12px', fontSize: '12px', color: '#15201d', fontWeight: 'bold' }}>عرض الطلبات ←</Link>
        </div>
        <div className="stat-card" style={{ background: 'white', padding: '24px', border: '1px solid #e2e7e1', borderRadius: '12px', borderRight: '4px solid #b9f36b' }}>
          <div style={{ color: '#6c7772', fontSize: '14px', marginBottom: '8px' }}>طلبات جديدة</div>
          <div style={{ fontSize: '32px', fontWeight: 900 }}>{stats.newOrders}</div>
          <Link href="/admin/orders?status=new" style={{ display: 'block', marginTop: '12px', fontSize: '12px', color: '#15201d', fontWeight: 'bold' }}>معالجة الطلبات ←</Link>
        </div>
        <div className="stat-card" style={{ background: 'white', padding: '24px', border: '1px solid #e2e7e1', borderRadius: '12px' }}>
          <div style={{ color: '#6c7772', fontSize: '14px', marginBottom: '8px' }}>الأقسام</div>
          <div style={{ fontSize: '32px', fontWeight: 900 }}>{stats.categories}</div>
        </div>
      </div>
      
      <div style={{ marginTop: '32px', background: 'white', padding: '32px', border: '1px solid #e2e7e1', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>مرحباً بك في لوحة تحكم Bein Store</h2>
        <p style={{ color: '#6c7772', lineHeight: '1.8' }}>
          من هنا يمكنك إدارة مخزون المنتجات، متابعة طلبات العملاء وتحديث حالتها، وتعديل إعدادات المتجر وبيانات التواصل.
          استخدم القائمة الجانبية للتنقل بين الأقسام المختلفة.
        </p>
      </div>
    </AdminLayout>
  );
}
