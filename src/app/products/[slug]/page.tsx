import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import ProductDetailActions from "@/components/product-detail-actions";
import ProductGallery from "@/components/product-gallery";
import SiteBrand from "@/components/site-brand";
export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data, error } = await supabase.from("products").select("id,category_id,sku,slug,name_ar,name_en,brand,model,description_ar,description_en,specifications,price_egp,image_urls,is_active,is_featured").eq("slug", slug).eq("is_active", true).not("price_egp", "is", null).maybeSingle();
  if (error || !data) notFound();
  const p = data as Product;
  const money = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(Number(p.price_egp));
  return <main className="subpage product-page" dir="rtl"><header className="subpage-header"><SiteBrand className="brand" /><div className="subpage-header-actions"><Link href="/#catalog">مواصلة التسوق ←</Link><Link className="subpage-cart-link" href="/cart">عرض السلة</Link></div></header>
    <section className="section-wrap product-detail-wrap"><div className="breadcrumbs"><Link href="/">الرئيسية</Link> <span>›</span> <Link href="/#catalog">المنتجات</Link> <span>›</span> <span>{p.name_ar}</span></div>
      <article className="product-detail"><ProductGallery product={p} />
        <div className="detail-copy"><span className="product-brand-pill">{p.brand ?? "BEIN STORE"}</span><h1 className="page-title">{p.name_ar}</h1>{p.model && <p className="product-model">الموديل: <b dir="ltr">{p.model}</b></p>}{p.sku && <p className="product-model">كود المنتج: {p.sku}</p>}
          <div className="detail-price-row"><strong className="detail-price">{money}</strong><span className="detail-stock"><i/> متاح للطلب — التأكيد مع المتجر</span></div>{p.description_ar && <p className="detail-description">{p.description_ar}</p>}
          <ul className="detail-highlights"><li>مساعدة في اختيار الموديل المناسب</li><li>تأكيد التوافق والتوافر قبل تجهيز الطلب</li><li>خيار إتمام الطلب ومتابعته عبر واتساب عند تفعيله</li></ul><ProductDetailActions product={p}/><p className="detail-delivery-note">رسوم الشحن والتوافر النهائي يتم تأكيدهما مع المتجر قبل اعتماد الطلب.</p>
        </div></article></section></main>;
}
