"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Category, Product } from "@/lib/types";
import { priceNoticeFor } from "@/lib/types";
import { useCart } from "@/components/cart-provider";

const formatPrice = (price: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 2 }).format(price);
export default function Storefront({ products, categories, initialQuery = "", initialCategoryId = "all" }: { products: Product[]; categories: Category[]; initialQuery?: string; initialCategoryId?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState(initialCategoryId);
  const { add } = useCart();
  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand).filter((x): x is string => Boolean(x)))).sort((a, b) => a.localeCompare(b, "ar")), [products]);
  const filtered = products.filter((p) => {
    const term = query.trim().toLocaleLowerCase("ar");
    const matches = !term || [p.name_ar, p.name_en, p.brand ?? "", p.model ?? "", p.sku ?? ""].some((v) => v.toLocaleLowerCase("ar").includes(term));
    return matches && (brand === "all" || p.brand === brand) && (category === "all" || p.category_id === category);
  });
  return <>
    {products.some((product) => priceNoticeFor(product.specifications)) && <div className="provisional-price-banner" role="note"><strong>تنبيه بخصوص الأسعار</strong><span>بعض الأسعار مؤقتة أو مرجعية لنسخة قريبة. راجع الملاحظة أسفل سعر المنتج، والسعر النهائي وتوافر الموديل يتأكدان مع المتجر قبل اعتماد الطلب.</span></div>}
    <div className="catalog-tools">
      <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم المنتج أو الموديل أو الكود" aria-label="البحث عن منتج" /></label>
      <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="تصفية حسب القسم"><option value="all">كل الأقسام</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}</select>
      <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="تصفية حسب الماركة"><option value="all">كل الماركات</option>{brands.map((b) => <option key={b} value={b}>{b}</option>)}</select>
      <span className="results-count">{filtered.length} منتج</span>
    </div>
    {filtered.length === 0 ? <div className="empty-state"><div className="empty-symbol">⌕</div><h3>{products.length ? "مفيش نتائج مطابقة" : "الكتالوج جاهز لاستقبال منتجاتك"}</h3><p>{products.length ? "جرّب كلمة بحث مختلفة أو اختار كل الماركات." : "لا توجد منتجات منشورة بسعر معتمد حتى الآن. أضف المنتجات والأسعار الفعلية من لوحة الإدارة."}</p></div> : <div className="product-grid">
      {filtered.map((product) => <article className="product-card" key={product.id}>
        <Link className="product-image" href={`/products/${product.slug}`} aria-label={`عرض ${product.name_ar}`}>
          {product.image_urls?.[0] ? <img src={product.image_urls[0]} alt={product.name_ar} loading="lazy" /> : <div className="image-placeholder">صورة المنتج قيد الإضافة</div>}
          {product.is_featured && <span className="featured-badge">اختيار مميز</span>}
        </Link>
        <div className="product-info"><div className="product-brand">{product.brand ?? "BEIN STORE"}</div><Link href={`/products/${product.slug}`}><h3>{product.name_ar}</h3></Link>
          {product.model && <p className="product-model">الموديل: {product.model}</p>}
          {product.sku && <p className="product-model">كود المنتج: {product.sku}</p>}
          <div className="product-bottom"><strong>{formatPrice(Number(product.price_egp))}</strong><button className="add-cart" onClick={() => add(product)} aria-label={`أضف ${product.name_ar} للسلة`}>+ أضف للسلة</button></div>
          {priceNoticeFor(product.specifications) && <p className="temporary-price-note">{priceNoticeFor(product.specifications)}</p>}
        </div>
      </article>)}
    </div>}
  </>;
}
