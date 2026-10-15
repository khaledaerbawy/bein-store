import Link from "next/link";

export default function SocialAutomationPage() {
  return <main dir="rtl" style={{ maxWidth: 900, margin: "48px auto", padding: 24, fontFamily: "Arial,sans-serif", color: "#15201d" }}>
    <p style={{ color: "#47715b", fontWeight: 800 }}>BEIN STORE · SOCIAL</p>
    <h1>أتمتة صفحات فيسبوك</h1>
    <p style={{ lineHeight: 1.9 }}>خطة مجانية لتشغيل 3 صفحات، 3 منشورات لكل صفحة يوميًا، بصور PNG مصممة آليًا ونصوص عربية جاهزة. لا يوجد توليد AI مدفوع أو اشتراك.</p>
    <section style={{ padding: 20, background: "#f1f6fa", borderRadius: 14, lineHeight: 2 }}>
      <b>قبل التفعيل</b><br/>يلزم ضبط صلاحيات Meta Graph API وإضافة Page IDs وPage Access Tokens في GitHub Actions Secrets. لن يتم نشر أي شيء قبل إعداد هذه المفاتيح وتفعيل الأتمتة.
    </section>
    <p><Link href="/admin">العودة إلى لوحة المتجر</Link></p>
  </main>;
}
