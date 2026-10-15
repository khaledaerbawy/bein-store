import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "المتجر غير مربوط بقاعدة البيانات بعد." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "بيانات الطلب غير صحيحة." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "بيانات الطلب غير صحيحة." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const customer = {
    customer_name: clean(input.customer_name, 120), customer_phone: clean(input.customer_phone, 24),
    customer_email: clean(input.customer_email, 180) || null, shipping_address: clean(input.shipping_address, 500),
    city: clean(input.city, 100), notes: clean(input.notes, 1000) || null, language: "ar"
  };
  if (customer.customer_name.length < 2 || customer.customer_phone.replace(/\D/g, "").length < 8 || !customer.shipping_address || !customer.city) return NextResponse.json({ error: "راجع الاسم ورقم الهاتف والمدينة والعنوان." }, { status: 400 });
  if (customer.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.customer_email)) return NextResponse.json({ error: "البريد الإلكتروني غير صحيح." }, { status: 400 });
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) return NextResponse.json({ error: "السلة فارغة أو تحتوي على عدد غير صالح من المنتجات." }, { status: 400 });
  const items: { product_id: string; quantity: number }[] = [];
  for (const raw of input.items) {
    if (!raw || typeof raw !== "object") return NextResponse.json({ error: "أحد المنتجات غير صالح." }, { status: 400 });
    const row = raw as Record<string, unknown>;
    if (typeof row.product_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(row.product_id) || !Number.isInteger(row.quantity) || Number(row.quantity) < 1 || Number(row.quantity) > 99) return NextResponse.json({ error: "بيانات أحد المنتجات غير صحيحة." }, { status: 400 });
    items.push({ product_id: row.product_id, quantity: Number(row.quantity) });
  }
  const { data, error } = await supabase.rpc("create_public_order", { p_customer: customer, p_items: items });
  if (error) {
    let known = "تعذر تسجيل الطلب. حاول مرة أخرى أو تواصل معنا عبر واتساب.";
    if (error.message.includes("PRODUCT_UNAVAILABLE")) known = "أحد المنتجات لم يعد متاحًا بالسعر الحالي. حدّث السلة وحاول مرة أخرى.";
    else if (error.message.includes("INSUFFICIENT_STOCK")) known = "الكمية المطلوبة غير متاحة حاليًا.";
    else if (error.message.includes("ORDER_BELOW_MINIMUM:")) {
      const value = Number(error.message.split("ORDER_BELOW_MINIMUM:")[1]?.match(/^\s*([0-9.]+)/)?.[1]);
      known = Number.isFinite(value) ? "الحد الأدنى لقيمة الطلب " + new Intl.NumberFormat("ar-EG").format(value) + " جنيه." : "قيمة الطلب أقل من الحد الأدنى المسموح.";
    } else if (error.message.includes("ORDERS_PAUSED:")) {
      const paused = error.message.split("ORDERS_PAUSED:")[1]?.trim();
      known = paused || "استقبال الطلبات متوقف مؤقتًا. تواصل مع المتجر للاستفسار.";
    }
    console.error("Order creation failed:", error.message);
    return NextResponse.json({ error: known }, { status: 400 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ order_number: result?.order_number, total_egp: result?.total_egp }, { status: 201 });
}
