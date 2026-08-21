import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { through } from "../lib/cache.js";
import { getJSON } from "../lib/http.js";

const QUOTES = [
  { text: "Simplicity is the ultimate sophistication.", who: "Leonardo da Vinci" },
  { text: "Make it work, make it right, make it fast.", who: "Kent Beck" },
  { text: "The details are not the details. They make the design.", who: "Charles Eames" },
  { text: "Perfection is achieved when there is nothing left to take away.", who: "Antoine de Saint-Exupéry" },
  { text: "Design is not just what it looks like. Design is how it works.", who: "Steve Jobs" },
  { text: "Slow is smooth, smooth is fast.", who: "—" },
  { text: "You can't read the label from inside the jar.", who: "—" },
];

export const misc = new Hono()
  /** Deterministic per day, so every widget shows the same quote. */
  .get("/quote", (c) => {
    const day = Math.floor(Date.now() / 86_400_000);
    return c.json(QUOTES[day % QUOTES.length]);
  })

  /** Favicon lookup for Quick Launch entries the user adds. */
  .get(
    "/icon",
    zValidator("query", z.object({ url: z.string().min(3).max(300) })),
    (c) => {
      const raw = c.req.valid("query").url;
      let host: string;
      try {
        host = new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname;
      } catch {
        return c.json({ error: "bad url" }, 400);
      }
      return c.json({
        host,
        icon: `https://www.google.com/s2/favicons?sz=64&domain=${host}`,
      });
    },
  )

  /** Public IP + coarse location, so Weather can offer "use my location". */
  .get("/whereami", async (c) => {
    const { value, from } = await through("geo:self", 30 * 60_000, () =>
      getJSON<{ city?: string; country_name?: string; latitude?: number; longitude?: number }>(
        "https://ipapi.co/json/",
      ),
    );
    c.header("x-cache", from);
    return c.json({
      city: value.city ?? null,
      country: value.country_name ?? null,
      lat: value.latitude ?? null,
      lon: value.longitude ?? null,
    });
  });
