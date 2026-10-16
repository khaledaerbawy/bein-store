"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/admin/admin-shell";

type OrderItem = { product_name_snapshot: string; quantity: number; unit_price_egp: number; line_total_egp: number };
type Order = { id:string; order_number:number; customer_name:string; customer_phone:string; customer_email:string|null; shipping_address:string|null; city:string|null; notes:string|null; status:string; subtotal_egp:number; shipping_fee_egp:number; total_egp:number; created_at:string; order_items: OrderItem[] };
const statuses = [{value:"new",label:"جديد"},{value:"confirmed",label:"تم التأكيد"},{value:"preparing",label:"قيد التجهيز"},{value:"shipped",label:"تم الشحن"},{value:"completed",label:"مكتمل"},{value:"cancelled",label:"ملغي"}];
const money=(n:number)=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(Number(n)||0)+" ج.م";
const statusLabel=(v:string)=>statuses.find(s=>s.value===v)?.label??v;
const csvCell=(v:unknown)=>'"'+String(v??"").replace(/"/g,'""')+'"';

export default function AdminOrdersPage(){
 const [orders,setOrders]=useState<Order[]>([]);
 const [message,setMessage]=useState("");
 const [loading,setLoading]=useState(true);
 const [query,setQuery]=useState("");
 const [statusFilter,setStatusFilter]=useState("all");
 const [dateFrom,setDateFrom]=useState("");
 const [dateTo,setDateTo]=useState("");
 const [busyId,setBusyId]=useState("");
 async function load(){
  setLoading(true);
  const s=createClient();
  if(!s){setMessage("إعدادات Supabase ناقصة.");setLoading(false);return;}
  const {data:{user}}=await s.auth.getUser();
  if(!user){location.href="/admin/login";return;}
  const {data:role}=await s.from("admin_roles").select("is_active").eq("user_id",user.id).maybeSingle();
  if(!role?.is_active){location.href="/admin/login";return;}
  const {data,error}=await s.from("orders").select("id,order_number,customer_name,customer_phone,customer_email,shipping_address,city,notes,status,subtotal_egp,shipping_fee_egp,total_egp,created_at,order_items(product_name_snapshot,quantity,unit_price_egp,line_total_egp)").order("created_at",{ascending:false});
  if(error)setMessage("تعذر تحميل الطلبات: "+error.message);else setOrders((data??[]) as Order[]);
  setLoading(false);
 }
 useEffect(()=>{void load();},[]);
 async function changeStatus(id:string,status:string){
  setBusyId(id);setMessage("");
  const s=createClient();if(!s){setMessage("إعدادات Supabase ناقصة.");setBusyId("");return;}
  const {error}=await s.rpc("admin_update_order_status",{p_order_id:id,p_new_status:status});
  const message = error?.message ?? "";
  const safeError = message.includes("ORDER_CANNOT_CANCEL_AFTER_SHIPMENT")
    ? "لا يمكن إلغاء طلب تم شحنه أو إكماله."
    : message.includes("ORDER_ALREADY_CANCELLED")
      ? "الطلب ملغي بالفعل ولا يمكن إعادة تفعيله."
      : "لم يتم تحديث الحالة. تأكد من صلاحيات الإدارة وحاول مرة أخرى.";
  setMessage(error ? safeError : "تم تحديث حالة الطلب.");
  if(!error)setOrders(current=>current.map(o=>o.id===id?{...o,status}:o));
  setBusyId("");
 }
 const filtered=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase();
  return orders.filter(o=>{
   const matchesQuery=!q||[o.order_number,o.customer_name,o.customer_phone,o.customer_email,o.city,o.shipping_address,...(o.order_items??[]).map(i=>i.product_name_snapshot)].some(v=>String(v??"").toLocaleLowerCase().includes(q));
   const day=o.created_at.slice(0,10);
   return matchesQuery&&(statusFilter==="all"||o.status===statusFilter)&&(!dateFrom||day>=dateFrom)&&(!dateTo||day<=dateTo);
  });
 },[orders,query,statusFilter,dateFrom,dateTo]);
 function exportCsv(){
  const rows=[["رقم الطلب","التاريخ","العميل","الهاتف","البريد","المحافظة/المدينة","العنوان","الحالة","المنتجات","قيمة المنتجات","الشحن","الإجمالي","ملاحظات"]];
  filtered.forEach(o=>rows.push([String(o.order_number),new Date(o.created_at).toLocaleString("en-GB"),o.customer_name,o.customer_phone,o.customer_email??"",o.city??"",o.shipping_address??"",statusLabel(o.status),(o.order_items??[]).map(i=>i.product_name_snapshot+" × "+i.quantity).join(" | "),String(o.subtotal_egp),String(o.shipping_fee_egp),String(o.total_egp),o.notes??""]));
  const csv="\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  const a=document.createElement("a");a.href=url;a.download="bein-store-orders.csv";a.click();URL.revokeObjectURL(url);
 }
 const counts={all:orders.length,new:orders.filter(o=>o.status==="new").length,working:orders.filter(o=>["confirmed","preparing"].includes(o.status)).length,completed:orders.filter(o=>o.status==="completed").length};
 return <AdminShell title="طلبات العملاء" subtitle="ابحث في الطلبات، راجع بيانات العميل، حدّث الحالة، وصدّر تقريرًا للمحاسبة.">
  <div className="admin-orders-page">
   <section className="admin-order-tools">
    <div className="admin-order-tools-heading"><div><span>إدارة المبيعات</span><h2>متابعة الطلبات</h2><p>التغيير في الحالة يُحفظ مباشرة في قاعدة البيانات.</p></div><button type="button" className="admin-order-export" onClick={exportCsv} disabled={!filtered.length}>تصدير النتائج CSV ↓</button></div>
    <div className="admin-order-metrics">
     <div><small>كل الطلبات</small><b>{counts.all}</b></div><div><small>طلبات جديدة</small><b>{counts.new}</b></div><div><small>قيد المعالجة</small><b>{counts.working}</b></div><div><small>مكتملة</small><b>{counts.completed}</b></div>
    </div>
    <div className="admin-order-filters">
     <label>بحث بالطلب أو العميل أو الهاتف أو المنتج<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="مثال: 1001 أو اسم العميل أو موديل..." /></label>
     <label>حالة الطلب<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">كل الحالات</option>{statuses.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
     <label>من تاريخ<input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} /></label>
     <label>إلى تاريخ<input type="date" value={dateTo} min={dateFrom||undefined} onChange={e=>setDateTo(e.target.value)} /></label>
     <button type="button" onClick={()=>{setQuery("");setStatusFilter("all");setDateFrom("");setDateTo("");}}>مسح الفلاتر</button>
    </div>
    <div className="admin-order-results-count">عرض {filtered.length} من {orders.length} طلب</div>
   </section>
   {message&&<p className={message.includes("لم يتم")||message.includes("تعذر")?"form-error":"form-success"} role="status">{message}</p>}
   {loading?<p>جارٍ تحميل الطلبات...</p>:filtered.length===0?<div className="empty-state"><h3>{orders.length?"لا توجد نتائج مطابقة":"لا توجد طلبات حتى الآن"}</h3><p>{orders.length?"غيّر البحث أو الفلاتر لعرض طلبات أخرى.":"الطلبات الجديدة ستظهر هنا بعد تسجيل العملاء لها."}</p></div>:<div className="admin-orders">{filtered.map(o=><article className="admin-order-card" key={o.id}>
    <div className="order-card-top"><div><span className="eyebrow">ORDER #{o.order_number}</span><h2>{o.customer_name}</h2><p>{new Date(o.created_at).toLocaleString("ar-EG")}</p></div><strong>{money(Number(o.total_egp))}</strong></div>
    <div className="order-customer-details"><span>📞 <a href={"tel:"+o.customer_phone}>{o.customer_phone}</a></span>{o.customer_email&&<span>✉ {o.customer_email}</span>}<span>📍 {o.city??""} — {o.shipping_address??"لم يحدد"}</span>{o.notes&&<span>ملاحظات: {o.notes}</span>}</div>
    <div className="order-status-control"><label>حالة الطلب<select disabled={busyId===o.id} value={o.status} onChange={e=>void changeStatus(o.id,e.target.value)}>{statuses.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label><a className="button button-secondary" href={"https://wa.me/"+o.customer_phone.replace(/\D/g,"")+"?text="+encodeURIComponent("مرحبًا "+o.customer_name+"، بخصوص طلبك رقم "+o.order_number+" من Bein Store.")} target="_blank" rel="noreferrer">مراسلة العميل عبر واتساب ↗</a></div>
    <div className="order-items-list"><b>تفاصيل المنتجات</b>{(o.order_items??[]).map((item,index)=><div className="summary-line" key={o.id+"-"+index}><span>{item.product_name_snapshot} × {item.quantity}<small>سعر الوحدة: {money(Number(item.unit_price_egp))}</small></span><strong>{money(Number(item.line_total_egp))}</strong></div>)}</div>
    <div className="summary-line"><span>المنتجات</span><strong>{money(Number(o.subtotal_egp))}</strong></div><div className="summary-line"><span>الشحن</span><strong>{Number(o.shipping_fee_egp)===0?"يُحدد لاحقًا":money(Number(o.shipping_fee_egp))}</strong></div>
   </article>)}</div>}
  </div>
 </AdminShell>;
}
