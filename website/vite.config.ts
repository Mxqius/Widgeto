import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Served from https://<user>.github.io/Widgeto/, so every asset path is rooted there.
export default defineConfig({
  base: "/Widgeto/",
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 700 },
});
