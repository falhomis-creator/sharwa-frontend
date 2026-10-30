# Verifying outgoing webhook signatures — Node.js and Python samples

> **Source**: DOC-220 · INT-023 (M19) · inventory Domain 12, A.8
> **Live key**: *Django-first, no switch of its own* (see [`webhooks-outgoing.md`](webhooks-outgoing.md)).
> **Django provider**: `sharwa_saas/products/services/webhook_service.py` (`sign()`, `send()`, `test_endpoint()`)
> **Frontend contract**: none (receiver-side code). The owner's test button is documented in [M19 §6.5](../domains/12-settings-staff-integrations/m19-domains-integrations.md#webhooks-test).
> **Tests**: the contract is asserted by `sharwa_saas/api/test_integrations_api.py::WebhookApiTests::test_test_event_signed`. The samples on this page were run against a fixture built with the real `sign()` — results in [§7](#tested).
> **Last verified against code**: 2026-10-27 (step 28)

<a id="overview"></a>

## 1. Overview

This page gives copy-paste receivers that check the `X-Sharwa-Signature` header of an outgoing webhook, in **Node.js** (plain module, Express, Next.js route handler) and **Python** (plain module, Flask, Django). Each receiver does the same six things in the same order:

1. read the **raw body bytes**;
2. parse `t=` and `v1=` from the header;
3. reject a timestamp more than 300 seconds from the clock;
4. compute `HMAC-SHA256(secret, "<t>." + raw body)` as lowercase hex;
5. compare in constant time;
6. only then parse the JSON, deduplicate on the body `id` and answer `2xx`.

The protocol itself — headers, retries, secret rotation — is in [`webhooks-outgoing.md`](webhooks-outgoing.md); the events are in [`webhooks-events.md`](webhooks-events.md).

<a id="algorithm"></a>

## 2. The algorithm in one place

```
header   = "t=<unix seconds>,v1=<64 lowercase hex>"
signed   = ASCII(t) + "." + raw body bytes
v1       = hex( HMAC_SHA256( key = UTF8(secret), message = signed ) )
accept   = |now - t| <= 300  AND  constant_time_equal(v1, header.v1)
```

* `secret` is the full `whsec_…` string, prefix included.
* The body is compact UTF-8 JSON with real Arabic characters (no `\uXXXX` escapes). Use the bytes you received.
* Each delivery attempt has its own `t`, so a retry carries a new signature. Do not cache signatures.

Reason codes returned by the samples (for your logs only; send nothing more specific than `400` to the caller in production):

| Code | Meaning |
|---|---|
| `missing` | no `X-Sharwa-Signature` header, or no secret configured |
| `malformed` | header is not `t=<digits>,v1=<hex>` |
| `stale_timestamp` | `t` is more than 300 s from your clock (past or future) |
| `bad_signature` | the digest does not match: wrong secret, altered body, or body re-serialized |

<a id="node"></a>

## 3. Node.js

Tested on Node 22; Node 18 or newer is expected to work (`node:crypto`, standard `Request`/`Response`). The module has no dependencies.

### 3.1 Verification module — `sharwa-webhook.mjs`

```javascript
import { createHmac, timingSafeEqual } from 'node:crypto';

export const TOLERANCE_SECONDS = 300;

/**
 * Verify the X-Sharwa-Signature header of one delivery.
 *
 * @param {Buffer|string} rawBody  the request body exactly as received (bytes, not re-serialised JSON)
 * @param {string|null|undefined} header  value of the X-Sharwa-Signature header: "t=<unix>,v1=<hex>"
 * @param {string} secret  the endpoint secret, "whsec_…"
 * @param {{ toleranceSeconds?: number, now?: number }} [options]  `now` is Unix seconds (tests only)
 * @returns {{ ok: true, timestamp: number } | { ok: false, reason: string }}
 */
export function verifySharwaSignature(rawBody, header, secret, options = {}) {
  const { toleranceSeconds = TOLERANCE_SECONDS, now = Date.now() / 1000 } = options;
  if (!header || !secret) return { ok: false, reason: 'missing' };

  const parts = {};
  for (const item of header.split(',')) {
    const i = item.indexOf('=');
    if (i > 0) parts[item.slice(0, i).trim()] = item.slice(i + 1).trim();
  }
  if (!/^\d{1,12}$/.test(parts.t ?? '') || !parts.v1) return { ok: false, reason: 'malformed' };

  const timestamp = Number(parts.t);
  if (Math.abs(now - timestamp) > toleranceSeconds) return { ok: false, reason: 'stale_timestamp' };

  const expected = createHmac('sha256', secret).update(`${parts.t}.`).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(parts.v1, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad_signature' };

  return { ok: true, timestamp };
}
```

### 3.2 Express

`express.raw()` must run **instead of** `express.json()` on this route. If a global `app.use(express.json())` is registered before it, the body is already parsed and the original bytes are lost — register the webhook route first, or mount `express.json()` only on other paths.

```javascript
import express from 'express';
import { verifySharwaSignature } from './sharwa-webhook.mjs';

const SECRET = process.env.SHARWA_WEBHOOK_SECRET; // "whsec_…", shown once when the endpoint was created
const seenEventIds = new Set();                    // use a table with a UNIQUE column in production

export const app = express();

// express.raw() keeps the body as a Buffer. Do NOT put express.json() before this route:
// it would parse the body and the signature could no longer be checked against the original bytes.
app.post('/hooks/sharwa', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
  const result = verifySharwaSignature(req.body, req.get('X-Sharwa-Signature'), SECRET);
  if (!result.ok) return res.status(400).json({ error: result.reason });

  const event = JSON.parse(req.body.toString('utf8'));
  if (seenEventIds.has(event.id)) return res.sendStatus(200); // duplicate or retry: acknowledge, do nothing
  seenEventIds.add(event.id);

  // Answer 2xx quickly and do the real work in a queue.
  console.log(`received ${event.event} ${event.id} (delivery ${req.get('X-Sharwa-Delivery')})`);
  return res.sendStatus(200);
});
```

### 3.3 Next.js (App Router route handler)

Route handlers receive a standard `Request`; read the bytes with `arrayBuffer()` and do not call `request.json()` first. Use the Node.js runtime (the sample imports `Buffer` and `node:crypto`), not the Edge runtime. In TypeScript, type the parameter as `request: Request` and the module's arguments as in its JSDoc.

```javascript
// app/api/hooks/sharwa/route.js  (Next.js App Router, Node.js runtime)
import { verifySharwaSignature } from './sharwa-webhook.mjs';

export const runtime = 'nodejs';

const seenEventIds = new Set(); // use a table with a UNIQUE column in production

export async function POST(request) {
  // arrayBuffer() gives the exact bytes. Never call request.json() before verifying.
  const rawBody = Buffer.from(await request.arrayBuffer());
  const result = verifySharwaSignature(
    rawBody,
    request.headers.get('x-sharwa-signature'),
    process.env.SHARWA_WEBHOOK_SECRET,
  );
  if (!result.ok) return Response.json({ error: result.reason }, { status: 400 });

  const event = JSON.parse(rawBody.toString('utf8'));
  if (seenEventIds.has(event.id)) return new Response(null, { status: 200 });
  seenEventIds.add(event.id);

  // Answer 2xx quickly and do the real work in a queue.
  return new Response(null, { status: 200 });
}
```

With the Pages Router the equivalent is to disable the body parser (`export const config = { api: { bodyParser: false } }`) and read the stream into a `Buffer` before calling `verifySharwaSignature` (not tested here).

<a id="python"></a>

## 4. Python

The module uses only the standard library. Tested on Python 3.13.

### 4.1 Verification module — `sharwa_webhook.py`

```python
import hashlib
import hmac
import re
import time

TOLERANCE_SECONDS = 300


class SignatureError(Exception):
    """Raised when a delivery must be rejected. `reason` is a short machine-readable code."""

    def __init__(self, reason):
        super().__init__(reason)
        self.reason = reason


def verify_sharwa_signature(raw_body, header, secret, tolerance=TOLERANCE_SECONDS, now=None):
    """Check the X-Sharwa-Signature header ("t=<unix>,v1=<hex>") of one delivery.

    raw_body must be the request body exactly as received (bytes, not re-serialised JSON).
    Returns the signed Unix timestamp, or raises SignatureError.
    """
    if not header or not secret:
        raise SignatureError('missing')

    parts = {}
    for item in header.split(','):
        key, _, value = item.strip().partition('=')
        parts[key] = value
    timestamp, v1 = parts.get('t', ''), parts.get('v1', '')
    if not re.fullmatch(r'\d{1,12}', timestamp) or not v1:
        raise SignatureError('malformed')

    current = time.time() if now is None else now
    if abs(current - int(timestamp)) > tolerance:
        raise SignatureError('stale_timestamp')

    expected = hmac.new(
        secret.encode('utf-8'), timestamp.encode('ascii') + b'.' + raw_body, hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected.encode('utf-8'), v1.encode('utf-8')):
        raise SignatureError('bad_signature')
    return int(timestamp)
```

### 4.2 Flask

`request.get_data()` returns the exact bytes. Call it before `request.get_json()` (which reads and caches the same stream); never verify against `request.get_json()` output.

```python
import json
import os

from flask import Flask, jsonify, request

from sharwa_webhook import SignatureError, verify_sharwa_signature

app = Flask(__name__)
SECRET = os.environ['SHARWA_WEBHOOK_SECRET']  # "whsec_…", shown once when the endpoint was created
seen_event_ids = set()                        # use a table with a UNIQUE column in production


@app.post('/hooks/sharwa')
def sharwa_hook():
    raw_body = request.get_data()  # the exact bytes; call this before request.get_json()
    try:
        verify_sharwa_signature(raw_body, request.headers.get('X-Sharwa-Signature'), SECRET)
    except SignatureError as exc:
        return jsonify(error=exc.reason), 400

    event = json.loads(raw_body)
    if event['id'] in seen_event_ids:
        return '', 200  # duplicate or retry: acknowledge, do nothing
    seen_event_ids.add(event['id'])

    # Answer 2xx quickly and do the real work in a queue (Celery, RQ, …).
    return '', 200
```

### 4.3 Django

`request.body` is the raw bytes. Do not run `json.loads` before the check, and exempt the view from CSRF — the caller is a server, not a browser. With Django REST Framework, read `request.body` rather than `request.data` (not tested here).

```python
import json
import os

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from sharwa_webhook import SignatureError, verify_sharwa_signature

SECRET = os.environ['SHARWA_WEBHOOK_SECRET']  # "whsec_…", shown once when the endpoint was created
seen_event_ids = set()                        # use a model with a unique field in production


@csrf_exempt  # the call comes from Sharwa's servers, not from a browser form
@require_POST
def sharwa_hook(request):
    raw_body = request.body  # the exact bytes; read it before anything parses the body
    try:
        verify_sharwa_signature(raw_body, request.headers.get('X-Sharwa-Signature'), SECRET)
    except SignatureError as exc:
        return JsonResponse({'error': exc.reason}, status=400)

    event = json.loads(raw_body)
    if event['id'] in seen_event_ids:
        return HttpResponse(status=200)  # duplicate or retry: acknowledge, do nothing
    seen_event_ids.add(event['id'])

    # Answer 2xx quickly and do the real work in a queue (Celery, RQ, …).
    return HttpResponse(status=200)
```

<a id="shell"></a>

## 5. Checking one delivery by hand

With the secret, the header value and the body saved to a file **without adding a newline**, `openssl` produces the same digest — useful to prove that your secret is the right one:

```bash
SECRET='whsec_…'          # the secret you copied from the dashboard
TS=1793133300             # the number after t= in the header
printf '%s.' "$TS" | cat - body.json | openssl dgst -sha256 -hmac "$SECRET"
# compare the printed hex with the value after v1=
```

For the fixture of [§7](#tested) this printed `40fcd1e873627984bb856d20f2ee6a824af98ada7f20bab57dd8dd427c0bf980`, equal to the `v1` produced by Sharwa's own `sign()`.

<a id="mistakes"></a>

## 6. Common mistakes

| Mistake | Effect | Fix |
|---|---|---|
| Verifying `JSON.stringify(req.body)` / `json.dumps(request.json)` | `bad_signature`. Pretty-printing changes the bytes, and Python's default `json.dumps` escapes Arabic as `\uXXXX`. (Compact `JSON.stringify` happens to reproduce Sharwa's bytes, which hides the bug until a body contains a character it formats differently — do not rely on it.) | Verify the raw bytes |
| Global JSON body parser before the route | Raw bytes gone | Mount the raw parser on this route first |
| Using the secret without `whsec_` | `bad_signature` | Use the full string |
| Comparing with `==` / `===` | Timing leak | `timingSafeEqual` / `hmac.compare_digest` |
| Treating `X-Sharwa-Delivery` as the event id | Duplicates processed after a retry | Deduplicate on the body `id` |
| Not checking `t` | Captured requests can be replayed | Reject beyond ±300 s |
| Slow work before answering | Timeout at 10 s → retry → duplicates | Queue and answer `2xx` first |
| Rotating the secret without updating the receiver | Every delivery fails with `bad_signature` until fixed (retries stop after 3 attempts) | Deploy the new secret, then rotate — or rotate and redeliver the failed rows |

<a id="tested"></a>

## 7. How these samples were tested

> ⚠️ Discrepancy — roadmap says the samples are "tested against a fixture produced by the test event" and "both samples verify a real test-event delivery" / what was done: no live delivery was made. A real one needs a running Django with a tenant, a public HTTPS endpoint and a Celery worker, which this documentation step does not have. Instead the fixture was produced by **extracting the real `sign()` function from `webhook_service.py` with the Python `ast` module** (not re-implemented), applied to a body built with the same envelope and serialization as `build_payload()` / `test_endpoint()` (`json.dumps(…, ensure_ascii=False, separators=(',', ':'))`, UTF-8, event `webhook.test`, Arabic store name and message). The header was also checked against the recipe asserted by `test_test_event_signed` (`hmac.new(secret, f'{ts}.'.encode() + body, sha256)` equals `t={ts},v1={…}`) and against `openssl` ([§5](#shell)). Re-run the owner's «إرسال حدث تجريبي» button against your own receiver once for the true end-to-end check.

Environment: Node 22.23.4, Express 4.21.2, Python 3.13, Flask 3.1.3, Django 6.1.2 (run in-process with `RequestFactory`). The Next.js handler was called directly with a standard `Request` object; it was not run under `next dev`.

Fixture: secret `whsec_` + 32 characters, timestamp = the time of generation, body of 277 bytes containing Arabic text. Cases:

| Runtime | Case | Observed | Result |
|---|---|---|---|
| Node | core: valid | `{"ok":true,"timestamp":1793133300}` | PASS |
| Node | core: tampered body (1 byte) | `{"ok":false,"reason":"bad_signature"}` | PASS |
| Node | core: re-serialised JSON (pretty-printed, indent 2) | `{"ok":false,"reason":"bad_signature"}` | PASS |
| Node | core: wrong secret | `{"ok":false,"reason":"bad_signature"}` | PASS |
| Node | core: edge (299 s old) | `{"ok":true,"timestamp":1793133001}` | PASS |
| Node | core: stale (301 s old) | `{"ok":false,"reason":"stale_timestamp"}` | PASS |
| Node | core: future (301 s ahead) | `{"ok":false,"reason":"stale_timestamp"}` | PASS |
| Node | core: malformed header | `{"ok":false,"reason":"malformed"}` | PASS |
| Node | core: non-hex v1 of other length | `{"ok":false,"reason":"bad_signature"}` | PASS |
| Node | core: missing header | `{"ok":false,"reason":"missing"}` | PASS |
| Node | express: valid -> status | `200` | PASS |
| Node | express: same event again (dedupe) -> status | `200` | PASS |
| Node | express: tampered -> status | `400` | PASS |
| Node | express: stale -> status/reason | `[400,"stale_timestamp"]` | PASS |
| Node | next: valid -> status | `200` | PASS |
| Node | next: same event again -> status | `200` | PASS |
| Node | next: tampered -> status | `400` | PASS |
| Node | next: stale/forged -> status/body | `[400,{"error":"stale_timestamp"}]` | PASS |
| Python | core: valid | `('ok', 1793133300)` | PASS |
| Python | core: tampered body (1 byte) | `('error', 'bad_signature')` | PASS |
| Python | core: re-serialised JSON (json.dumps defaults) | `('error', 'bad_signature')` | PASS |
| Python | core: wrong secret | `('error', 'bad_signature')` | PASS |
| Python | core: edge (299 s old) | `('ok', 1793133001)` | PASS |
| Python | core: stale (301 s old) | `('error', 'stale_timestamp')` | PASS |
| Python | core: future (301 s ahead) | `('error', 'stale_timestamp')` | PASS |
| Python | core: malformed header | `('error', 'malformed')` | PASS |
| Python | core: non-ASCII v1 (no TypeError) | `('error', 'bad_signature')` | PASS |
| Python | core: missing header | `('error', 'missing')` | PASS |
| Python | flask: valid -> status | `200` | PASS |
| Python | flask: same event again -> status | `200` | PASS |
| Python | flask: tampered -> status | `400` | PASS |
| Python | flask: stale -> status/body | `(400, {'error': 'stale_timestamp'})` | PASS |
| Python | django: valid -> status | `200` | PASS |
| Python | django: same event again -> status | `200` | PASS |
| Python | django: tampered -> status | `400` | PASS |
| Python | django: stale -> status/body | `(400, {'error': 'stale_timestamp'})` | PASS |
| Python | django: GET -> 405 | `405` | PASS |

Result: **18 of 18** Node checks and **19 of 19** Python checks passed. The same fixture file was read by both test runners, so the Node and Python verifiers agree with each other and with Sharwa's `sign()`.

To reproduce, save the six files above, generate a fixture with any implementation of the algorithm of [§2](#algorithm), and run each receiver against it with the secret in `SHARWA_WEBHOOK_SECRET`.

<a id="related"></a>

## 8. Related pages

* Protocol and delivery rules: [`webhooks-outgoing.md`](webhooks-outgoing.md)
* Event catalogue: [`webhooks-events.md`](webhooks-events.md)
* Inbound receivers (the opposite direction): [`webhooks-inbound.md`](webhooks-inbound.md)
* Folder index: [`README.md`](README.md)
