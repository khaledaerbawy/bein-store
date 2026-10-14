import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";

export const metadata: Metadata = {
  title: "Bein Store | كاميرات المراقبة والشبكات",
  description: "متجر Bein Store لكاميرات المراقبة وأجهزة التسجيل والشبكات."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
