# Money: representation, formatting and conversion

> **Source**: DOC-030 (representation and formatting) · DOC-031 (conversion, anchor `#conversion`) · inventory A.6 · INT-010, INT-012, INT-013, INT-017, INT-020, INT-028, INT-033, INT-034, INT-035, INT-037, INT-038, INT-039, INT-043, INT-044, INT-045, INT-048
> **Code**: `products/models/base.py` (`CURRENCY_CHOICES`, `convert_amount`, `format_money`) · `products/models/catalog.py` (`Product._convert_value_to_target`, `get_formatted_price`) · `products/models/store_settings.py` (`StoreSetting` rates) · `products/services/settings_service.py` (`fx_preview`, `patch_currency`) · `api/serializers.py`, `api/serializers_products.py` (`display_*`) · module services listed in section 6
> **Frontend**: `src/features/*/schemas.ts` (`displayMoney = z.string()`)
> **Last verified against code**: 2026-10-27 (step 04)

Money crosses the API in two forms: a **decimal string** for values the client sends or edits, and a **display string** (`display_*`) for values the client only shows. The browser never parses, sums or re-formats a display string. Terms are in the [glossary](../../glossary.md#3-currencies-and-money).

## 1. Currencies

| Code | Meaning | Django label (`CURRENCY_CHOICES`) | Label in the frontend |
|---|---|---|---|
| `SAR` | Saudi riyal (the pivot of every conversion) | ريال سعودي | ريال سعودي |
| `USD` | US dollar | دولار أمريكي | دولار أمريكي |
| `YER_OLD` | Yemeni rial, Sana'a rate | يمني صنعاء | ريال يمني (صنعاء) |
| `YER_NEW` | Yemeni rial, Aden rate | يمني عدن | ريال يمني (عدن) |

The same four codes exist in `WALLET_CURRENCY_CHOICES` (customer wallet balances). The wallet code refuses any other code: `wallet_balance_field` raises «عملة غير مدعومة في المحافظ: <code>». The label discrepancy between Django and the frontend is already in the glossary (§3). Send the **code**, never the label.

## 2. What goes on the wire

| Kind | Form | Example | Rules |
|---|---|---|---|
| Input amount | decimal string | `"12.50"` | up to two decimals for money (`AMOUNT_RE ^\d{1,10}(\.\d{1,2})?$` in payments). Invalid: 400 with a field error |
| Stored amount echoed back | decimal string, two decimals (for example `_money` in settings) | `"1250.00"` | plain number with no currency. Safe to put in an `<input>` |
| Display amount | string `display_*` | `"1,250 ر.س"` | formatted by `format_money`. For showing only |
| Exchange rate | decimal string, at least two decimals, up to four | `"3.75"`, `"3.7525"` | `_rate()` strips trailing zeros but keeps two decimals |
| Currency | one of the four codes | `"YER_NEW"` | next to every amount that is not in the store currency |

Rules for the client:

- **Never add two display strings.** Totals are given by Django per currency (section 4).
- **Never infer the currency from a number.** Read the currency field or the suffix of the display string.

## 3. Formatting: `format_money(amount, currency)`

`format_money` is the one formatter every `display_*` in `/api/v1` goes through.

| Currency | Rule | Examples |
|---|---|---|
| `SAR` (and any unknown code) | `clean_num + " ر.س"`. `clean_num` writes a whole number with no decimals and otherwise two decimals, with thousands commas | `1250` → «1,250 ر.س» · `12.5` → «12.50 ر.س» · `0` → «0 ر.س» |
| `USD` | `"$" + clean_num` | `1` → «$1» · `12.5` → «$12.50» · `1234.5` → «$1,234.50» |
| `YER_OLD`, `YER_NEW` | the amount rounded **half up** to a whole number, thousands commas, `" ر.ي"` | `52000` → «52,000 ر.ي» · `52000.5` → «52,001 ر.ي» |

`None` and `0` both format as zero. The two Yemeni currencies share one suffix, so a display string alone does not say Sana'a or Aden: the currency field does.

Where a display string comes from:

| Surface | Currency of the string | Code |
|---|---|---|
| Dashboard product rows (`display_price`, `display_old_price`, `display_effective_price`, `display_price_with_tax`) | the product's **own** currency, no conversion | `serializers_products.py` → `format_money(price, product.currency)` |
| Storefront product cards and detail (`catalog/products/`) | the visitor's currency from `?currency=` (default `SAR`), converted | `serializers.py` → `format_money(get_converted_price(currency), currency)` |
| Storefront cart and checkout | the session currency `user_currency` (`cart.target_currency`) | `storefront_cart_service`, `storefront_checkout_service` |
| Order rows | `order.currency` | `format_money(order.total_price, order.currency)` |
| Settings | see section 5 | `settings_service.read` |

> ⚠️ Discrepancy — legacy `Product.get_formatted_price` returns a Yemeni amount as a bare integer («52,000») with no «ر.ي» because the old templates add the unit themselves, while the API contract wants the whole text. Card `display_price` and `display_old_price` therefore use `format_money` instead (INT-012). Do not copy a legacy template's formatter into an API field.

## 4. Per-currency totals

A figure that mixes currencies is never added up. The server returns one total per currency and the client prints them side by side, for example «2.50 ر.س · $1». The roadmap lists the places below; each domain page carries the exact shape and is where it gets verified:

| Where | What is split by currency |
|---|---|
| Platform dues (console) | the dues a store owes, per currency |
| Expenses | month totals per currency |
| Sharwa Pay | four wallet rows, one per currency |
| Customer wallets | always SAR, so there is nothing to split (section 6) |
| POS | one currency, the store currency (section 6) |

Pages: [`m45-dues-sharwa-pay-admin.md`](../domains/16-platform-console/m45-dues-sharwa-pay-admin.md) · [`m16-pos.md`](../domains/13-channels-operations/m16-pos.md) · [`m33-expenses.md`](../domains/08-finance/m33-expenses.md) · [`m40-sharwa-pay.md`](../domains/08-finance/m40-sharwa-pay.md) · [`m35-wallets-loyalty.md`](../domains/06-customers-wallets/m35-wallets-loyalty.md).

## 5. Exchange rates

Rates live on the store's `StoreSetting` row. There are three, all stored as decimals with **four** places (`max_digits=12, decimal_places=4`):

| Field (`settings/` payload) | Meaning | Default | Fallback in code when the stored value is `0` or negative |
|---|---|---|---|
| `usd_to_sar` | 1 USD in SAR | `3.75` | `3.75` |
| `sar_to_yer_old` | 1 SAR in Sana'a rial | `140.00` | `140.00` |
| `sar_to_yer_new` | 1 SAR in Aden rial | `520.00` | `520.00` |

The settings payload also carries `currency` (the store's **dashboard currency**, one of the four codes, default `SAR`), `fx_preview`, `display_free_shipping_threshold` and `display_default_delivery_fee`.

- **Writing rates**: `PATCH settings/currency` (owner-only section, plan feature `currency_settings`, see [`permissions.md#owner-only`](permissions.md#owner-only)). A rate must match `^\d+(\.\d{1,4})?$` with at most eight digits before the point, and be greater than zero. Errors: `"أدخل رقماً صحيحاً."` or `"يجب أن يكون أكبر من صفر."`. `currency` must be one of the four codes (`"اختر عملة من القائمة."`).
- **`fx_preview`** shows what 100 SAR is worth in each currency, already formatted: `[{currency, display_100_sar}]` for `SAR`, `USD`, `YER_OLD`, `YER_NEW` (for example `3.75` → «$26.67», `520` → «52,000 ر.ي»).
- **Free-shipping threshold**: `free_shipping_threshold` is a decimal in the **dashboard currency** (`display_free_shipping_threshold` uses `StoreSetting.currency`). The checkout invoice compares the order subtotal to it in that currency (INT-013).
- **Default delivery fee**: `default_delivery_fee` is always in `YER_NEW` (`display_default_delivery_fee` is formatted as `YER_NEW`).
- A product can carry its own `custom_sar_rate`. It replaces the store rate for the product's **own** currency only (section 6.1).

The roadmap names a migration `0217_storesetting_fx_rate_precision` for the four decimals. The model field has `decimal_places=4`, set by that migration (corrected in official Step 08: an earlier version of this page said the migration was missing; it exists — see [`../../architecture/40-money.md`](../../architecture/40-money.md)).

<a id="conversion"></a>
## 6. Conversion rules per module

Every conversion goes **through SAR**: amount → SAR with the "from" rate → target currency with the "to" rate. All rounding is half up (`ROUND_HALF_UP`).

### 6.1 The two engines

| | `convert_amount(amount, from, to, store_setting=None)` | `Product._convert_value_to_target(value, target, store_setting=None)` |
|---|---|---|
| Used for | any total that does not belong to one product: order totals, wallet and gateway amounts, POS, B2B, procurement, chat-to-order, LTV | a product's price, old price, deposit, upfront amount, storefront cards |
| Source currency | the `from` argument | `product.currency` |
| Rate override | none (store rates only) | `product.custom_sar_rate` replaces the rate of the product's own currency (`YER_OLD`, `YER_NEW` or `USD`) |
| Result to `SAR` / `USD` | quantised to two decimals | quantised to two decimals |
| Result to `YER_OLD` / `YER_NEW` | quantised to **two** decimals (`0.01`) | quantised to a **whole number** |
| Same currency | the amount quantised to two decimals | not special-cased (goes through SAR and back) |
| Empty / zero | `0.00` | `0.00` |
| Unknown currency | treated as SAR on the way in; returned unchanged and quantised on the way out | the value is returned unchanged |

The two engines are separate on purpose: an order total belongs to no product, so it cannot use a product's `custom_sar_rate`.

> ⚠️ Discrepancy — the same SAR amount converted to a Yemeni currency gives a whole rial through the product engine (`52000`) and a value with two decimals through `convert_amount` (`52000.00`). Both reach the client through `format_money`, which rounds a Yemeni amount to a whole number, so the screen shows the same text. The stored decimal differs.

### 6.2 By module

| Module | Rule | Code | Domain page |
|---|---|---|---|
| **Storefront** (cards, detail, cart, quote) | product price → visitor currency with `Product._convert_value_to_target`. The currency comes from `?currency=` on the request. `GET cart/?currency=` also saves it in the session key `user_currency`, which cart, checkout and wallet read afterwards | `serializers.py` · `storefront_cart_service` · `storefront_product_service` | [`m09-storefront-home-catalog.md`](../domains/05-storefront/m09-storefront-home-catalog.md) · [`m11-cart.md`](../domains/05-storefront/m11-cart.md) |
| **Checkout** | order amounts in the cart currency. Gateway and wallet amounts go through `convert_amount` (banks take Yemeni rial while `total_price` is in the buyer's currency) | `storefront_checkout_service` | [`m12-checkout.md`](../domains/05-storefront/m12-checkout.md) |
| **Free shipping** | threshold compared in the dashboard currency (section 5) | `pricing.build_order_invoice` | [`m12-checkout.md`](../domains/05-storefront/m12-checkout.md) |
| **Store settings** | rates edited and previewed here (section 5) | `settings_service` | [`m34-store-settings.md`](../domains/12-settings-staff-integrations/m34-store-settings.md) |
| **Customers (CRM)** | each customer's lifetime value is converted to the store currency (`customer_service`) | `customer_service.py` | [`m07-customers.md`](../domains/06-customers-wallets/m07-customers.md) |
| **Customer wallet and loyalty** | the wallet is **always SAR** (`sar()` amounts), whatever the display currency | `storefront_wallet_service` · `wallets` models | [`m35-wallets-loyalty.md`](../domains/06-customers-wallets/m35-wallets-loyalty.md) |
| **Affiliates and influencers** | amounts are stored in **SAR**. Totals are shown in the store currency through `convert_amount` (`partners_service._display`). A fixed commission is entered and shown in SAR | `partners_service.py` | [`m17-affiliates-influencers.md`](../domains/07-marketing-design-partners/m17-affiliates-influencers.md) |
| **B2B drafts and order lines** | each line converts from the product's currency to the draft's currency. The delivery fee (stored in `YER_NEW`) converts to the draft currency | `order_api_service` | [`m36-b2b-wholesale.md`](../domains/09-b2b/m36-b2b-wholesale.md) · [`m06-orders.md`](../domains/04-orders-returns/m06-orders.md) |
| **POS** | the product price converts to the **store currency**. The refund OTP threshold also converts | `pos_service` | [`m16-pos.md`](../domains/13-channels-operations/m16-pos.md) |
| **Procurement** | unit cost converts from `Product.cost_price` currency to the purchase order currency, which is the store currency at creation (`convert_amount`) | `procurement_service` | [`m23-procurement.md`](../domains/10-inventory-locations-procurement/m23-procurement.md) |
| **Auctions** | a bid is compared in the **buyer's** currency, using the product's own rate (`_convert_value_to_target` per buyer currency) | product extras / auction service | [`m37-advanced-products.md`](../domains/03-catalog/m37-advanced-products.md) |
| **Chat to order** | an order created from a conversation is written in the **store currency**: each unit price is `convert_amount(product.price, product.currency, store currency)`, quantised to two decimals. (An earlier version wrote `SAR` with each product's own number) | `social_channels/chat_to_order_service.py` | [`m27-inbox-channels.md`](../domains/13-channels-operations/m27-inbox-channels.md) |
| **Marketplaces** | the price pushed to Amazon or noon is `price_override` if set, else `base_price_sar × fx_rate_from_sar × (1 + default_price_markup_percent / 100)`, quantised to `0.01` | `marketplaces/listing_service.compute_effective_price` | [`m28-marketplaces.md`](../domains/13-channels-operations/m28-marketplaces.md) |
| **Dropshipping** | supplier cost → SAR (`SAR` unchanged; `USD` × `StoreSetting.usd_to_sar`; any other currency needs a fixed-rate rule or `PricingError`). Then `price = (cost_sar + shipping_estimate) × (1 + markup%) + fixed_add`, never below `floor = cost_sar × (1 + min_margin%)`, then a rounding mode (`none`, `nearest_1`, `end_99`, `end_95`, `end_00`). The default rule is markup 30, minimum margin 10, `end_99`. Each price records `fx_source`: `store_setting` or `fixed` | `dropshipping/pricing_engine.py` | [`m29-dropshipping.md`](../domains/13-channels-operations/m29-dropshipping.md) |

> ⚠️ Discrepancy — roadmap calls `StoreSetting.usd_to_sar` the dropshipping «daily» rate / the code has no schedule or refresh: it is the stored `usd_to_sar` rate (default `3.75`) that the merchant edits in settings. Nothing updates it daily. The glossary entry (§3, "FX rate") repeats the word «daily» and should read "the stored rate".

## 7. Examples

Fixture rates: `usd_to_sar = 3.75`, `sar_to_yer_old = 140`, `sar_to_yer_new = 520`.

| Input | Engine | Result | Display |
|---|---|---|---|
| 100 SAR → `USD` | `convert_amount` | `26.67` | «$26.67» |
| 100 SAR → `YER_OLD` | `convert_amount` | `14000.00` | «14,000 ر.ي» |
| 100 SAR → `YER_NEW` | `convert_amount` | `52000.00` | «52,000 ر.ي» |
| 52,000 `YER_NEW` → `SAR` | `convert_amount` | `100.00` | «100 ر.س» |
| 10 `USD` → `YER_NEW` | `convert_amount` | `19500.00` | «19,500 ر.ي» |
| product 12.5 `SAR` → `SAR` | product engine | `12.50` | «12.50 ر.س» |
| product 12.5 `SAR` → `YER_OLD` | product engine | `1750` | «1,750 ر.ي» |
| product 1 `USD` → `USD` | product engine | `1.00` | «$1» |
| product 1,000 `YER_NEW`, `custom_sar_rate = 500` → `SAR` | product engine | `2.00` | «2 ر.س» |
| `0` any currency | either | `0.00` | «0 ر.س» / «$0» / «0 ر.ي» |

## 8. For callers

| Situation | Do |
|---|---|
| Showing a price | print the `display_*` string as it is. Do not rebuild it from the decimal |
| Editing a price | send a decimal string in the **product's own currency**; the field's currency is in the same payload |
| A screen needs a total across currencies | ask Django for per-currency totals. Do not add display strings |
| A store changes its rates | the next request uses them. Orders already placed keep their stored amounts and currency |
| You need the store currency | `settings/` → `currency` |

See [`errors.md`](errors.md) for field-error bodies and [`conventions.md`](conventions.md) for the rest of the API rules.
