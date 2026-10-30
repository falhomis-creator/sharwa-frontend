# Runbook — issue TLS for a merchant custom domain

> **Source**: DOC-516 · inventory A.10 (`deploy/README.md` §3) · INT-023
> **Owner**: fares · **Last dry run**: not dry-run in step 39 (no environment was available; every command below is taken from the repository's configuration or is standard certbot/Nginx usage and is marked **derived** or **unverified** where it was not run)

> **Acceptance check NOT run.** DOC-516 is done when "a new custom domain can be taken to `active` following only this runbook". No domain was taken to `active` while writing it. Steps 1, 2, 8 and the state rules are checked against the code (`products/services/domain_service.py`, `tenants/models.py`); steps 4-7 and 9 describe Nginx/certbot work that the repository does not contain (it ships no per-domain configuration) and are written from the repository's own Nginx files plus standard certbot behaviour. Treat the first real domain as the dry run and record it in the "Last dry run" line.

## When to use

A store owner added a custom domain in the dashboard (`/dashboard/settings/domains`), put the DNS records in place and pressed «تحقّق الآن». The claim is now `verifying` («جارٍ التحقق», shown to the merchant as «جارٍ إصدار الشهادة»): the DNS proof passed, a `tenants.Domain` row exists, and HTTPS is not answering yet. Nothing issues the certificate automatically (the header of `products/services/domain_service.py`, lines 13-14, says so; `deploy/README.md` §3: "Automating this … is a separate task").

**Nobody is notified when a claim reaches `verifying`.** There is no log line, task, console list or admin page for claims (`CustomDomain` is not registered in `tenants/admin.py`; the console has no claims screen). Operations learns about it from the merchant or by running the query in step 1 — decide a routine for that (for example the query once a day).

> ⚠️ Discrepancy — roadmap says "when a domain reaches `verifying` … the ops step issues TLS" as if operations is triggered / code has no hand-off: no notification, no list, no Beat task (`products/services/domain_service.py:13-14, 249-284`; `tenants/admin.py` registers `Domain` at line 271 but not `CustomDomain`). Reported in step 39.

## Impact and risk

- **Per domain, one-time**: one new Nginx file, one Let's Encrypt certificate, one Django restart (only if step 4 applies). Duration 10 to 30 minutes plus DNS waiting.
- **Routing starts before TLS.** From `verifying` on, the `Domain` row routes the host to the store (`12-custom-domains.md` §4.4); the only thing missing is HTTPS at the edge.
- **Nginx reload** (steps 5 and 7) is graceful; a syntax error is caught by `nginx -t` before the reload — never skip it.
- **Django restart** (step 4) drops in-flight requests for a few seconds; do it in a quiet period. `reload` (HUP) is **not** enough to pick up new environment values under systemd (**derived**: systemd reads `EnvironmentFile=` at start, and `load_dotenv()` does not override variables already set).
- **HSTS** (derived from `config/settings.py:507-508`): when Django itself answers on the custom host, it sends `Strict-Transport-Security` for one year **with `includeSubDomains`**, so the browser pins every sub-host of the merchant's domain to HTTPS. Tell the merchant before activating an apex domain whose other sub-hosts are served over plain HTTP.
- **Let's Encrypt rate limits** apply per registered domain and per exact host set; do not re-issue repeatedly while debugging — use `--dry-run` / `--staging` first (**external behaviour**, see Let's Encrypt documentation).
- **Not reversible by itself**: a certificate that was issued is public (certificate transparency) even if you delete it later.

## Prerequisites

- Access: shell with `sudo` on the edge host; the application's `.env` and unit names (`gunicorn`, `celery-sharwa`, `celery-sharwa-beat`); a way to read the Django shell (`python manage.py shell` inside the application environment — the same `.env` the service uses).
- Software on the edge host: Nginx with the repository's snippets installed (`/etc/nginx/snippets/sharwa-{proxy,tls,gzip,media-headers}.conf`), `certbot`, the ACME webroot `/var/www/certbot` (already referenced by `deploy/nginx/sharwa.conf:21-23`), port 80 and 443 open to the internet.
- Values to have ready:
  - `<HOST>` — the custom host exactly as claimed, lower case (for example `shop.example.com`).
  - `<SCHEMA>` — the store's schema (shown in the console, or from step 1).
  - `<OPS_EMAIL>` — the address for certificate expiry notices.
  - The edge values the merchant was told to use: `SHARWA_EDGE_IP` (A record, apex domains) and `SHARWA_EDGE_CNAME` (CNAME target, sub-hosts; default `TENANT_BASE_DOMAIN`). `config/settings.py:33-34`.
- The platform wildcard certificate is **not** reusable: it covers `<BASE>` and `*.<BASE>` only (certbot DNS-01, `deploy/README.md` §3). A merchant domain needs its own certificate by HTTP-01, because only the merchant controls its DNS.

### Bare metal or Docker?

| Mode | Per-domain Nginx file | Certificate files |
|---|---|---|
| Bare metal (`deploy/nginx/sharwa.conf`) | `/etc/nginx/sites-available/` + symlink in `sites-enabled/` — steps below | `/etc/letsencrypt/live/<HOST>/` on the host |
| Docker Compose (`deploy/nginx/sharwa.docker.conf`) | **Not supported by the repository files**: the Nginx container loads one template (`docker-compose.prod.yml:155`) and mounts only `snippets/`, `static`, `media`, `/etc/letsencrypt` (read-only) and `certbot-webroot`. A per-domain file needs an extra bind mount into `/etc/nginx/conf.d/` — a change to the compose file that has not been made or tested (**unverified**) | `/etc/letsencrypt` is shared with the container, so host certbot works; the webroot is the named volume `certbot-webroot` (compose project `sharwa` → volume name `sharwa_certbot-webroot`, **derived**): `docker volume inspect sharwa_certbot-webroot --format "{{ .Mountpoint }}"` |

The steps below are written for bare metal. For Docker apply the same two server blocks through the extra mount.

## Steps

### 1. Find the claim

```bash
# Linux — claims waiting for a certificate (run in the application environment)
python manage.py shell -c "from tenants.models import CustomDomain; [print(c.id, c.client.schema_name, c.domain, c.status, c.dns_ok, c.last_checked_at) for c in CustomDomain.objects.filter(status='verifying').order_by('created_at')]"
```

```bat
:: Windows cmd (development machine only) — same command; keep the single quotes inside the double quotes
python manage.py shell -c "from tenants.models import CustomDomain; [print(c.id, c.client.schema_name, c.domain, c.status, c.dns_ok, c.last_checked_at) for c in CustomDomain.objects.filter(status='verifying').order_by('created_at')]"
```

Expected: one line per claim, for example `7 noor shop.example.com verifying True 2026-10-28 10:15:00+00:00`. Note the claim `id` and `<SCHEMA>`. (`CustomDomain` and `Client` live in the `public` schema, which `manage.py shell` uses by default. **Unverified** by running; the model fields are `tenants/models.py:425-460`.)

Also confirm the routing row exists — it must, for a `verifying` claim:

```bash
python manage.py shell -c "from tenants.models import Domain; print(list(Domain.objects.filter(domain='<HOST>').values('id','tenant__schema_name','is_primary')))"
```

Expected: exactly one row, for the same `<SCHEMA>`.

### 2. Check the DNS the way Let's Encrypt will see it

The platform checks `TXT _sharwa.<HOST>` = the claim token (`sharwa-verify=…`) and routing (apex: A records ⊆ `SHARWA_EDGE_IP`, or ⊆ the A records of `SHARWA_EDGE_CNAME` when no IP is set; sub-host: CNAME equals `SHARWA_EDGE_CNAME`, or flattened A records ⊆ the edge's A records) — `products/services/domain_service.py:139-150, 249-284`. Check the same from outside:

```bash
dig +short TXT _sharwa.<HOST>
dig +short A <HOST>
dig +short CNAME <HOST>
dig +short A <EDGE_CNAME>          # what the edge name resolves to
```

```powershell
# Windows PowerShell
Resolve-DnsName -Type TXT _sharwa.<HOST>
Resolve-DnsName -Type A <HOST>
Resolve-DnsName -Type CNAME <HOST>
```

Expected: the TXT value equals the claim's token; the A/CNAME answer ends at this deployment's edge. If an `AAAA` record points elsewhere, Let's Encrypt may validate over IPv6 and fail (the platform's check looks at A and CNAME only — `domain_service.py:139-150`): ask the merchant to remove it or point it at the edge.

If something is missing, the claim is not ready: do not continue; the merchant fixes the records and presses «تحقّق الآن» (claim goes to `failed`, then back to `verifying`).

### 3. Confirm the edge values are the real ones

```bash
grep -E "^(SHARWA_EDGE_IP|SHARWA_EDGE_CNAME|TENANT_BASE_DOMAIN)=" /srv/sharwa/.env
```

`SHARWA_EDGE_IP` must be the public IPv4 address of the host that terminates TLS for custom domains; `SHARWA_EDGE_CNAME` a name that resolves to it (default `<BASE>`). If `SHARWA_EDGE_IP` is empty the dashboard shows the CNAME host name as the value of an `A` record, which DNS providers reject (`domain_service.py:84`) — set it before the first apex domain. A wrong value cannot be fixed per domain: correct `.env`, restart Gunicorn (step 4 command), and tell affected merchants to change their records.

### 4. Let Django accept the host

Two settings read the environment at start (`config/settings.py:24, 54-68`). Check what applies to your topology ([`../deployment/topology.md`](../deployment/topology.md) §4.2, §9):

| Setting | When it is needed | Edit in `.env` |
|---|---|---|
| `ALLOWED_HOSTS` | the host reaches Django with its own `Host` header — true for the repository's Nginx (`sharwa-proxy.conf:61` passes `Host $host`). No spaces after commas: the value is split on `,` without trimming (`settings.py:24`) | append `,<HOST>` |
| `CSRF_TRUSTED_ORIGINS` | any state-changing request made from `https://<HOST>` (login, saving settings, checkout). The Next.js BFF sends `Origin: https://<HOST>` (`src/lib/bff/upstream.ts:133`), and Django trusts only `https://<BASE>`, `https://*.<BASE>` and the listed origins (`settings.py:54-68`) — **derived**: without this entry such requests are refused with 403 «CSRF Failed: Origin checking failed …» | append `,https://<HOST>` |

Then restart (not reload) so the new values are read:

```bash
sudo systemctl restart gunicorn
```

Docker: `docker compose -f deploy/docker-compose.prod.yml --env-file .env up -d` recreates the services whose environment changed (**unverified**). Celery does not serve these checks; restarting it is not required for this step.

> ⚠️ Discrepancy — roadmap says a domain reaches `active` once TLS answers, with no Django configuration per domain / code trusts only `https://<BASE>` and `https://*.<BASE>` for CSRF and has no wildcard `ALLOWED_HOSTS` (`config/settings.py:24, 54-68`); custom hosts need an entry in each (derived, not run). [`../../architecture/12-custom-domains.md`](../../architecture/12-custom-domains.md) does not mention this. Reported in step 39.

### 5. Add the port-80 server block (ACME) and reload

The repository's port-80 blocks only match `<BASE>` and `*.<BASE>` (`sharwa.conf:16-27`); a custom host falls to the `default_server` that answers `444` and has **no** ACME location (`sharwa.conf:46-51`). Let Let's Encrypt in first, with HTTP only:

```nginx
# /etc/nginx/sites-available/sharwa-domain-<HOST>.conf   (phase A: HTTP only)
server {
    listen 80;
    listen [::]:80;
    server_name <HOST>;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/sharwa-domain-<HOST>.conf /etc/nginx/sites-enabled/sharwa-domain-<HOST>.conf
sudo nginx -t && sudo systemctl reload nginx
```

Expected: `nginx: configuration file … test is successful`. A named `server_name` takes precedence over the `default_server`, so only this host is affected.

### 6. Issue the certificate

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d <HOST> --cert-name <HOST> \
  --non-interactive --agree-tos -m <OPS_EMAIL> --deploy-hook "systemctl reload nginx"
```

Expected: "Successfully received certificate" and files in `/etc/letsencrypt/live/<HOST>/` (`fullchain.pem`, `privkey.pem`). Certbot stores the webroot method and the deploy hook in `/etc/letsencrypt/renewal/<HOST>.conf`, which is what renewal reuses (**standard certbot behaviour**, not verified here). One certificate per host: `example.com` does not cover `www.example.com`; if the merchant claimed both, repeat for the second host (each claim is its own row, up to 5 per store).

To rehearse first: add `--dry-run` (nothing is issued, rate limits are not consumed).

### 7. Add the HTTPS server block and reload

Copy the platform's own 443 block so the host is handled exactly like a store subdomain, and change only the name and the certificate paths. With the repository's configuration that is:

```nginx
# append to /etc/nginx/sites-available/sharwa-domain-<HOST>.conf   (phase B: HTTPS)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name <HOST>;

    ssl_certificate     /etc/letsencrypt/live/<HOST>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<HOST>/privkey.pem;
    include /etc/nginx/snippets/sharwa-tls.conf;
    include /etc/nginx/snippets/sharwa-gzip.conf;

    include /etc/nginx/snippets/sharwa-proxy.conf;
}
```

This mirrors `deploy/nginx/sharwa.conf:30-42`. If production routes store hosts to the Next.js server through a different block ([`../deployment/topology.md`](../deployment/topology.md) §4.2 — not in the repository), copy **that** server block instead. Do not add this block before step 6 has produced the files: Nginx refuses to load a missing certificate.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 8. Take the claim to `active`

Nothing re-checks claims on a schedule (`12-custom-domains.md` §4.3), so the claim moves only when `verify` is called again:

- **Merchant**: dashboard → Settings → Domains → «تحقّق الآن» on the row (`POST /api/v1/domains/<id>/verify/`, owner only). The screen's 30-second poll only re-reads the list.
- **Operations, when the merchant is not available** (**derived, not run** — `verify_domain` takes the store from the current schema, `domain_service.py:50-58, 249-284`):

  ```bash
  python manage.py shell -c "from django.db import connection; from products.services import domain_service as d; connection.set_schema('<SCHEMA>'); r=d.verify_domain(<CLAIM_ID>); print(r['status'], r['dns_ok'], r['failure_reason'])"
  ```

The call checks DNS again, then `https_ready`: `HEAD https://<HOST>/` from the Django host, timeouts 3 s connect / 5 s read, redirects not followed, certificate verified; **any HTTP answer** counts (`domain_service.py:130-136`). Expected: `active True None`.

If the answer is still `verifying`: from the Django host run `curl -I https://<HOST>/` — the request must complete the TLS handshake with a valid chain (the Django host resolves the name through public DNS and must reach the edge, including from inside a private network — hairpin routing).

### 9. Check renewal

Certificates last 90 days; certbot renews those within 30 days of expiry (**standard certbot behaviour**). The port-80 block from step 5 must stay in place, because renewal repeats the HTTP-01 challenge.

```bash
sudo certbot renew --dry-run                  # rehearses every certificate's renewal
systemctl list-timers | grep -i certbot      # the timer certbot installs (name varies by package)
```

**An `active` claim is never re-checked** (`domain_service.py:256-261`): if renewal silently fails, the claim keeps saying `active` while browsers show an expired certificate. Monitor expiry outside the platform:

```bash
echo | openssl s_client -connect <HOST>:443 -servername <HOST> 2>/dev/null | openssl x509 -noout -enddate
```

```powershell
# Windows: expiry date appears in the TLS section of the verbose output
curl.exe -vI https://<HOST>/ 2>&1 | Select-String "expire date"
```

## Verify

1. `curl -I https://<HOST>/` answers without a certificate error, and the certificate names `<HOST>` (`openssl s_client … | openssl x509 -noout -subject -enddate`).
2. `curl -sI http://<HOST>/` answers `301` to `https://<HOST>/`.
3. The dashboard row shows «نشط» (`status: active`, `verified_at` set); or the step 8 query prints `active`.
4. The store loads on the new host: the storefront home renders the store's own name; the `/dashboard/login` page loads and a login succeeds (this exercises the CSRF entry from step 4).
5. Setting the domain as primary (button «اجعله أساسياً», `POST domains/<id>/set-primary/`) is allowed only now: before `active` Django answers `400` «لا يصير النطاق أساسياً قبل أن يكون نشطاً.»

## Roll back

| Situation | Action |
|---|---|
| Certificate issued, claim not yet `active`, you want to stop | Remove the HTTPS block only (leave phase A in place, or remove the file as below). The claim stays `verifying`, routing stays on, nothing else changes |
| The merchant removes the domain | Merchant deletes the row in the dashboard (`DELETE domains/<id>/`: deletes the `Domain` row — routing stops at once — and the claim; the primary domain cannot be deleted first). Then on the edge: `sudo rm /etc/nginx/sites-enabled/sharwa-domain-<HOST>.conf /etc/nginx/sites-available/sharwa-domain-<HOST>.conf`, `sudo nginx -t && sudo systemctl reload nginx`, `sudo certbot delete --cert-name <HOST>`; remove `<HOST>` from `ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS` at the next restart |
| Wrong `Domain` row (host owned by another store) | There is no console delete (`12-custom-domains.md` §4.7). Remove the row in the Django admin (`Domain` is registered, `tenants/admin.py:271`) — this stops routing immediately; confirm with the platform owner first |
| A bad Nginx file broke the reload | `nginx -t` should have caught it; if a reload already failed, the previous configuration keeps running. Fix or remove the new file and run `nginx -t` again |
| Certificate that was issued | Not reversible (public log). `certbot revoke --cert-name <HOST>` only if the key was exposed |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Claim `failed`: «لم نجد سجل TXT المطلوب لـ <HOST> عند مزوّد النطاق.» | TXT `_sharwa.<HOST>` missing, wrong value, or not propagated (allow up to an hour — the UI says so) | `dig +short TXT _sharwa.<HOST>`; merchant corrects, presses «تحقّق الآن» |
| Claim `failed`: «لم نجد سجل A المطلوب …» / «… CNAME المطلوب …» | routing record missing or pointing elsewhere; `SHARWA_EDGE_IP`/`SHARWA_EDGE_CNAME` differ from what the merchant was shown | compare step 2 with step 3; fix `.env` (restart) or the merchant's record |
| Claim `failed`: «هذا النطاق مرتبط بمتجر آخر.» | another store already has a `Domain` row for the host | decide ownership with the platform owner; see Roll back |
| `verify` answers `503` «فحص DNS غير متاح على الخادم الآن — حاول لاحقاً.» | `dnspython` not installed in the server's environment | `pip install -r requirements.txt` (the file lists `dnspython>=2.6,<3`), restart Gunicorn |
| certbot: "Timeout during connect" / "Connection refused" | port 80 closed, DNS not pointing at this host, or the step 5 file is not loaded (host still hits the `444` default) | open the port; run `sudo nginx -T` and look for `server_name <HOST>` in the output; repeat step 2 |
| certbot: "Invalid response from …/.well-known/acme-challenge/…" with a 404/301 | wrong webroot path, or another `server` answers for the host | `-w` must equal the `root` in the ACME location; keep `^~` |
| certbot: "too many certificates" / "too many failed authorizations" | Let's Encrypt rate limit | wait; use `--dry-run` to debug |
| Claim stays `verifying` after the certificate exists | HTTPS not answering for the Django host (hairpin routing, missing 443 block, certificate chain) | step 8 diagnostics; `curl -I https://<HOST>/` on the Django host |
| Browser: certificate name mismatch on `<HOST>` | no 443 block of its own, so the platform block answers (derived — `topology.md` §4.5) | step 7 |
| Login works on `noor.<BASE>` but 403 on `<HOST>` | `https://<HOST>` missing from `CSRF_TRUSTED_ORIGINS`, or Gunicorn not restarted | step 4 |
| Django 400 «Invalid HTTP_HOST header» in the log | host missing from `ALLOWED_HOSTS` (or a space after a comma) | step 4 |
| Domain works but images from `/media/` are blocked or 404 | the 443 block did not include `sharwa-proxy.conf` | step 7 |
| After renewal Nginx still serves the old certificate | the certificate was issued without a deploy hook, so Nginx was never reloaded | `sudo systemctl reload nginx` now; once run `sudo certbot renew --deploy-hook "systemctl reload nginx"` (certbot saves the hook for later renewals — standard behaviour) |

## Related

- [`../../architecture/12-custom-domains.md`](../../architecture/12-custom-domains.md) — the claim lifecycle and the state machine this runbook acts on
- [`../deployment/topology.md`](../deployment/topology.md) — edge, origins, unknown-host behaviour (§4.5), open items
- [`../environment.md`](../environment.md) — `SHARWA_EDGE_IP`, `SHARWA_EDGE_CNAME`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`
- [`../deployment/go-live-checklist.md`](../deployment/go-live-checklist.md) · [`../deployment/rollback.md`](../deployment/rollback.md)
- `sharwa_saas/deploy/README.md` §3 (the TLS section this runbook completes; mismatches are listed in the step 39 report)
