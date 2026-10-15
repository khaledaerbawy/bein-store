"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/admin/admin-shell";

type ProductRow={id:string;name_ar:string;brand:string|null;model:string|null;sku:string|null;price_egp:number|null;is_active:boolean};
type InventoryRow={product_id:string;quantity_on_hand:number;low_stock_threshold:number;updated_at:string};
type Movement={id:string;product_id:string;quantity_delta:number;reason:string;reference:string|null;created_at:string};
const money=(n:number)=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(n)+" ج.م";
const reasons=[{value:"توريد",label:"توريد / إضافة مخزون"},{value:"تسوية جرد",label:"تسوية جرد"},{value:"تالف أو مرتجع",label:"تالف أو مرتجع"},{value:"تصحيح رصيد",label:"تصحيح رصيد"}];

export default function AdminInventoryPage(){
 const router=useRouter();
 const [email,setEmail]=useState("");
 const [products,setProducts]=useState<ProductRow[]>([]);
 const [inventory,setInventory]=useState<Record<string,InventoryRow>>({});
 const [movements,setMovements]=useState<Movement[]>([]);
 const [quantities,setQuantities]=useState<Record<string,string>>({});
 const [thresholds,setThresholds]=useState<Record<string,string>>({});
 const [reasonsByProduct,setReasonsByProduct]=useState<Record<string,string>>({});
 const [references,setReferences]=useState<Record<string,string>>({});
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState<"all"|"low"|"out"|"untracked">("all");
 const [loading,setLoading]=useState(true);
 const [savingId,setSavingId]=useState("");
 const [message,setMessage]=useState("");

 const load=useCallback(async()=>{
  const s=createClient();if(!s){setMessage("إعدادات Supabase ناقصة.");setLoading(false);return;}
  const {data:{user}}=await s.auth.getUser();if(!user){router.replace("/admin/login");return;}
  const {data:role}=await s.from("admin_roles").select("is_active").eq("user_id",user.id).maybeSingle();
  if(!role?.is_active){await s.auth.signOut();router.replace("/admin/login");return;}
  setEmail(user.email??"");
  const [pr,ir,mr]=await Promise.all([
   s.from("products").select("id,name_ar,brand,model,sku,price_egp,is_active").order("name_ar",{ascending:true}),
   s.from("inventory").select("product_id,quantity_on_hand,low_stock_threshold,updated_at"),
   s.from("inventory_movements").select("id,product_id,quantity_delta,reason,reference,created_at").order("created_at",{ascending:false}).limit(25)
  ]);
  if(pr.error){setMessage("تعذر تحميل المنتجات: "+pr.error.message);setLoading(false);return;}
  if(ir.error){setMessage("تعذر تحميل المخزون: "+ir.error.message);setLoading(false);return;}
  if(mr.error)setMessage("تم تحميل المخزون، لكن تعذر تحميل سجل الحركات: "+mr.error.message);
  const ps=(pr.data??[]) as ProductRow[];
  const inv=(ir.data??[]) as InventoryRow[];
  const nextInv:Record<string,InventoryRow>={};inv.forEach(row=>{nextInv[row.product_id]=row;});
  setProducts(ps);setInventory(nextInv);setMovements((mr.data??[]) as Movement[]);
  setQuantities(old=>{const next={...old};for(const p of ps){if(next[p.id]===undefined)next[p.id]=nextInv[p.id]?String(nextInv[p.id].quantity_on_hand):"";}return next;});
  setThresholds(old=>{const next={...old};for(const p of ps){if(next[p.id]===undefined)next[p.id]=nextInv[p.id]?String(nextInv[p.id].low_stock_threshold):"2";}return next;});
  setLoading(false);
 },[router]);
 useEffect(()=>{void load();},[load]);

 const filtered=useMemo(()=>products.filter(p=>{
  const q=query.trim().toLocaleLowerCase("ar");
  const matches=!q||[p.name_ar,p.brand,p.model,p.sku].filter(Boolean).join(" ").toLocaleLowerCase("ar").includes(q);
  const row=inventory[p.id];
  const matchesFilter=filter==="all"||(filter==="untracked"&&!row)||(filter==="low"&&!!row&&row.quantity_on_hand>0&&row.quantity_on_hand<=row.low_stock_threshold)||(filter==="out"&&!!row&&row.quantity_on_hand===0);
  return matches&&matchesFilter;
 }),[products,inventory,query,filter]);
 const tracked=Object.keys(inventory).length;
 const lowCount=products.filter(p=>inventory[p.id]&&inventory[p.id].quantity_on_hand>0&&inventory[p.id].quantity_on_hand<=inventory[p.id].low_stock_threshold).length;
 const outCount=products.filter(p=>inventory[p.id]?.quantity_on_hand===0).length;

 async function saveStock(p:ProductRow){
  const qtyText=quantities[p.id]??"";
  if(qtyText.trim()===""){setMessage("اكتب الكمية الفعلية الموجودة عندك قبل حفظ المخزون.");return;}
  const qty=Number(qtyText),threshold=Number(thresholds[p.id]??"2");
  if(!Number.isInteger(qty)||qty<0){setMessage("الكمية لازم تكون رقمًا صحيحًا غير سالب.");return;}
  if(!Number.isInteger(threshold)||threshold<0){setMessage("حد التنبيه لازم يكون رقمًا صحيحًا غير سالب.");return;}
  const s=createClient();if(!s)return;
  setSavingId(p.id);setMessage("");
  const {data:{user}}=await s.auth.getUser();
  const {data,error}=await s.rpc("admin_adjust_inventory",{
   p_product_id:p.id,
   p_new_quantity:qty,
   p_low_stock_threshold:threshold,
   p_reason:reasonsByProduct[p.id]??"تصحيح رصيد",
   p_reference:references[p.id]?.trim()||null
  });
  if(error){setMessage("لم يتم حفظ المخزون: "+error.message);setSavingId("");return;}
  const result=Array.isArray(data)?data[0]:data;
  setMessage("تم تحديث مخزون «"+p.name_ar+"» وتسجيل حركة المخزون.");
  setReferences(old=>({...old,[p.id]:""}));
  setSavingId("");
  await load();
 }
 async function signOut(){const s=createClient();await s?.auth.signOut();router.replace("/admin/login");router.refresh();}

 const productById=useMemo(()=>Object.fromEntries(products.map(p=>[p.id,p])),[products]);
 const formatDate=(value:string)=>new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
 const delta=(value:number)=>(value>0?"+":"")+new Intl.NumberFormat("ar-EG").format(value);

 return <AdminShell title="المخزون وحركاته" subtitle="أدخل الكميات الفعلية، وحدد تنبيهات النقص، وراجع سجل كل تعديل على المخزون." userEmail={email} onSignOut={signOut}>
  <div className="admin-inventory-page">
   <div className="admin-inventory-stats">
    <article><small>الأصناف المسجلة</small><b>{products.length}</b><span>كل المنتجات في الكتالوج</span></article>
    <article><small>تتبّع مخزون فعلي</small><b>{tracked}</b><span>من {products.length} منتج</span></article>
    <article className={lowCount?"warning":""}><small>قريبة من النفاد</small><b>{lowCount}</b><span>عند حد التنبيه أو أقل</span></article>
    <article className={outCount?"danger":""}><small>نفدت الكمية</small><b>{outCount}</b><span>رصيد مسجل يساوي صفر</span></article>
   </div>
   <section className="admin-inventory-panel">
    <div className="admin-inventory-toolbar"><div><h2>رصيد المنتجات</h2><p>المخزون غير المسجل يظهر «غير متتبع»، ولا نفترض له كمية صفرية.</p></div><label className="admin-inventory-search">⌕ <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث باسم المنتج أو SKU أو الموديل"/></label></div>
    <div className="admin-inventory-filters">{[{key:"all",label:"كل المنتجات"},{key:"untracked",label:"غير متتبع"},{key:"low",label:"قريبة من النفاد"},{key:"out",label:"نفدت الكمية"}].map(item=><button type="button" key={item.key} className={filter===item.key?"active":""} onClick={()=>setFilter(item.key as typeof filter)}>{item.label}</button>)}</div>
    {message&&<p className={message.startsWith("تم")?"form-success":"form-error"} role="status">{message}</p>}
    {loading?<div className="admin-inventory-empty">جارٍ تحميل المخزون...</div>:filtered.length===0?<div className="admin-inventory-empty">لا توجد منتجات مطابقة للتصفية الحالية.</div>:<div className="admin-inventory-table-wrap"><table className="admin-inventory-table"><thead><tr><th>المنتج</th><th>الكمية الحالية</th><th>حد التنبيه</th><th>الحالة</th><th>التعديل والحفظ</th></tr></thead><tbody>{filtered.map(p=>{
      const row=inventory[p.id];
      const qtyText=quantities[p.id]??"";
      const qty=qtyText.trim()===""?null:Number(qtyText);
      const low=!!row&&row.quantity_on_hand>0&&row.quantity_on_hand<=row.low_stock_threshold;
      const out=!!row&&row.quantity_on_hand===0;
      return <tr key={p.id}>
       <td><div className="admin-inventory-product"><b>{p.name_ar}</b><small>{[p.brand,p.model,p.sku].filter(Boolean).join(" · ")||"بدون موديل أو كود"}</small><small>{p.price_egp==null?"عند الطلب":money(Number(p.price_egp))}</small></div></td>
       <td><strong className={!row?"inventory-untracked":out?"inventory-zero":low?"inventory-low":""}>{row?new Intl.NumberFormat("ar-EG").format(row.quantity_on_hand):"غير متتبع"}</strong></td>
       <td><input aria-label={"حد التنبيه لـ "+p.name_ar} type="number" min="0" step="1" value={thresholds[p.id]??"2"} onChange={e=>setThresholds(old=>({...old,[p.id]:e.target.value}))}/></td>
       <td><span className={"admin-category-state "+(!row?"hidden":out?"hidden":low?"visible":"visible")}>{!row?"غير متتبع":out?"نفد":low?"كمية قليلة":"متوفر"}</span></td>
       <td><div className="admin-inventory-edit">
        <input aria-label={"الكمية الفعلية لـ "+p.name_ar} type="number" min="0" step="1" value={qtyText} placeholder={row?"كمية جديدة":"اكتب الرصيد الفعلي"} onChange={e=>setQuantities(old=>({...old,[p.id]:e.target.value}))}/>
        <select aria-label="سبب الحركة" value={reasonsByProduct[p.id]??"تصحيح رصيد"} onChange={e=>setReasonsByProduct(old=>({...old,[p.id]:e.target.value}))}>{reasons.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select>
        <input aria-label="مرجع الحركة" value={references[p.id]??""} onChange={e=>setReferences(old=>({...old,[p.id]:e.target.value}))} placeholder="مرجع / فاتورة (اختياري)"/>
        <button type="button" disabled={savingId===p.id} onClick={()=>void saveStock(p)}>{savingId===p.id?"جارٍ الحفظ...":"حفظ الرصيد"}</button>
       </div></td>
      </tr>;
    })}</tbody></table></div>}
   </section>
   <section className="admin-inventory-panel">
    <div className="admin-inventory-toolbar"><div><h2>آخر حركات المخزون</h2><p>تسجيل آلي لكل رصيد افتتاحي أو تسوية يتم حفظها من هذه الصفحة.</p></div></div>
    {loading?<div className="admin-inventory-empty">جارٍ تحميل سجل الحركات...</div>:movements.length===0?<div className="admin-inventory-empty">لم يتم تسجيل حركات مخزون بعد. أدخل رصيدًا فعليًا لبدء التتبع.</div>:<div className="admin-inventory-table-wrap"><table className="admin-inventory-table admin-movement-table"><thead><tr><th>التاريخ</th><th>المنتج</th><th>تغير الكمية</th><th>السبب</th><th>المرجع</th></tr></thead><tbody>{movements.map(m=><tr key={m.id}><td>{formatDate(m.created_at)}</td><td>{productById[m.product_id]?.name_ar??"منتج محذوف"}</td><td><strong className={m.quantity_delta>0?"inventory-positive":m.quantity_delta<0?"inventory-negative":""}>{delta(m.quantity_delta)}</strong></td><td>{m.reason}</td><td>{m.reference||"—"}</td></tr>)}</tbody></table></div>}
   </section>
  </div>
 </AdminShell>;
}
