import { getLang } from "./locale";

/** Open-Meteo's conditions, as `data.rs` names them, in Persian. */
const FA: Record<string, string> = {
  clear: "صاف",
  "partly cloudy": "نیمه‌ابری",
  overcast: "ابری",
  fog: "مه",
  drizzle: "نم‌نم باران",
  rain: "باران",
  snow: "برف",
  showers: "رگبار",
  "snow showers": "برف پراکنده",
  thunderstorm: "رعد و برق",
};

/** A weather condition in the UI's language; unknown ones pass through. */
export const conditionLabel = (c: string) => (getLang() === "fa" ? (FA[c.toLowerCase()] ?? c) : c);

/** The short form a tile has room for: the first word in English, the whole word in Persian. */
export const conditionShort = (c: string) =>
  getLang() === "fa" ? conditionLabel(c) : c.split(" ")[0];
