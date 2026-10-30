/**
 * Zod ↔ OpenAPI contract diff (Phase 003, DOC-009) — docs/api/openapi/contract-diff.md.
 *
 *   npx tsx scripts/openapi-contract-diff.ts                 # every documented operation
 *   npx tsx scripts/openapi-contract-diff.ts --module reports  # one frontend module
 *   npx tsx scripts/openapi-contract-diff.ts --verbose         # also list stripped extra fields
 *
 * For every operation of docs/api/openapi/sharwa-v1.yaml that carries `x-zod: <module>.<export>`,
 * the success response schema (what Django sends, written from the Django code) must be ACCEPTED by
 * the frontend Data Contract (the Zod schema the browser parses it with — A.1, immutable):
 *
 *   Django ⊆ Zod   — every field Zod requires is required in OpenAPI, no `null` Zod refuses,
 *                    no enum value Zod does not know, integer ⊆ number, nested objects/arrays/records alike.
 *
 * Zod is converted with Zod 4's native `z.toJSONSchema(schema, { io: "input" })` (the INPUT side is
 * what `safeParse` checks; defaults make a field optional). No extra dependency: `zod` and `tsx` are
 * already in package.json; the YAML is read with `js-yaml` (present in node_modules through eslint —
 * if it ever disappears, `npm i -D js-yaml`).
 *
 * Exit code 1 on any drift (`error`), so it can run next to `npm run lint`, `npx tsc --noEmit`
 * and the Django suites of inventory A.12.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

type Json = Record<string, unknown>;
type Finding = { level: "error" | "info"; where: string; msg: string };

const ROOT = process.cwd();
const SPEC = path.join(ROOT, "docs/api/openapi/sharwa-v1.yaml");
const args = process.argv.slice(2);
const onlyModule = args.includes("--module") ? args[args.indexOf("--module") + 1] : null;
const verbose = args.includes("--verbose");

type YamlModule = { load: (text: string) => unknown };

async function loadYaml(file: string): Promise<Json> {
  // js-yaml ships without types here; a non-literal specifier keeps tsc from looking for them.
  const specifier = "js-yaml";
  const mod = (await import(specifier)) as YamlModule & { default?: YamlModule };
  const load = mod.load ?? mod.default?.load;
  if (!load) throw new Error("js-yaml not found — run: npm i -D js-yaml");
  return load(readFileSync(file, "utf8")) as Json;
}

/** `src/features/<module>/schemas.ts` or `src/features/<module>/schemas/index.ts`. */
function schemaFile(module: string): string {
  const flat = path.join(ROOT, "src/features", module, "schemas.ts");
  if (existsSync(flat)) return flat;
  const dir = path.join(ROOT, "src/features", module, "schemas/index.ts");
  if (existsSync(dir)) return dir;
  throw new Error(`no Zod contract for module "${module}" (looked for ${flat} and ${dir})`);
}

function deref(spec: Json, node: unknown, depth = 0): Json {
  if (!node || typeof node !== "object") return {};
  const n = node as Json;
  if (typeof n.$ref === "string") {
    if (depth > 50) throw new Error(`$ref loop at ${n.$ref}`);
    const target = (n.$ref as string).replace(/^#\//, "").split("/").reduce<unknown>((acc, k) => (acc as Json)?.[k.replace(/~1/g, "/").replace(/~0/g, "~")], spec);
    return deref(spec, target, depth + 1);
  }
  return n;
}

/** Split a schema into its alternatives: `type: [a, b]`, `anyOf`, `oneOf`; `allOf` merged. */
function variants(spec: Json, raw: unknown): Json[] {
  const s = deref(spec, raw);
  if (Array.isArray(s.allOf)) {
    const merged: Json = { type: "object", properties: {}, required: [] };
    for (const part of s.allOf as unknown[]) {
      const p = deref(spec, part);
      Object.assign(merged.properties as Json, (p.properties as Json) ?? {});
      (merged.required as string[]).push(...((p.required as string[]) ?? []));
    }
    return [merged];
  }
  const alts = (s.anyOf ?? s.oneOf) as unknown[] | undefined;
  if (Array.isArray(alts)) return alts.flatMap((a) => variants(spec, a));
  if (Array.isArray(s.type)) return (s.type as string[]).map((t) => ({ ...s, type: t }));
  if (s.const === null) return [{ type: "null" }];
  return [s];
}

const isAny = (s: Json) => !s.type && !s.anyOf && !s.oneOf && !s.allOf && !s.enum && !s.properties && !s.items && s.const === undefined;
const typeOf = (s: Json) => (s.type as string | undefined) ?? (s.properties ? "object" : s.items ? "array" : s.enum ? typeof (s.enum as unknown[])[0] : undefined);

function compat(spec: Json, oaRaw: unknown, zRaw: unknown, where: string, out: Finding[]) {
  const zVariants = variants({}, zRaw);
  if (zVariants.some(isAny)) return;
  for (const oa of variants(spec, oaRaw)) {
    if (isAny(oa)) {
      out.push({ level: "error", where, msg: "OpenAPI leaves this value unconstrained; Zod expects " + zVariants.map(typeOf).join("|") });
      continue;
    }
    const ot = typeOf(oa);
    const candidates = zVariants.filter((zv) => {
      const zt = typeOf(zv);
      return zt === ot || (ot === "integer" && zt === "number");
    });
    if (!candidates.length) {
      out.push({ level: "error", where, msg: `Django may send ${ot}; Zod accepts ${zVariants.map(typeOf).join("|")}` });
      continue;
    }
    // Several Zod branches of the same type: accept if one of them is fully compatible.
    const trials = candidates.map((zv) => {
      const f: Finding[] = [];
      compareSame(spec, oa, zv, where, f);
      return f;
    });
    const clean = trials.find((f) => !f.some((x) => x.level === "error"));
    out.push(...(clean ?? trials[0]));
  }
}

function compareSame(spec: Json, oa: Json, zv: Json, where: string, out: Finding[]) {
  const t = typeOf(oa);
  if (Array.isArray(zv.enum)) {
    const zEnum = new Set(zv.enum as unknown[]);
    if (!Array.isArray(oa.enum) && oa.const === undefined) out.push({ level: "error", where, msg: `Zod requires one of [${[...zEnum].join(", ")}]; OpenAPI does not constrain the value` });
    else for (const v of (oa.enum as unknown[]) ?? [oa.const]) if (!zEnum.has(v)) out.push({ level: "error", where, msg: `Django value "${String(v)}" is not in the Zod enum` });
  } else if (zv.const !== undefined && oa.const !== zv.const) {
    out.push({ level: "error", where, msg: `Zod requires the constant ${JSON.stringify(zv.const)}` });
  }
  if (t === "object") {
    const oaProps = (oa.properties as Json) ?? {};
    const zProps = (zv.properties as Json) ?? {};
    const oaReq = new Set((oa.required as string[]) ?? []);
    for (const key of (zv.required as string[]) ?? []) {
      if (!(key in oaProps) && !oa.additionalProperties) out.push({ level: "error", where: `${where}.${key}`, msg: "required by Zod, absent from the OpenAPI response" });
      else if (key in oaProps && !oaReq.has(key)) out.push({ level: "error", where: `${where}.${key}`, msg: "required by Zod, optional in the OpenAPI response" });
    }
    for (const [key, sub] of Object.entries(zProps)) if (key in oaProps) compat(spec, oaProps[key], sub, `${where}.${key}`, out);
    for (const key of Object.keys(oaProps)) if (!(key in zProps) && !zv.additionalProperties) out.push({ level: "info", where: `${where}.${key}`, msg: "sent by Django, not in the Zod schema (stripped by z.object)" });
    if (zv.additionalProperties && typeof zv.additionalProperties === "object") {
      if (oa.additionalProperties && typeof oa.additionalProperties === "object") compat(spec, oa.additionalProperties, zv.additionalProperties, `${where}.*`, out);
      for (const [key, sub] of Object.entries(oaProps)) if (!(key in zProps)) compat(spec, sub, zv.additionalProperties, `${where}.${key}`, out);
    }
  } else if (t === "array") {
    if (oa.items && zv.items) compat(spec, oa.items, zv.items, `${where}[]`, out);
    else if (zv.items && !oa.items) out.push({ level: "error", where: `${where}[]`, msg: "array items unconstrained in OpenAPI" });
  }
}

async function main() {
  const spec = await loadYaml(SPEC);
  const paths = spec.paths as Record<string, Record<string, Json>>;
  const cache = new Map<string, Record<string, unknown>>();
  let checked = 0;
  let errors = 0;
  const perModule = new Map<string, { documented: number; checked: number; errors: number }>();
  for (const [p, item] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(item)) {
      if (!op || typeof op !== "object" || !("operationId" in op)) continue;
      const ref = op["x-zod"] as string | undefined;
      if (!ref) continue;
      const [module, exportName] = ref.split(".");
      if (onlyModule && module !== onlyModule) continue;
      const stats = perModule.get(module) ?? { documented: 0, checked: 0, errors: 0 };
      perModule.set(module, stats);
      stats.documented++;
      if (!cache.has(module)) cache.set(module, await import(pathToFileURL(schemaFile(module)).href));
      const zodSchema = cache.get(module)![exportName] as z.ZodType | undefined;
      const label = `${method.toUpperCase()} ${p} (${op.operationId})`;
      if (!zodSchema) {
        console.log(`✗ ${label}: export "${exportName}" not found in the ${module} contract`);
        stats.errors++;
        errors++;
        continue;
      }
      const responses = op.responses as Record<string, Json>;
      const code = Object.keys(responses).find((c) => /^2\d\d$/.test(c) && c !== "204");
      const media = code ? ((responses[code].content as Json | undefined)?.["application/json"] as Json | undefined) : undefined;
      if (!media?.schema) {
        console.log(`✗ ${label}: no JSON success response to compare`);
        stats.errors++;
        errors++;
        continue;
      }
      const zJson = z.toJSONSchema(zodSchema, { io: "input", unrepresentable: "any" }) as Json;
      const findings: Finding[] = [];
      compat(spec, media.schema, zJson, "$", findings);
      const errs = findings.filter((f) => f.level === "error");
      checked++;
      stats.checked++;
      stats.errors += errs.length;
      errors += errs.length;
      console.log(`${errs.length ? "✗" : "✓"} ${label} ⊆ ${ref}${errs.length ? ` — ${errs.length} drift` : ""}`);
      for (const f of findings) if (f.level === "error" || verbose) console.log(`    ${f.level === "error" ? "drift" : "info "} ${f.where}: ${f.msg}`);
    }
  }
  const ops = Object.values(paths).flatMap((it) => Object.values(it).filter((o) => o && typeof o === "object" && "operationId" in o)) as Json[];
  const documented = ops.filter((o) => o["x-sharwa-status"] === "documented").length;
  console.log(`\n${checked} operation(s) diffed · ${errors} drift(s) · coverage: ${documented}/${ops.length} operations documented`);
  for (const [m, s] of perModule) console.log(`  ${m}: ${s.checked}/${s.documented} diffed, ${s.errors} drift(s)`);
  process.exit(errors ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
