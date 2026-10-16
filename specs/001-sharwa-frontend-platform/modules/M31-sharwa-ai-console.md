# M31 — وحدة تحكم شروة AI للدعم (Sharwa AI Support Console)

**Route group**: `(dashboard)` · **Priority**: P3 · **Backend status**: HTML-only `[NEEDS BACKEND]` (`sharwa_ai_*` تحت `/dashboard/apps/sharwa-ai/*`) + SSO إلى وحدة التحكم الخارجية (RS256 JWKS، `SHARWA_AI_CONSOLE_URL`)
**Discovery refs**: `02-products-domain-model.md` §14.G (SupportSession, SupportMessage, BotToolCallLog, SupportBotSettings), §10 (صلاحية `support.takeover_session`) · `01-tenants-dashboard-admin.md` §2.3 (تطبيق `sharwa_ai`), §3.1 (`sharwa-ai/commerce/*`, `.well-known/sharwa-ai-jwks.json`), §3.2 (Apps: `sharwa_ai_*`) · `03-*.md` §6 (webhooks `session-status` + `inbound-message`، SSO console), §8 (`SHARWA_AI_CONSOLE_URL`) · **Benchmarks**: Intercom Fin (تسليم المحادثة من البوت إلى الإنسان — بنسخة مقتضبة بلا رسوم توضيحية)، Linear (قائمة كثيفة بحالات نصية واختصارات)

## 1. الهدف (Purpose)

تمكين التاجر من تفعيل مساعد الدعم الآلي «شروة AI»، ضبط حدوده، ومراقبة جلسات الدعم الحية بحيث يتدخّل الموظف المصرَّح له في أي جلسة ويستردّها أو يعيدها للبوت، مع شفافية كاملة لما فعله البوت (سجل استدعاء الأدوات). يُقاس بزمن التدخّل البشري وبنسبة الجلسات المحلولة بالبوت.

## 2. الفاعلون (Actors)

- **مالك المتجر**: يربط التطبيق (M30)، يضبط `ai_enabled` والحد الأقصى للردود المتتابعة، يفتح وحدة التحكم الخارجية.
- **موظف بصلاحية `support.takeover_session`**: يستولي على جلسة، يردّ، يُعيدها للبوت أو يغلقها.
- **البوت (شروة AI)**: يردّ ويستدعي أدوات التجارة (`sharwa-ai/commerce/*`).
- **العميل / المسوّق / موظف داخلي**: طرف الجلسة بحسب `session_type`.
- **النظام**: يحدّث حالات الجلسات عبر webhooks ويحوّل إلى `escalated` عند تجاوز الحد.

## 3. قصص المستخدم (User Stories)

### US-31.1 — الربط والإعدادات (P1)
يرى التاجر حالة ربط شروة AI (مستطلَعة من الخادم)، يفعّل/يعطّل الذكاء الاصطناعي، ويضبط تجاوز الحد الأقصى للردود المتتابعة للبوت.
**Independent Test**: تعطيل `ai_enabled` ثم فتح قائمة الجلسات يعرض شريطاً «المساعد معطّل — الجلسات الجديدة تذهب للموظفين مباشرة».
**Acceptance**:
1. **Given** التطبيق مثبَّت غير مربوط، **When** تُفتح الصفحة، **Then** تُعرض حالة «جارٍ الربط» مع استطلاع كل 5 ثوانٍ حتى `connected` أو خطأ بسبب الخادم.
2. **Given** `max_consecutive_bot_replies_override` فارغ، **Then** يُعرض الافتراضي من الخادم كنص رمادي داخل الحقل مع «يستخدم افتراضي المنصة».
3. **Given** تغيير إعداد، **When** يُحفظ، **Then** Sonner تأكيد وتُحدَّث القيمة من استجابة الخادم.

### US-31.2 — قائمة الجلسات الحية (P1)
يرى الموظف الجلسات مفلترة بالحالة والنوع ومن يتولّاها، مع أحدث نشاط في الأعلى وشارة للجلسات `escalated`.
**Acceptance**:
1. **Given** 50 جلسة، **When** تُفتح القائمة، **Then** أعمدة: الطرف (اسم/هاتف Mono)، النوع، الحالة (نقطة + نص)، المتولّي (البوت / اسم الموظف)، عدد الرسائل Mono، آخر نشاط نسبي.
2. **Given** فلتر `status=escalated`, **Then** الحالة في الرابط والعدّاد في الشريط يطابق.
3. **Given** جلسة جديدة تُفتح من webhook، **Then** تظهر خلال ≤ 10 ثوانٍ (استطلاع).

### US-31.3 — الاستيلاء والردّ والإفراج (P1)
يفتح الموظف جلسة، يرى الرسائل بمرسِلها (عميل/بوت/موظف)، يضغط «استلام الجلسة» فتصير `human_locked` ويُقفل البوت، يردّ، ثم يُعيدها للبوت أو يغلقها.
**Independent Test**: موظفان يفتحان الجلسة؛ الأول يستولي → الثاني يرى «يتولّاها <اسم>» وحقل الردّ معطَّل.
**Acceptance**:
1. **Given** جلسة `bot_active`, **When** يُضغط «استلام»، **Then** تصير `human_locked` بـ`version` محدَّث، ويُعرض شريط «أنت تتولّى هذه الجلسة — البوت متوقف».
2. **Given** `human_locked` لي، **When** أرسل ردّاً، **Then** يظهر تفاؤلياً بمرسِل `staff` ثم يُثبَّت من الخادم.
3. **Given** `human_locked` لي، **When** يُضغط «إعادة للبوت»، **Then** تعود `bot_active`؛ «إغلاق» → `closed` بتأكيد.
4. **Given** تضارب `version` (استولى آخر قبلي)، **Then** رسالة «استلمها <اسم> قبلك» مع تحديث.
5. **Given** موظف بلا `support.takeover_session`, **Then** الجلسة للقراءة فقط مع تلميح.

### US-31.4 — سجل استدعاء الأدوات (P2)
يرى الموظف داخل الجلسة ما استدعاه البوت (الأداة، المدخلات المختصرة، النتيجة/الخطأ، الوقت) ضمن الخط الزمني للرسائل.
**Acceptance**:
1. **Given** `BotToolCallLog` لجلسة، **Then** يُعرض كصفوف مطوية بين الرسائل بخط Mono للأداة وزمنها، تتوسّع لعرض JSON مقروء بحد 1px.

### US-31.5 — فتح وحدة التحكم الخارجية (P2)
يضغط التاجر «افتح وحدة تحكم شروة AI» فيحصل على رمز قصير العمر ويُفتح الموقع الخارجي في تبويب جديد، مع استلام إشعار الإغلاق/النجاح عبر `postMessage`.
**Acceptance**:
1. **Given** الضغط على الزر، **When** يُطلب الرمز، **Then** يُفتح `SHARWA_AI_CONSOLE_URL` بالرمز في نافذة جديدة؛ الرمز لا يُخزَّن محلياً ولا يُعرض.
2. **Given** رسالة `postMessage` من نطاق وحدة التحكم (مُتحقَّق من الأصل)، **Then** تُحدَّث حالة الربط/الإعدادات؛ رسائل من أصل آخر تُهمَل.

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-31.01**: الوحدة MUST تظهر فقط حين يكون تطبيق `sharwa_ai` مثبَّتاً ومفعّلاً (M30) وميزة `app_marketplace` مفعّلة؛ قائمة الجلسات لمن يحمل `support.takeover_session` أو مالك المتجر.
- **FR-31.02**: حالة الربط MUST تُستطلع كل 5 ثوانٍ أثناء «جارٍ الربط» وكل 60 ثانية بعده، وتتوقف عند إخفاء التبويب.
- **FR-31.03**: الإعدادات MUST تُحفظ بنموذج React Hook Form + Zod بالحقلَين الفعليَّين (`ai_enabled`, `max_consecutive_bot_replies_override` اختياري عدد صحيح ≥ 1).
- **FR-31.04**: قائمة الجلسات MUST تدعم فلاتر `status`, `session_type`, `assigned_to_me`, `q` في الرابط، وترقيماً خادمياً، واستطلاعاً كل 10 ثوانٍ.
- **FR-31.05**: الاستيلاء/الإفراج/الإغلاق MUST ترسل `version` وتعالج 409 تفاعلياً؛ الأزرار مقيَّدة بالحالة والمتولّي.
- **FR-31.06**: الرسائل MUST تميّز المرسِل نصياً (عميل · البوت · موظف باسمه) بلا avatars مولَّدة؛ الوارد بحد 1px والصادر بخلفية `muted`.
- **FR-31.07**: سجل الأدوات MUST يُعرض مطوياً افتراضياً ضمن الخط الزمني، ولا يُعرض أي سرّ (توكنات) حتى لو ورد في المدخلات؛ القيم الحساسة يحجبها الخادم.
- **FR-31.08**: رمز SSO MUST يُطلب عند النقر فقط، يُستخدم مرة واحدة، لا يُخزَّن في `localStorage`، ويُفتح في نافذة جديدة؛ مستمع `postMessage` MUST يتحقق من `event.origin` مقابل `SHARWA_AI_CONSOLE_URL`.
- **FR-31.09**: الوحدة MUST تعرض شريطاً ثابتاً حين `ai_enabled=false` في كل شاشاتها.

## 5. الكيانات والحالات (Key Entities & States)

- **SupportBotSettings**: `ai_enabled`, `max_consecutive_bot_replies_override` (فارغ = افتراضي المنصة).
- **SupportSession**: `status`: `bot_active` البوت يردّ · `human_locked` يتولّاها موظف · `escalated` مُصعَّدة · `closed` مغلقة؛ `session_type`: `customer` عميل · `affiliate` مسوّق · `staff_internal` موظف داخلي؛ المتولّي، `version`، آخر نشاط.
- **SupportMessage**: المرسِل (عميل · بوت · موظف)، النص، الوقت.
- **BotToolCallLog**: الأداة، المدخلات، النتيجة/الخطأ، الوقت.
- الانتقالات: `bot_active → human_locked` (استيلاء) · `bot_active → escalated` (النظام عند تجاوز الحد أو طلب العميل) · `escalated → human_locked` (استيلاء) · `human_locked → bot_active` (إفراج) · `* → closed`.

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: `/dashboard/apps/sharwa-ai` (الحالة + الإعدادات + زر وحدة التحكم) · `/dashboard/apps/sharwa-ai/sessions` (قائمة) · `/dashboard/apps/sharwa-ai/sessions/[id]` (الخط الزمني: رسائل + استدعاءات أدوات؛ شريط التولّي؛ حقل الردّ).
- **الحالات البصرية**: skeleton · فراغ «لا جلسات بعد» · «لا جلسات تطابق الفلاتر» · خطأ استطلاع (شريط هادئ) · بلا صلاحية (قراءة فقط) · التطبيق غير مثبَّت («ثبّت شروة AI من متجر التطبيقات» مع رابط) · `ai_enabled=false` (شريط ثابت) · جارٍ الربط (نقطة نابضة هادئة + نص).
- **الجوال**: القائمة → الجلسة صفحة كاملة؛ شريط التولّي ثابت أعلى، حقل الردّ ثابت أسفل؛ استدعاءات الأدوات مطوية.
- **اختصارات**: `J/K` بين الجلسات · `T` استلام · `R` إعادة للبوت · `E` إغلاق · `⌘K` بحث هاتف/اسم.

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| حالة الربط (استطلاع) | `sharwa_ai_*` HTML + webhook `session-status` | `[NEEDS BACKEND]` → `GET /api/v1/apps/sharwa-ai/status/` → `{connected: bool, connecting: bool, error, connected_at}` |
| الإعدادات | `sharwa_ai_*` POST | `[NEEDS BACKEND]` → `GET/PUT /api/v1/apps/sharwa-ai/settings/` `{ai_enabled, max_consecutive_bot_replies_override}` → + `{platform_default_max_replies}` |
| قائمة الجلسات | `sharwa_ai_*` / `support_sessions_list` HTML | `[NEEDS BACKEND]` → `GET /api/v1/support/sessions/?status&session_type&assigned_to_me&q&page` → `{count, results:[{id, session_type, status, party:{name, phone}, assigned_staff:{id,name}\|null, messages_count, last_activity_at, version}]}` |
| تفاصيل الجلسة + الخط الزمني | `support_session_detail` HTML | `[NEEDS BACKEND]` → `GET /api/v1/support/sessions/<id>/?after=<cursor>` → `{session, timeline:[{kind: message\|tool_call, sender_type?, sender_name?, text?, tool_name?, input_summary?, output_summary?, error?, created_at}]}` |
| استيلاء / إفراج / إغلاق | — | `[NEEDS BACKEND]` → `POST /api/v1/support/sessions/<id>/takeover/`, `/release/`, `/close/` `{version}` → 200/409 (perm `support.takeover_session`) |
| ردّ الموظف | — | `[NEEDS BACKEND]` → `POST /api/v1/support/sessions/<id>/messages/` `{text, client_id}` |
| رمز SSO قصير العمر | SSO console (RS256 JWKS) | `[NEEDS BACKEND]` → `POST /api/v1/apps/sharwa-ai/console-token/` → `{console_url, token, expires_in}` |
| عدّاد الجلسات المُصعَّدة | — | `[NEEDS BACKEND]` → `GET /api/v1/support/sessions/counters/` → `{escalated, human_locked_mine}` |

## 8. الحالات الحدّية (Edge Cases)

- جلسة `human_locked` لموظف انتهت جلسته أو عُطِّل: يُعرض «المتولّي غير متاح» وزر «استلام» للمصرَّح لهم (يعتمد على قبول الخادم).
- البوت يستدعي أداة تفشل: يُعرض الخطأ Mono مطوياً بلا تفسير محلي.
- `escalated` ولا موظف متاح: تبقى في الأعلى بشارة؛ لا إشعار صوتي (مركز الإشعارات M49 لاحقاً).
- نافذة وحدة التحكم أُغلقت بلا `postMessage`: لا تغيير؛ الاستطلاع الدوري يحدّث الحالة.
- رمز SSO منتهٍ قبل الاستخدام: تُعاد المحاولة بطلب رمز جديد عند النقر مجدداً.
- `session_type=staff_internal`: يُعرض الطرف كاسم موظف بلا هاتف.

## 9. معايير النجاح (Success Criteria)

- **SC-31.1**: من رؤية جلسة `escalated` إلى أول ردّ بشري ≤ 3 نقرات / ≤ 15 ثانية.
- **SC-31.2**: صفر حالات يردّ فيها موظفان في جلسة واحدة (قفل `human_locked` + 409 يُعرض بوضوح).
- **SC-31.3**: صفر أسرار في `localStorage`/الروابط الظاهرة؛ 100% من رسائل `postMessage` من أصل غير مطابق تُهمَل (اختبار وحدة).
- **SC-31.4**: الجلسة الجديدة تظهر في القائمة خلال ≤ 10 ثوانٍ في 95% من الحالات.

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M30 (تثبيت التطبيق)، M18 (صلاحية `support.takeover_session`)، M32 (قائمة الجلسات المشتركة؛ هذه الوحدة تملك شاشة التولّي)، M49 (الإشعارات لاحقاً).
- افتراض: الاستطلاع كافٍ؛ لا WebSocket حتى يوفّره الخادم.
- افتراض: حقول `SupportMessage`/`BotToolCallLog` التفصيلية تُؤخذ من العقد؛ الواجهة تعرض ملخصات يحجب فيها الخادم الحساس.
- افتراض: `SHARWA_AI_CONSOLE_URL` يُمرَّر للعميل كمتغير بيئة عام للتحقق من الأصل فقط.
- افتراض: قائمة الجلسات هنا وفي M32 تستهلك نفس العقد `/api/v1/support/sessions/`.

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I: لا أيقونة «روبوت» ملونة ولا هالات «AI»؛ البوت يُعرض نصاً «شروة AI» بخط عادي؛ لا تدرجات بنفسجية مطلقاً في هذه الوحدة تحديداً؛ استدعاءات الأدوات صفوف Mono بحد 1px؛ النقطة النابضة للربط بلون `muted` لا brand.
- II: الهواتف وأعداد الرسائل والأوقات Mono؛ JSON الأدوات داخل `dir="ltr"` معزول؛ الوارد من اليمين والصادر من اليسار منطقياً؛ زر الرجوع منعكس.
- IV: لقطات `docs/visual-checks/31-sharwa-ai/{desktop,tablet,mobile,desktop-dark}.png` للإعدادات، قائمة الجلسات مع `escalated`، وجلسة `human_locked` بسجل أدوات موسَّع.
- IX: الاستطلاع عبر TanStack Query مُفتاح بالمستأجر؛ لا تخزين رمز SSO؛ Zod على كل استجابة.
