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
  specifications: Record<string, any>;
  price_egp: number | null;
  compare_at_price_egp?: number | null;
  image_urls: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Category = {
  id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  description_ar?: string | null;
  description_en?: string | null;
  image_url?: string | null;
  is_active: boolean;
  sort_order: number;
};

export type OrderStatus = 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  shipping_address: string;
  city: string;
  notes?: string | null;
  status: OrderStatus;
  total_egp: number;
  created_at: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot?: string | null;
  quantity: number;
  unit_price_egp: number;
  line_total_egp: number;
};

export type StoreSettings = {
  id: string;
  store_name_ar: string;
  store_name_en: string;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  contact_email?: string | null;
  address_ar?: string | null;
  hero_title_ar?: string | null;
  hero_subtitle_ar?: string | null;
  theme_primary_color?: string | null;
};
