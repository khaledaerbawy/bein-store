"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import ProductImage from "@/components/product-image";
import { createClient } from "@/lib/supabase/client";

type CheckoutSettings = {
  orders_enabled: boolean;
  orders_paused_message: string;
  shipping_fee_egp: number;
  free_shipping_threshold_egp: number | null;
  minimum_order_egp: number;
  whatsapp_order_confirmation: boolean;
  allow_order_notes: boolean;
  delivery_time_text: string;
  whatsapp: string | null;
  show_whatsapp: boolean;
};
const defaultSettings: CheckoutSettings = {
  orders_enabled: true,
  orders_paused_message: "استقبال الطلبات متوقف مؤقتًا. تواصل مع المتجر للاستفسار.",
  shipping_fee_egp: 0,
  free_shipping_threshold_egp: null,
  minimum_order_egp: 0,
  whatsapp_order_confirmation: true,
  allow_order_notes: true,
  delivery_time_text: "موعد التوصيل ورسوم الشحن يتم تأكيدهما مع المتجر بعد مراجعة العنوان.",
  whatsapp: null,
  show_whatsapp: true
};
const money = (value: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(value) + " ج.م";

export default function CheckoutForm() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<CheckoutSettings>(defaultSettings);

  useEffect(() => {
    let live = true;
    (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.from("store_settings")
        .select("orders_enabled,orders_paused_message,shipping_fee_egp,free_shipping_threshold_egp,minimum_order_egp,whatsapp_order_confirmation,allow_order_notes,delivery_time_text,whatsapp,show_whatsapp")
        .eq("id", "main").maybeSingle();
      if (live && data) setSettings(current => ({ ...current, ...data } as CheckoutSettings));
    })();
    return () => { live = false; };
  }, []);

  const storeWhatsapp = (settings.show_whatsapp ? (settings.whatsapp || process.env.NEXT_PUBLIC_STORE_WHATSAPP || "") : "").replace(/\D/g, "");
  const whatsappEnabled = settings.whatsapp_order_confirmation && Boolean(storeWhatsapp);
  const shippingFee = settings.free_shipping_threshold_egp !== null && subtotal >= Number(settings.free_shipping_threshold_egp)
    ? 0
    : Math.max(0, Number(settings.shipping_fee_egp) || 0);
  const estimatedTotal = subtotal + shippingFee;
  const minimumOrder = Math.max(0, Number(settings.minimum_order_egp) || 0);

  async function submit(formData: FormData) {
    if (!settings.orders_enabled) { setError(settings.orders_paused_message || "استقبال الطلبات متوقف مؤقتًا."); return; }
    if (subtotal < minimumOrder) { setError("الحد الأدنى للطلب هو " + money(minimumOrder) + ". أضف منتجات أخرى للمتابعة."); return; }
    const whatsappWindow = whatsappEnabled ? window.open("about:blank", "_blank") : null;
    setBusy(true); setError("");
    const payload = {
      customer_name: String(formData.get("customer_name") ?? "").trim(),
      customer_phone: String(formData.get("customer_phone") ?? "").trim(),
      customer_email: String(formData.get("customer_email") ?? "").trim() || null,
      shipping_address: String(formData.get("shipping_address") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      notes: settings.allow_order_notes ? (String(formData.get("notes") ?? "").trim() || null) : null,
      items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity }))
    };
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تسجيل الطلب. حاول مرة أخرى.");
      clear();
      const lines = items.map((x) => "• " + x.product.name_ar + " × " + x.quantity).join("\n");
      const actualTotal = Number(result.total_egp) || estimatedTotal;
      const actualShipping = Math.max(0, actualTotal - subtotal);
      const message = "طلب جديد من Bein Store\nرقم الطلب: " + result.order_number + "\nالاسم: " + payload.customer_name + "\nالهاتف: " + payload.customer_phone + "\nالمدينة: " + payload.city + "\nالعنوان: " + payload.shipping_address + "\n\nالمنتجات:\n" + lines + "\n\nقيمة المنتجات: " + money(subtotal) + "\nالشحن: " + (actualShipping === 0 ? "مجاني / بدون رسوم مسجلة" : money(actualShipping)) + "\nالإجمالي المبدئي: " + money(actualTotal) + "\nطريقة الدفع: عند الاستلام / تأكيد عبر المتجر";
      if (whatsappWindow && whatsappEnabled) whatsappWindow.location.href = "https://wa.me/" + storeWhatsapp + "?text=" + encodeURIComponent(message);
      router.push("/checkout/success?order=" + encodeURIComponent(String(result.order_number)));
    } catch (e) {
      whatsappWindow?.close();
      setError(e instanceof Error ? e.message : "حصل خطأ غير متوقع.");
    } finally { setBusy(false); }
  }

  if (!items.length) return <div className="empty-state"><h3>السلة فاضية</h3><p>أضف المنتجات اللي محتاجها الأول.</p><Link className="button button-primary" href="/#catalog">تصفح المنتجات</Link></div>;

  return <div className="checkout-layout">
    <form className="checkout-form" action={submit}>
      <h2>بيانات الطلب</h2>
      <p className="muted">{!settings.orders_enabled ? settings.orders_paused_message : whatsappEnabled ? "هنسجل طلبك ونفتح واتساب لتأكيد التفاصيل." : "هنسجل طلبك، وبعدها يتواصل معك فريق المتجر لتأكيد التفاصيل."} الدفع الإلكتروني غير مفعّل حاليًا.</p>
      {minimumOrder > 0 && <p className="checkout-minimum-notice">الحد الأدنى للطلب: {money(minimumOrder)}.</p>}
      <label>الاسم بالكامل<input name="customer_name" required minLength={2} maxLength={120} autoComplete="name" /></label>
      <label>رقم الموبايل<input name="customer_phone" required minLength={8} maxLength={24} inputMode="tel" autoComplete="tel" placeholder="01xxxxxxxxx" /></label>
      <label>البريد الإلكتروني (اختياري)<input name="customer_email" type="email" maxLength={180} autoComplete="email" /></label>
      <div className="form-two"><label>المحافظة / المدينة<input name="city" required maxLength={100} autoComplete="address-level2" /></label><label>العنوان بالتفصيل<input name="shipping_address" required maxLength={500} autoComplete="street-address" /></label></div>
      {settings.allow_order_notes && <label>ملاحظات إضافية<textarea name="notes" rows={3} maxLength={1000} /></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary full-button" type="submit" disabled={busy || !settings.orders_enabled || subtotal < minimumOrder}>{busy ? "جارٍ تسجيل الطلب..." : !settings.orders_enabled ? "استقبال الطلبات متوقف مؤقتًا" : whatsappEnabled ? "تأكيد الطلب والمتابعة لواتساب" : "تأكيد الطلب"}</button>
    </form>
    <aside className="order-summary">
      <div className="order-summary-head"><span className="order-summary-icon">✓</span><div><h2>ملخص الطلب</h2><small>{items.length} أنواع منتجات · {items.reduce((n, item) => n + item.quantity, 0)} قطعة</small></div></div>
      {items.map((item) => <div className="checkout-summary-item" key={item.product.id}><div className="checkout-summary-photo"><ProductImage product={item.product} className="checkout-product-photo" /></div><div className="checkout-summary-name"><span>{item.product.name_ar}</span><small>الكمية: {item.quantity}</small></div><strong>{money(Number(item.product.price_egp) * item.quantity)}</strong></div>)}
      <p className="checkout-price-confirmation">{settings.delivery_time_text}</p>
      <div className="summary-total"><span>قيمة المنتجات</span><strong>{money(subtotal)}</strong></div>
      <div className="summary-shipping-row"><span>الشحن التقديري</span><strong>{shippingFee === 0 ? "مجاني / يتم التأكيد" : money(shippingFee)}</strong></div>
      <div className="summary-total summary-final-total"><span>الإجمالي التقديري شامل الشحن</span><strong>{money(estimatedTotal)}</strong></div>
      <small className="shipping-note">الشحن والحد الأدنى للطلب يخضعان لإعدادات المتجر. لا يتم تحصيل أي دفع إلكتروني من هذه الصفحة.</small>
      <div className="checkout-assurance"><span>✓ مراجعة بيانات الطلب</span><span>✓ تأكيد السعر والتوافر</span><span>✓ متابعة مع المتجر</span></div>
    </aside>
  </div>;
}
