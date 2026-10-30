# Conflicts: optimistic locking and the 409 shapes

> **Source**: DOC-033 · inventory A.7 · INT-007, INT-016, INT-018, INT-020, INT-021, INT-022, INT-024, INT-026, INT-031, INT-033, INT-035, INT-042, INT-045, INT-047, INT-048
> **Code**: `products/services/product_api_errors.py` (`conflict`) · `products/services/order_api_service.py` (`lock_order`, `bump_version`, `OrderVersionConflict`) · `api/views_orders.py` · `products/services/{design,returns_api,staff,pos,procurement,support_api,sharwa_ship_api,shipping}_service.py` · `products/models/staff_approvals.py` · row locks in `products/services/*` and `tenants/console_*_service.py`
> **Frontend**: `src/lib/api-error.ts` (`ApiError.body`, `defaultMessage(409)`)
> **Last verified against code**: 2026-10-27 (step 04)

`409 Conflict` means: your request was valid when you built it, but the data it was built on has changed. It never means "your input is wrong" (that is `400`) and never "you may not" (that is `403`). This page lists every 409 body Django sends, what the body gives the client to recover with, and what the client should do next.

Row locks (`select_for_update`) are a third mechanism. They make Django serialise two writers and the client never sees them, except that one writer waits a moment. They are listed in section 4.

## 1. Two kinds of 409

| Kind | Cause | Recovery |
|---|---|---|
| **Version conflict** | you sent a `version` older than the row's current one | reload the row, show the change, let the user reapply their edit |
| **State conflict** | the action is not allowed in the row's present state (already installed, already decided, slot taken, still in use) | refresh and show why; some carry data to continue with |

All 409 bodies are JSON objects with a `detail` key built by `conflict(message, **extra)` (`ProductApiError(409, {"detail": message, **extra})`). The extra keys depend on the route and are the part that matters to the client. The frontend keeps the full body in `ApiError.body`; when a screen has no handler for it, the generic message is «تغيّرت البيانات من جهة أخرى، أعد التحميل ثم حاول مجدداً.»

## 2. Version conflicts

The current version comes back under **two different key names**. Read the key given in the table; do not assume one name.

| Area | Route | Request field | 409 body | Current-version key | Notes |
|---|---|---|---|---|---|
| Orders | `PATCH orders/<pk>/`, `POST orders/<pk>/status/`, `fulfillment-status/`, `payment/<action>/`, `refunds/` | `version` (required) | `{detail: "حُدِّث الطلب من مستخدم آخر.", current_version, order}` | `current_version` | `order` is the full current order detail, so the client can diff without another request |
| Storefront theme | `PATCH store/theme/` | `version` (optional) | `{detail: "حُدِّث الثيم من جلسة أخرى. أعد التحميل لترى آخر نسخة منشورة.", current_version}` | `current_version` | with no `version` in the body the check is skipped and the write goes through. A non-numeric value is `400` `{"version": ["قيمة غير صالحة."]}` |
| Convert to pickup | `POST orders/<pk>/convert-to-pickup/` | `version` | `{detail: "حُدِّث الطلب من مستخدم آخر — أعد تحميل الصفحة.", current_version, status}` | `current_version` | `status` is the order's current status |
| Returns | `POST returns/<pk>/approve/` | `version` (optional) | `{detail: "حُدِّث طلب الإرجاع من مستخدم آخر.", current_version}` | `current_version` | already decided: `{detail: "حُسم هذا الإرجاع من قبل (<status>).", current_version}`. The concurrent decision loses a compare-and-set update on `version` |
| Approvals | `POST approvals/<pk>/resolve/` | `version` (required) | `{detail: "حُسم الطلب من مستخدم آخر.", version}` | **`version`** | when the request is already decided the body also has `status` |
| POS shift variance | `POST pos/shifts/<pk>/resolve-variance/` | `version` | `{detail: "تغيّرت الوردية، أعد التحميل.", version}` | **`version`** | already settled: `{detail: "حُسم فرق هذه الوردية من مستخدم آخر.", version}` |
| Purchase orders | `PATCH purchase-orders/<pk>/` and the action routes | `version` | `{detail: "حُدِّث الأمر من مستخدم آخر.", version}` | **`version`** | approval taken by someone else: `{detail: "تم حسم هذا الاعتماد بالفعل من طرف آخر.", version}` |
| Support session | `POST support/sessions/<pk>/takeover/`, `release/`, `close/` | `version` (required: `400` `{"version": ["أرسل رقم نسخة الجلسة كما رأيتها."]}` without it) | `{detail, session}` | the `session` object carries its `version` | the body returns the **whole current session** |
| Sharwa Ship | `GET shipping/shipments/<pk>/` returns `version` | none | no 409 | `version` = accepted transitions + 1 | there is no column. The status route is protected by the event key instead ([`idempotency.md`](idempotency.md)), not by this number |

> ⚠️ Discrepancy — roadmap says every version conflict returns `current_version` / the code uses `current_version` for orders, theme, convert-to-pickup and returns, and plain **`version`** for approvals, POS shift variance and purchase orders. Support puts the version inside `session`. A shared helper in the client must handle all three.

> ⚠️ Discrepancy — the version field is **required** for orders and approvals and **optional** for the theme and for return decisions (a missing value skips the check). A client that omits `version` on those two gets a silent last-write-wins.

Products, categories, brands and most settings have **no version**. A second save overwrites the first. If a screen needs protection there, it has to re-read before it saves.

### How `version` moves

- Orders: `lock_order` takes `select_for_update` on the row, compares the sent `version`, and raises `OrderVersionConflict`. `bump_version` then adds one with `F('version') + 1`, so the number only grows. Internal callers (shipping, convert-to-pickup) pass `version_required=False` and still bump it.
- Theme: `theme_version` is bumped on each published save.
- Approvals, POS shifts and purchase orders carry their own `version` column. `ApprovalRequest.resolve()` raises `ConcurrencyError` on a mismatch, which the services turn into the 409 above.

### What the client does

| Shape | Do |
|---|---|
| `{detail, current_version, order}` | show a conflict panel. The user chooses between keeping the server's order (replace the screen with `order`) or reapplying their change on it (send again with `version = current_version`). Do not resend the old `version` |
| `{detail, current_version}` (theme, returns) | refetch the resource, show `detail`, let the user redo the edit on the new version |
| `{detail, version}` (approvals, shifts, purchase orders) | refetch the row. If its status is now `approved` or `rejected`, show that outcome and stop; do not resend |
| `{detail, session}` | replace the session on screen with `session`. If it now belongs to someone else, show who. Do not retry the takeover |
| any 409 without a handler | show `detail`, reload the page data |

Never retry automatically with the same body: it will conflict again. Retrying with the new version is a user decision.

## 3. State conflicts

These do not involve a version. The extra keys are the recovery data.

| Area | Route | Body | Meaning and recovery |
|---|---|---|---|
| Checkout | `POST checkout/` | `{detail: "تغيّرت سلتك أثناء الإكمال — راجع المنتجات قبل التأكيد.", changed: [...]}` | stock or price changed during checkout. `changed` lists the affected products. Reload the cart, show the changes, ask the customer to confirm again with the **same** `client_uuid` ([`idempotency.md`](idempotency.md)) |
| Auctions | `POST catalog/products/<id>/auction/bids/` | `{detail, auction}` | e.g. «المزاد لم يبدأ بعد.», «انتهى المزاد.», «الحد الأدنى للعطاء …». `auction` is the current auction state. Update the screen and let the bidder change the amount |
| Multi-location off | `POST locations/mode/` `{enabled: false}` | `{detail, conflicts: [{location, products_with_stock}]}` | stock sits in several locations. Show the list; to continue, send again with `merge: true` to merge into the main location |
| Variant attributes | `DELETE variant-attributes/<pk>/` | `{detail, rules_count}` | still used in bundle compatibility rules. Remove the rules first, or disable instead of deleting |
| Variant options | `DELETE variant-attributes/options/<pk>/` | `{detail, products_count}` | «القيمة مستخدمة في متغيرات N منتج/منتجات.» |
| Suppliers | `DELETE suppliers/<pk>/` | `{detail, orders_count}` | «لا يمكن حذف المورد: مرتبط بـ N أمر شراء — عطّله بدلاً من ذلك.» Disable instead |
| Purchase orders | action routes | `{detail}` | «التعديل متاح للمسودة فقط.», «الإرسال متاح للمسودة فقط.», «الأمر ليس بانتظار الموافقة.», «لا يوجد طلب اعتماد معلّق لهذا الأمر.», «الاستلام متاح للأوامر المعتمدة فقط.». The PO is in another state: refetch |
| Bookings | `POST catalog/products/<id>/slots/hold/` | `{detail: "لم يعد هذا الموعد متاحاً."}` | another customer took the slot. Reload the slots |
| Apps | `POST apps/<code>/install/`, `activate/`, `deactivate/` | `{detail}` | «التطبيق مثبَّت مسبقاً.», «التطبيق مفعّل مسبقاً.» / «التطبيق معطّل مسبقاً.», «تطبيق الواتساب غير مثبَّت أو غير مفعّل.». The state is already what you asked for or is not ready: refetch |
| Merchant withdrawals (console decision) | console withdrawal action | `{detail: "تم البتّ في هذا الطلب مسبقاً."}` | already decided by another operator |
| Console money / billing | `platform/dues/…`, `platform/sharwa-pay/…` actions | `{detail: "<item> غير موجود أو تم التعامل معه مسبقاً."}` | the record was handled. Reload the queue. A financial failure (not enough balance) is `400` `{detail, level: "error"}`, not 409 |
| POS | `pos/orders/`, `pos/orders/<pk>/refund/` | `{detail}` | «لا وردية مفتوحة لك على هذا الجهاز.», «افتح وردية لتسجيل الاسترجاع في الدرج.», «استُخدم رمز التحقق هذا مسبقاً — اطلب رمزاً جديداً.», «مفتاح منع التكرار مستخدم لعملية أخرى.» |
| Support | `POST support/sessions/<pk>/messages/` | `{detail: "استلم الجلسة أولاً لتتمكن من الردّ."}` | take over first, then reply |
| Courier partial delivery | `POST agent/fulfillments/<id>/partial-delivery/` | `{detail: "رُفض التسليم.", rejection_reason}` | the rules refused it. Show `rejection_reason` |

Client rule for all of these: a state conflict is information, not a failure to retry. Refetch, show `detail`, and let the user pick the next step.

## 4. Row locks (not visible to the client)

Before a money or stock decision Django locks the rows it will change (`select_for_update`, inside `transaction.atomic()`). Two requests on the same row run one after the other; the second sees the first's result. This is why a double click on "approve" gives one approval and one 409, not two approvals.

The locks are in:

| Area | Where |
|---|---|
| Orders: status, payment, refund, fulfilment | `order_api_service.lock_order`, `refund_service`, `shipping_service`, `shipment_state_service` |
| Checkout and stock | `storefront_checkout_service`, `checkout_service`, `inventory_reservation_service`, `inventory_service` |
| Merchant wallet and withdrawals | `payments_service`, `merchant_credit_service` |
| Customer wallets and loyalty | `products/models/wallets.py`, `products/models/loyalty.py` |
| POS shifts and refunds | `pos_service` |
| Approvals and purchase orders | `products/models/staff_approvals.py`, `purchase_order_service`, `procurement_service` |
| Returns | `return_service`, `returns_api_service` |
| Campaigns | `marketing_service.dispatch_campaign` ([`idempotency.md`](idempotency.md)) |
| Auctions | `storefront_auction_service` |
| Imports and supplier jobs | `product_import_service`, `suppliers/import_service`, `suppliers/connection_service`, `suppliers/order_forward_service` |
| Support sessions | `support_api_service`, `products/models/support.py` |
| Bookings | `booking_service` |
| Sharwa Pay wallets | `sharwapay/models.py` (the wallet manager) |
| Platform console dues, top-ups, withdrawals, billing | `tenants/console_money_service`, `console_billing_service`, `console_service` |

About 50 files use `select_for_update`. The table lists the groups that matter for API behaviour.

## 5. Recovery cheat sheet

| You get | Look at | Then |
|---|---|---|
| `409` + `current_version` | `current_version`, maybe `order` | refetch or use `order`, resend with the new version only if the user confirms |
| `409` + `version` | `version`, maybe `status` | refetch the row; stop if it was decided |
| `409` + `session` | `session` | replace the session on screen |
| `409` + `changed` | `changed[]` | reload the cart, ask again |
| `409` + `conflicts` | `conflicts[]` | show the list; resend with `merge: true` to confirm |
| `409` + `*_count` | `rules_count`, `products_count`, `orders_count` | explain what blocks the delete; offer disable |
| `409` + `auction` | `auction` | update the auction card |
| `409` + only `detail` | `detail` | refetch; show the sentence |

Other statuses people mistake for conflicts: `400` «أُرسلت هذه الحملة من قبل.» (campaign already sent), `428` `otp_required` (POS refund above the limit), `429` (rate limits, see [`rate-limits.md`](rate-limits.md)).

See [`errors.md`](errors.md) for how the BFF turns a 409 into an `ApiError`.
