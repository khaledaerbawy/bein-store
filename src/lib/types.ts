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
