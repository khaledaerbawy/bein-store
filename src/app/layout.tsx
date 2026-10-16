import type { Metadata } from "next";

import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import CartFeedback from "@/components/cart-feedback";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bein-store.vercel.app").replace(/\/+$/, "");

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      metadataBase: new URL(SITE_URL),
      title: { default: "Bein Store | بين ستور لكاميرات المراقبة والشبكات", template: "%s" },
      description: "Bein Store (بين ستور) متجر إلكتروني لكاميرات المراقبة وأجهزة DVR وNVR وهيلوك وهيكفيجن والشبكات. تصفح الموديلات واسأل عن السعر والتوافر والتوصيل إلى 6 أكتوبر والجيزة.",
      applicationName: "Bein Store",
      robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
      verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
      openGraph: { type: "website", locale: "ar_EG", url: SITE_URL, siteName: "Bein Store", title: "Bein Store | بين ستور لكاميرات المراقبة والشبكات", description: "كاميرات مراقبة، أجهزة DVR وNVR، هيلوك وهيكفيجن وشبكات ومستلزمات تركيب." },
      twitter: { card: "summary_large_image", title: "Bein Store | بين ستور", description: "كاميرات مراقبة وأجهزة تسجيل وشبكات من Bein Store." }
    };
  }
  const { data } = await supabase.from("store_settings").select("store_name,page_title,meta_description,favicon_url").eq("id", "main").maybeSingle();
  const title = data?.page_title?.trim() || data?.store_name || "Bein Store | كاميرات المراقبة والشبكات";
  const description = data?.meta_description?.trim() || "Bein Store (بين ستور) لكاميرات المراقبة وأجهزة DVR وNVR وهيلوك وهيكفيجن والشبكات ومستلزمات التركيب في 6 أكتوبر، الجيزة، مصر.";
  const result: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: title || "Bein Store | بين ستور لكاميرات المراقبة والشبكات في 6 أكتوبر", template: "%s" },
    description,
    applicationName: data?.store_name || "Bein Store",
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
    openGraph: { type: "website", locale: "ar_EG", url: SITE_URL, siteName: data?.store_name || "Bein Store", title, description },
    twitter: { card: "summary_large_image", title, description }
  };
  if (data?.favicon_url) {
    result.icons = { icon: data.favicon_url, shortcut: data.favicon_url };
  }
  return result;
}

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body><CartProvider>{children}<CartFeedback /></CartProvider></body>
    </html>
  );
}
