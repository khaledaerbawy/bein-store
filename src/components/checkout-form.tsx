"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import ProductImage from "@/components/product-image";

export default function CheckoutForm() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const storeWhatsapp = (process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? "").replace(/\D/g, "");
  async function submit(formData: FormData) {
    const whatsappWindow = storeWhatsapp ? window.open("about:blank", "_blank") : null;
    setBusy(true); setError("");
    const payload = {
      customer_name: String(formData.get("customer_name") ?? "").trim(),
      customer_phone: String(formData.get("customer_phone") ?? "").trim(),
      customer_email: String(formData.get("customer_email") ?? "").trim() || null,
      shipping_address: String(formData.get("shipping_address") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim() || null,
      items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity }))
    };
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تسجيل الطلب. حاول مرة أخرى.");
      clear();
      const lines = items.map((x) => `• ${x.product.name_ar} × ${x.quantity}`).join("\n");
      const message = `طلب جديد من Bein Store\nرقم الطلب: ${result.order_number}\nالاسم: ${payload.customer_name}\nالهاتف: ${payload.customer_phone}\nالمدينة: ${payload.city}\nالعنوان: ${payload.shipping_address}\n\nالمنتجات:\n${lines}\n\nالإجمالي المبدئي: ${new Intl.NumberFormat("ar-EG").format(result.total_egp)} جنيه\nطريقة الدفع: عند الاستلام / تأكيد عبر المتجر`;
      if (whatsappWindow && storeWhatsapp) { whatsappWindow.location.href = `https://wa.me/${storeWhatsapp}?text=${encodeURIComponent(message)}`; }
      router.push(`/checkout/success?order=${encodeURIComponent(String(result.order_number))}`);
    } catch (e) { whatsappWindow?.close(); setError(e instanceof Error ? e.message : "حصل خطأ غير متوقع."); }
    finally { setBusy(false); }
  }
  if (!items.length) return <div className="empty-state"><h3>السلة فاضية</h3><p>أضف المنتجات اللي محتاجها الأول.</p><a className="button button-primary" href="/#catalog">تصفح المنتجات</a></div>;
  return <div className="checkout-layout"><form className="checkout-form" action={submit}>
    <h2>بيانات الطلب</h2><p className="muted">{storeWhatsapp ? "هنسجل طلبك ونفتح واتساب لتأكيد التفاصيل." : "هنسجل طلبك، وبعدها يتواصل معك فريق المتجر لتأكيد التفاصيل."} الدفع الإلكتروني غير مفعّل حاليًا.</p>
    <label>الاسم بالكامل<input name="customer_name" required minLength={2} maxLength={120} autoComplete="name" /></label>
    <label>رقم الموبايل<input name="customer_phone" required minLength={8} maxLength={24} inputMode="tel" autoComplete="tel" placeholder="01xxxxxxxxx" /></label>
    <label>البريد الإلكتروني (اختياري)<input name="customer_email" type="email" maxLength={180} autoComplete="email" /></label>
    <div className="form-two"><label>المحافظة / المدينة<input name="city" required maxLength={100} autoComplete="address-level2" /></label><label>العنوان بالتفصيل<input name="shipping_address" required maxLength={500} autoComplete="street-address" /></label></div>
    <label>ملاحظات إضافية<textarea name="notes" rows={3} maxLength={1000} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary full-button" type="submit" disabled={busy}>{busy ? "جارٍ تسجيل الطلب..." : storeWhatsapp ? "تأكيد الطلب والمتابعة لواتساب" : "تأكيد الطلب"}</button>
  </form><aside className="order-summary"><div className="order-summary-head"><span className="order-summary-icon">✓</span><div><h2>ملخص الطلب</h2><small>{items.length} أنواع منتجات · {items.reduce((n, item) => n + item.quantity, 0)} قطعة</small></div></div>{items.map((item) => <div className="checkout-summary-item" key={item.product.id}><div className="checkout-summary-photo"><ProductImage product={item.product} className="checkout-product-photo" /></div><div className="checkout-summary-name"><span>{item.product.name_ar}</span><small>الكمية: {item.quantity}</small></div><strong>{new Intl.NumberFormat("ar-EG").format(Number(item.product.price_egp) * item.quantity)} ج.م</strong></div>)}<p className="checkout-price-confirmation">السعر النهائي وتوافر الموديل يتم تأكيدهما مع المتجر قبل اعتماد الطلب.</p><div className="summary-total"><span>الإجمالي قبل الشحن</span><strong>{new Intl.NumberFormat("ar-EG").format(subtotal)} ج.م</strong></div><small className="shipping-note">الشحن يتم تأكيده مع المتجر بعد مراجعة العنوان. لا يتم تحصيل أي دفع إلكتروني من هذه الصفحة.</small><div className="checkout-assurance"><span>✓ مراجعة بيانات الطلب</span><span>✓ تأكيد السعر والتوافر</span><span>✓ متابعة مع المتجر</span></div></aside></div>;
}
