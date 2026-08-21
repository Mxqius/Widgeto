import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { through } from "../lib/cache.js";
import { getJSON } from "../lib/http.js";

/** WMO weather codes collapsed to the handful of icons a widget can show. */
function condition(code: number): { label: string; icon: "sun" | "part" | "cloud" | "rain" | "snow" | "storm" } {
  if (code === 0) return { label: "clear", icon: "sun" };
  if (code <= 2) return { label: "partly cloudy", icon: "part" };
  if (code === 3) return { label: "overcast", icon: "cloud" };
  if (code <= 48) return { label: "fog", icon: "cloud" };
  if (code <= 57) return { label: "drizzle", icon: "rain" };
  if (code <= 67) return { label: "rain", icon: "rain" };
  if (code <= 77) return { label: "snow", icon: "snow" };
  if (code <= 82) return { label: "showers", icon: "rain" };
  if (code <= 86) return { label: "snow showers", icon: "snow" };
  return { label: "thunderstorm", icon: "storm" };
}

const query = z.object({
  q: z.string().min(1).max(80).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
});

interface GeoHit {
  name: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

async function geocode(place: string): Promise<GeoHit> {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=" +
    encodeURIComponent(place);
  const res = await getJSON<{ results?: GeoHit[] }>(url);
  const hit = res.results?.[0];
  if (!hit) throw new Error(`no place matches "${place}"`);
  return hit;
}

export const weather = new Hono().get("/", zValidator("query", query), async (c) => {
  const { q, lat, lon } = c.req.valid("query");
  const place = q ?? (lat === undefined || lon === undefined ? "Amsterdam" : undefined);

  const key = place ? `wx:q:${place.toLowerCase()}` : `wx:c:${lat!.toFixed(2)},${lon!.toFixed(2)}`;

  const { value, from } = await through(key, 10 * 60_000, async () => {
    const spot = place
      ? await geocode(place)
      : ({ name: "Here", latitude: lat!, longitude: lon! } as GeoHit);

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${spot.latitude}&longitude=${spot.longitude}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto`;

    const w = await getJSON<{
      current: {
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        wind_speed_10m: number;
        weather_code: number;
      };
      daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
      };
    }>(url);

    const now = condition(w.current.weather_code);
    return {
      place: spot.name,
      country: spot.country_code ?? null,
      // always celsius; the client converts, so one cache entry serves both units
      tempC: Math.round(w.current.temperature_2m),
      feelsC: Math.round(w.current.apparent_temperature),
      humidity: Math.round(w.current.relative_humidity_2m),
      windKph: Math.round(w.current.wind_speed_10m),
      condition: now.label,
      icon: now.icon,
      forecast: w.daily.time.map((day, i) => ({
        day: new Date(day).toLocaleDateString("en", { weekday: "short" }),
        icon: condition(w.daily.weather_code[i]).icon,
        hiC: Math.round(w.daily.temperature_2m_max[i]),
        loC: Math.round(w.daily.temperature_2m_min[i]),
      })),
    };
  });

  c.header("x-cache", from);
  return c.json(value);
});
