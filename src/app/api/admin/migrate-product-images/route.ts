import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 3;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_BUCKET = "product-images";
const ALLOWED_HOSTS = new Set([
  "assets.hikvision.com",
  "material.dahuasecurity.com",
  "www.cctvcamerapros.com",
  "www.hikvision.com",
  "www.westerndigital.com"
]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

type ProductImages = { id: string; slug: string; image_urls: string[] | null };
type ImageEntry = { product: ProductImages; index: number; url: string };

function isStoredProductImage(url: string, supabaseUrl: string) {
  try {
    const parsed = new URL(url);
    const base = new URL(supabaseUrl);
    return parsed.origin === base.origin &&
      parsed.pathname.startsWith("/storage/v1/object/public/" + IMAGE_BUCKET + "/");
  } catch {
    return false;
  }
}

function safeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "product";
}

async function downloadImage(source: string) {
  let current: URL;
  try {
    current = new URL(source);
  } catch {
    throw new Error("رابط الصورة غير صالح");
  }
  if (current.protocol !== "https:" && current.protocol !== "http:") {
    throw new Error("نوع رابط الصورة غير مدعوم");
  }
  if (!ALLOWED_HOSTS.has(current.hostname.toLowerCase())) {
    throw new Error("مصدر الصورة غير موجود في قائمة المصادر المسموحة");
  }
  current.protocol = "https:";

  const headers = { Accept: "image/avif,image/webp,image/png,image/jpeg" };
  let response = await fetch(current.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(10000)
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("مصدر الصورة أعاد إعادة توجيه غير صالحة");
    const redirected = new URL(location, current);
    if (redirected.protocol !== "https:" || !ALLOWED_HOSTS.has(redirected.hostname.toLowerCase())) {
      throw new Error("إعادة توجيه الصورة إلى مصدر غير مسموح");
    }
    response = await fetch(redirected.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000)
    });
  }

  if (!response.ok) throw new Error("تعذر تنزيل الصورة من المصدر");
  const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) throw new Error("الملف الذي رجع من المصدر ليس صورة مدعومة");
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_IMAGE_BYTES) throw new Error("حجم الصورة أكبر من الحد المسموح");

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength < 1 || arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("حجم الصورة فارغ أو أكبر من الحد المسموح");
  }
  const buffer = Buffer.from(arrayBuffer);
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.slice("image/".length);
  const digest = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
  return { buffer, contentType, extension, digest };
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (!origin || origin !== requestUrl.origin) {
    return NextResponse.json({ error: "الطلب لازم يتم من لوحة المتجر نفسها." }, { status: 403 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "إعدادات قاعدة البيانات غير مكتملة." }, { status: 503 });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "سجّل الدخول إلى لوحة الإدارة أولًا." }, { status: 401 });
  const { data: role, error: roleError } = await supabase
    .from("admin_roles").select("is_active").eq("user_id", user.id).maybeSingle();
  if (roleError || !role?.is_active) {
    return NextResponse.json({ error: "صلاحية مسؤول نشطة مطلوبة." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صحيحة." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "بيانات الطلب غير صحيحة." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const offset = input.offset === undefined ? 0 : Number(input.offset);
  const dryRun = input.dryRun === true;
  if (!Number.isInteger(offset) || offset < 0 || offset > 10000) {
    return NextResponse.json({ error: "موضع المعالجة غير صالح." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("products")
    .select("id,slug,image_urls")
    .order("id", { ascending: true })
    .limit(500);
  if (error) {
    console.error("Image migration product query failed:", { code: error.code });
    return NextResponse.json({ error: "تعذر قراءة روابط الصور من الكتالوج." }, { status: 500 });
  }

  const products = (data ?? []) as ProductImages[];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const allImages: ImageEntry[] = [];
  for (const product of products) {
    for (const [index, url] of (product.image_urls ?? []).entries()) {
      allImages.push({ product, index, url });
    }
  }

  const start = Math.min(offset, allImages.length);
  const batch = allImages.slice(start, start + BATCH_SIZE);
  const current = batch.map(entry => ({
    ...entry,
    alreadyStored: isStoredProductImage(entry.url, supabaseUrl)
  }));
  const pending = current.filter(entry => !entry.alreadyStored);
  const hostCounts: Record<string, number> = {};
  for (const entry of pending) {
    try {
      const host = new URL(entry.url).hostname.toLowerCase();
      hostCounts[host] = (hostCounts[host] ?? 0) + 1;
    } catch {
      hostCounts.invalid = (hostCounts.invalid ?? 0) + 1;
    }
  }

  if (dryRun) {
    const eligible = pending.filter(entry => {
      try {
        const url = new URL(entry.url);
        return (url.protocol === "https:" || url.protocol === "http:") && ALLOWED_HOSTS.has(url.hostname.toLowerCase());
      } catch { return false; }
    }).length;
    return NextResponse.json({
      dryRun: true,
      total: allImages.length,
      offset: start,
      nextOffset: Math.min(start + batch.length, allImages.length),
      done: start + batch.length >= allImages.length,
      batchSize: batch.length,
      alreadyStored: current.filter(entry => entry.alreadyStored).length,
      eligible,
      hostCounts
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const changes = new Map<string, { product: ProductImages; urls: string[] }>();
  const results: Array<{ slug: string; index: number; status: "uploaded" | "skipped" | "failed"; reason?: string }> = [];
  for (const entry of current) {
    if (entry.alreadyStored) {
      results.push({ slug: entry.product.slug, index: entry.index, status: "skipped" });
      continue;
    }
    try {
      const image = await downloadImage(entry.url);
      const path = "migrated/" + safeSlug(entry.product.slug) + "/" + entry.index + "-" + image.digest + "." + image.extension;
      const bytes = image.buffer.buffer.slice(
        image.buffer.byteOffset,
        image.buffer.byteOffset + image.buffer.byteLength
      ) as ArrayBuffer;
      const { error: uploadError } = await supabase.storage.from(IMAGE_BUCKET).upload(
        path,
        new Blob([bytes], { type: image.contentType }),
        { contentType: image.contentType, cacheControl: "31536000", upsert: true }
      );
      if (uploadError) throw new Error("تعذر رفع الصورة إلى التخزين");
      const { data: publicData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
      if (!publicData.publicUrl) throw new Error("تعذر إنشاء رابط الصورة الجديدة");
      const change = changes.get(entry.product.id) ?? {
        product: entry.product,
        urls: [...(entry.product.image_urls ?? [])]
      };
      change.urls[entry.index] = publicData.publicUrl;
      changes.set(entry.product.id, change);
      results.push({ slug: entry.product.slug, index: entry.index, status: "uploaded" });
    } catch (err) {
      results.push({
        slug: entry.product.slug,
        index: entry.index,
        status: "failed",
        reason: err instanceof Error ? err.message : "فشل نقل الصورة"
      });
    }
  }

  for (const { product, urls } of changes.values()) {
    const { error: updateError } = await supabase.from("products").update({ image_urls: urls }).eq("id", product.id);
    if (updateError) {
      for (const result of results) {
        if (result.slug === product.slug && result.status === "uploaded") {
          result.status = "failed";
          result.reason = "تم رفع الصورة، لكن تعذر حفظ الرابط الجديد على المنتج";
        }
      }
    }
  }

  const uploaded = results.filter(result => result.status === "uploaded").length;
  const failed = results.filter(result => result.status === "failed").length;
  const nextOffset = Math.min(start + batch.length, allImages.length);
  return NextResponse.json({
    dryRun: false,
    total: allImages.length,
    offset: start,
    nextOffset,
    done: nextOffset >= allImages.length,
    uploaded,
    skipped: results.filter(result => result.status === "skipped").length,
    failed,
    results
  }, { headers: { "Cache-Control": "no-store" } });
}
