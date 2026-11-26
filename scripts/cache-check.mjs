#!/usr/bin/env node
// V2-04: measures public-page caching on a running deployment. Read-only: GET requests only.
//
//   node scripts/cache-check.mjs <baseUrl> <pagePath> [--steps publish,rename,redeploy] [--new-path /x/y] [--out file.json]
//
// Always: unknown path → 404, then cold and warm requests to <pagePath>.
// Optional steps pause and ask you to act in the dashboard (publish a change, rename the slug, redeploy),
// then measure how long until the public page reflects it.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const steps = (flag("steps") ?? "").split(",").filter(Boolean);
const newPath = flag("new-path");
const out = flag("out");
const [baseUrl, pagePath] = args;
if (!baseUrl || !pagePath?.startsWith("/")) {
  console.error(
    "usage: node scripts/cache-check.mjs <baseUrl> <pagePath> [--steps publish,rename,redeploy] [--new-path /x/y] [--out file.json]",
  );
  process.exit(2);
}
if (steps.includes("rename") && !newPath) {
  console.error("--steps rename needs --new-path (the path after renaming)");
  process.exit(2);
}

const results = [];
let failures = 0;

/** Visible text only, so the hash changes with page content but not with per-request script ids. */
function contentHash(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

async function probe(label, path, expect) {
  const started = performance.now();
  const res = await fetch(new URL(path, baseUrl), {
    redirect: "manual",
    headers: { "cache-control": "no-cache" },
  });
  const body = await res.text();
  const row = {
    label,
    path,
    status: res.status,
    ms: Math.round(performance.now() - started),
    cache: res.headers.get("x-vercel-cache") ?? "-",
    age: res.headers.get("age") ?? "-",
    region: (res.headers.get("x-vercel-id") ?? "-").split("::")[0],
    location: res.headers.get("location") ?? undefined,
    hash: res.status === 200 ? contentHash(body) : "-",
  };
  row.ok = expect ? expect(row) : true;
  if (!row.ok) failures++;
  results.push(row);
  console.log(
    `${row.ok ? "ok  " : "FAIL"} ${label.padEnd(22)} ${String(row.status).padEnd(4)} ${String(row.ms).padStart(5)}ms cache=${row.cache.padEnd(9)} age=${row.age.padEnd(5)} region=${row.region} hash=${row.hash}${row.location ? ` → ${row.location}` : ""}`,
  );
  return row;
}

/** Polls until check(row) is true or the timeout passes; records the seconds it took. */
async function waitFor(label, path, check, timeoutS = 60) {
  const started = Date.now();
  for (;;) {
    const row = await probe(label, path);
    if (check(row)) {
      row.seconds = Math.round((Date.now() - started) / 100) / 10;
      console.log(`     ${label}: reflected after ${row.seconds}s`);
      return row;
    }
    if (Date.now() - started > timeoutS * 1000) {
      row.ok = false;
      failures++;
      console.log(`FAIL ${label}: not reflected within ${timeoutS}s`);
      return row;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

const rl = steps.length
  ? createInterface({ input: process.stdin, output: process.stdout })
  : null;
const pause = (msg) => rl.question(`\n>>> ${msg} Press Enter when done. `);

await probe(
  "unknown path → 404",
  `/zz-cache-check-${Date.now()}/missing`,
  (r) => r.status === 404,
);
const cold = await probe("page (first)", pagePath, (r) => r.status === 200);
await probe(
  "page (warm)",
  pagePath,
  (r) => r.status === 200 && r.hash === cold.hash,
);

let current = cold.hash;
if (steps.includes("publish")) {
  await pause(`Change something visible on ${pagePath} and click "Xuất bản".`);
  const fresh = await waitFor(
    "after publish",
    pagePath,
    (r) => r.status === 200 && r.hash !== current,
  );
  current = fresh.hash;
  await probe(
    "after publish (warm)",
    pagePath,
    (r) => r.status === 200 && r.hash === current,
  );
}
if (steps.includes("rename")) {
  await pause(`Rename the page so its address becomes ${newPath}.`);
  await waitFor(
    "old path redirects",
    pagePath,
    (r) => r.status >= 300 && r.status < 400 && r.location?.endsWith(newPath),
  );
  await probe("new path", newPath, (r) => r.status === 200);
}
if (steps.includes("redeploy")) {
  const path = steps.includes("rename") ? newPath : pagePath;
  await pause(
    "Redeploy the app (same code) and wait until the deployment is ready.",
  );
  await probe(
    "after redeploy (first)",
    path,
    (r) => r.status === 200 && r.hash === current,
  );
  await probe(
    "after redeploy (warm)",
    path,
    (r) => r.status === 200 && r.hash === current,
  );
}
rl?.close();

if (out)
  writeFileSync(
    out,
    JSON.stringify({ baseUrl, at: new Date().toISOString(), results }, null, 2),
  );
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
