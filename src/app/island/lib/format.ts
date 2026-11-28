import { digits } from "@/shared/i18n/format";
import { t } from "../i18n";

export const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");

export const mmss = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return digits(
    s >= 3600
      ? `${Math.floor(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`
      : `${Math.floor(s / 60)}:${pad(s % 60)}`,
  );
};

export function clock(d: Date, h24: boolean) {
  if (h24) return digits(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  const h = d.getHours() % 12 || 12;
  return digits(`${h}:${pad(d.getMinutes())}`);
}

export const ampm = (d: Date) => (d.getHours() < 12 ? t("AM") : t("PM"));

export function bytesPerSec(bps: number) {
  if (bps >= 1024 * 1024) return t("{n} MB/s", { n: (bps / 1024 / 1024).toFixed(1) });
  if (bps >= 1024) return t("{n} KB/s", { n: Math.round(bps / 1024) });
  return t("{n} B/s", { n: Math.round(bps) });
}

/** Turns "Spotify.exe" or an AUMID into something worth showing. */
export function appLabel(id: string | null) {
  if (!id) return null;
  const last = id.split("!").pop() ?? id;
  const name = last.replace(/\.exe$/i, "").replace(/^App$/i, "");
  return name || null;
}
