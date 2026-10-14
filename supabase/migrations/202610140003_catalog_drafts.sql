-- Initial catalog structure and draft records based on product models/names
-- previously mentioned for Bein Store. No prices, images, stock quantities,
-- or public product visibility are assumed.
with cat as (
  insert into public.categories (name_ar,name_en,slug,description_ar,description_en,is_active,sort_order)
  values
    ('كاميرات المراقبة','Security Cameras','security-cameras','كاميرات مراقبة داخلية وخارجية.','Indoor and outdoor security cameras.',true,1),
    ('أجهزة التسجيل DVR / NVR','DVR & NVR Recorders','recorders','أجهزة تسجيل أنظمة المراقبة.','Recording devices for surveillance systems.',true,2),
    ('الهاردات والتخزين','Storage','storage','وحدات تخزين لأنظمة المراقبة.','Storage drives for surveillance systems.',true,3),
    ('الشبكات والسويتشات','Networking & PoE','networking','سويتشات PoE ومستلزمات الشبكات.','PoE switches and networking equipment.',true,4),
    ('الكابلات والإكسسوارات','Cables & Accessories','cables-accessories','كابلات وملحقات تركيب أنظمة المراقبة.','Cables and accessories for CCTV installation.',true,5),
    ('خدمات التركيب','Installation Services','installation-services','خدمات تركيب أنظمة المراقبة عند الاتفاق.','Surveillance installation services.',true,6)
  on conflict (slug) do update set name_ar=excluded.name_ar,name_en=excluded.name_en,is_active=true,sort_order=excluded.sort_order
  returning id,slug
), draft_products as (
  select * from (values
    ('security-cameras','hikvision-camera-2mp','كاميرا Hikvision 2MP','Hikvision 2MP Camera','Hikvision',null::text,'كاميرا مراقبة بدقة 2 ميجابكسل. السعر والتوفر يحتاجان إلى تأكيد.'),
    ('security-cameras','hilook-camera-2mp','كاميرا HiLook 2MP','HiLook 2MP Camera','HiLook',null::text,'كاميرا مراقبة بدقة 2 ميجابكسل. السعر والتوفر يحتاجان إلى تأكيد.'),
    ('recorders','hilook-nvr-4ch-poe','جهاز NVR HiLook 4 قنوات PoE','HiLook 4-Channel PoE NVR','HiLook','4CH PoE','جهاز تسجيل شبكي لأربع قنوات. السعر والتوفر يحتاجان إلى تأكيد.'),
    ('recorders','hilook-nvr-8ch','جهاز NVR HiLook 8 قنوات','HiLook 8-Channel NVR','HiLook','8CH','جهاز تسجيل شبكي لثماني قنوات. السعر والتوفر يحتاجان إلى تأكيد.'),
    ('storage','hard-disk-1tb','هارد تخزين 1 تيرابايت','1TB Hard Drive','',null::text,'وحدة تخزين 1 تيرابايت. النوع والسعر والتوفر يحتاجون إلى تأكيد.'),
    ('storage','hard-disk-2tb','هارد تخزين 2 تيرابايت','2TB Hard Drive','WD',null::text,'وحدة تخزين 2 تيرابايت. السعر والتوفر يحتاجان إلى تأكيد.'),
    ('networking','hikvision-ds-xs10p','سويتش Hikvision DS-XS10P','Hikvision DS-XS10P Switch','Hikvision','DS-XS10P','السعر والتوفر يحتاجان إلى تأكيد.'),
    ('networking','hikvision-ds-3e1105p-ei-m-v2','سويتش Hikvision DS-3E1105P-EI/M V2','Hikvision DS-3E1105P-EI/M V2 Switch','Hikvision','DS-3E1105P-EI/M V2','السعر والتوفر يحتاجان إلى تأكيد.'),
    ('recorders','hikvision-ds-7632nxi-k2','جهاز Hikvision DS-7632NXI-K2','Hikvision DS-7632NXI-K2 Recorder','Hikvision','DS-7632NXI-K2','السعر والتوفر يحتاجان إلى تأكيد.'),
    ('cables-accessories','hilook-nc-1ln6u-cca-m','كابل HiLook NC-1LN6U/CCA/M','HiLook NC-1LN6U/CCA/M Cable','HiLook','NC-1LN6U/CCA/M','كابل شبكات/مراقبة. تأكيد النوع والسعر والتوفر مطلوب.'),
    ('cables-accessories','hdmi-extender-60m','موسع HDMI لمسافة 60 متر','60m HDMI Extender','',null::text,'موسع HDMI حتى 60 متر. السعر والتوفر يحتاجان إلى تأكيد.'),
    ('cables-accessories','camera-mount-60x120','حامل كاميرا 60×120','Camera Mount 60×120','',null::text,'حامل كاميرا. السعر والتوفر يحتاجان إلى تأكيد.'),
    ('cables-accessories','camera-power-supply','مزود طاقة للكاميرات','Camera Power Supply','',null::text,'مزود طاقة للكاميرات. المواصفات والسعر والتوفر تحتاج إلى تأكيد.'),
    ('installation-services','camera-installation','خدمة تركيب كاميرات المراقبة','CCTV Installation Service','',null::text,'خدمة تركيب يتم تسعيرها بعد تحديد الموقع وعدد الكاميرات.')
  ) as v(category_slug,slug,name_ar,name_en,brand,model,description_ar)
)
insert into public.products (category_id,slug,name_ar,name_en,brand,model,description_ar,description_en,price_egp,is_active,is_featured,image_urls,specifications)
select c.id,d.slug,d.name_ar,d.name_en,nullif(d.brand,''),d.model,d.description_ar,'Price and availability to be confirmed.',null,false,false,'{}','{}'::jsonb
from draft_products d join cat c on c.slug=d.category_slug
on conflict (slug) do nothing;
