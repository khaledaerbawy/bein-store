# إعداد أتمتة فيسبوك المجانية

## التشغيل
- 3 تشغيلات يوميًا عبر GitHub Actions، وكل تشغيل يستهدف صفحة واحدة من كل ثلاث صفحات = 9 منشورات يوميًا.
- النشر يستخدم Meta Graph API الرسمي عبر Page Photos endpoint؛ يتطلب Page Access Token وصلاحيات `pages_manage_posts` و`pages_read_engagement` و`pages_show_list` حسب متطلبات التطبيق.
- الصور PNG مصممة في تشغيل سحابي باستخدام HTML/CSS؛ النصوص عربية جاهزة وليست مولدة عبر API مدفوع.
- لا تعتمد الأتمتة على بقاء الكمبيوتر مفتوحًا.

## أسرار GitHub المطلوبة
أضفها من Settings → Secrets and variables → Actions في المستودع:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `META_PAGE_1_ID`, `META_PAGE_1_ACCESS_TOKEN`, `META_PAGE_2_ID`, `META_PAGE_2_ACCESS_TOKEN`, `META_PAGE_3_ID`, `META_PAGE_3_ACCESS_TOKEN`.

لا تضع أي مفتاح سري داخل الكود أو متغير يبدأ بـ `NEXT_PUBLIC_`. أضف أسماء الصفحات كمتغيرات اختيارية `META_PAGE_1_LABEL` إلى `META_PAGE_3_LABEL`، وإصدار Graph API في `META_GRAPH_VERSION`.

## قاعدة البيانات ولوحة التحكم
طبّق migration `supabase/migrations/202610150003_free_social_automation.sql` على مشروع Supabase المتصل. صفحة اللوحة في `/social`. أبقِ الأتمتة متوقفة حتى تضبط الأسرار وتختبر تشغيلًا يدويًا من Actions.

## حدود الخطة المجانية
- GitHub Free للمستودعات الخاصة يضم 2,000 دقيقة Actions شهريًا؛ إذا انتهت الحصة دون وسيلة دفع، تتوقف التشغيلات بدل فرض دفع تلقائيًا. وقت تثبيت Chromium قد يستهلك جزءًا ملحوظًا من الحصة. المصدر: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Supabase Free يضم 500 MB لقاعدة البيانات و1 GB لتخزين الملفات و5 GB نقل بيانات وفق صفحة الأسعار، وقد يوقف المشروع بعد أسبوع من النشاط المنخفض؛ قد تحتاج إلى فتح لوحة Supabase أو تنفيذ طلبات دورية. المصدر: https://supabase.com/docs/guides/platform/free-project-pausing
- Meta قد يرفض النشر بسبب الصلاحيات أو صلاحية التوكن أو سياسات المنصة. endpoint الصور يقبل PNG ويتطلب صلاحية نشر الصفحة؛ راجع وثائق Meta الحالية: https://developers.facebook.com/docs/graph-api/
- لا يوجد AI صور أو نصوص غير محدود مجانًا في هذا التصميم؛ الصور قوالب مرئية آلية والنصوص قوالب توعوية. لا بطاقة دفع ولا اشتراك مدفوع.
- التوقيت في cron هو UTC وقد يتغير فرق الساعة مع التوقيت الصيفي في مصر.
