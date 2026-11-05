import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SystemPlanner from "@/components/system-planner";
import "./planner.css";

type SearchParams = Promise<{ q?: string }>;
type CameraOption = {
  id: string;
  brand: string;
  model: string;
  megapixels: number | null;
  camera_type: string | null;
  power_source: string[];
};
type StoreProduct = {
  id: string;
  slug: string;
  name_ar: string;
  brand: string | null;
  model: string | null;
  price_egp: number;
  quantity_on_hand?: number;
};

export const metadata: Metadata = {
  title: "حاسبة تصميم نظام كاميرات المراقبة | Bein Store",
  description: "احسب سعة التخزين وعرض النطاق وعدد الأقراص المناسب لنظام كاميرات المراقبة قبل الشراء.",
  alternates: { canonical: "/system-planner" },
  robots: { index: true, follow: true }
};

function safeFilter(value: string) {
  return value.replace(/[,%()"'\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export default async function SystemPlannerPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = safeFilter(params.q ?? "");
  const supabase = await createClient();
  let cameras: CameraOption[] = [];
  let products: StoreProduct[] = [];
  let isAdmin = false;

  if (supabase) {
    if (q) {
      const cameraResult = await supabase.from("cctv_cameras")
        .select("id,brand,model,megapixels,camera_type,power_source")
        .or("brand.ilike.%" + q + "%,model.ilike.%" + q + "%")
        .order("brand").order("model").limit(24);
      cameras = (cameraResult.data ?? []) as CameraOption[];
      if (cameraResult.error) console.error("Planner camera search failed:", cameraResult.error.message);
    }

    const productResult = await supabase.from("products")
      .select("id,slug,name_ar,brand,model,price_egp")
      .eq("is_active", true).not("price_egp", "is", null)
      .order("name_ar").limit(200);
    products = (productResult.data ?? []) as StoreProduct[];
    if (productResult.error) console.error("Planner product lookup failed:", productResult.error.message);

    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      const { data: role } = await supabase.from("admin_roles")
        .select("user_id").eq("user_id", authData.user.id).eq("is_active", true).maybeSingle();
      isAdmin = Boolean(role?.user_id);
    }

    if (isAdmin && products.length) {
      const productIds = products.map((product) => product.id);
      const inventoryResult = await supabase.from("inventory")
        .select("product_id,quantity_on_hand").in("product_id", productIds);
      if (inventoryResult.error) {
        console.error("Planner inventory lookup failed:", inventoryResult.error.message);
      } else {
        const quantities = new Map((inventoryResult.data ?? []).map((row) => [row.product_id, row.quantity_on_hand]));
        products = products.map((product) => ({ ...product, quantity_on_hand: quantities.get(product.id) ?? 0 }));
      }
    }
  }

  return (
    <>
      <div className="planner-search-strip" dir="rtl">
        <form action="/system-planner">
          <label htmlFor="planner-camera-search">ابحث عن موديل كاميرا في الدليل</label>
          <div><input id="planner-camera-search" name="q" defaultValue={q} placeholder="Hikvision DS-2CD أو Dahua IPC..." /><button type="submit">بحث في الدليل</button></div>
        </form>
        {q && <p>{cameras.length ? "تم العثور على " + cameras.length + " موديل مطابق." : "لم يتم العثور على موديلات مطابقة. جرّب اسم الماركة أو رقم الموديل."}</p>}
        {!q && <p>ابدأ بالبحث عن موديلك، أو استخدم المواصفات العامة في الحاسبة.</p>}
        <Link href="/cctv-database">فتح الدليل الكامل ←</Link>
      </div>
      <SystemPlanner cameras={cameras} products={products} isAdmin={isAdmin} />
    </>
  );
}
