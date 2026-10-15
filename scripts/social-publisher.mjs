import { chromium } from "playwright";

const SUPABASE_URL = required("SUPABASE_URL").replace(/\/$/, "");
const SERVICE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");
const GRAPH_VERSION = (process.env.META_GRAPH_VERSION || "v24.0").replace(/^\/?/, "");
const RUN_KEY = required("GITHUB_RUN_ID");
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required GitHub secret/environment: ${name}`);
  return value;
}

const topicBank = [
  {
    key: "camera-placement",
    title: "اختيار مكان الكاميرا",
    caption: "📹 مكان تركيب الكاميرا بيفرق جدًا في وضوح الصورة. اختار زاوية تغطي المدخل أو المساحة المهمة، وراعي الإضاءة وتجنب توجيه العدسة لمصدر ضوء مباشر.\n\nمحتاج مساعدة في اختيار المكان أو النظام المناسب؟ ابعتلنا رسالة.\n\n#كاميرات_مراقبة #أنظمة_أمنية #BeinStore",
    image: "زاوية تركيب مناسبة",
  },
  {
    key: "night-vision",
    title: "رؤية أوضح بالليل",
    caption: "🌙 قبل ما تختار كاميرا للرؤية الليلية، راجع مساحة المكان والإضاءة المحيطة والمسافة المطلوبة. المواصفات المناسبة بتختلف من مكان للتاني.\n\nاسألنا عن الاختيارات المناسبة لاحتياجك قبل الشراء.\n\n#كاميرات_مراقبة #رؤية_ليلية #BeinStore",
    image: "رؤية ليلية",
  },
  {
    key: "recording-storage",
    title: "التسجيل والتخزين",
    caption: "💾 سعة التخزين ومدة الاحتفاظ بالتسجيل بتعتمد على عدد الكاميرات والدقة ومعدل التسجيل. اختيار الهارد المناسب جزء أساسي من النظام.\n\nلو محتاج تحسب سعة التخزين، ابعتلنا عدد الكاميرات والدقة ومدة التسجيل المطلوبة.\n\n#NVR #DVR #تخزين #BeinStore",
    image: "تسجيل وتخزين",
  },
  {
    key: "poe",
    title: "تبسيط التوصيلات",
    caption: "🔌 تقنية PoE ممكن تنقل البيانات والطاقة عبر كابل شبكة واحد في الأنظمة المتوافقة، وده بيساعد في تنظيم التركيب. اتأكد من توافق الكاميرا والسويتش وقدرة الطاقة قبل التوصيل.\n\n#PoE #شبكات #كاميرات_مراقبة #BeinStore",
    image: "شبكة وتوصيلات",
  },
  {
    key: "camera-resolution",
    title: "اختار الدقة حسب المكان",
    caption: "🎯 مش كل مكان محتاج نفس دقة الكاميرا. مساحة المشهد، المسافة، وتفاصيل الصورة اللي محتاج تراجعها كلها عوامل مهمة في الاختيار.\n\nقولنا طبيعة المكان وهنساعدك تقارن بين الاختيارات المتاحة.\n\n#كاميرات_مراقبة #دقة_الصورة #BeinStore",
    image: "دقة تناسب احتياجك",
  },
  {
    key: "maintenance",
    title: "مراجعة النظام بشكل دوري",
    caption: "🛠️ مراجعة الكاميرات والتوصيلات والتسجيل كل فترة بتساعدك تكتشف المشاكل بدري. اتأكد إن الوقت والتاريخ مضبوطين وإن التسجيل شغال وإن العدسات نظيفة.\n\n#صيانة #أنظمة_مراقبة #BeinStore",
    image: "متابعة وصيانة",
  },
  {
    key: "network",
    title: "شبكة مستقرة لنظامك",
    caption: "🌐 استقرار شبكة كاميرات IP بيتأثر بتصميم الشبكة وجودة الكابلات وسعة السويتش. خطط للتوصيلات وعدد الأجهزة قبل التنفيذ لتجنب الأعطال.\n\n#كاميرات_IP #شبكات #BeinStore",
    image: "شبكة أكثر تنظيمًا",
  },
  {
    key: "choose-system",
    title: "ابدأ بتحديد احتياجك",
    caption: "✅ قبل شراء نظام مراقبة، حدد عدد النقاط، أماكن التركيب، هل تحتاج تسجيل مستمر، ومدة الاحتفاظ بالفيديو. الخطوات دي بتسهل اختيار المكونات المناسبة من البداية.\n\nابعتلنا التفاصيل ونساعدك ترتب احتياجك.\n\n#نظام_مراقبة #كاميرات #BeinStore",
    image: "نظام حسب احتياجك",
  },
  {
    key: "privacy",
    title: "تركيب مسؤول وآمن",
    caption: "🔒 عند تركيب كاميرات المراقبة، احترم خصوصية الآخرين ووجّه العدسات للمساحات المسموح بمراقبتها، وغيّر كلمات المرور الافتراضية واستخدم كلمة مرور قوية.\n\n#أمان_رقمي #خصوصية #كاميرات_مراقبة #BeinStore",
    image: "أمان وخصوصية",
  },
];

const pageSlots = [
  { slot: 1, id: process.env.META_PAGE_1_ID, token: process.env.META_PAGE_1_ACCESS_TOKEN, label: process.env.META_PAGE_1_LABEL || "صفحة فيسبوك 1" },
  { slot: 2, id: process.env.META_PAGE_2_ID, token: process.env.META_PAGE_2_ACCESS_TOKEN, label: process.env.META_PAGE_2_LABEL || "صفحة فيسبوك 2" },
  { slot: 3, id: process.env.META_PAGE_3_ID, token: process.env.META_PAGE_3_ACCESS_TOKEN, label: process.env.META_PAGE_3_LABEL || "صفحة فيسبوك 3" },
];

async function supabase(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...HEADERS, ...(options.headers || {}) },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

function getTopic(day, slot) {
  return topicBank[(day * 3 + slot - 1) % topicBank.length];
}

function makeHtml(brand, topic, slot) {
  const safe = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const accent = ["#b9f36b", "#64d8cb", "#8bb7ff"][slot - 1];
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;font-family:Arial,Tahoma,sans-serif}
    body{background:#101a18;color:#fff;overflow:hidden}
    .card{width:1200px;height:630px;position:relative;padding:68px 76px;background:radial-gradient(circle at 18% 20%,#2c4a40 0,transparent 42%),linear-gradient(135deg,#101a18 0%,#1b302a 55%,#203b34 100%);display:flex;flex-direction:column;justify-content:space-between}
    .orb{position:absolute;width:410px;height:410px;border:1px solid rgba(255,255,255,.13);border-radius:50%;left:-90px;bottom:-150px}
    .orb:after{content:"";position:absolute;inset:38px;border:1px solid rgba(255,255,255,.11);border-radius:50%}
    .top{display:flex;align-items:center;gap:18px;font-size:25px;font-weight:700;letter-spacing:.5px}
    .mark{width:58px;height:58px;background:${accent};color:#15201d;border-radius:18px;display:grid;place-items:center;font-size:34px;font-weight:900}
    .eyebrow{font-size:22px;color:${accent};margin-bottom:22px;font-weight:700}
    h1{font-size:54px;line-height:1.3;max-width:850px;margin:0 0 20px;font-weight:800}
    .desc{font-size:28px;color:#d5e3db;max-width:760px;line-height:1.6}
    .bottom{display:flex;align-items:center;justify-content:space-between;color:#b4c7bd;font-size:20px}
    .pill{border:1px solid ${accent};color:${accent};padding:12px 22px;border-radius:40px}
    .camera{position:absolute;left:115px;top:205px;width:300px;height:210px;opacity:.14;transform:rotate(-12deg)}
  </style></head><body><div class="card"><div class="orb"></div>
  <div class="camera"><svg viewBox="0 0 300 210" width="300" height="210"><path fill="#fff" d="M40 55h150a22 22 0 0 1 22 22v52a22 22 0 0 1-22 22H40a22 22 0 0 1-22-22V77a22 22 0 0 1 22-22z"/><path fill="#fff" d="M212 76l65-29v112l-65-29z"/><circle cx="74" cy="103" r="32" fill="#203b34"/><circle cx="74" cy="103" r="21" fill="#fff"/><path fill="#fff" d="M75 151l45 50h40l-42-55z"/></svg></div>
  <div class="top"><span class="mark">B</span><span>${safe(brand)}</span></div>
  <div><div class="eyebrow">حلول مراقبة وشبكات</div><h1>${safe(topic.title)}</h1><div class="desc">${safe(topic.image)}</div></div>
  <div class="bottom"><span>معلومة تساعدك تختار صح</span><span class="pill">اسألنا عن التفاصيل</span></div></div></body></html>`;
}

async function renderImage(brand, topic, slot) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.setContent(makeHtml(brand, topic, slot), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    return await page.locator(".card").screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}

async function publishPhoto(pageSlot, topic, caption, image) {
  const form = new FormData();
  form.append("caption", caption);
  form.append("published", "true");
  form.append("access_token", pageSlot.token);
  form.append("source", new Blob([image], { type: "image/png" }), "bein-social-post.png");
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pageSlot.id}/photos`, {
    method: "POST",
    body: form,
  });
  const result = await response.json();
  if (!response.ok || result.error) {
    throw new Error(result.error?.message || `Meta Graph API returned ${response.status}`);
  }
  return result.id || result.post_id || null;
}

async function main() {
  const settingsRows = await supabase("social_automation_settings?select=enabled,brand_name&id=eq.1&limit=1");
  const settings = settingsRows?.[0];
  if (!settings?.enabled) {
    console.log("Social automation is paused in the dashboard; nothing was published.");
    return;
  }

  for (const pageSlot of pageSlots) {
    if (!pageSlot.id || !pageSlot.token) {
      console.error(`Page slot ${pageSlot.slot} is not configured; skipping this page.`);
      continue;
    }

    const existing = await supabase(
      `social_publish_logs?select=status,meta_post_id&run_key=eq.${encodeURIComponent(RUN_KEY)}&page_slot=eq.${pageSlot.slot}&limit=1`
    );
    if (existing?.[0]?.status === "published") {
      console.log(`Page slot ${pageSlot.slot} already published for run ${RUN_KEY}; skipping retry.`);
      continue;
    }

    const day = Math.floor(Date.now() / 86400000);
    const topic = getTopic(day, pageSlot.slot);
    const caption = topic.caption.replaceAll("#BeinStore", "#BeinStore");
    const logRow = {
      run_key: RUN_KEY,
      page_slot: pageSlot.slot,
      page_id: pageSlot.id,
      page_label: pageSlot.label,
      caption,
      topic_key: topic.key,
      status: "pending",
      error_message: null,
    };

    await supabase("social_publish_logs?on_conflict=run_key,page_slot", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(logRow),
    });

    try {
      const image = await renderImage(settings.brand_name || "Bein Store", topic, pageSlot.slot);
      const postId = await publishPhoto(pageSlot, topic, caption, image);
      await supabase(`social_publish_logs?run_key=eq.${encodeURIComponent(RUN_KEY)}&page_slot=eq.${pageSlot.slot}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "published", meta_post_id: postId, published_at: new Date().toISOString(), error_message: null }),
      });
      console.log(`Published to ${pageSlot.label}; topic=${topic.key}; id=${postId || "unknown"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await supabase(`social_publish_logs?run_key=eq.${encodeURIComponent(RUN_KEY)}&page_slot=eq.${pageSlot.slot}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "failed", error_message: message.slice(0, 1000) }),
      });
      console.error(`Failed to publish to ${pageSlot.label}: ${message}`);
      throw error;
    }
  }
}

await main();
