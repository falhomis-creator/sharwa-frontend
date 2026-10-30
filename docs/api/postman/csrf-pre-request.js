/*
 * Sharwa — collection-level pre-request script (DOC-012). Embedded in sharwa.postman_collection.json
 * by scripts/openapi/postman.py; kept here as the readable source. Docs: docs/api/overview/csrf.md#postman
 *
 * Why it fetches a token before EVERY unsafe request
 *   Django sets CSRF_COOKIE_HTTPONLY=True and the frontend never reads the cookie (api-client.ts): the
 *   token comes from GET /api/v1/auth/csrf/ → {csrfToken} (Django get_token, matching the csrftoken
 *   cookie of the same jar). api-client.ts refreshes once and retries on a CSRF 403; Postman cannot
 *   replay a request from its test script, so this script fetches a fresh token before each
 *   POST/PUT/PATCH/DELETE instead — that also covers a login that rotates the CSRF secret
 *   (Django's `login()` does, e.g. the console login, which also returns the rotated `csrf_token`),
 *   after which an older token is rejected.
 *
 * Variables (environment first, then collection):
 *   base_url        origin of Django for this environment (store host, platform origin or console API host)
 *   x_store_domain  optional store domain when base_url is not a store host (X-Store-Domain override);
 *                   must stay EMPTY for the console and Sharwa Pay environments (they answer 404 otherwise)
 *   csrf_token      written here; also sent as X-CSRFToken
 *   idempotency_key written here: a new UUID per send (Idempotency-Key header of retried writes)
 */
const method = pm.request.method.toUpperCase();
pm.variables.set("idempotency_key", pm.variables.replaceIn("{{$guid}}"));

if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
  const base = pm.variables.get("base_url");
  const storeDomain = pm.variables.get("x_store_domain");
  const header = [{ key: "Accept", value: "application/json" }];
  if (storeDomain) header.push({ key: "X-Store-Domain", value: storeDomain });

  pm.sendRequest({ url: `${base}/api/v1/auth/csrf/`, method: "GET", header }, (err, res) => {
    if (err || !res || res.code !== 200) {
      console.warn("Sharwa CSRF: could not fetch /api/v1/auth/csrf/", err || (res && res.code));
      return;
    }
    const token = res.json().csrfToken;
    pm.environment.set("csrf_token", token);
    pm.request.headers.upsert({ key: "X-CSRFToken", value: token });
  });
}
