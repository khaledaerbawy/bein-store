"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StorageCalc from "@/lib/cctv/calc";

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

const formatNumber = (value: number, digits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(Number.isFinite(value) ? value : 0);
const formatPrice = (value: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(value);

function resolutionFromMegapixels(value: number | null) {
  if (!value) return "4MP";
  if (value <= 1) return "1MP";
  if (value <= 2.5) return "2MP";
  if (value <= 3.5) return "3MP";
  if (value <= 4.5) return "4MP";
  if (value <= 5.5) return "5MP";
  if (value <= 7) return "6MP";
  if (value <= 10) return "8MP";
  return "12MP";
}

export default function SystemPlanner({
  cameras,
  products,
  isAdmin
}: {
  cameras: CameraOption[];
  products: StoreProduct[];
  isAdmin: boolean;
}) {
  const [cameraId, setCameraId] = useState("");
  const [quantity, setQuantity] = useState(8);
  const [resolution, setResolution] = useState("2MP");
  const [codec, setCodec] = useState("h265");
  const [fps, setFps] = useState(15);
  const [recordingMode, setRecordingMode] = useState("continuous");
  const [hours, setHours] = useState(12);
  const [scene, setScene] = useState("medium");
  const [nightIr, setNightIr] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);
  const [diskSize, setDiskSize] = useState(8);
  const [raid, setRaid] = useState("raid6");
  const [copied, setCopied] = useState(false);

  const selectedCamera = cameras.find((camera) => camera.id === cameraId) ?? null;

  const projectResult = useMemo(() => {
    const group = {
      ...StorageCalc.newGroup(1),
      name: selectedCamera ? selectedCamera.brand + " " + selectedCamera.model : "كاميرات النظام",
      qty: quantity,
      resolution,
      codec,
      quality: "medium",
      fps,
      nightFps: "",
      scene,
      mode: recordingMode,
      hours: recordingMode === "scheduled" ? hours : 24,
      nightIR: nightIr,
      audio: false,
      measuredMbps: "",
      switch: "",
      poeW: "",
      target: "recorder",
      recorder: "r1",
      sdGB: "",
      preset: ""
    };
    const project = {
      name: "Bein Store system plan",
      retentionDays,
      headroom: 1.2,
      nightHours: 12,
      evidential: true,
      archive: { enabled: false, hotDays: "" },
      internetUploadMbps: "",
      method: "bitrate",
      compressionRatios: { ...StorageCalc.DEFAULT_COMPRESSION_RATIOS },
      liveStreams: 0,
      liveStreamType: "sub",
      playbackStreams: 0,
      viewingLinkMbps: "",
      switches: [],
      recorders: [{
        id: "r1",
        name: "NVR / DVR",
        diskTB: diskSize,
        raid,
        bays: "",
        inboundMbps: "",
        arrayMode: "design",
        existingDisks: ""
      }]
    };
    return StorageCalc.calculateProject(project, [group]);
  }, [selectedCamera, quantity, resolution, codec, fps, recordingMode, hours, scene, nightIr, retentionDays, diskSize, raid]);

  const matchedProducts = useMemo(() => {
    if (!selectedCamera) return [];
    const brand = selectedCamera.brand.trim().toLocaleLowerCase();
    const model = selectedCamera.model.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const productBrand = (product.brand ?? "").trim().toLocaleLowerCase();
      const productModel = (product.model ?? "").trim().toLocaleLowerCase();
      return productBrand === brand || (productModel && (productModel === model || model.includes(productModel)));
    }).slice(0, 8);
  }, [selectedCamera, products]);

  const summary = [
    "Bein Store — ملخص تصميم نظام مراقبة",
    "الكاميرا: " + (selectedCamera ? selectedCamera.brand + " " + selectedCamera.model : "مواصفات عامة"),
    "عدد الكاميرات: " + quantity,
    "الدقة: " + resolution + " | الترميز: " + codec.toUpperCase() + " | FPS: " + fps,
    "مدة الاحتفاظ: " + retentionDays + " يوم",
    "التخزين الخام: " + formatNumber(projectResult.totals.rawTB, 2) + " TB",
    "السعة المطلوبة بالاحتياطي: " + formatNumber(projectResult.totals.requiredTB, 2) + " TB",
    "التوصية: " + projectResult.recorders[0].array.totalDisks + " × " + diskSize + " TB (" + projectResult.recorders[0].array.raidLabel + ")",
    "معدل البيانات: " + formatNumber(projectResult.totals.aggregateMbps, 2) + " Mbps",
    "سرعة التسجيل المطلوبة: " + formatNumber(projectResult.totals.minRecorderMbps, 2) + " Mbps"
  ].join("\n");

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function chooseCamera(id: string) {
    setCameraId(id);
    const camera = cameras.find((item) => item.id === id);
    if (camera) setResolution(resolutionFromMegapixels(camera.megapixels));
  }

  const row = projectResult.rows[0];
  const recorder = projectResult.recorders[0];
  const array = recorder.array;

  return (
    <main className="planner-page" dir="rtl">
      <header className="planner-header">
        <Link href="/" className="planner-back">← العودة إلى Bein Store</Link>
        <span>BEIN STORE <i>·</i> SYSTEM DESIGNER</span>
      </header>
      <section className="planner-hero">
        <p className="planner-eyebrow">أداة تخطيط فني لأنظمة المراقبة</p>
        <h1>صمّم نظامك قبل <em>ما تشتري</em></h1>
        <p>احسب التخزين وعرض النطاق واختيار الأقراص بناءً على عدد الكاميرات والدقة ومدة التسجيل. الأرقام تقديرية وتحتاج مراجعة مواصفات الأجهزة الفعلية.</p>
        <div className="planner-hero-links">
          <Link href="/cctv-database">استكشف قاعدة بيانات الكاميرات ↗</Link>
          <span>الأسعار والمخزون منفصلان عن الدليل الفني</span>
        </div>
      </section>

      <section className="planner-layout">
        <div className="planner-form-card">
          <div className="planner-section-heading"><span>01</span><div><h2>مواصفات النظام</h2><p>اختار موديل من الدليل أو أدخل مواصفات عامة</p></div></div>
          <label className="planner-field planner-wide">
            <span>موديل الكاميرا من قاعدة البيانات</span>
            <select value={cameraId} onChange={(event) => chooseCamera(event.target.value)}>
              <option value="">مواصفات عامة / اختيار يدوي</option>
              {cameras.map((camera) => <option value={camera.id} key={camera.id}>{camera.brand} — {camera.model}</option>)}
            </select>
            {selectedCamera && <small>الدقة المسجلة: {selectedCamera.megapixels ?? "غير محددة"} MP · النوع: {selectedCamera.camera_type ?? "غير محدد"}</small>}
          </label>
          <div className="planner-fields-grid">
            <label className="planner-field"><span>عدد الكاميرات</span><input type="number" min="1" max="256" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(256, Number(e.target.value) || 1)))} /></label>
            <label className="planner-field"><span>الدقة</span><select value={resolution} onChange={(e) => setResolution(e.target.value)}>{StorageCalc.RESOLUTIONS.filter((item: any) => !item.coax).map((item: any) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="planner-field"><span>ضغط الفيديو</span><select value={codec} onChange={(e) => setCodec(e.target.value)}>{StorageCalc.CODECS.filter((item: any) => item.id !== "mjpeg").map((item: any) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="planner-field"><span>معدل الإطارات FPS</span><select value={fps} onChange={(e) => setFps(Number(e.target.value))}>{[10,12,15,20,25,30].map((v) => <option key={v} value={v}>{v} FPS</option>)}</select></label>
            <label className="planner-field"><span>طريقة التسجيل</span><select value={recordingMode} onChange={(e) => setRecordingMode(e.target.value)}><option value="continuous">مستمر 24 ساعة</option><option value="scheduled">حسب جدول</option><option value="motion-medium">حركة — نشاط متوسط</option><option value="motion-low">حركة — نشاط منخفض</option><option value="motion-high">حركة — نشاط مرتفع</option></select></label>
            {recordingMode === "scheduled" && <label className="planner-field"><span>ساعات التسجيل يوميًا</span><input type="number" min="1" max="24" value={hours} onChange={(e) => setHours(Math.max(1, Math.min(24, Number(e.target.value) || 1)))} /></label>}
            <label className="planner-field"><span>حركة المشهد</span><select value={scene} onChange={(e) => setScene(e.target.value)}><option value="low">منخفضة — ممرات ومخازن</option><option value="medium">متوسطة — مكاتب ومحلات</option><option value="high">مرتفعة — شارع ومداخل</option></select></label>
            <label className="planner-field"><span>الاحتفاظ بالتسجيل</span><select value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value))}>{[7,15,30,45,60,90,120].map((v) => <option key={v} value={v}>{v} يوم</option>)}</select></label>
            <label className="planner-field"><span>حجم الهارد الواحد</span><select value={diskSize} onChange={(e) => setDiskSize(Number(e.target.value))}>{[2,4,6,8,10,12,14,16,18,20,22,24].map((v) => <option key={v} value={v}>{v} TB</option>)}</select></label>
            <label className="planner-field"><span>نظام الأقراص</span><select value={raid} onChange={(e) => setRaid(e.target.value)}>{StorageCalc.RAID_LEVELS.map((item: any) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          </div>
          <label className="planner-check"><input type="checkbox" checked={nightIr} onChange={(e) => setNightIr(e.target.checked)} /><span>تشغيل الرؤية الليلية بالأشعة تحت الحمراء</span></label>
        </div>

        <aside className="planner-results">
          <div className="planner-section-heading"><span>02</span><div><h2>نتيجة التصميم</h2><p>تقدير فوري حسب مدخلاتك</p></div></div>
          <div className="planner-main-metric"><small>السعة المطلوبة مع الاحتياطي</small><strong>{formatNumber(projectResult.totals.requiredTB, 2)} <i>TB</i></strong><span>قبل اختيار عدد الأقراص النهائي</span></div>
          <div className="planner-metrics-grid">
            <div><small>عدد الكاميرات</small><b>{quantity}</b></div>
            <div><small>تخزين يومي</small><b>{formatNumber(row.gbPerDay, 1)} GB</b></div>
            <div><small>الترافيك الكلي</small><b>{formatNumber(projectResult.totals.aggregateMbps, 1)} Mbps</b></div>
            <div><small>معدل التسجيل المطلوب</small><b>{formatNumber(projectResult.totals.minRecorderMbps, 1)} Mbps</b></div>
          </div>
          <div className="planner-disk-recommendation">
            <small>توصية الأقراص حسب RAID</small>
            <strong>{array.totalDisks} × {diskSize} TB</strong>
            <span>{array.raidLabel} · سعة فعلية {formatNumber(array.usableTB, 1)} TB ({formatNumber(array.usableTiB, 1)} TiB)</span>
            <span>احتفاظ متوقع تقريبي: {formatNumber(recorder.expectedRetentionDays, 0)} يوم</span>
          </div>
          <button type="button" className="planner-copy" onClick={copySummary}>{copied ? "✓ تم نسخ ملخص التصميم" : "نسخ ملخص التصميم"}</button>
        </aside>
      </section>

      <section className="planner-products">
        <div className="planner-section-heading"><span>03</span><div><h2>منتجات Bein Store المرتبطة</h2><p>مطابقة اسم الماركة أو الموديل مع المنتجات المسعّرة في المتجر</p></div></div>
        {!selectedCamera ? <p className="planner-empty">ابحث عن موديل كاميرا بالأعلى لعرض المنتجات التجارية المرتبطة به.</p> :
          matchedProducts.length === 0 ? <p className="planner-empty">لا يوجد حاليًا منتج نشط ومسعّر مطابق لهذا الموديل في المتجر. موديل الدليل مرجع فني فقط وليس منتجًا للبيع.</p> :
          <div className="planner-product-grid">{matchedProducts.map((product) => <article className="planner-product" key={product.id}>
            <small>{product.brand ?? "BEIN STORE"} {product.model ? "· " + product.model : ""}</small>
            <h3><Link href={"/products/" + product.slug}>{product.name_ar}</Link></h3>
            <strong>{formatPrice(Number(product.price_egp))}</strong>
            {isAdmin ? <span className={Number(product.quantity_on_hand ?? 0) > 0 ? "planner-stock-ok" : "planner-stock-out"}>{Number(product.quantity_on_hand ?? 0) > 0 ? "المخزون: " + product.quantity_on_hand + " قطعة" : "نفد المخزون"}</span> : <span className="planner-stock-private">يتم تأكيد التوافر مع المتجر</span>}
          </article>)}</div>}
        <p className="planner-inventory-note">{isAdmin ? "بيانات المخزون المعروضة هنا للمدير فقط، وتُقرأ من جدول inventory دون تعديل." : "كميات المخزون الداخلية غير معروضة للزوار؛ لا يتم كشف أرقام المخزون العامة."}</p>
      </section>
      <footer className="planner-disclaimer">الحاسبة أداة تقدير أولي وليست اعتمادًا هندسيًا نهائيًا. استخدم معدل البت المقاس من الكاميرا أو حاسبة الشركة المصنّعة عند توفره، وراجع قدرة الـNVR والسويتش ومواصفات الهارد قبل الشراء.</footer>
    </main>
  );
}
