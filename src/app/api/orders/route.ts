import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

function getClientIp(request: Request): string | null {
  const vercelIp = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map(value => value.trim()).filter(Boolean);
  const candidate = vercelIp || forwarded?.at(-1) || request.headers.get("x-real-ip")?.trim() || "";
  return candidate && isIP(candidate) ? candidate : null;
}

async function verifyTurnstile(token: string, ip: string): Promise<"disabled" | "valid" | "invalid" | "misconfigured" | "unavailable"> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!secret && !siteKey) return "disabled";
  if (!secret || !siteKey) return "misconfigured";
  if (!token) return "invalid";

  try {
    const form = new FormData();
    form.set("secret", secret);
    form.set("response", token);
    form.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return "unavailable";
    const result = await response.json() as { success?: boolean };
    return result.success === true ? "valid" : "invalid";
  } catch {
    return "unavailable";
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "المتجر غير مربوط بقاعدة البيانات بعد." }, { status: 503 });

  const internalSecret = process.env.ORDER_RPC_SECRET;
  if (!internalSecret) {
    console.error("Order endpoint is not configured: ORDER_RPC_SECRET is missing.");
    return NextResponse.json({ error: "استقبال الطلبات غير متاح مؤقتًا. حاول لاحقًا." }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "حجم بيانات الطلب أكبر من المسموح." }, { status: 413 });
  }

  const ip = getClientIp(request);
  if (!ip) {
    return NextResponse.json({ error: "تعذر التحقق من الاتصال الآمن. أعد المحاولة." }, { status: 503 });
  }

  // Only a keyed digest is sent to / stored in the database; the raw IP is not persisted.
  const clientKey = createHmac("sha256", internalSecret).update(ip).digest("hex");
  const { data: limitData, error: limitError } = await supabase.rpc("consume_order_rate_limit", {
    p_internal_secret: internalSecret,
    p_client_key: clientKey
  });
  if (limitError) {
    console.error("Order rate limiter unavailable:", { code: limitError.code });
    return NextResponse.json({ error: "تعذر التحقق من الطلب مؤقتًا. حاول بعد قليل." }, { status: 503 });
  }
  const limit = Array.isArray(limitData) ? limitData[0] : limitData;
  if (!limit || typeof limit.allowed !== "boolean") {
    return NextResponse.json({ error: "تعذر التحقق من الطلب مؤقتًا. حاول بعد قليل." }, { status: 503 });
  }
  if (!limit.allowed) {
    const retryAfter = Math.max(1, Number(limit.retry_after_seconds) || 60);
    return NextResponse.json(
      { error: "تم إرسال طلبات متعددة من نفس الاتصال. انتظر قليلًا ثم حاول مرة أخرى." },
      { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صحيحة." }, { status: 400 });
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "حجم بيانات الطلب أكبر من المسموح." }, { status: 413 });
  }

  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "بيانات الطلب غير صحيحة." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "بيانات الطلب غير صحيحة." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const customer = {
    customer_name: clean(input.customer_name, 120),
    customer_phone: clean(input.customer_phone, 24),
    customer_email: clean(input.customer_email, 180) || null,
    shipping_address: clean(input.shipping_address, 500),
    city: clean(input.city, 100),
    notes: clean(input.notes, 1000) || null,
    language: "ar"
  };

  if (customer.customer_name.length < 2 || customer.customer_phone.replace(/\D/g, "").length < 8 || !customer.shipping_address || !customer.city) {
    return NextResponse.json({ error: "راجع الاسم ورقم الهاتف والمدينة والعنوان." }, { status: 400 });
  }
  if (customer.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.customer_email)) {
    return NextResponse.json({ error: "البريد الإلكتروني غير صحيح." }, { status: 400 });
  }
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) {
    return NextResponse.json({ error: "السلة فارغة أو تحتوي على عدد غير صالح من المنتجات." }, { status: 400 });
  }

  const items: { product_id: string; quantity: number }[] = [];
  for (const raw of input.items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json({ error: "أحد المنتجات غير صالح." }, { status: 400 });
    }
    const row = raw as Record<string, unknown>;
    if (typeof row.product_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(row.product_id) ||
        !Number.isInteger(row.quantity) || Number(row.quantity) < 1 || Number(row.quantity) > 99) {
      return NextResponse.json({ error: "بيانات أحد المنتجات غير صحيحة." }, { status: 400 });
    }
    items.push({ product_id: row.product_id, quantity: Number(row.quantity) });
  }

  const captcha = await verifyTurnstile(clean(input.turnstile_token, 4096), ip);
  if (captcha === "misconfigured" || captcha === "unavailable") {
    console.error("Turnstile verification is not available:", captcha);
    return NextResponse.json({ error: "التحقق الأمني غير متاح مؤقتًا. حاول لاحقًا." }, { status: 503 });
  }
  if (captcha === "invalid") {
    return NextResponse.json({ error: "أكمل خطوة التحقق الأمني ثم أعد المحاولة." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("create_public_order", {
    p_customer: customer,
    p_items: items,
    p_internal_secret: internalSecret
  });
  if (error) {
    let message = "تعذر تسجيل الطلب. حاول مرة أخرى أو تواصل مع المتجر.";
    let status = 500;
    if (error.message.includes("PRODUCT_UNAVAILABLE")) {
      message = "أحد المنتجات لم يعد متاحًا بالسعر الحالي. حدّث السلة وحاول مرة أخرى.";
      status = 409;
    } else if (error.message.includes("INSUFFICIENT_STOCK")) {
      message = "الكمية المطلوبة غير متاحة حاليًا.";
      status = 409;
    } else if (error.message.includes("ORDER_BELOW_MINIMUM:")) {
      const value = Number(error.message.split("ORDER_BELOW_MINIMUM:")[1]?.match(/^\s*([0-9.]+)/)?.[1]);
      message = Number.isFinite(value) ? "الحد الأدنى لقيمة الطلب " + new Intl.NumberFormat("ar-EG").format(value) + " جنيه." : "قيمة الطلب أقل من الحد الأدنى المسموح.";
      status = 409;
    } else if (error.message.includes("ORDERS_PAUSED:")) {
      message = error.message.split("ORDERS_PAUSED:")[1]?.trim() || "استقبال الطلبات متوقف مؤقتًا. تواصل مع المتجر للاستفسار.";
      status = 409;
    } else if (error.message.includes("INVALID_ORDER") || error.message.includes("INVALID_CUSTOMER") || error.message.includes("INVALID_ITEM")) {
      message = "راجع بيانات الطلب وحاول مرة أخرى.";
      status = 400;
    }
    console.error("Order creation failed:", { code: error.code });
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }

  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(
    { order_number: result?.order_number, total_egp: result?.total_egp },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
