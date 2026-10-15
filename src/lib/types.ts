export type Product = {
  id: string;
  category_id: string | null;
  sku: string | null;
  slug: string;
  name_ar: string;
  name_en: string;
  brand: string | null;
  model: string | null;
  description_ar: string | null;
  description_en: string | null;
  specifications: Record<string, unknown>;
  price_egp: number | null;
  image_urls: string[];
  is_active: boolean;
  is_featured: boolean;
};

export type Category = { id: string; name_ar: string; name_en: string; slug: string; sort_order: number };


export function priceNoticeFor(specifications: Record<string, unknown> | null | undefined): string {
  const status = String(specifications?.price_status ?? "");
  if (status === "provisional_estimate") return "سعر تقديري مؤقت قابل للتغيير؛ السعر النهائي يتأكد مع المتجر قبل اعتماد الطلب.";
  if (status === "market_reference_variant") return "السعر مرجعي لنسخة قريبة؛ يجب تأكيد تطابق الموديل قبل اعتماد الطلب.";
  return "";
}
