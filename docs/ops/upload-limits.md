# Upload size limits — end to end

> **Source**: DOC-514 · inventory A.10 · M05 (images), M33/M34 (feeds), M40 (Sharwa Pay), INT-045 (product import)
> **Code**: `sharwa_saas/deploy/nginx/snippets/sharwa-proxy.conf` · `config/settings.py` · `core/uploads.py` · `api/views_products.py` · `api/serializers_catalog.py` · `products/services/{design,marketing,product_import,storefront_checkout}_service.py` · `products/services/suppliers/feed_reader.py` · `products/forms.py` · `sharwapay/customer_api.py` · frontend `src/lib/bff/upstream.ts`, `src/proxy.ts`, `next.config.ts`
> **Last verified against code**: 2026-10-27 (official Step 09)

## 1. Purpose

A file travels through four places before it is stored, and each one has its own limit. This page lists every limit in the order the request meets it, then every upload surface with the limit the code enforces. Use it when a merchant says "the upload failed" and when a limit has to be changed (the **change together** table, [§6](#change)).

Nothing here was run: the limits are read from code and from the tests that pin them. The frontend screens' own pre-checks (file picker `accept`, client-side compression) live in feature code that was not available to this review — see [§7](#open).

<a id="ladder"></a>

## 2. The ladder

| # | Layer | Limit | Where it is set | What the user sees when exceeded |
|---|---|---|---|---|
| 1 | Browser → Next.js BFF (`/api/bff/*`) | **No limit in code.** The BFF reads the whole body into memory (`bufferedBody` → `request.arrayBuffer()`) so it can send a `Content-Length` to Django. `src/proxy.ts` skips `/api/*`, so Next's proxy body-clone cap does not apply to uploads. | `src/lib/bff/upstream.ts` | Memory pressure on the Next.js process for very large bodies; no error message. |
| 2 | Edge Nginx in front of Django | **`client_max_body_size 55m`** | `deploy/nginx/snippets/sharwa-proxy.conf` (shared by `sharwa.conf` and `sharwa.docker.conf`) | Nginx answers **413** with its own HTML page — Django never sees the request. |
| 3 | Django request body | **`DATA_UPLOAD_MAX_MEMORY_SIZE` = 8 MB** — counts everything **except** uploaded file parts of a multipart request | `config/settings.py` | `RequestDataTooBig` → 400 from Django. Applies to JSON bodies (data-URL images, CSRF-free API calls) and to non-file form fields. |
| 4 | The view / service for that surface | 5 MB per image, 50 MB per feed, 20,000 rows per import, … ([§3](#surfaces)) | the files in the "Code" line above | An Arabic message in the `detail` / field error (quoted below). |

Two consequences:

- A **JSON** image upload can be at most 8 MB on the wire. A 5 MB image becomes about 6.7 MB of base64, which is why the setting is 8 MB (comment in `settings.py`; the test `api/test_catalog_api.py` asserts the setting is ≥ 8 MB and `api/test_catalog_serializers.py` posts a ~7 MB data URL and expects rejection).
- A publish that carries many new images as data URLs in one JSON `PATCH` (for example several slider images) is bounded by the same 8 MB for the whole body.
- A **multipart** file is not counted by layer 3, so the real ceiling for a file is the smaller of Nginx's 55 MB and the view's own limit.

> ⚠️ Discrepancy — roadmap says production Nginx `client_max_body_size 8M` must match `DATA_UPLOAD_MAX_MEMORY_SIZE` (DOC-514 and DOC-515) / code does `client_max_body_size 55m;` in `deploy/nginx/snippets/sharwa-proxy.conf`, with the comment "Feeds accept up to 50 MB (`feed_reader.MAX_FILE_BYTES`); receipts 5 MB". The roadmap wording comes from comments that are still in the code: `config/settings.py` (above `DATA_UPLOAD_MAX_MEMORY_SIZE`: "Nginx `client_max_body_size 8M` must match"), `api/views_products.py` ("Nginx limits the request to 8MB") and `src/lib/bff/upstream.ts` ("8MB max"). The behaviour is the 55 MB one, and it is deliberate: Nginx must admit 50 MB feed files, while Django still caps JSON bodies at 8 MB. This page documents it as it behaves; the three stale comments and the DOC-515 wording need correcting (Step 52 / next code change). Nothing was changed.

<a id="surfaces"></a>

## 3. Upload surfaces

"Types" is what the server accepts; "content check" says whether the bytes are inspected or only the name / declared type.

| Surface (screen) | Endpoint / code | Max size | Types | Content check | Error text on rejection |
|---|---|---|---|---|---|
| **Product gallery** (add images) | `POST products/{id}/images` multipart `images` (`ProductImagesView`) — the browser sends one image per request | **5 MB** per file | jpg, jpeg, png, webp, gif (by name) | Pillow opens and `verify()`s; format must be JPEG / PNG / WEBP / GIF. No pixel cap in this view. | «حجم الصورة أكبر من 5MB.» · «الصيغ المسموحة: jpg, jpeg, png, webp, gif» |
| **Category image / OG image, brand logo, option (variant value) image, store SEO image** | JSON fields as `data:image/…;base64,…` (`Base64ImageField` in `serializers_catalog.py` and `serializers_products.py`; `settings_service.patch_seo` for `seo_og_image`; `views_products` option routes) | **5 MB decoded** (a quick estimate runs before decoding) | by Pillow's detected format: jpg, png, webp, gif | Pillow `verify()` + **40,000,000 pixels** (`MAX_IMAGE_PIXELS`) | «حجم الصورة 5MB على الأكثر.» · «أبعاد الصورة كبيرة جداً.» · «الصيغ المسموحة: …» |
| **Store logo / theme images** | `PATCH store/theme` — multipart `logo`, or data-URL strings for section images (`design_service`) | **5 MB** | logo: extension and declared `image/jpeg|png|webp|gif`; data URL: the same four types in the prefix | Logo: name + declared type only. Data URL: prefix, base64 and size only (`_decode_data_url`). | «حجم الشعار 5MB على الأكثر.» · «حجم الصورة 5MB على الأكثر.» · «الصيغ المسموحة: …» |
| **Promotional offer image** | multipart `image` on offer create / update (`marketing_service`) | **5 MB** | jpg, jpeg, png, webp, gif (by name) | Name only | «حجم الصورة أكبر من 5MB.» · «الصيغ المسموحة: jpg, jpeg, png, webp, gif» |
| **Manual-transfer receipt at checkout** (storefront) | `place_order` and `attach_receipt` → `products/forms.py: validate_receipt_image` | **5 MB** | **JPEG or PNG only**, judged by the browser-declared content type | Declared type only — no Pillow check | «صيغة الملف غير مدعومة. يُسمح فقط بصور JPEG أو PNG.» · «حجم الملف كبير جداً. الحد الأقصى المسموح به 5MB.» |
| **Sharwa Pay top-up receipt** (customer wallet) | `sharwapay/customer_api.py: _receipt_error` | **5 MB** | jpg, jpeg, png, webp, gif (by name) | Pillow via `forms.ImageField().clean()` | «أرفق صورة الإيصال.» · «الصيغ المسموحة: jpg, jpeg, png, webp, gif.» · «حجم الصورة أكبر من 5 ميغابايت.» · «الملف ليس صورة صالحة.» |
| **Supplier flat-feed file** (dropshipping) | `create_feed` → `feed_reader.sniff_upload` | **50 MB** (`MAX_FILE_BYTES`) | csv, tsv, txt, xlsx | First 8 KB sniffed (`detect_format`); an `.xlsx` name with non-Excel bytes is refused | «حجم الملف أكبر من 50MB.» · «الملف فارغ.» · «الصيغ المقبولة: CSV أو xlsx.» · «الامتداد xlsx لكن المحتوى ليس ملف Excel.» |
| **Product import** (CSV / xlsx) | `product_import_service.upload` → the same `sniff_upload` + `FeedReader` | **50 MB** and **20,000 data rows** (`MAX_ROWS`) | csv, tsv, txt, xlsx | Same as feed; UTF-8 / Windows-1256 detected | «الصيغ المسموحة: csv, tsv, txt, xlsx» · «الملف أكبر من 20,000 صف — قسّمه إلى ملفات أصغر.» · «الملف ليس بترميز UTF-8؛ احفظه بترميز UTF-8 ثم أعد الرفع.» |
| **Supplier webhook body** (not a file) | `tenants/webhooks_suppliers.py` | **1 MB** (`MAX_BODY_BYTES`), 200 events per call | JSON | — | HTTP **413** `{"ok": false, "error": "payload_too_large"}` |

Reader limits that apply inside a feed or an import (`feed_reader.py`):

| Limit | Value | Behaviour |
|---|---|---|
| Columns | 200 | «الملف يحوي N عموداً — الحد 200.» / «الصف N يحوي أكثر من 200 عموداً.» |
| Cell length | 10,000 characters | Longer cells are **truncated silently** (`[:MAX_CELL]`). |
| xlsx: uncompressed sheet or shared-strings part | 300 MB | The read is refused (zip-bomb guard). |
| xlsx: shared strings | 500,000 | The read is refused. |
| Rows | `MAX_ROWS = 200_000` is declared in `feed_reader.py` but no line of that file uses it | The feed-run code (`feed_engine`) was not in the reviewed files — confirm whether a 200,000-row cap is enforced there ([§7](#open)). Product import has its own 20,000-row cap. |

Memory note for the two spreadsheet surfaces: `product_import_service._read` copies the upload into `io.BytesIO` and keeps every row in the `ProductImportJob.rows` JSON field, so a 20,000-row import is held in Gunicorn memory and in one database row. Plan for that when raising `MAX_ROWS`.

### 3.1 File names and extensions (every `FileField` / `ImageField` under `TenantUploadTo`)

Independent of size: `core.uploads.tenant_upload_path` refuses an extension outside the field's list **before anything is written**, with «امتداد الملف «<ext>» غير مسموح. الامتدادات المسموحة: <list>.». Lists: images `jpg, jpeg, png, webp, gif` (no `svg`); documents `pdf, jpg, jpeg, png, webp`; feeds `csv, tsv, txt, xlsx`. A name that is not pure ASCII (for example a screenshot named in Arabic) is stored under a `uuid` name; the path is `<schema>/<folder>/<name>`. Files stored before 2026-10-24 are fixed with `normalize_media_filenames` ([`management-commands.md`](management-commands.md#normalize_media_filenames)). Nginx additionally refuses to serve `html`, `svg`, `js`, `xml`, `php` and similar under `/media/` (403) and forces download for anything that is not `jpg|jpeg|png|gif|webp`.

### 3.2 Surfaces with no size limit in code

- `products/views/csv_io.py: import_products_csv` (the older server-rendered import page): reads the whole file with `file.read()` and has no size or row cap; only the layers above bound it (Nginx 55 MB). If that route is still reachable, the Next.js screen above is the one to use. Whether the route is still wired in `urls.py` was not checked.
- The platform-side Sharwa Pay top-up view (`tenants/sharwa_pay_views.py`) passes `request.FILES.get('receipt_image')` to the service; its validation was not reviewed here.

<a id="symptoms"></a>

## 4. What the person sees at each layer

| Symptom | Layer | Cause | Fix |
|---|---|---|---|
| Browser shows a plain Nginx "413 Request Entity Too Large" page | Nginx | Body > 55 MB | Ask for a smaller file; feed files are capped at 50 MB anyway. |
| «حجم الصورة أكبر من 5MB.» | View | Image > 5 MB | The dashboard compresses larger images before sending (per the comment in `serializers_catalog.py`); if it did not, resize manually. |
| Generic 400 on an image sent as JSON | Django | Body > 8 MB before the 5 MB check | The image is too large even after base64; send a smaller one. |
| «الملف أكبر من 20,000 صف …» | Service | Import cap | Split the file. |
| Receipt rejected although it is a valid JPG | View | The checkout validator trusts the **declared** type; a file sent as `application/octet-stream` fails | Re-attach from a normal browser upload; see the discrepancy list in the Step 09 changelog. |
| Upload hangs then fails near 60 s | Gunicorn / Nginx | Gunicorn `timeout 60`; Nginx `proxy_read_timeout 65s` | Large feed + slow link; run the import in smaller files. |

## 5. Tests that pin these limits

| Test | Pins |
|---|---|
| `api/test_products_api.py:379` | a file of 5 MB + 1 byte is rejected by the gallery endpoint |
| `api/test_catalog_serializers.py:140` | an oversized data URL is rejected |
| `api/test_catalog_api.py:89` | `DATA_UPLOAD_MAX_MEMORY_SIZE` is at least 8 MB |
| `products/test_dropshipping_phase3.py:191, 742` | `MAX_FILE_BYTES` can be lowered by patch; feed chunks stay under 8 MB peak memory |
| `products/test_media_isolation.py` | extension allow-lists and the `<schema>/…` path |

No test sends a 50 MB file through Nginx; the 55 MB figure is configuration only.

<a id="change"></a>

## 6. Change together

| To change… | Edit all of | Also |
|---|---|---|
| The image limit (5 MB) | `api/serializers_catalog.py`, `api/views_products.py`, `products/services/design_service.py`, `products/services/marketing_service.py`, `products/forms.py`, `sharwapay/customer_api.py` — **six independent constants** (`MAX_IMAGE_BYTES`, `RECEIPT_MAX_BYTES`, `MAX_SIZE_MB`) | The frontend pre-check and compression target; `DATA_UPLOAD_MAX_MEMORY_SIZE` must stay ≥ limit × 4/3 + overhead. |
| The feed limit (50 MB) | `feed_reader.MAX_FILE_BYTES` | `client_max_body_size` in `sharwa-proxy.conf` (keep ≥ 5 MB above it) and any proxy in front of the Next.js server. |
| The JSON body limit (8 MB) | `DATA_UPLOAD_MAX_MEMORY_SIZE` | Correct the three stale "8MB Nginx" comments at the same time. |
| The import row cap | `product_import_service.MAX_ROWS` | Memory of `ProductImportJob.rows`. |

<a id="open"></a>

## 7. Open points

1. **Proxy in front of Next.js.** The Nginx in this repository fronts Django (`upstream sharwa_app`). The repository does not describe the proxy that fronts the Next.js server in production; its body limit must be at least 50 MB for feed and import uploads to work through the BFF. *Decision for fares; to be recorded in `deployment/topology.md` (DOC-515).*
2. **Frontend pre-checks** (file-picker `accept`, client-side compression of images over 5 MB) are described by backend comments but were not reviewed in the frontend feature code. Verify per screen in the Step 10+ manual.
3. **`MAX_ROWS = 200_000`** in `feed_reader.py` — confirm where (if anywhere) it is enforced.
4. **Stale comments** (§2) — documentation-only fix in a later code change.
5. **Checkout receipt validation** trusts the declared content type and does no Pillow check, unlike the Sharwa Pay receipt. Documented as it behaves; a hardening item, not a doc fix.

## 8. Related pages

- [`environment.md`](environment.md) — `DATA_UPLOAD_MAX_MEMORY_SIZE` in context
- [`management-commands.md`](management-commands.md) — `normalize_media_filenames`
- [`dependencies.md`](dependencies.md) — Pillow, defusedxml
- `deployment/topology.md` — production topology and edge configuration (DOC-515, planned)
- `deployment/go-live-checklist.md` — release gates (DOC-517, planned)
