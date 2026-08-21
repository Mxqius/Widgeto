import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { weather } from "./routes/weather.js";
import { markets } from "./routes/markets.js";
import { misc } from "./routes/misc.js";
import { cacheSize } from "./lib/cache.js";

const PORT = Number(process.env.PORT ?? 8787);
const started = Date.now();

const app = new Hono();

app.use("*", logger());
// The desktop app is not a browser origin we can predict (tauri://localhost in
// production, http://localhost:3420 in dev), and there is no auth or cookie to
// protect, so any origin may read these public, read-only endpoints.
app.use("*", cors({ origin: "*", allowMethods: ["GET", "OPTIONS"] }));

app.get("/", (c) =>
  c.json({
    name: "widgeto-server",
    endpoints: ["/health", "/api/weather", "/api/markets", "/api/quote", "/api/icon", "/api/whereami"],
  }),
);

app.get("/health", (c) =>
  c.json({ ok: true, uptimeSec: Math.round((Date.now() - started) / 1000), cached: cacheSize() }),
);

app.route("/api/weather", weather);
app.route("/api/markets", markets);
app.route("/api", misc);

app.notFound((c) => c.json({ error: "not found" }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error("[widgeto]", err);
  // widgets fall back to their own sample data on a non-2xx, so a failing
  // upstream degrades the tile instead of blanking it
  return c.json({ error: err.message || "upstream failed" }, 502);
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`widgeto-server listening on http://localhost:${info.port}`);
});
