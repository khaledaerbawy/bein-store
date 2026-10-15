import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import CartFeedback from "@/components/cart-feedback";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      title: "Bein Store | كاميرات المراقبة والشبكات",
      description: "متجر Bein Store لكاميرات المراقبة وأجهزة التسجيل والشبكات."
    };
  }
  const { data } = await supabase.from("store_settings").select("store_name,page_title,meta_description,favicon_url").eq("id", "main").maybeSingle();
  const title = data?.page_title?.trim() || data?.store_name || "Bein Store | كاميرات المراقبة والشبكات";
  const result: Metadata = {
    title,
    description: data?.meta_description || "متجر Bein Store لكاميرات المراقبة وأجهزة التسجيل والشبكات."
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
