// Per-window bundle accounting: what each webview actually downloads and parses.
// Walks the static import graph from every HTML entry, then from each widget
// body chunk, and sums the bytes.
import fs from "node:fs";
import path from "node:path";

const DIST = "dist";
const BODY_RE = /^(Battery|Calendar|Clock|Launcher|Markets|Music|Network|Notes|Pet|Pomodoro|System|Tasks|Weather)-[A-Za-z0-9_-]+\.js$/;
const ASSETS = path.join(DIST, "assets");
const files = fs.readdirSync(ASSETS);
const size = (f) => fs.statSync(path.join(ASSETS, f)).size;

const IMPORT_RE = /from"\.\/([A-Za-z0-9_.-]+\.js)"|import"\.\/([A-Za-z0-9_.-]+\.js)"/g;
const deps = new Map();
for (const f of files.filter((f) => f.endsWith(".js"))) {
  const src = fs.readFileSync(path.join(ASSETS, f), "utf8");
  const out = new Set();
  for (const m of src.matchAll(IMPORT_RE)) out.add(m[1] ?? m[2]);
  deps.set(f, out);
}

function closure(roots) {
  const seen = new Set();
  const stack = [...roots];
  while (stack.length) {
    const f = stack.pop();
    if (!f || seen.has(f) || !deps.has(f)) continue;
    seen.add(f);
    for (const d of deps.get(f)) stack.push(d);
  }
  return seen;
}

const total = (set) => [...set].reduce((n, f) => n + size(f), 0);
const kb = (n) => (n / 1024).toFixed(1).padStart(7) + " kB";

// entry scripts, per HTML file
const entries = new Map();
for (const h of fs.readdirSync(DIST).filter((f) => f.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(DIST, h), "utf8");
  const js = [...html.matchAll(/src="\/assets\/([^"]+\.js)"/g)].map((m) => m[1]);
  const css = [...html.matchAll(/href="\/assets\/([^"]+\.css)"/g)].map((m) => m[1]);
  entries.set(h, { js, css });
}

console.log("=== per-window payload (static graph) ===");
for (const [html, { js, css }] of entries) {
  const base = closure(js);
  const cssBytes = css.reduce((n, f) => n + size(f), 0);
  console.log(`\n${html}  base ${kb(total(base))} js + ${kb(cssBytes)} css`);

  // widget bodies are lazily loaded on top of the base
  const bodies = files.filter((f) => BODY_RE.test(f));
  if (!html.startsWith("widget")) continue;
  for (const b of bodies.sort()) {
    const withBody = closure([...js, b]);
    const added = [...withBody].filter((f) => !base.has(f));
    console.log(`   ${b.split("-")[0].padEnd(16)} ${kb(total(withBody))}   (+${kb(total(new Set(added))).trim()})`);
  }
}

console.log("\n=== assertions ===");
const find = (re) => files.find((f) => re.test(f));
const read = (f) => fs.readFileSync(path.join(ASSETS, f), "utf8");
const check = (label, ok) => console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);

const vreact = find(/^vendor-react-/);
const vmotion = find(/^vendor-motion-/);
check("vendor-react holds the scheduler", !!vreact && read(vreact).includes("unstable_scheduleCallback"));
check("vendor-motion holds no React core", !vmotion || !read(vmotion).includes('Symbol.for("react.'));
const bodyChunks = files.filter((f) => BODY_RE.test(f));
for (const [name, re] of [["vendor-motion", /vendor-motion/], ["vendor-baseui", /vendor-baseui/], ["vendor-store", /vendor-store/], ["vendor-twmerge", /vendor-twmerge/]]) {
  const bad = bodyChunks.filter((f) => [...closure([f])].some((d) => re.test(d)));
  check(`no widget body reaches ${name}` + (bad.length ? ` — ${bad.join(", ")}` : ""), bad.length === 0);
}
