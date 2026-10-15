import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SiteBrand from "@/components/site-brand";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bein-store.vercel.app").replace(/\/+$/, "");
const PAGE_URL = SITE_URL + "/services/cameras-6-october";
const TITLE = "كاميرات مراقبة في 6 أكتوبر | بين ستور";
const DESCRIPTION = "بتدور على كاميرات مراقبة أو DVR وNVR أو مستلزمات دش وشبكات في 6 أكتوبر؟ تصفّح كتالوج Bein Store واسأل عن الموديل والسعر والتوافر قبل الطلب.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  openGraph: { type: "website", locale: "ar_EG", siteName: "Bein Store", url: PAGE_URL, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION }
};

export default async function CamerasInOctoberPage() {
  const supabase = await createClient();
  let phone = process.env.NEXT_PUBLIC_STORE_PHONE?.trim() || "";
  let whatsapp = (process.env.NEXT_PUBLIC_STORE_WHATSAPP || "").replace(/\D/g, "");
  let address = process.env.NEXT_PUBLIC_STORE_ADDRESS?.trim() || "";
  if (supabase) {
    const { data } = await supabase.from("store_settings").select("phone,whatsapp,address,show_phone,show_whatsapp,show_address").eq("id", "main").maybeSingle();
    if (data) {
      phone = data.show_phone ? (data.phone || phone) : "";
      whatsapp = data.show_whatsapp ? (data.whatsapp || whatsapp).replace(/\D/g, "") : "";
      address = data.show_address ? (data.address || address) : "";
    }
  }
  const contactMessage = "مرحبًا Bein Store، محتاج أعرف توافر وسعر كاميرات مراقبة أو مستلزمات دش وشبكات في 6 أكتوبر.";
  const contactUrl = whatsapp ? "https://wa.me/" + whatsapp + "?text=" + encodeURIComponent(contactMessage) : "/#contact";
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "كاميرات مراقبة وشبكات في 6 أكتوبر",
    serviceType: ["توريد كاميرات مراقبة", "أجهزة DVR وNVR", "مستلزمات الشبكات"],
    areaServed: [
      { "@type": "City", name: "6th of October City" },
      { "@type": "AdministrativeArea", name: "Giza Governorate" }
    ],
    provider: { "@type": "OnlineStore", name: "Bein Store", url: SITE_URL },
    url: PAGE_URL
  };
  const faqs = [
    { q: "فين أشتري كاميرات مراقبة في 6 أكتوبر؟", a: "تقدر تتصفح كتالوج Bein Store وتشوف الموديلات المتاحة، وبعدها تتواصل مع المتجر لتأكيد السعر والتوافر والتوصيل قبل اعتماد الطلب." },
    { q: "هل أقدر أطلب تركيب كاميرات؟", a: "اسأل المتجر عن خدمة التركيب حسب المنطقة وعدد الكاميرات وطبيعة المكان، لأن التكلفة والتوافر بيتحددوا حسب تفاصيل المشروع." },
    { q: "بدور على بتاع دش في أكتوبر أو مستلزمات دش؟", a: "تواصل مع المتجر باسم القطعة أو الموديل المطلوب عشان نراجع توافر مستلزمات الدش والشبكات قبل الزيارة أو الطلب." },
    { q: "هل السعر الموجود على الموقع نهائي؟", a: "أي منتج موضح عليه سعر مبدئي أو مرجعي يحتاج تأكيد الموديل والسعر والتوافر مع المتجر قبل اعتماد الطلب." }
  ];
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return <main className="subpage" dir="rtl">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema).replace(/</g, "\\u003c") }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
    <header className="subpage-header"><SiteBrand className="brand" /><div className="subpage-header-actions"><Link href="/">الرئيسية</Link><Link className="subpage-cart-link" href="/#catalog">تصفح المنتجات</Link></div></header>
    <section className="section-wrap local-seo-section">
      <span className="section-overline">BEIN STORE · 6 OCTOBER · GIZA</span>
      <h1 className="page-title">كاميرات مراقبة وشبكات في 6 أكتوبر — بين ستور</h1>
      <p>لو بتدور على كاميرات مراقبة في 6 أكتوبر أو الجيزة، Bein Store بيساعدك تتعرف على كاميرات Hikvision وHiLook وDahua وUNV، وأجهزة التسجيل DVR وNVR، والهاردات، وسويتشات PoE وكابلات الشبكات. راجع تفاصيل المنتج والموديل في الكتالوج، واسأل عن التوافق والتوافر قبل الطلب.</p>
      <p>ولو بحثك عن «بتاع دش في أكتوبر» أو مستلزمات دش وشبكات، ابعت اسم القطعة أو صورة الموديل عشان نتأكد من توافرها قبل ما تتحرك أو تطلبها. ما بنفترضش إن كل موديل متاح؛ التأكيد بيكون مع المتجر.</p>
      <div className="hero-actions"><Link className="button button-primary" href="/#catalog">تصفح المنتجات والأسعار</Link><a className="button button-secondary" href={contactUrl} target={whatsapp ? "_blank" : undefined} rel={whatsapp ? "noreferrer" : undefined}>اسأل عن التوافر عبر واتساب</a></div>
      <div className="local-seo-faq">
        <h2>أسئلة شائعة</h2>
        {faqs.map(f => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
      </div>
      <h2>قبل ما تختار نظام المراقبة</h2>
      <p>حدد عدد الكاميرات، وهل التركيب داخلي ولا خارجي، والدقة المطلوبة، والرؤية الليلية وطريقة التسجيل. بعدها نراجع معاك عدد قنوات DVR أو NVR، والتخزين، ومصدر الطاقة، وتوافق سويتش PoE والكابلات. ده بيساعدك تختار مكونات مناسبة بدل شراء أجهزة غير متوافقة.</p>
      <h2>تواصل مع Bein Store</h2>
      <p>للتأكد من السعر النهائي، التوافر، رسوم الشحن أو تفاصيل التركيب، تواصل مع المتجر قبل اعتماد الطلب.</p>
      {phone && <p>الهاتف: <a href={"tel:" + phone.replace(/[^\d+]/g, "")} dir="ltr">{phone}</a></p>}
      {address && <p>العنوان المسجل للمتجر: {address}</p>}
      <p><Link href="/">ارجع إلى الصفحة الرئيسية لـ Bein Store ←</Link></p>
    </section>
  </main>;
}
