/**
 * `sharwa/tenant-cache-key` — FR-47.09 / constitution VIII: every TanStack Query cache key on a
 * store origin is tenant-prefixed, so two stores never share a cache entry in one browser.
 *
 * A key written as an ARRAY LITERAL must start with `storeKey(...)` — either as its first
 * element or spread (`[...storeKey(store, "x"), id]`) — or spread a module key factory whose
 * name ends in `Key`/`Keys` (`[...ordersKeys(store).all, id]`): those factories are built on
 * `storeKey` in `src/features/<module>/api*.ts` (and are themselves checked here).
 * A key that is not an array literal (`ordersKeys(store).list(q)`, a variable) is left to the
 * factory that built it. Checked places:
 *   - any `queryKey: [...]` property (useQuery, useInfiniteQuery, useSuspenseQuery,
 *     queryOptions, invalidateQueries, removeQueries, …);
 *   - the first argument of `setQueryData`, `getQueryData`, `setQueriesData`, `getQueriesData`.
 */
const FIRST_ARG_METHODS = new Set(["setQueryData", "getQueryData", "setQueriesData", "getQueriesData", "ensureQueryData", "prefetchQuery"]);

function rootCalleeName(node) {
  // storeKey(...) | fooKeys(store) | fooKeys(store).all | fooKeys(store).list(q)
  let n = node;
  for (;;) {
    if (!n) return null;
    if (n.type === "CallExpression") n = n.callee;
    else if (n.type === "MemberExpression") n = n.object;
    else if (n.type === "Identifier") return n.name;
    else if (n.type === "ChainExpression") n = n.expression;
    else if (n.type === "TSAsExpression" || n.type === "TSSatisfiesExpression") n = n.expression;
    else return null;
  }
}

const isStoreKeyCall = (n) => n && n.type === "CallExpression" && rootCalleeName(n) === "storeKey" && n.callee.type === "Identifier";
const isFactory = (name) => typeof name === "string" && (name === "storeKey" || /Keys?$/.test(name));

function startsTenantPrefixed(arr) {
  const first = arr.elements[0];
  if (!first) return false;
  if (isStoreKeyCall(first)) return true;
  if (first.type === "SpreadElement") return isFactory(rootCalleeName(first.argument));
  return false;
}

function unwrap(n) {
  while (n && (n.type === "TSAsExpression" || n.type === "TSSatisfiesExpression")) n = n.expression;
  return n;
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: { description: "TanStack Query keys must start with storeKey(...) (FR-47.09)" },
    schema: [],
    messages: {
      prefix: "مفتاح الكاش يجب أن يبدأ بـ storeKey(store, …) أو مصنع مفاتيح الوحدة (FR-47.09 · الدستور VIII) — وإلا تشارك المتاجر الكاش نفسه.",
    },
  },
  create(context) {
    function checkKey(node) {
      const value = unwrap(node);
      if (value && value.type === "ArrayExpression" && !startsTenantPrefixed(value)) context.report({ node: value, messageId: "prefix" });
    }
    return {
      Property(node) {
        const key = node.key;
        const name = key && (key.type === "Identifier" ? key.name : key.type === "Literal" ? key.value : null);
        if (name === "queryKey" && !node.computed) checkKey(node.value);
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier" && FIRST_ARG_METHODS.has(callee.property.name) && node.arguments[0]) {
          checkKey(node.arguments[0]);
        }
      },
    };
  },
};

module.exports = { rules: { "tenant-cache-key": rule } };
