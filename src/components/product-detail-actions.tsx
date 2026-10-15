"use client";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { useCart } from "@/components/cart-provider";
export default function ProductDetailActions({ product }: { product: Product }) {
  const { add, lastAdded } = useCart();
  const storeWhatsapp = (process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? "").replace(/\D/g, "");
  const message = `استفسار عن المنتج: ${product.name_ar}${product.model ? ` - ${product.model}` : ""}`;
  const added = lastAdded?.id === product.id;
  return <div className="detail-actions">
    <button type="button" className={`button button-primary ${added ? "is-added" : ""}`} onClick={() => add(product)} aria-pressed={added}>{added ? "✓ تمت الإضافة للسلة" : "أضف للسلة"}</button>
    <Link className="button button-secondary" href="/cart">عرض السلة</Link>
    {storeWhatsapp && <a className="button button-secondary" href={`https://wa.me/${storeWhatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">اسأل على واتساب</a>}
  </div>;
}
