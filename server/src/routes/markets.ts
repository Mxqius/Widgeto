import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { through } from "../lib/cache.js";
import { getJSON } from "../lib/http.js";

/** Keyless CoinGecko ids, keyed by the ticker a user would type. */
const COINS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  DOGE: "dogecoin",
  XRP: "ripple",
  DOT: "polkadot",
  LINK: "chainlink",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
};

export const SUPPORTED = Object.keys(COINS);

const query = z.object({
  symbols: z
    .string()
    .default("BTC,ETH,SOL")
    .transform((s) =>
      s
        .split(",")
        .map((x) => x.trim().toUpperCase())
        .filter((x) => x in COINS)
        .slice(0, 10),
    ),
});

export const markets = new Hono().get("/", zValidator("query", query), async (c) => {
  const symbols = c.req.valid("query").symbols;
  const wanted = symbols.length ? symbols : ["BTC", "ETH", "SOL"];
  const key = `mk:${wanted.join(",")}`;

  const { value, from } = await through(key, 60_000, async () => {
    const ids = wanted.map((s) => COINS[s]).join(",");
    const url =
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}` +
      `&vs_currencies=usd&include_24hr_change=true`;
    const res = await getJSON<Record<string, { usd: number; usd_24h_change?: number }>>(url);

    return wanted
      .map((sym) => {
        const row = res[COINS[sym]];
        if (!row) return null;
        return {
          symbol: sym,
          name: COINS[sym].replace(/-/g, " "),
          price: row.usd,
          change24h: +(row.usd_24h_change ?? 0).toFixed(2),
        };
      })
      .filter(Boolean);
  });

  c.header("x-cache", from);
  return c.json({ assets: value, supported: SUPPORTED });
});
