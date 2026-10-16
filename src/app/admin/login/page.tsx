"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SiteBrand from "@/components/site-brand";
import TurnstileWidget from "@/components/turnstile-widget";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileGeneration, setTurnstileGeneration] = useState(0);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    if (turnstileSiteKey && !turnstileToken) {
      setError("أكمل التحقق الأمني قبل تسجيل الدخول.");
      setBusy(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("إعدادات Supabase ناقصة في .env.local");
      setBusy(false);
      return;
    }

    const credentials = turnstileSiteKey
      ? { email, password, options: { captchaToken: turnstileToken } }
      : { email, password };
    const { error: authError } = await supabase.auth.signInWithPassword(credentials);

    if (authError) {
      setError("تعذر تسجيل الدخول. راجع بياناتك وتأكد من إكمال التحقق الأمني.");
      setTurnstileToken("");
      if (turnstileSiteKey) setTurnstileGeneration(value => value + 1);
      setBusy(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const { data: role } = await supabase
      .from("admin_roles")
      .select("role,is_active")
      .eq("user_id", userData.user?.id ?? "")
      .maybeSingle();

    if (!role?.is_active) {
      await supabase.auth.signOut();
      setError("الحساب غير مسموح له بدخول لوحة الإدارة. أضف دوره من Supabase أولًا.");
      setTurnstileToken("");
      if (turnstileSiteKey) setTurnstileGeneration(value => value + 1);
      setBusy(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="subpage">
      <header className="subpage-header">
        <SiteBrand className="brand" />
        <Link href="/">العودة للمتجر</Link>
      </header>
      <section className="login-wrap">
        <form className="checkout-form login-card" onSubmit={submit}>
          <span className="eyebrow">ADMIN ACCESS</span>
          <h1 className="page-title">دخول الإدارة</h1>
          <p className="muted">للمسؤولين المضافين يدويًا في قاعدة البيانات فقط.</p>
          <label>
            البريد الإلكتروني
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" />
          </label>
          <label>
            كلمة المرور
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          {turnstileSiteKey && (
            <TurnstileWidget
              key={turnstileGeneration}
              siteKey={turnstileSiteKey}
              onToken={setTurnstileToken}
            />
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button
            className="button button-primary full-button"
            disabled={busy || Boolean(turnstileSiteKey && !turnstileToken)}
          >
            {busy ? "جارٍ تسجيل الدخول..." : "دخول آمن"}
          </button>
        </form>
      </section>
    </main>
  );
}
