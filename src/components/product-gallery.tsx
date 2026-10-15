"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import ProductImage from "@/components/product-image";

export default function ProductGallery({ product }: { product: Product }) {
  const images = (product.image_urls ?? []).filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const active = images[activeIndex];

  return <div className="detail-gallery">
    <div className="detail-image">
      {active && !failed
        ? <img className="detail-photo" src={active} alt={product.name_ar + " - صورة " + (activeIndex + 1)} onError={() => setFailed(true)} />
        : <ProductImage product={{ ...product, image_urls: [] }} className="detail-photo" showNote />}
    </div>
    {images.length > 1 && <div className="detail-thumbnails" role="group" aria-label="صور المنتج">
      {images.map((url, index) => <button type="button" className={index === activeIndex ? "detail-thumbnail active" : "detail-thumbnail"} key={url + index} aria-label={"عرض الصورة " + (index + 1)} aria-pressed={index === activeIndex} onClick={() => { setActiveIndex(index); setFailed(false); }}>
        <img src={url} alt="" loading="lazy" />
      </button>)}
    </div>}
  </div>;
}
