/**
 * Locale-aware formatting. In English everything defers to the OS locale, as
 * the app always has; in Persian dates are Solar Hijri and digits are Persian.
 */
import { getLang } from "./locale";

const FA_LOCALE = "fa-IR-u-ca-persian-nu-arabext";

/** The locale tag to hand `Intl`; undefined keeps the OS default. */
export const intlLocale = () => (getLang() === "fa" ? FA_LOCALE : undefined);

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * Persian digits for every ASCII digit in a string, in Persian mode. The
 * decimal point becomes the Persian decimal separator and % the Persian ٪.
 */
export function digits(v: string | number): string {
  const s = String(v);
  if (getLang() !== "fa") return s;
  return s
    .replace(/\d/g, (d) => FA_DIGITS[+d])
    .replace(/([۰-۹])\.(?=[۰-۹])/g, "$1٫") // decimal separator
    .replace(/([۰-۹])\s?%/g, "$1٪"); // Persian percent sign
}

const cache = new Map<string, Intl.DateTimeFormat>();

export function fmtDate(d: Date, opts: Intl.DateTimeFormatOptions): string {
  const loc = intlLocale();
  const k = `${loc}|${JSON.stringify(opts)}`;
  let f = cache.get(k);
  if (!f) {
    f = new Intl.DateTimeFormat(loc, opts);
    cache.set(k, f);
  }
  return f.format(d);
}

/** A number grouped by the locale, e.g. 12,480 or ۱۲٬۴۸۰. */
export const fmtNumber = (n: number, opts?: Intl.NumberFormatOptions) =>
  n.toLocaleString(intlLocale(), opts);
