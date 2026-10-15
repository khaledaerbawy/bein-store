"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Category, Product } from "@/lib/types";
import { useCart } from "@/components/cart-provider";
import ProductImage from "@/components/product-image";

const formatPrice = (price: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 2 }).format(price);
const technicalFields: Array<[string, string]> = [
  ["resolution", "الدقة"],
  ["lens", "العدسة"],
  ["poe", "PoE"],
  ["ir_range_m", "IR"],
  ["protection", "الحماية"],
  ["compression", "Codec"],
  ["capacity", "السعة"],
  ["sensor", "Sensor"],
  ["audio", "Audio"],
  ["type", "النوع"],
];
function getTechnicalSpecs(product: Product): Array<{ label: string; value: string }> {
  return technicalFields
    .map(([key, label]) => {
      const raw = product.specifications?.[key];
      if (typeof raw !== "string" && typeof raw !== "number") return null;
      const value = String(raw).trim();
      return value ? { label, value } : null;
    })
    .filter((field): field is { label: string; value: string } => field !== null)
    .slice(0, 3);
}
export default function Storefront({ products, categories, initialQuery = "", initialCategoryId = "all" }: { products: Product[]; categories: Category[]; initialQuery?: string; initialCategoryId?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState(initialCategoryId);
  const { add, lastAdded } = useCart();
  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand).filter((x): x is string => Boolean(x)))).sort((a, b) => a.localeCompare(b, "ar")), [products]);
  const filtered = products.filter((p) => {
    const term = query.trim().toLocaleLowerCase("ar");
    const matches = !term || [p.name_ar, p.name_en, p.brand ?? "", p.model ?? "", p.sku ?? ""].some((v) => v.toLocaleLowerCase("ar").includes(term));
    return matches && (brand === "all" || p.brand === brand) && (category === "all" || p.category_id === category);
  });
  return <>
    <div className="catalog-tools">
      <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن المنتج أو الموديل" aria-label="البحث عن منتج" /></label>
      <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="تصفية حسب القسم"><option value="all">كل الأقسام</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}</select>
      <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="تصفية حسب الماركة"><option value="all">كل الماركات</option>{brands.map((b) => <option key={b} value={b}>{b}</option>)}</select>
      <span className="results-count">{filtered.length} منتج</span>
    </div>
    {filtered.length === 0 ? <div className="empty-state"><div className="empty-symbol">⌕</div><h3>{products.length ? "مفيش نتائج مطابقة" : "المنتجات غير متاحة حاليًا"}</h3><p>{products.length ? "جرّب كلمة بحث مختلفة أو اختار كل الماركات." : "جرّب تغيير البحث أو اختيار قسم آخر."}</p></div> : <div className="product-grid">
      {filtered.map((product, index) => <article className="product-card" key={product.id} style={{ animationDelay: `${Math.min(index, 12) * 34}ms` }}>
        <Link className="product-image" href={`/products/${product.slug}`} aria-label={`عرض ${product.name_ar}`}>
          <ProductImage product={product} className="catalog-photo" />
          {product.is_featured && <span className="featured-badge">اختيار مميز</span>}
        </Link>
        <div className="product-info"><div className="product-brand">{product.brand ?? "BEIN STORE"}</div><Link href={`/products/${product.slug}`}><h3>{product.name_ar}</h3></Link>
          {product.model && <p className="product-model">الموديل: <b dir="ltr">{product.model}</b></p>}
          <div className="product-bottom"><strong>{formatPrice(Number(product.price_egp))}</strong><button type="button" className={`add-cart ${lastAdded?.id === product.id ? "is-added" : ""}`} onClick={() => add(product)} aria-label={`أضف ${product.name_ar} للسلة`} aria-pressed={lastAdded?.id === product.id}>{lastAdded?.id === product.id ? "✓ تمت الإضافة" : "+ أضف للسلة"}</button></div>
        </div>
      </article>)}
    </div>}
  </>;
}
