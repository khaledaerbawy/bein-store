"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import ProductImage from "@/components/product-image";

const money = (n: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(n);

export default function CartFeedback() {
  const { items, count, subtotal, lastAdded, noticeVersion } = useCart();
  const pathname = usePathname();
  const [dismissedVersion, setDismissedVersion] = useState<number | null>(null);
  const hiddenPage = pathname === "/cart" || pathname.startsWith("/checkout") || pathname.startsWith("/admin");
  if (hiddenPage || !items.length || !lastAdded || dismissedVersion === noticeVersion) return null;
  return <aside className="cart-feedback" role="status" aria-live="polite">
    <div className="cart-feedback-head"><span className="cart-feedback-check" aria-hidden="true">✓</span><div><strong>اتضاف للسلة</strong><small>تقدر تراجع الكمية أو تكمل التسوق</small></div><button className="cart-feedback-close" type="button" aria-label="إخفاء إشعار السلة" onClick={() => setDismissedVersion(noticeVersion)}>×</button></div>
    <div className="cart-feedback-product"><div className="cart-feedback-thumb"><ProductImage product={lastAdded} className="cart-feedback-photo" /></div><div className="cart-feedback-info"><b>{lastAdded.name_ar}</b><small>عدد المنتجات في السلة: {count}</small><strong>{money(Number(lastAdded.price_egp) || 0)}</strong></div><span className="cart-feedback-total">{money(subtotal)}</span></div>
    <div className="cart-feedback-actions"><Link className="cart-feedback-secondary" href="/#catalog" onClick={() => setDismissedVersion(noticeVersion)}>مواصلة التسوق</Link><Link className="cart-feedback-primary" href="/cart">عرض السلة ({count}) <span aria-hidden="true">←</span></Link><Link className="cart-feedback-checkout" href="/checkout">إتمام الطلب</Link></div>
  </aside>;
}
