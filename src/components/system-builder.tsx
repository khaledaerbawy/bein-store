"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Category, Product } from "@/lib/types";
import { useCart } from "@/components/cart-provider";
import ProductImage from "@/components/product-image";

type Place = "home" | "shop" | "office" | "warehouse";
type Quality = "2MP" | "4MP";
const placeLabels: Record<Place, string> = { home: "منزل / فيلا", shop: "محل تجاري", office: "شركة / مكتب", warehouse: "مصنع / مخزن" };
const money = (value: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(value);

function categorySlug(product: Product, categories: Category[]) {
  return categories.find((category) => category.id === product.category_id)?.slug?.toLowerCase() ?? "";
}
function matches(product: Product, categories: Category[], kind: "camera" | "recorder" | "storage" | "poe" | "cable") {
  const text = [product.name_ar, product.name_en, product.brand, product.model, categorySlug(product, categories)].filter(Boolean).join(" ").toLowerCase();
  const patterns = {
    camera: /كاميرا|camera|cctv|ip-cam|security-cam/,
    recorder: /dvr|nvr|جهاز تسجيل|مسجل|record/,
    storage: /هارد|hard.?disk|hdd|storage|تخزين/,
    poe: /poe|سويتش|switch|شبكات|network/,
    cable: /كابل|كيبل|cable|accessor|إكسسوار|ملحق/
  };
  return patterns[kind].test(text);
}

export default function SystemBuilder({ products, categories, whatsappUrl, showPartnerOffers = true }: { products: Product[]; categories: Category[]; whatsappUrl: string; showPartnerOffers?: boolean }) {
  const [place, setPlace] = useState<Place>("home");
  const [cameraCount, setCameraCount] = useState(8);
  const [days, setDays] = useState(14);
  const [quality, setQuality] = useState<Quality>("2MP");
  const [poe, setPoe] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const { add } = useCart();
  const candidates = useMemo(() => {
    const available = products.filter((product) => product.is_active && Number(product.price_egp) > 0);
    const searchable = (product: Product) => [product.name_ar, product.name_en, product.brand, product.model, JSON.stringify(product.specifications ?? {})].filter(Boolean).join(" ").toLowerCase();
    const readCapacityTb = (product: Product) => {
      const specs = product.specifications ?? {};
      for (const [key, value] of Object.entries(specs)) {
        if (/capacity|storage|سعة|تخزين/i.test(key)) {
          const numeric = Number(value);
          if (Number.isFinite(numeric) && numeric > 0 && numeric <= 100) return numeric;
          const match = String(value).match(/(\d+(?:\.\d+)?)\s*(tb|تيرا)/i);
          if (match) return Number(match[1]);
        }
      }
      const match = searchable(product).match(/(\d+(?:\.\d+)?)\s*(tb|تيرا)/i);
      return match ? Number(match[1]) : null;
    };
    const readChannels = (product: Product) => {
      const specs = product.specifications ?? {};
      for (const [key, value] of Object.entries(specs)) {
        if (/channel|channels|قنوات|عدد الكاميرات/i.test(key)) {
          const numeric = Number(value);
          if (Number.isInteger(numeric) && numeric > 0 && numeric <= 128) return numeric;
        }
      }
      const match = searchable(product).match(/\b(4|8|16|32|64|128)\s*(?:ch|channels?|قناة|قنوات)\b/i);
      return match ? Number(match[1]) : null;
    };
    const readPoePorts = (product: Product) => {
      const text = searchable(product);
      if (!/\bpoe\b|power over ethernet|طاقة عبر الإيثرنت/i.test(text)) return null;
      const match = text.match(/\b(4|5|8|10|16|24|48)\s*(?:port|ports|منفذ|منافذ)\b/i);
      return match ? Number(match[1]) : null;
    };
    const qualityPattern = quality === "2MP" ? /2\s?mp|2\s?ميجا|2ميجا/ : /4\s?mp|4\s?ميجا|4ميجا/;
    const camera = available.find((product) => matches(product, categories, "camera") && qualityPattern.test(searchable(product))) ?? null;
    const recorder = available
      .filter((product) => matches(product, categories, "recorder"))
      .filter((product) => (readChannels(product) ?? 0) >= cameraCount)
      .sort((a, b) => (readChannels(a) ?? Infinity) - (readChannels(b) ?? Infinity))[0] ?? null;
    const storage = available
      .filter((product) => matches(product, categories, "storage"))
      .filter((product) => (readCapacityTb(product) ?? 0) >= storageTb)
      .sort((a, b) => (readCapacityTb(a) ?? Infinity) - (readCapacityTb(b) ?? Infinity))[0] ?? null;
    const poeSwitch = available
      .filter((product) => matches(product, categories, "poe"))
      .filter((product) => (readPoePorts(product) ?? 0) >= cameraCount)[0] ?? null;
    return { camera, recorder, storage, poe: poeSwitch };
  }, [products, categories, quality, cameraCount, storageTb]);
  const storageTb = Math.ceil(cameraCount * (quality === "2MP" ? 0.12 : 0.22) * days / 14 * 2) / 2;
  const parts = [
    candidates.camera ? { key: "camera", title: "كاميرات مراقبة", product: candidates.camera, quantity: cameraCount } : null,
    candidates.recorder ? { key: "recorder", title: "جهاز تسجيل بقنوات كافية", product: candidates.recorder, quantity: 1 } : null,
    candidates.storage ? { key: "storage", title: "هارد بسعة معلومة", product: candidates.storage, quantity: 1 } : null,
    poe && candidates.poe ? { key: "poe", title: "سويتش PoE بعدد منافذ مناسب", product: candidates.poe, quantity: 1 } : null
  ].filter((part): part is { key: string; title: string; product: Product; quantity: number } => Boolean(part));
  const estimate = parts.reduce((sum, part) => sum + Number(part.product.price_egp) * part.quantity, 0);
  const contactHref = whatsappUrl !== "#contact" ? whatsappUrl : "#contact";

  return (
    <section className="system-builder" id="system-builder" aria-labelledby="builder-title">
      <div className="builder-topline">
        <div className="builder-brand"><span className="builder-brand-mark">BS</span><span><b>BEIN STORE</b><small>SYSTEM BUILDER / 01</small></span></div>
        <div className="builder-proof"><span><i /> حلول مراقبة مصممة لاحتياجك</span><span>توافق المكونات يحتاج مراجعة فنية</span></div>
      </div>
      <div className="builder-intro">
        <span className="builder-eyebrow">من الفكرة إلى نظام متكامل</span>
        <h1 id="builder-title">كوّن نظام المراقبة <em>المناسب لك</em></h1>
        <p>حدّد المكان والتغطية ومدة التسجيل، وشوف قائمة مبدئية بالمكونات التي تحتاجها — بدل ما تختار الأجهزة واحدًا واحدًا.</p>
      </div>
      <div className="builder-workspace">
        <div className="builder-scene">
          <div className="scene-grid" />
          <div className="scene-label scene-label-top"><span className="scene-live-dot" /> معاينة توزيع الكاميرات <b>LIVE PLAN</b></div>
          <svg className="floor-plan" viewBox="0 0 660 430" role="img" aria-label="مخطط توضيحي لتوزيع كاميرات المراقبة">
            <defs><linearGradient id="roomFill" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#203a49"/><stop offset="100%" stopColor="#0b1925"/></linearGradient><linearGradient id="roomTop" x1="0" x2="1"><stop offset="0%" stopColor="#405d68"/><stop offset="100%" stopColor="#1d3747"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <g transform="translate(62 52)">
              <path d="M34 92 L285 12 L520 104 L270 193 Z" fill="url(#roomTop)" stroke="#6e8790" strokeWidth="2"/>
              <path d="M34 92 L270 193 L270 322 L34 220 Z" fill="#142a38" stroke="#496775" strokeWidth="2"/>
              <path d="M270 193 L520 104 L520 232 L270 322 Z" fill="#0f2230" stroke="#496775" strokeWidth="2"/>
              <path d="M90 86 L285 28 L455 96 L262 164 Z" fill="#182f3d" stroke="#53717d" strokeWidth="1.5"/>
              <path d="M90 86 L262 164 L262 272 L90 194 Z" fill="#102430" stroke="#3e5c69" strokeWidth="1.5"/>
              <path d="M262 164 L455 96 L455 204 L262 272 Z" fill="#142b39" stroke="#3e5c69" strokeWidth="1.5"/>
              <path d="M118 102 L188 76 L241 98 L171 124 Z" fill="#294454" stroke="#5a7783"/><path d="M119 102 L171 124 L171 174 L119 151 Z" fill="#213b4a" stroke="#496775"/><path d="M171 124 L241 98 L241 149 L171 174 Z" fill="#1b3342" stroke="#496775"/>
              <path d="M298 72 L359 50 L412 71 L351 94 Z" fill="#2c4757" stroke="#5a7783"/><path d="M298 72 L351 94 L351 138 L298 116 Z" fill="#1e3747" stroke="#496775"/><path d="M351 94 L412 71 L412 116 L351 138 Z" fill="#182f3e" stroke="#496775"/>
              <path d="M100 181 L166 209 L166 247 L100 219 Z" fill="#263f4d" stroke="#53717d"/><path d="M312 197 L385 171 L385 211 L312 237 Z" fill="#1f3948" stroke="#53717d"/>
              <g filter="url(#glow)"><path d="M57 80 L133 148 L39 172 Z" fill="#ff6a21" opacity=".15"/><circle cx="57" cy="80" r="13" fill="#ff641f" stroke="#ffb17f" strokeWidth="2"/><circle cx="57" cy="80" r="4" fill="#fff"/>
              <path d="M300 18 L376 86 L282 110 Z" fill="#ff6a21" opacity=".15"/><circle cx="300" cy="18" r="13" fill="#ff641f" stroke="#ffb17f" strokeWidth="2"/><circle cx="300" cy="18" r="4" fill="#fff"/>
              <path d="M490 96 L566 164 L472 188 Z" fill="#ff6a21" opacity=".15"/><circle cx="490" cy="96" r="13" fill="#ff641f" stroke="#ffb17f" strokeWidth="2"/><circle cx="490" cy="96" r="4" fill="#fff"/>
              <path d="M280 185 L356 253 L262 277 Z" fill="#ff6a21" opacity=".15"/><circle cx="280" cy="185" r="13" fill="#ff641f" stroke="#ffb17f" strokeWidth="2"/><circle cx="280" cy="185" r="4" fill="#fff"/>
              <circle cx="68" cy="220" r="13" fill="#ff641f" stroke="#ffb17f" strokeWidth="2"/><circle cx="68" cy="220" r="4" fill="#fff"/><circle cx="510" cy="215" r="13" fill="#ff641f" stroke="#ffb17f" strokeWidth="2"/><circle cx="510" cy="215" r="4" fill="#fff"/>
              <circle cx="190" cy="132" r="13" fill="#ff641f" stroke="#ffb17f" strokeWidth="2"/><circle cx="190" cy="132" r="4" fill="#fff"/><circle cx="412" cy="130" r="13" fill="#ff641f" stroke="#ffb17f" strokeWidth="2"/><circle cx="412" cy="130" r="4" fill="#fff"/></g>
              <text x="130" y="292" fill="#9fb7c1" fontSize="13">ZONE A / داخلي</text><text x="375" y="282" fill="#9fb7c1" fontSize="13">ZONE B / خارجي</text>
            </g>
          </svg>
          <div className="scene-legend"><span><i className="legend-camera" /> نقاط كاميرات مقترحة</span><span><i className="legend-zone" /> مناطق تغطية توضيحية</span></div>
          <div className="scene-count"><b>{cameraCount.toLocaleString("ar-EG")}</b><span>كاميرات مبدئيًا</span></div>
        </div>
        <div className="builder-controls">
          <div className="builder-steps"><span className="active">01 <small>المكان</small></span><i /><span className="active">02 <small>التغطية</small></span><i /><span>03 <small>التسجيل</small></span><i /><span>04 <small>النظام</small></span></div>
          <div className="control-block"><label className="control-title">01 / نوع المكان</label><div className="place-options">
            {(["home","shop","office","warehouse"] as Place[]).map((value) => <button type="button" key={value} className={place === value ? "place-option selected" : "place-option"} onClick={() => setPlace(value)} aria-pressed={place === value}><span className="place-option-icon">{value === "home" ? "⌂" : value === "shop" ? "▤" : value === "office" ? "▥" : "▦"}</span><b>{placeLabels[value]}</b></button>)}
          </div></div>
          <div className="control-block"><div className="control-title-row"><label className="control-title" htmlFor="camera-count">02 / عدد الكاميرات</label><output htmlFor="camera-count" className="control-output">{cameraCount} كاميرات</output></div><input id="camera-count" className="builder-range" type="range" min="2" max="32" step="2" value={cameraCount} onChange={(event) => setCameraCount(Number(event.target.value))} /><div className="range-labels"><span>2 كاميرا</span><span>32 كاميرا</span></div></div>
          <div className="control-block"><label className="control-title">03 / دقة التصوير</label><div className="segmented-options">{(["2MP","4MP"] as Quality[]).map((value) => <button key={value} type="button" onClick={() => setQuality(value)} className={quality === value ? "selected" : ""} aria-pressed={quality === value}>{value}<small>{value === "2MP" ? "استخدام عام" : "تفاصيل أعلى"}</small></button>)}</div></div>
          <div className="control-block"><div className="control-title-row"><label className="control-title" htmlFor="record-days">04 / مدة الاحتفاظ بالتسجيل</label><output htmlFor="record-days" className="control-output">{days} يوم</output></div><input id="record-days" className="builder-range" type="range" min="7" max="28" step="7" value={days} onChange={(event) => setDays(Number(event.target.value))} /><div className="range-labels"><span>7 أيام</span><span>28 يوم</span></div></div>
          <label className="poe-toggle"><span><b>شبكة PoE</b><small>طاقة وبيانات عبر كابل شبكة واحد — إذا كانت الأجهزة متوافقة</small></span><input type="checkbox" checked={poe} onChange={(event) => setPoe(event.target.checked)} /><i /></label>
          <button type="button" className="builder-primary-action" onClick={() => setShowResult(true)}>كوّن النظام المقترح <span>←</span></button>
          <p className="builder-disclaimer">التكوين والحسابات تقديرية للتوجيه الأولي، وليست اعتمادًا فنيًا أو عرض سعر نهائيًا.</p>
        </div>
      </div>
      <div className="builder-result" id="builder-result">
        <div className="result-heading"><div><span className="builder-eyebrow">YOUR SYSTEM / 02</span><h2>{showResult ? "التكوين المقترح لاحتياجك" : "النظام المقترح لك"}</h2><p>{placeLabels[place]} · {cameraCount} كاميرات · تسجيل {days} يومًا · {quality}</p></div><div className="result-storage"><span>تقدير مبدئي للتخزين</span><b>{storageTb.toLocaleString("ar-EG")} TB</b></div></div>
        {showResult && <div className="result-notice">تم تحديث التكوين حسب اختياراتك. {!candidates.camera ? "لم نعثر على كاميرا مسعّرة ومطابقة بوضوح لدقة " + quality + ". " : ""}{!candidates.recorder ? "لم نعثر على جهاز تسجيل موضح بعدد قنوات يكفي عدد الكاميرات المختار. " : ""}{!candidates.storage ? "لم نعثر على هارد بسعة معلومة تكفي مدة التسجيل التقديرية. " : ""}{poe && !candidates.poe ? "لم نعثر على سويتش PoE موضح بعدد منافذ كافٍ. " : ""}الكابلات والتركيب وتوافق الطاقة والتخزين النهائي تحتاج مراجعة فنية قبل اعتماد الطلب.</div>}
        <div className="result-layout"><div className="result-products">
          {parts.length ? parts.map((part) => <article className="result-product" key={part.key}><div className="result-product-image"><ProductImage product={part.product} className="result-product-photo" /></div><div className="result-product-copy"><small>{part.title}</small><Link href={"/products/" + part.product.slug}><b>{part.product.name_ar}</b></Link><span>{part.product.brand ?? "Bein Store"}{part.product.model ? " · " + part.product.model : ""}</span><strong>{money(Number(part.product.price_egp) * part.quantity)}</strong><em>الكمية المقترحة: {part.quantity}</em></div></article>) : <div className="builder-no-products">الكتالوج لا يحتوي حاليًا على منتجات كافية لتكوين قائمة آلية. تواصل مع الفريق لمراجعة احتياجك.</div>}
        </div><aside className="result-summary"><span className="summary-kicker">ESTIMATED CONFIGURATION</span><div className="summary-total-label">إجمالي المنتجات المتاحة المطابقة مبدئيًا</div><strong className="summary-total">{estimate ? money(estimate) : "يحتاج تسعيرًا"}</strong><small>لا يشمل التركيب أو الشحن، ولا يؤكد التوافق أو التوفر.</small><div className="summary-stats"><span><b>{cameraCount}</b><small>كاميرا</small></span><span><b>{storageTb.toLocaleString("ar-EG")} TB</b><small>تخزين تقديري</small></span><span><b>{poe ? (candidates.poe ? "PoE" : "غير مؤكد") : "عادي"}</b><small>الشبكة</small></span></div><button type="button" className="summary-add" disabled={!showResult || !parts.length} onClick={() => parts.forEach((part) => add(part.product, part.quantity))}>إضافة المكونات المتاحة للسلة</button><a className="summary-whatsapp" href={contactHref}>راجع التوافق مع فني ↗</a></aside></div>
      </div>
      {showPartnerOffers &&       <div className="ad-slot" id="ad-space" aria-label="عروض مختارة من شركائنا"><div className="ad-slot-mark">BS<span> / PLUS</span></div><div className="ad-slot-copy"><small>محتوى ترويجي من شركائنا</small><b>عروض مختارة وحلول من علامات موثوقة في عالم المراقبة والشبكات</b><span>اكتشف منتجات وعروضًا قد تساعدك في استكمال نظامك — مع بقاء اختيار المكونات بيدك.</span></div><a href={contactHref}>استكشف العروض <span>↗</span></a></div>}
    </section>
  );
}
