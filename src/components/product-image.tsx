"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";

function localFallback(slug: string): string {
  if (/ptz/.test(slug)) return "/products/camera-ptz.svg";
  if (/dome|turret/.test(slug)) return "/products/camera-dome.svg";
  if (/camera|bullet/.test(slug)) return "/products/camera-bullet.svg";
  if (/dvr|nvr|recorder/.test(slug)) return "/products/recorder.svg";
  if (/switch|ethernet/.test(slug)) return "/products/switch.svg";
  if (/hdd|hard-disk|storage/.test(slug)) return "/products/hdd.svg";
  if (/power-supply/.test(slug)) return "/products/power-supply.svg";
  if (/bnc|connector/.test(slug)) return "/products/connector.svg";
  if (/cable/.test(slug)) return "/products/cable.svg";
  if (/mount|junction/.test(slug)) return "/products/junction-box.svg";
  if (/rack/.test(slug)) return "/products/rack.svg";
  if (/hdmi/.test(slug)) return "/products/hdmi-extender.svg";
  if (/install/.test(slug)) return "/products/installation.svg";
  return "/products/camera-bullet.svg";
}

export default function ProductImage({ product, className = "product-image-object", showNote = false }: { product: Product; className?: string; showNote?: boolean }) {
  const primary = product.image_urls?.[0] || localFallback(product.slug);
  const [src, setSrc] = useState(primary);
  const [failedRemote, setFailedRemote] = useState(false);
  useEffect(() => { setSrc(primary); setFailedRemote(false); }, [primary]);
  const illustrative = !product.model || Boolean(product.specifications?.image_source_note);
  return <>
    <img className={className} src={src} alt={product.name_ar} loading="lazy" decoding="async" onError={() => { if (!failedRemote && src !== localFallback(product.slug)) { setFailedRemote(true); setSrc(localFallback(product.slug)); } }} />
    {showNote && illustrative && <span className="image-illustrative-note">صورة توضيحية للفئة</span>}
  </>;
}
