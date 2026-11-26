import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;
const at = (p: string) => path.resolve(__dirname, p);

const WIN_SEP = /\\/g;

/**
 * Which vendor chunk a module belongs to, keyed on its resolved id.
 *
 * The function form is called for every module in the graph, including the
 * synthetic nodes Vite's CommonJS interop creates for React — ids that begin
 * with a NUL and end in `?commonjs-module`. Those ids still carry the real
 * path, so matching on the path catches them.
 *
 * The object form did not: it resolves package *specifiers* and then claims
 * their dependency closure. It never named `react-dom/client` or `scheduler`,
 * and React 19's entry is a six-line CommonJS `require` shim whose real body
 * is reachable only through those interop nodes — which `motion` reaches too.
 * The result was React's core ending up inside the motion chunk, so every
 * widget window downloaded the whole animation library just to get React.
 */
function vendorChunk(id: string): string | undefined {
  const p = id.replace(WIN_SEP, "/");
  const i = p.lastIndexOf("/node_modules/");
  if (i === -1) return undefined; // first-party code: leave it to Rollup

  const seg = p.slice(i + "/node_modules/".length).split("/");
  const pkg = seg[0].startsWith("@") ? `${seg[0]}/${seg[1]}` : seg[0];

  // Every entry needs these, so they must land in exactly one shared chunk.
  switch (pkg) {
    case "react":
    case "react-dom":
    case "scheduler":
    case "use-sync-external-store":
      return "vendor-react";
  }

  // Manager-only. A widget window must never pull these in.
  if (pkg === "motion" || pkg === "motion-dom" || pkg === "motion-utils") return "vendor-motion";
  if (pkg === "@base-ui/react" || pkg.startsWith("@floating-ui/")) return "vendor-baseui";
  if (pkg === "zustand") return "vendor-store";
  if (pkg === "tailwind-merge") return "vendor-twmerge";

  // Reached from the widget entry only through a dynamic import, so the
  // widgets that never poll do not download it.
  if (pkg === "@tanstack/react-query" || pkg === "@tanstack/query-core") return "vendor-query";

  // Deliberately ungrouped:
  //   @tauri-apps/*  every call site is a dynamic import and Rollup already
  //                  emits core/event/window/dpi separately — grouping them
  //                  would make one lazy call drag in the updater, the dialog
  //                  and the global-shortcut plugins with it.
  //   lucide-react   already one small chunk per icon actually used.
  return undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": at("./src") } },
  clearScreen: false,
  server: {
    port: 3420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 3421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    // WebView2 is Chromium; the modulepreload polyfill is dead weight.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        // index.html stays the manager: tauri.conf.json's `main` window
        // declares no url, so it loads the app root.
        manager: at("index.html"),
        widget: at("widget.html"),
        capture: at("capture.html"),
        island: at("island.html"),
      },
      output: { manualChunks: vendorChunk },
    },
  },
});
