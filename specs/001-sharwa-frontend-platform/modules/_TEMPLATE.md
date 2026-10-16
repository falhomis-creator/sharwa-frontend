# M[NN] — [اسم الوحدة بالعربية] ([English Module Name])

**Route group**: `([group])` · **Priority**: P[1|2|3] · **Backend status**: [Ready | HTML-only `[NEEDS BACKEND]` | Absent `[NEEDS BACKEND]`]
**Discovery refs**: `specs/discovery/0X-*.md` §[section] · **Benchmarks**: [2–3 من لاعبي السوق المرجعيين وما نستلهمه منهم تحديداً]

## 1. الهدف (Purpose)

[جملتان: ما المشكلة التي تحلّها الوحدة لمن، وما القيمة القابلة للقياس.]

## 2. الفاعلون (Actors)

- **[Actor]**: [ما يفعله هنا]

## 3. قصص المستخدم (User Stories)

### US-[NN].1 — [عنوان] (P1)
[السرد بلغة المستخدم.]
**Independent Test**: [كيف تُفحص هذه القصة وحدها.]
**Acceptance**:
1. **Given** … **When** … **Then** …
2. …

### US-[NN].2 — [عنوان] (P2)
…

## 4. المتطلبات الوظيفية (Functional Requirements)

- **FR-[NN].01**: النظام MUST …
- **FR-[NN].02**: المستخدم MUST be able to …
- …

## 5. الكيانات والحالات (Key Entities & States)

- **[Entity]**: [الحقول الأساسية بلا تفاصيل تنفيذ]. الحالات: `a` · `b` · `c` (بالعربية: …).
- [قواعد الانتقال بين الحالات إن وُجدت.]

## 6. واجهة المستخدم (UI Surface)

- **الشاشات**: [قائمة الشاشات/اللوحات مع المسار المقترح `/dashboard/...`].
- **الحالات البصرية**: التحميل (skeleton) · الفراغ (empty state بنص فعلي، لا رسم) · الخطأ · بلا صلاحية · الميزة معطّلة (feature off).
- **الجوال**: [ما يتغير على 390px].
- **اختصارات**: [⌘K أوامر، مفاتيح].

## 7. عقد البيانات (Data Contract)

| Need | Backend today | Status |
|---|---|---|
| [قراءة X] | `GET /api/v1/...` أو `HTML view_name` | Ready / `[NEEDS BACKEND]` |

[للنواقص: الشكل المقترح للطلب/الاستجابة بسطر واحد لكل endpoint.]

## 8. الحالات الحدّية (Edge Cases)

- ماذا يحدث عندما …؟
- …

## 9. معايير النجاح (Success Criteria)

- **SC-[NN].1**: [قابل للقياس، بلا تقنية]
- …

## 10. الافتراضات والاعتماديات (Assumptions & Dependencies)

- يعتمد على: M[xx], M[yy].
- افتراض: …

## 11. قيود الدستور المطبَّقة (Constitution Hooks)

- I (Anti-AI): [ما يُمنع تحديداً في هذه الوحدة، مثال: لا بطاقات KPI أربع متماثلة].
- II (RTL): [أماكن الحذر: الأرقام، الأسهم، الجداول].
- IV (Visual check): [اللقطات المطلوبة].
