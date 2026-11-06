"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Product = {
  id: string; slug: string; name_ar: string; name_en?: string | null; brand: string | null; model: string | null;
  price_egp: number; image_urls: string[] | null; category_slug: string | null;
  specifications: Record<string, unknown> | null;
};
type Kind = "camera" | "recorder" | "storage" | "poe" | "cable";
const labels: Record<Kind,string> = { camera:"الكاميرات", recorder:"جهاز التسجيل", storage:"الهارد", poe:"سويتش الشبكة / PoE", cable:"الكابلات والإكسسوارات" };
const patterns: Record<Kind,RegExp> = {
  camera:/كاميرا|camera|cctv|security cam|ip cam/i,
  recorder:/dvr|nvr|جهاز تسجيل|مسجل|recorder/i,
  storage:/هارد|hard.?disk|hdd|storage|تخزين/i,
  poe:/poe|سويتش|switch|network/i,
  cable:/كابل|كيبل|cable|accessor|إكسسوار|ملحق/i
};
const money = (n:number) => new Intl.NumberFormat("ar-EG",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(n);
const positions = [[9,12],[91,12],[9,88],[91,88],[50,7],[50,93],[7,50],[93,50],[28,7],[72,7],[28,93],[72,93],[7,28],[93,28],[7,72],[93,72],[36,18],[64,18],[36,82],[64,82],[18,36],[82,36],[18,64],[82,64],[50,30],[50,70],[30,50],[70,50],[42,42],[58,42],[42,58],[58,58]];
function capacity(p:Product) {
 const all=[p.name_ar,p.name_en,p.model,JSON.stringify(p.specifications??{})].filter(Boolean).join(" ");
 const m=all.match(/(4|8|16|32|64|128)\s*(?:ch|channel|قناة|قنوات)/i);
 return m?Number(m[1]):null;
}
export default function SystemCostBuilder({products}:{products:Product[]}) {
 const [place,setPlace]=useState("منزل / فيلا");
 const [count,setCount]=useState(8);
 const [quality,setQuality]=useState("2MP");
 const [days,setDays]=useState(14);
 const [poe,setPoe]=useState(true);
 const [selected,setSelected]=useState<Record<Kind,string>>({camera:"",recorder:"",storage:"",poe:"",cable:""});
 const [install,setInstall]=useState("250");
 const [cableMeters,setCableMeters]=useState("100");
 const [showDetails,setShowDetails]=useState(false);
 const choices=useMemo(()=>Object.fromEntries((Object.keys(patterns) as Kind[]).map(k=>[k,products.filter(p=>patterns[k].test([p.name_ar,p.brand,p.model,p.category_slug,JSON.stringify(p.specifications??{})].filter(Boolean).join(" ")))])) as Record<Kind,Product[]>,[products]);
 const chosen=(kind:Kind)=>products.find(p=>p.id===selected[kind])??null;
 const storageTb=Math.ceil(count*(quality==="2MP"?.12:quality==="4MP"?.22)*days/14*2)/2;
 const recorder=chosen("recorder");
 const channelCount=recorder?capacity(recorder):null;
 const compatibleRecorder=!recorder||!channelCount||channelCount>=count;
 const lines=(["camera","recorder","storage",...(poe?["poe" as Kind]:[]),"cable"] as Kind[]).map(kind=>({kind,product:chosen(kind),qty:kind==="camera"?count:kind==="cable"?Number(cableMeters)||0:1})).filter(x=>x.product&&x.qty>0);
 const equipment=lines.reduce((s,x)=>s+x.product!.price_egp*x.qty,0);
 const installation=Math.max(0,Number(install)||0)*count;
 const total=equipment+installation;
 const missing=(["camera","recorder","storage",...(poe?["poe" as Kind]:[])] as Kind[]).filter(k=>!chosen(k));
 const quote=["Bein Store — طلب مراجعة نظام مراقبة", "المكان: "+place,"عدد الكاميرات: "+count,"الدقة: "+quality,"مدة التسجيل: "+days+" يوم","التخزين التقديري: "+storageTb+" TB",...lines.map(x=>labels[x.kind]+": "+x.product!.name_ar+" × "+x.qty+" = "+money(x.product!.price_egp*x.qty)),"التركيب التقديري: "+money(installation),"الإجمالي التقديري: "+money(total),"يرجى مراجعة التوافق والتوافر والسعر النهائي."].join("\n");
 const whatsapp="https://wa.me/?text="+encodeURIComponent(quote);
 return <main className="sys-builder" dir="rtl">
  <header className="sb-top"><Link href="/">BEIN STORE <i> / SYSTEMS</i></Link><Link href="/system-planner">الحاسبة الفنية المتقدمة ↗</Link></header>
  <section className="sb-hero"><div className="sb-kicker"><span/> SYSTEM CONFIGURATOR / 01</div><h1>ابنِ نظام المراقبة<br/><em>على مقاس مكانك.</em></h1><p>اختار احتياجك، وزّع الكاميرات على المخطط، وشوف المكونات والتكلفة بتتحدث لحظيًا من أسعار منتجات المتجر الفعلية.</p><div className="sb-hero-meta"><span>01 — صمّم</span><span>02 — اختار الأجهزة</span><span>03 — احسب التكلفة</span></div></section>
  <section className="sb-layout">
   <div className="sb-controls">
    <div className="sb-title"><b>01</b><div><h2>حدّد احتياجك</h2><p>غيّر الاختيارات وشاهد تأثيرها فورًا</p></div></div>
    <label className="sb-label">نوع المكان<select value={place} onChange={e=>setPlace(e.target.value)}>{["منزل / فيلا","محل تجاري","شركة / مكتب","مخزن / مصنع"].map(x=><option key={x}>{x}</option>)}</select></label>
    <div className="sb-control"><div><label htmlFor="sb-count">عدد الكاميرات</label><strong>{count} كاميرات</strong></div><input id="sb-count" type="range" min="2" max="32" step="1" value={count} onChange={e=>setCount(Number(e.target.value))}/><small>2 كاميرا <span>32 كاميرا</span></small></div>
    <div className="sb-choice"><span>دقة التصوير</span><div>{["2MP","4MP","5MP","8MP"].map(x=><button type="button" className={quality===x?"active":""} onClick={()=>setQuality(x)} key={x}>{x}</button>)}</div></div>
    <div className="sb-control"><div><label htmlFor="sb-days">مدة الاحتفاظ بالتسجيل</label><strong>{days} يوم</strong></div><input id="sb-days" type="range" min="7" max="90" step="1" value={days} onChange={e=>setDays(Number(e.target.value))}/><small>7 أيام <span>90 يوم</span></small></div>
    <label className="sb-toggle"><span><b>استخدام شبكة PoE</b><small>توصيل الطاقة والبيانات عبر كابل شبكة واحد</small></span><input type="checkbox" checked={poe} onChange={e=>setPoe(e.target.checked)}/></label>
    <div className="sb-title sb-subtitle"><b>02</b><div><h2>اختار مكونات النظام</h2><p>الأسعار مأخوذة من كتالوج Bein Store</p></div></div>
    {(["camera","recorder","storage",...(poe?["poe" as Kind]:[]),"cable"] as Kind[]).map(kind=><label className="sb-label" key={kind}>{labels[kind]}<select value={selected[kind]??""} onChange={e=>setSelected(s=>({...s,[kind]:e.target.value}))}><option value="">اختار المنتج (اختياري)</option>{choices[kind].map(p=><option value={p.id} key={p.id}>{p.name_ar} — {money(p.price_egp)}</option>)}</select></label>)}
    <div className="sb-fields"><label className="sb-label">أمتار الكابل<input type="number" min="0" max="5000" value={cableMeters} onChange={e=>setCableMeters(e.target.value)}/></label><label className="sb-label">سعر التركيب للكاميرا<input type="number" min="0" value={install} onChange={e=>setInstall(e.target.value)}/></label></div>
    {recorder&&!compatibleRecorder&&<p className="sb-warning">تنبيه: الجهاز المختار موضح أنه يدعم {channelCount} قناة فقط، وعدد الكاميرات المختار {count}. راجع جهازًا أكبر.</p>}
    {missing.length>0&&<p className="sb-note">لم تختر بعد: {missing.map(k=>labels[k]).join("، ")}. الإجمالي الحالي يشمل المكونات المختارة فقط.</p>}
   </div>
   <aside className="sb-preview">
    <div className="sb-preview-head"><span>LIVE LAYOUT / {place}</span><b><i/> DESIGN PREVIEW</b></div>
    <div className="sb-floor"><div className="sb-room"><div className="sb-room-inner"><span className="sb-zone zone-a">ZONE A</span><span className="sb-zone zone-b">ZONE B</span>{positions.slice(0,count).map(([x,y],i)=><span className="sb-cam" key={i} style={{left:x+"%",top:y+"%",animationDelay:(i*55)+"ms"}}><i/></span>)}</div></div><div className="sb-floor-caption"><span>توزيع توضيحي — وليس مخططًا هندسيًا</span><b>{count.toLocaleString("ar-EG")} CAMS</b></div></div>
    <div className="sb-stat-grid"><div><small>عدد الكاميرات</small><b>{count}</b></div><div><small>التخزين التقديري</small><b>{storageTb} TB</b></div><div><small>الاحتفاظ</small><b>{days} يوم</b></div><div><small>الدقة</small><b>{quality}</b></div></div>
    <div className="sb-total"><small>إجمالي المكونات المختارة + التركيب</small><strong>{money(total)}</strong><span>تقدير مبدئي بالجنيه المصري</span></div>
    <button className="sb-details" onClick={()=>setShowDetails(v=>!v)} type="button">{showDetails?"إخفاء التفاصيل":"عرض تفاصيل التكلفة"} <span>⌄</span></button>
    {showDetails&&<div className="sb-breakdown">{lines.map(x=><div key={x.kind}><span>{labels[x.kind]} × {x.qty}</span><b>{money(x.product!.price_egp*x.qty)}</b></div>)}<div><span>التركيب × {count}</span><b>{money(installation)}</b></div><div className="sb-break-total"><span>الإجمالي</span><b>{money(total)}</b></div></div>}
    <a className="sb-whatsapp" href={whatsapp} target="_blank" rel="noreferrer">اطلب مراجعة التصميم على واتساب ↗</a>
    <p className="sb-footnote">المخطط للتوضيح فقط. حساب التخزين تقريبي، وأسعار الكابلات والتركيب المدخلة قابلة للتعديل. التوافق والتوافر والسعر النهائي يحتاجوا تأكيد من فريق Bein Store.</p>
   </aside>
  </section>
  <footer className="sb-footer">BEIN STORE <span>SECURITY SYSTEMS / DESIGNED AROUND YOUR NEEDS</span><Link href="/">العودة للمتجر ↑</Link></footer>
 </main>;
}
