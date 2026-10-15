"use client";
import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import { createClient } from "@/lib/supabase/client";

type Settings = { id: number; enabled: boolean; brand_name: string };
type Log = { id: string; page_label: string; topic_key: string; status: string; error_message: string | null; created_at: string; published_at: string | null; meta_post_id: string | null };

export default function SocialAutomationPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const db = createClient();
    if (!db) { setError("إعدادات Supabase غير مكتملة."); return; }
    const [s, l] = await Promise.all([
      db.from("social_automation_settings").select("id,enabled,brand_name").eq("id", 1).maybeSingle(),
      db.from("social_publish_logs").select("id,page_label,topic_key,status,error_message,created_at,published_at,meta_post_id").order("created_at", { ascending: false }).limit(30)
    ]);
    if (s.error) setError("طبّق migration الخاصة بالأتمتة على Supabase أولًا.");
    else setSettings(s.data as Settings | null);
    if (l.error) setError((e) => e || "تعذر قراءة سجل النشر.");
    else setLogs((l.data || []) as Log[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function toggle() {
    if (!settings) return;
    const db = createClient(); if (!db) return;
    setBusy(true); setError("");
    const { data } = await db.auth.getUser();
    const { error: e } = await db.from("social_automation_settings").update({ enabled: !settings.enabled, updated_by: data.user?.id ?? null, updated_at: new Date().toISOString() }).eq("id", 1);
    if (e) setError("تعذر حفظ الحالة. تأكد من تسجيل الدخول كمسؤول وتطبيق migration.");
    else setSettings({ ...settings, enabled: !settings.enabled });
    setBusy(false);
  }
  const published = logs.filter((x) => x.status === "published").length;
  const failed = logs.filter((x) => x.status === "failed").length;
  return <AdminLayout><main dir="rtl" style={{ maxWidth: 1100, margin: "0 auto", color: "#15201d" }}>
    <p style={{ color: "#47715b", fontWeight: 800 }}>BEIN STORE · SOCIAL</p>
    <h2 style={{ fontSize: 30, margin: "8px 0" }}>أتمتة صفحات فيسبوك</h2>
    <p style={{ lineHeight: 1.9, color: "#607168" }}>3 صفحات · 3 منشورات لكل صفحة يوميًا · 9 منشورات يوميًا. الصور قوالب PNG تُرسم في السحابة والنصوص عربية جاهزة، دون API مدفوع أو الاعتماد على جهازك.</p>
    {error && <p role="alert" style={{ padding: 14, background: "#fff0ed", color: "#a33122", borderRadius: 12 }}>{error}</p>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, margin: "20px 0" }}>
      {[["الصفحات المستهدفة","3"],["منشورات يوميًا","9"],["تم النشر في السجل",String(published)],["محاولات فاشلة",String(failed)]].map(([k,v]) => <section key={k} style={{ padding: 20, border: "1px solid #e4ebe5", borderRadius: 16, background: "#fff" }}><div style={{ color: "#65756b" }}>{k}</div><strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{v}</strong></section>)}
    </div>
    <section style={{ padding: 22, background: "#fff", border: "1px solid #e4ebe5", borderRadius: 16 }}>
      <h3 style={{ marginTop: 0 }}>حالة الأتمتة</h3>
      <p style={{ color: "#607168", lineHeight: 1.8 }}>ثلاث تشغيلات سحابية يوميًا. كل تشغيل ينشر منشورًا واحدًا على كل صفحة مجهزة.</p>
      <p><b>{settings?.enabled ? "الحالة: مفعّلة" : "الحالة: متوقفة"}</b></p>
      <button disabled={!settings || busy} onClick={() => void toggle()} style={{ padding: "12px 18px", border: 0, borderRadius: 10, background: settings?.enabled ? "#26372f" : "#b9f36b", color: settings?.enabled ? "#fff" : "#15201d", fontWeight: 800, cursor: "pointer" }}>{busy ? "جارٍ الحفظ..." : settings?.enabled ? "إيقاف الأتمتة" : "تفعيل الأتمتة"}</button>
      <button onClick={() => void load()} style={{ marginInlineStart: 10, padding: "12px 18px", border: "1px solid #d4ddd6", borderRadius: 10, background: "#fff", cursor: "pointer" }}>تحديث السجل</button>
      <p style={{ color: "#8b5b16", lineHeight: 1.8, fontSize: 13 }}>لا تفعّلها قبل إضافة معرفات الصفحات وPage Access Tokens في GitHub Secrets وتجربة تشغيل يدوي. لا تشارك المفاتيح السرية.</p>
    </section>
    <section style={{ marginTop: 20, background: "#fff", border: "1px solid #e4ebe5", borderRadius: 16, overflow: "hidden" }}>
      <h3 style={{ padding: "0 20px" }}>آخر 30 محاولة نشر</h3>
      {logs.length === 0 ? <p style={{ padding: 20, color: "#607168" }}>لا يوجد سجل حتى الآن أو لم تُطبق قاعدة البيانات.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}><thead><tr>{["الصفحة","الموضوع","الحالة","الوقت","الخطأ / المعرف"].map((x) => <th key={x} style={{ padding: 12, textAlign: "right", background: "#f7faf7" }}>{x}</th>)}</tr></thead><tbody>{logs.map((x) => <tr key={x.id} style={{ borderTop: "1px solid #edf1ed" }}><td style={{ padding: 12 }}>{x.page_label}</td><td style={{ padding: 12 }}>{x.topic_key}</td><td style={{ padding: 12 }}>{x.status}</td><td style={{ padding: 12, whiteSpace: "nowrap" }}>{new Date(x.published_at || x.created_at).toLocaleString("ar-EG")}</td><td style={{ padding: 12, maxWidth: 300, overflowWrap: "anywhere" }}>{x.error_message || x.meta_post_id || "—"}</td></tr>)}</tbody></table></div>}
    </section>
  </main></AdminLayout>;
}
