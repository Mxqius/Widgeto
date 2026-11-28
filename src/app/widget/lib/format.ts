import { digits, fmtNumber } from "@/shared/i18n/format";

export { pad } from "@/shared/lib/math";

/** Bytes per second in the largest sensible unit. */
export function bytesRate(bps: number): [string, "MB/S" | "KB/S" | "B/S"] {
  if (bps >= 1_000_000) return [(bps / 1_048_576).toFixed(1), "MB/S"];
  if (bps >= 1_000) return [(bps / 1024).toFixed(0), "KB/S"];
  return [Math.round(bps).toString(), "B/S"];
}

export const gigabytes = (bytes: number) => bytes / 1_000_000_000;

/** Prices read better without decimals once they are into the thousands. */
export const money = (n: number) =>
  n >= 1000 ? fmtNumber(Math.round(n)) : digits(n.toFixed(2));

/** Seconds as m:ss, for track position. */
export const mmss = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Minutes past midnight as HH:MM, for calendar events. */
export const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
