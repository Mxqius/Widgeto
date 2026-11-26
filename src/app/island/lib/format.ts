export const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");

export const mmss = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return s >= 3600
    ? `${Math.floor(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`
    : `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

export function clock(d: Date, h24: boolean) {
  if (h24) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const h = d.getHours() % 12 || 12;
  return `${h}:${pad(d.getMinutes())}`;
}

export const ampm = (d: Date) => (d.getHours() < 12 ? "AM" : "PM");

export function bytesPerSec(bps: number) {
  if (bps >= 1024 * 1024) return `${(bps / 1024 / 1024).toFixed(1)} MB/s`;
  if (bps >= 1024) return `${Math.round(bps / 1024)} KB/s`;
  return `${Math.round(bps)} B/s`;
}

/** Turns "Spotify.exe" or an AUMID into something worth showing. */
export function appLabel(id: string | null) {
  if (!id) return null;
  const last = id.split("!").pop() ?? id;
  const name = last.replace(/\.exe$/i, "").replace(/^App$/i, "");
  return name || null;
}
