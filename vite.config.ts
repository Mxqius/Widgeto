import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
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
    rollupOptions: {
      output: {
        // Keep the heavy vendors in their own chunks. A widget window then
        // pulls react + motion + its own body, and never Base UI, which only
        // the manager needs.
        manualChunks: {
          react: ["react", "react-dom", "react/jsx-runtime"],
          motion: ["motion", "motion/react"],
          baseui: ["@base-ui/react"],
        },
      },
    },
  },
});
