# Support API — M32 (مركز الدعم)

> **Source**: DOC-260, DOC-261, DOC-262 · INT-042 (M32) · inventory Domain 14, A.7, A.8
> **Live key**: `support` (`SHARWA_LIVE_MODULES`) — one catch-all `api/bff/support/[...path]` → `/api/v1/support/<path>/`.
> **Django provider**: `sharwa_saas/products/services/support_api_service.py` + `api/views_support.py` (11 routes) · every session transition and staff reply goes through `products/services/support_lock_service.py` (`select_for_update`); tickets are the same `SupportTicket` table the legacy screen and the average-close-time report read
> **Frontend contract**: `sharwa-frontend/src/features/support/schemas.ts` (`sessionSchema`, `timelineItemSchema`, `ticketRowSchema`, `assigneeListSchema`, …) · fixtures `src/mocks/support/`
> **Tests**: `sharwa_saas/api/test_support_api.py` (6 `def test_` methods)
> **Last verified against code**: 2026-10-28 (step 43)

## 1. Overview

The support centre: **live sessions** (WhatsApp conversations the Sharwa AI bot answers until a human takes over — M31's bot hands off here) and **tickets** (the internal work queue). Sessions are guarded by a row-lock service: only one member may hold a session at a time, transitions and replies check an optimistic `version`, and replies are idempotent per `client_id`. Before INT-042 this was the HTML support hub (`views/support_hub.py`, `views/operations.support_tickets_view`) on the same models.

## 2. Access — gate chain (FR-32.01)

| # | Gate | Requirement | Failure |
|---|---|---|---|
| 1 | Session | owner or staff session — **no plan feature** gates any support row | `401` |
| 2 | Permission key | only for takeover / release / close / reply: `support.takeover_session` (the owner holds it implicitly) | `403` `{"detail": "ليست لديك صلاحية استلام جلسات الدعم."}` |

Reading sessions, the whole tickets CRUD and the assignees list need **no permission key** — every signed-in member of the store can read and file tickets (FR-32.05).

## 3. Endpoint summary — the 11 routes

Declared in `api/urls.py` under `support/`:

| Method | Django path (`/api/v1/support/…`) | Purpose | Gate |
|---|---|---|---|
| `GET` | `sessions/` | live sessions, filters + `ai` flags | read |
| `GET` | `sessions/counters/` | `{escalated, human_locked_mine}` | read |
| `GET` | `sessions/<id>/?after=<cursor>` | session + merged timeline | read |
| `POST` | `sessions/<id>/takeover/` | take the session `{version}` | `support.takeover_session` |
| `POST` | `sessions/<id>/release/` | hand back to the bot `{version}` | same |
| `POST` | `sessions/<id>/close/` | close `{version}` | same |
| `POST` | `sessions/<id>/messages/` | staff reply `{text, client_id}` | same |
| `GET`, `POST` | `tickets/` | list / create | read |
| `GET` | `tickets/counters/` | `{open, in_progress}` badge | read |
| `GET`, `PATCH` | `tickets/<id>/` | detail / update | read |
| `GET` | `assignees/` | active staff for assignment | read |

## 4. Endpoint groups

### 4.1 Sessions: list, counters, detail timeline

#### `GET sessions/?status&session_type&assigned_to_me&q&page&page_size`

| Param | Values | Notes |
|---|---|---|
| `status` | `bot_active · human_locked · escalated · closed` | anything else → `400` `{"status": ["حالة غير صحيحة."]}` |
| `session_type` | `customer · affiliate · staff_internal` | else `400` `{"session_type": ["نوع غير صحيح."]}` |
| `assigned_to_me` | truthy (`1/true/yes/on`) | only sessions **you** hold |
| `q` | free text | matches the phone (digit substring) **or the party name** — names resolve through orders, affiliates and staff members (`_name_phones`) |
| `page`, `page_size` | ints | default 20, max 100; DRF-style `{count, next, previous, results}` envelope |

**Ordering**: `escalated → human_locked → bot_active → closed`, then latest activity first (`last_activity = greatest(updated_at, latest message)`). The envelope carries `ai: {installed, enabled}` — whether Sharwa AI is installed-and-active and whether auto-reply is on in `SupportBotSettings`. Row (`session_view`):

```json
{
  "id": 88,
  "session_type": "customer",
  "status": "escalated",
  "party": { "name": "منى", "phone": "9677XXXXXXXX" },
  "assigned_staff": { "id": 4, "name": "سامي" },
  "messages_count": 12,
  "last_activity_at": "2026-10-27T11:02:44+00:00",
  "version": 6,
  "is_mine": false
}
```

- `party.name` — there is no customer model (FR-07.01): the name comes from the **latest order** with that phone (customer sessions), the affiliate, or the staff member (per `session_type`); the phone itself if none. `party.phone` is `null` for `staff_internal` sessions.
- `assigned_staff` — the holder while `human_locked`; `{id: null, name: "مالك المتجر"}` when the owner holds it.
- `messages_count` excludes `system` rows.
- `version` — the optimistic-lock counter to send back on any action (§4.2).

`GET sessions/counters/` → `{escalated, human_locked_mine}`.

#### `GET sessions/<id>/?after=<cursor>` — the timeline

The response `{session, timeline, cursor, can_takeover, ai}` merges **two tables into one ordered list** — `SupportMessage` and `BotToolCallLog` — with stable, unique ids:

- message id = `2 × message_pk` (`kind: "message"`); tool call id = `2 × tool_pk + 1` (`kind: "tool_call"`); ordering by `(created_at, id)`.
- `cursor` is the opaque string `"<last_message_pk>.<last_tool_pk>"` — return it as `?after=` and each table resumes from its own high-water mark (nothing is lost when the two advance independently). A bare legacy numeric id still decodes (even → message, odd → tool call).
- Up to 500 rows per kind per page; `can_takeover` is `support.takeover_session` for the caller.

Timeline items:

- message: `{id, kind, sender_type (customer|bot|staff|system), sender_name, text, media_type, media_url, client_id, created_at}` — `sender_name` defaults to «موظف» for unnamed staff and «شروة AI» for the bot; customer media is a **signed URL** (the UI shows «فتح المرفق»); `system` rows render as quiet events (joins, takeovers…).
- tool call: `{id, kind, tool_name, input_summary, output_summary, error, created_at}` — **inputs and outputs are redacted server-side** (FR-31.07): any key matching `token | secret | password | passwd | api[-_]key | authorization | auth | otp | pin | cvv | card` becomes `***` before the data leaves Sharwa; a tool result that is `{"error": …}` surfaces as `error` instead of an output.

Unknown session → `404` `{"detail": "الجلسة غير موجودة."}`.

### 4.2 Takeover, release, close, staff replies

#### `POST sessions/<id>/takeover|release|close/ {version}`

All three check the `version` you last saw **under the session's row lock** and bump it on success; the lock service (`support_lock_service.py`) is the only writer. Errors:

| Status | Body | When |
|---|---|---|
| `400` | `{"version": ["أرسل رقم نسخة الجلسة كما رأيتها."]}` | missing / non-integer version |
| `404` | `{"detail": "الجلسة غير موجودة."}` | unknown session |
| `409` | `{"detail": "…", "session": <current session row>}` | someone got there first, or the version is stale — the body **names who holds it now** and returns the fresh row so the UI re-renders |

`takeover` locks the session to you (`human_locked`); `release` hands it back to the bot (and resets the consecutive-reply counter); `close` is final — and the new `staff_close` **refuses a session another member holds** (close after takeover, not under a colleague's feet). Takeover, release, close and escalation each log a `system` timeline row and bump `version`.

#### `POST sessions/<id>/messages/ {text, client_id}` — the idempotent reply

Requires holding the session: `409` `{"detail": "استلم الجلسة أولاً لتتمكن من الردّ."}` otherwise. `text` is required («اكتب رداً.») and ≤ 4096 chars («4096 حرفاً كحد أقصى.»); `client_id` (≤ 64 chars) is optional.

- The message row is written **synchronously under the lock** (with `sender_name` preserved).
- A **repeat of the same `client_id`** returns the **same row** with `200` instead of creating a second one (`201`) — `SupportMessage.client_id` is unique per session (migration `0234`), so a retried send can never double-message the customer.
- Actual delivery runs on Celery: `deliver_staff_reply` is queued `transaction.on_commit` and shares the delivery helper with the bot's `send_staff_reply_message`.

### 4.3 Tickets and assignees

#### `GET tickets/?status&assigned_to&q&page`

`status` is one of `open · in_progress · closed`; `assigned_to` is `me`, `none`, or a staff id (else `400` `{"assigned_to": ["me أو none أو معرّف موظف."]}`); `q` matches subject, phone or `#id`. Newest-updated first; the envelope carries `counters: {open, in_progress, closed}`. Row (`ticket_row` — contract names on the left, model fields on the right):

```json
{
  "id": 51,
  "title": "طلبي تأخر",
  "status": "in_progress",
  "assigned_to": { "id": 4, "name": "سامي" },
  "assignee_active": true,
  "customer_phone": "9677XXXXXXXX",
  "created_at": "2026-10-27T08:00:00+00:00",
  "updated_at": "2026-10-27T09:30:00+00:00"
}
```

Mapping: `title ↔ subject`, `created_at ↔ opened_at`; the detail view adds `description`, `created_by` and `closed_at`.

#### `POST tickets/` — create

Body `{title, description?, assigned_to_id?, customer_phone?}`:

| Rule | Error (verbatim) |
|---|---|
| `title` required, ≤ 200 chars | «أدخل عنوان التذكرة.» / «200 حرف كحد أقصى.» |
| `description` ≤ 4000 chars | «4000 حرف كحد أقصى.» |
| `customer_phone` optional, ≤ 20 digits/`+` | «رقم هاتف غير صحيح.» |
| `assigned_to_id` must be an active staff member or empty | «الموظف غير موجود أو غير نشط.» |

`201` — the full ticket view. `created_by` records the creator (owner or staff label; the legacy screen sets the same field).

#### `PATCH tickets/<id>/` — update

Partial `{status?, assigned_to_id?, title?, description?, customer_phone?}`. **`closed_at` follows the status**: closing stamps it, reopening clears it — exactly the legacy screen's rule (the average-close-time report depends on it). Reopening a closed ticket is allowed. Last write wins: the ticket model carries no version (§8). Unknown ticket → `404` `{"detail": "التذكرة غير موجودة."}`.

`GET tickets/counters/` → `{open, in_progress}` (the nav badge).

#### `GET assignees/`

The **active** staff members `[{id, name}]` for the assignment pickers — deliberately **not** gated by `staff.view`, so a member without staff permissions can still be assigned tickets or pick an assignee (FR-32.05). In ticket detail a deactivated assignee stays visible with `assignee_active: false` and a re-assign hint (§8); only the *picker* is limited to active staff.

## 5. Gaps closed, bugs fixed and migrations

**Migration `products/0234_support_api`** adds, in one migration:

- `SupportSession.version` (`PositiveIntegerField`, default 1) — the optimistic lock checked and bumped inside the lock service on takeover / release / escalate / close;
- `SupportMessage.sender_name` (≤ 150) and `SupportMessage.client_id` (≤ 64, nullable) + the partial unique constraint `support_message_client_id_once` (one row per `(session, client_id)` where `client_id` is not null) — the idempotent reply;
- `SupportTicket.description`, `updated_at` (auto), `created_by` (≤ 150), and `customer_phone` becomes optional (blank, indexed) — the fields the Next.js contract needs.

Behaviour closed with INT-042: version-checked transitions with a `{detail, session}` 409, idempotent staff replies, `staff_close` refusing a session a colleague holds, and the server-side redaction of tool-call inputs/outputs (FR-31.07).

## 6. Open items and legacy-only behaviour

- **BFF**: `api/bff/support/[...path]` → `liveOrMock(…, "support", "/api/v1/support/<path>/", …)`; `.env.example` lists `support`; the mock mirrors the 11 rows including the version and `client_id` rules.
- The legacy HTML screens (`support_hub`, `operations.support_tickets_view`) remain; both use the same lock service and table.
- Live sessions are produced by the Sharwa AI bot ([`m31-sharwa-ai.md`](m31-sharwa-ai.md)); their `escalate_session` transitions share the same lock/version rule.

## 7. Related pages

- [`m31-sharwa-ai.md`](m31-sharwa-ai.md) — the bot that owns `bot_active` sessions and escalates them · [`m30-app-store.md`](m30-app-store.md) — the shared app installation.
- [`../12-settings-staff-integrations/README.md`](../12-settings-staff-integrations/README.md) — staff members and permission keys (`support.takeover_session`).
