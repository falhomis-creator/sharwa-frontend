# M28 — الأسواق الإلكترونية: أمازون ونون (Marketplaces)

**Route group**: `(dashboard)` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`marketplaces_hub`, Amazon OAuth, `noon_connect`, settings, `marketplace_pull_orders_now`, `marketplace_refresh_fba_inventory`, `marketplace_listings*`, `marketplace_sync_jobs*`)
**Discovery refs**: `02-products-domain-model.md` §14.B (MarketplaceSettings, MarketplaceListing, MarketplaceSyncJob, MarketplaceFeed, MarketplaceOrderDetail), §3 (`traffic_source` `amazon` · `noon`), §10 (صلاحية `channels.marketplaces.manage`) · `01-tenants-dashboard-admin.md` §3.2 (Marketplaces), §4 («الأسواق الإلكترونية (أمازون، نون)»), §7 (ميزة `marketplaces`) · `03-*.md` §8 (`AMAZON_SP_APP_ID`) · M06 §3 (طلبات الأسواق محجوبة التغيير) · **Benchmarks**: Zid App Market (ربط سوق خارجي بخطوات واضحة)، Shopify Marketplace Connect (جدول القوائم بحالة المزامنة، سجل المهام، أخطاء قابلة للتنزيل)

## 1. الهدف (Purpose)

تمكين التاجر من ربط حساب أمازون (SP-API) ونون، ونشر منتجاته بهوامش وعملة مناسبة، ومتابعة المزامنة والطلبات الواردة من الأسواق في مكان واحد مع تشخيص أخطاء واضح. يُقاس بنسبة القوائم `synced` وبزمن تشخيص خطأ المزامنة.

## 2. الفاعلون (Actors)

- **مالك المتجر / موظف بصلاحية `channels.marketplaces.manage`**: يربط الحسابات، يضبط الإعدادات، يُدير القوائم ويشغّل المهام.
- **النظام**: يشغّل مهام المزامنة المجدولة، يسحب الطلبات، يحدّث حالات القوائم.
- **السوق الخارجي**: يُنفّذ الطلبات (`fulfillment=marketplace`) أو يتركها للتاجر (`merchant`).

## 3. قصص المستخدم (User Stories)

### US-28.1 — ربط أمازون ونون (P1)
يربط التاجر أمازون عبر OAuth (SP-API) ونون عبر مفتاح API، ويرى حالة الربط وآخر مزامنة لكل سوق.
**Independent Test**: صفحة الأسواق تعرض صفَّين (أمازون، نون) بحالة وزر مناسب؛ مفتاح نون لا يُعرض بعد الحفظ.
**Acceptance**:
1. **Given** أمازون غير مربوط، **When** يُضغط «ربط أمازون»، **Then** يُحوَّل إلى مسار OAuth الخادمي ويعود بحالة محدَّثة.
2. **Given** نون، **When** يُدخل مفتاح API ويُحفظ، **Then** يُعرض «مربوط» وتاريخ الربط، ويُخفى المفتاح.

### US-28.2 — إعدادات السوق (P1)
يضبط التاجر لكل سوق: نسبة الهامش، العملة (`SAR` · `AED`)، سعر الصرف، النشر الآلي، مزامنة المخزون، احتياطي المخزون، سحب الطلبات، والحالة الافتراضية للطلب الوارد.
**Acceptance**:
1. **Given** نموذج الإعدادات، **When** يُحفظ، **Then** تُعرض معاينة سعر منتج نموذجي بعد الهامش والصرف كما يحسبها الخادم (لا حساب محلي).
2. **Given** `auto_push` مفعّل، **Then** يُعرض تنبيه هادئ «ستُنشر المنتجات الجديدة المؤهلة تلقائياً».

### US-28.3 — القوائم (Listings) (P1)
يرى التاجر منتجاته لكل سوق مع المعرّف (`asin` · `nsku` · `ean` · `upc` · `gtin`) وحالة المزامنة، يُدخل المعرّفات الناقصة، يتجاوز السعر لمنتج، ويدفع (push) فردياً أو جماعياً.
**Independent Test**: فلتر `needs_identifier` يعرض المنتجات بلا معرّف؛ إدخال GTIN وحفظه ينقلها إلى `pending`.
**Acceptance**:
1. **Given** 300 منتج، **When** تُفتح القوائم، **Then** جدول مرقَّم بالأعمدة: المنتج، SKU (Mono)، نوع المعرّف + قيمته (Mono، حقل تحرير سطري)، السعر على السوق (`display_*`)، تجاوز السعر، الحالة (نقطة + نص)، آخر مزامنة.
2. **Given** قائمة `failed`, **When** يُوسَّع الصف، **Then** يُعرض سبب الفشل من الخادم وزر «إعادة الدفع».
3. **Given** 25 قائمة محددة، **When** يُختار «دفع»، **Then** معاينة بالعدد ثم تُنشأ `MarketplaceSyncJob(catalog_push)` ويُعرض رابط المهمة.
4. **Given** تجاوز سعر، **When** يُحفظ، **Then** يُعرض بجوار السعر المحسوب بشارة «يدوي» وإمكانية الإزالة.

### US-28.4 — مهام المزامنة (P1)
يرى التاجر سجل المهام بالنوع والحالة والمُطلِق ومدة التنفيذ، يفتح مهمة لرؤية الملخص وينزّل CSV الأخطاء، ويشغّل يدوياً: سحب الطلبات الآن، تحديث مخزون FBA.
**Acceptance**:
1. **Given** مهمة `completed_with_errors`, **When** تُفتح، **Then** يُعرض عدد الناجح/الفاشل Mono وزر «تنزيل أخطاء CSV».
2. **Given** مهمة `running`, **Then** يُحدَّث صفّها كل 10 ثوانٍ حتى تنتهي.

### US-28.5 — طلبات الأسواق (P2)
يرى التاجر الطلبات الواردة من أمازون/نون مع نوع التنفيذ وحالة السوق وحالة تأكيد الشحنة، ويفتح الطلب في M06.
**Acceptance**:
1. **Given** طلب `fulfillment=marketplace` (FBA), **Then** يُعرض بشارة «ينفّذه السوق» وتُعطَّل إجراءات التنفيذ مع تلميح.
2. **Given** طلب `merchant` شُحن من M06/M39, **Then** تُعرض حالة تأكيد الشحنة للسوق كما يرسلها الخادم، مع زر «إعادة تأكيد» عند الفشل.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-28.01**: الوحدة MUST تُخفى حين تكون ميزة `marketplaces` معطّلة وتُقيَّد بصلاحية `channels.marketplaces.manage`.
- **FR-28.02**: شاشة الأسواق MUST تعرض كل سوق كصفّ (لا بطاقتَين متماثلتَين) بحالة الربط وآخر مهمة ومفاتيح تنقّل إلى الإعدادات/القوائم/المهام/الطلبات.
- **FR-28.03**: الإعدادات MUST تُحفظ لكل سوق على حدة بنموذج React Hook Form + Zod بالحقول الفعلية فقط؛ الأسرار لا تُعرض بعد الحفظ.
- **FR-28.04**: جدول القوائم MUST يدعم ترقيماً خادمياً، فلاتر `sync_status` و`identifier_type` و`q`، تحريراً سطرياً للمعرّف وتجاوز السعر، وإجراءات جماعية بمعاينة؛ الحالة في الرابط.
- **FR-28.05**: الأسعار على السوق MUST تُعرض من `display_*` الخادم بالعملة المختارة؛ يُمنع تطبيق الهامش/الصرف محلياً.
- **FR-28.06**: سجل المهام MUST يعرض 8 أنواع و5 حالات بتسميات عربية ثابتة، مع فلترة بالنوع/الحالة والمُطلِق، وتنزيل أخطاء CSV عبر رابط خادمي.
- **FR-28.07**: المهام `queued`/`running` MUST تُستطلع كل 10 ثوانٍ وتتوقف عند الانتهاء أو إخفاء التبويب.
- **FR-28.08**: طلبات الأسواق MUST تُعرض كجدول خاص يربط إلى M06 ويحترم حجب تغيير الحالة الذي يفرضه الخادم.
- **FR-28.09**: كل خطأ من السوق MUST يُعرض نصاً كما يرسله الخادم مع رمز الخطأ Mono، بلا تفسير محلي.

## 5. الكيانات والحالات (Key Entities & States)

- **MarketplaceSettings** (لكل `marketplace` `amazon` · `noon`): العملة `SAR` · `AED`، الهامش، سعر الصرف، النشر الآلي، مزامنة المخزون، احتياطي المخزون (`stock_buffer`)، سحب الطلبات، الحالة الافتراضية للطلب.
- **MarketplaceListing**: المنتج، `identifier_type` `asin` · `nsku` · `ean` · `upc` · `gtin`, قيمة المعرّف، تجاوز السعر، `sync_status`: `needs_identifier` يحتاج معرّفاً · `pending` قيد الانتظار · `synced` متزامن · `failed` فشل · `unpublished` غير منشور · `hidden_out_of_stock` مخفي لنفاد المخزون.
- **MarketplaceSyncJob**: `job_type` `catalog_push` دفع الكتالوج · `price_update` تحديث الأسعار · `inventory_update` تحديث المخزون · `order_pull` سحب الطلبات · `barcode_match` مطابقة الباركود · `feed_result` نتيجة الملف · `shipment_confirm` تأكيد الشحنة · `fba_inventory` مخزون FBA؛ `status` `queued` · `running` · `completed` · `completed_with_errors` · `failed`؛ المُطلِق، أخطاء CSV.
- **MarketplaceFeed**: ملف دفع مرتبط بمهمة. **MarketplaceOrderDetail**: `fulfillment` `marketplace` ينفّذه السوق · `merchant` ينفّذه التاجر؛ حالة السوق `pending` · `open` · `shipped` · `canceled` · `unknown`؛ حالة تأكيد الشحنة.
- قواعد: `needs_identifier → pending` عند إدخال معرّف؛ `pending → synced|failed` بعد الدفع؛ `hidden_out_of_stock` يعود `pending` عند توفر المخزون (خادم).

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/marketplaces` (صفّا أمازون/نون + آخر المهام) · `/dashboard/marketplaces/[market]/settings` · `/dashboard/marketplaces/[market]/listings` · `/dashboard/marketplaces/jobs` + `/jobs/[id]` · `/dashboard/marketplaces/orders`.
- **الحالات البصرية**: skeleton · فراغ «لم تربط أي سوق بعد» / «لا قوائم — ادفع منتجاتك الأولى» / «لا مهام بعد» · خطأ ربط (سبب الخادم + «إعادة الربط») · بلا صلاحية · الميزة معطّلة · مهمة جارية (نقطة نابضة هادئة بلا ألوان صاخبة).
- **الجوال**: جدول القوائم → بطاقات (منتج، معرّف Mono، حالة)؛ التحرير السطري → ورقة سفلية؛ الفلاتر في drawer.
- **اختصارات**: `⌘K` → «قائمة: <SKU>» / «مهمة #…»؛ `R` إعادة الدفع للصف المحدد.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| حالة الأسواق | `marketplaces_hub` HTML | `[NEEDS BACKEND]` → `GET /api/v1/marketplaces/` → `[{marketplace, connected, account_label, connected_at, last_job:{id,job_type,status,finished_at}}]` |
| ربط أمازون (OAuth) | مسار OAuth HTML | Ready كتحويل خادمي يعود إلى `/dashboard/marketplaces` |
| ربط/فصل نون | `noon_connect` POST | `[NEEDS BACKEND]` → `POST /api/v1/marketplaces/noon/connect/` `{api_key}`؛ `POST /api/v1/marketplaces/<market>/disconnect/` |
| إعدادات السوق | settings views | `[NEEDS BACKEND]` → `GET/PUT /api/v1/marketplaces/<market>/settings/` `{currency, markup_percent, fx_rate, auto_push, inventory_sync, stock_buffer, order_pull, default_order_status_id}` → + `preview:{display_sample_price}` |
| القوائم مفلترة | `marketplace_listings*` HTML | `[NEEDS BACKEND]` → `GET /api/v1/marketplaces/<market>/listings/?sync_status&identifier_type&q&page` → `{count, results:[{id, product:{id,name,sku,image}, identifier_type, identifier_value, display_market_price, price_override, sync_status, last_error, last_synced_at}]}` |
| تحرير معرّف / تجاوز سعر | `marketplace_listings*` POST | `[NEEDS BACKEND]` → `PATCH /api/v1/marketplaces/<market>/listings/<id>/` `{identifier_type?, identifier_value?, price_override?}` |
| دفع فردي/جماعي | `marketplace_listings*` POST | `[NEEDS BACKEND]` → `POST /api/v1/marketplaces/<market>/listings/push/` `{listing_ids:[]}` → `{job_id}` |
| سجل المهام + تفاصيل | `marketplace_sync_jobs*` HTML | `[NEEDS BACKEND]` → `GET /api/v1/marketplaces/jobs/?market&job_type&status&page`, `GET /jobs/<id>/` → `{…, success_count, error_count, errors_csv_url, triggered_by}` |
| سحب الطلبات الآن / مخزون FBA | `marketplace_pull_orders_now`, `marketplace_refresh_fba_inventory` POST | `[NEEDS BACKEND]` → `POST /api/v1/marketplaces/<market>/jobs/` `{job_type: order_pull\|fba_inventory}` → `{job_id}` |
| طلبات الأسواق | ضمن `order_list` بـ `traffic_source` | `[NEEDS BACKEND]` → `GET /api/v1/marketplaces/orders/?market&fulfillment&status&page` → `[{order_id, order_number, marketplace, external_order_id, fulfillment, marketplace_status, shipment_confirm_status, display_total, created_at}]` |
| إعادة تأكيد الشحنة | — | `[NEEDS BACKEND]` → `POST /api/v1/marketplaces/orders/<order_id>/confirm-shipment/` |

## 8. الحالات الحدّية (Edge Cases)

- منتج بلا باركود ولا GTIN: يبقى `needs_identifier`؛ يُقترح «مطابقة الباركود» (`barcode_match`) إن توفّر `barcode`.
- انتهاء صلاحية توكن أمازون: تُعرض حالة «يحتاج إعادة ربط» من الخادم وتُعطَّل أزرار الدفع مع تلميح.
- تغيير العملة بعد النشر: تحذير «سيُعاد حساب أسعار القوائم عند التحديث التالي».
- مهمة `running` لأكثر من المتوقع: يُعرض الزمن المنقضي Mono بلا إلغاء من الواجهة (لا endpoint إلغاء).
- طلب سوق بحالة `unknown`: يُعرض كما هو مع تلميح «لم يتعرّف النظام على حالة السوق».
- ملف أخطاء CSV غير متاح (منتهٍ): زر معطَّل مع تلميح.

## 9. معايير النجاح (Success Criteria)

- **SC-28.1**: من ربط السوق إلى أول مهمة دفع ≤ 5 دقائق لتاجر جديد.
- **SC-28.2**: تشخيص سبب فشل قائمة ≤ 2 نقرات (توسيع الصف).
- **SC-28.3**: جدول 300 قائمة يُرسم في < 1s؛ التحرير السطري للمعرّف يُحفظ في ≤ 1 طلب.
- **SC-28.4**: 100% من الأسعار المعروضة مطابقة لقيم الخادم؛ صفر حساب هامش محلي.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M03 (الشريط)، M18 (الصلاحيات)، M04 (المنتجات/الباركود)، M06 (تفاصيل الطلب وحجب الحالة)، M39 (الشحنات لتأكيد الشحن).
- افتراض: قيم «المُطلِق» و«حالة تأكيد الشحنة» تُؤخذ كما يرسلها الخادم في العقد؛ الواجهة لا تفترض enum لهما.
- افتراض: الحالة الافتراضية للطلب الوارد تُختار من `OrderStatus` التاجر (M06.5).
- افتراض: تنزيل CSV يتم برابط خادمي موقَّع، لا بتوليد محلي.
- افتراض: سوق واحد لكل نوع (حساب أمازون واحد، حساب نون واحد).

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا شعارات أمازون/نون كبيرة في بطاقات متماثلة؛ صفوف نصية بحالة ونقطة؛ حالات المزامنة نص + نقطة دلالية؛ لا شريط تقدّم متحرك بتدرج للمهام الجارية.
- II: المعرّفات (ASIN/GTIN) وSKU والأسعار Mono محاذاة نهاية داخل خلايا `dir="ltr"` معزولة؛ أعمدة الجدول تبدأ من اليمين؛ أسهم توسيع الصف تنعكس.
- IV: لقطات `docs/visual-checks/28-marketplaces/{desktop,tablet,mobile,desktop-dark}.png` لصفحة الأسواق، جدول القوائم مع صف `failed` موسَّع، وسجل المهام.
- IX: استطلاع المهام عبر TanStack Query بمفاتيح المستأجر؛ فلاتر القوائم عبر nuqs؛ Zod على كل استجابة.
