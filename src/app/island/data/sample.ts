import type { BatteryStats, MediaNow, NetStats, SystemStats, Weather } from "@/shared/ipc/commands";

/**
 * What the island shows outside the desktop app (`npm run dev` in a browser),
 * so every state can be looked at and styled without Windows media sessions.
 */
export const SAMPLE_MEDIA: MediaNow = {
  playing: true,
  title: "Night Drive",
  artist: "The Midnight",
  album: "Endless Summer",
  app: "Spotify.exe",
  positionSec: 64,
  durationSec: 241,
};

export const SAMPLE_BATTERY: BatteryStats = {
  present: true,
  percent: 76,
  charging: false,
  full: false,
  secsLeft: 3 * 3600 + 12 * 60,
  health: 94,
  tempC: 31,
};

export const SAMPLE_SYSTEM: SystemStats = {
  cpu: 43,
  cpuCores: [],
  memUsed: 9.6e9,
  memTotal: 16e9,
  memPct: 60,
  diskUsed: 0,
  diskTotal: 0,
  diskPct: 0,
  uptimeSec: 26_000,
  hostName: "desktop",
};

export const SAMPLE_NET: NetStats = { downBps: 2.4e6, upBps: 180e3, totalRx: 0, totalTx: 0 };

export const SAMPLE_WEATHER: Weather = {
  place: "Tehran",
  country: "Iran",
  tempC: 17,
  feelsC: 16,
  humidity: 32,
  windKph: 9,
  condition: "Mostly clear",
  icon: "sun",
  forecast: [],
};

/** A cover for the sample track: a purple dusk, drawn rather than shipped. */
export const SAMPLE_ART =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1b5e"/><stop offset=".6" stop-color="#8b5cf6"/><stop offset="1" stop-color="#140c2c"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="44" cy="20" r="7" fill="#f5d0fe" opacity=".85"/><path d="M0 46 L18 36 L30 42 L46 32 L64 40 L64 64 L0 64Z" fill="#0b0618"/><rect x="29" y="38" width="3" height="9" rx="1" fill="#000"/></svg>`,
  );
