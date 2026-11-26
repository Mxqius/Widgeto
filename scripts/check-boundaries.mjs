#!/usr/bin/env node
/*
 * Keeps the three window kinds apart.
 *
 * Three checks. The folder rules are the obvious one: manager, widget and
 * capture code may only reach into `shared`. The one that actually protects
 * the bundle is a walk of the *static* import graph from each root — the two
 * light entry points and every widget body — asserting that nothing reachable
 * from it pulls in a package it has no business loading. The third asserts
 * every source directory is scanned by some entry's Tailwind `@source`.
 *
 * That distinction matters. A widget window loading the animation library was
 * never visible as a bad import; it happened because Rollup put React inside
 * the motion chunk. No folder rule catches that. "What can this entry reach"
 * does.
 *
 * Dynamic `import()` is deliberately not followed: that is exactly how the
 * seven polling widgets reach the query client without the other six paying
 * for it.
 */
import fs from "node:fs";
import path from "node:path";

const SRC = "src";

const FOLDER_RULES = [
  { from: "src/app/widget", deny: ["src/app/manager", "src/app/capture"] },
  { from: "src/app/capture", deny: ["src/app/manager", "src/app/widget"] },
  { from: "src/app/manager", deny: ["src/app/widget", "src/app/capture"] },
  { from: "src/shared", deny: ["src/app"] },
];

/**
 * Nothing a widget or capture window loads may pull these in. The query client
 * is the exception a widget *body* is allowed: seven of the thirteen kinds
 * fetch, and they reach it through a dynamic import so the other six do not.
 */
const HEAVY = ["motion", "@base-ui/react", "zustand", "tailwind-merge"];

const ROOTS = [
  { root: "src/app/widget/main.tsx", banned: [...HEAVY, "@tanstack/react-query"] },
  { root: "src/app/capture/main.tsx", banned: [...HEAVY, "@tanstack/react-query"] },
];

/**
 * Bodies are lazily imported, so they are not reachable from the widget entry
 * by a static walk — which is precisely why they need their own root. They are
 * also the files most likely to reach for something heavy.
 */
const BODIES_DIR = "src/app/widget/bodies";

/** Every directory under src/ must be scanned by some entry's Tailwind @source. */
const ENTRY_CSS = [
  "src/app/manager/manager.css",
  "src/app/widget/widget.css",
  "src/app/capture/capture.css",
];

const STATIC_IMPORT =
  /^[ \t]*(?:import|export)[\s\S]*?from\s*["']([^"']+)["']|^[ \t]*import\s*["']([^"']+)["']/gm;

const problems = [];

/* ------------------------------------------------------------ file walking */

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const posix = (p) => p.split(path.sep).join("/");
const isCode = (f) => /\.(ts|tsx)$/.test(f);

const allFiles = walk(SRC).map(posix);
const codeFiles = allFiles.filter(isCode);

function importsOf(file) {
  const src = fs.readFileSync(file, "utf8");
  const out = [];
  for (const m of src.matchAll(STATIC_IMPORT)) {
    const spec = m[1] ?? m[2];
    if (spec) out.push({ spec, line: src.slice(0, m.index).split("\n").length });
  }
  return out;
}

/** `@/x` and relative specifiers -> a real file under src/, or null if external. */
function resolve(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = path.posix.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.posix.join(path.posix.dirname(fromFile), spec);
  else return null;

  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (allFiles.includes(cand) && isCode(cand)) return cand;
  }
  return null;
}

/* ----------------------------------------------------------- folder rules */

for (const file of codeFiles) {
  const rule = FOLDER_RULES.find((r) => file.startsWith(`${r.from}/`));
  if (!rule) continue;
  for (const { spec, line } of importsOf(file)) {
    const target = resolve(spec, file);
    if (!target) continue;
    const bad = rule.deny.find((d) => target === d || target.startsWith(`${d}/`));
    if (bad) problems.push(`${file}:${line}  reaches into ${bad} (${spec})`);
  }
}

/* -------------------------------------------------- what each entry can load */

for (const f of allFiles) {
  if (f.startsWith(`${BODIES_DIR}/`) && /\.tsx$/.test(f)) ROOTS.push({ root: f, banned: HEAVY });
}

for (const { root, banned } of ROOTS) {
  if (!allFiles.includes(root)) {
    problems.push(`${root}  entry not found`);
    continue;
  }
  const seen = new Set();
  const stack = [root];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const { spec, line } of importsOf(file)) {
      if (banned.some((b) => spec === b || spec.startsWith(`${b}/`))) {
        problems.push(`${file}:${line}  ${spec} is banned from everything ${root} loads`);
        continue;
      }
      const target = resolve(spec, file);
      if (target) stack.push(target);
    }
  }
}

/* ------------------------------------------- Tailwind @source coverage */

const sourced = new Set();
for (const css of ENTRY_CSS) {
  if (!fs.existsSync(css)) {
    problems.push(`${css}  entry stylesheet not found`);
    continue;
  }
  const text = fs.readFileSync(css, "utf8");
  for (const m of text.matchAll(/@source\s+"([^"]+)"/g)) {
    sourced.add(posix(path.posix.normalize(path.posix.join(path.posix.dirname(css), m[1]))));
  }
}

// `source(none)` means a directory nobody scans produces missing utility
// classes at runtime with no build error at all — the way `.surface-flat` was
// referenced in five places while being defined nowhere.
const covered = (dir) => [...sourced].some((s) => dir === s || dir.startsWith(`${s}/`));
for (const file of codeFiles) {
  const dir = path.posix.dirname(file);
  if (dir === SRC) continue;
  if (!covered(dir)) problems.push(`${dir}  not covered by any @source; its classes will not be generated`);
}

/* ------------------------------------------------------------------ report */

if (problems.length) {
  console.error("Boundary check failed:\n");
  for (const p of [...new Set(problems)].sort()) console.error("  " + p);
  console.error(`\n${new Set(problems).size} problem(s).`);
  process.exit(1);
}
console.log(`Boundaries OK — ${codeFiles.length} files checked.`);
