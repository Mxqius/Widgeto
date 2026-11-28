/**
 * Just enough of the calendar to draw a month strip in either language: the
 * Gregorian one in English, the Solar Hijri (Jalali) one in Persian. Built on
 * Intl's persian calendar so there is no conversion table to get wrong.
 */
import { getLang } from "./locale";

const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function jalali(d: Date) {
  let y = 0, m = 0, day = 0;
  for (const p of parts.formatToParts(d)) {
    if (p.type === "year") y = parseInt(p.value, 10);
    else if (p.type === "month") m = parseInt(p.value, 10);
    else if (p.type === "day") day = parseInt(p.value, 10);
  }
  return { y, m, day };
}

/** Day of the month in the UI's calendar. */
export const dayOfMonth = (d: Date) => (getLang() === "fa" ? jalali(d).day : d.getDate());

/** Month index in the UI's calendar (only good for comparing two dates). */
export const monthOf = (d: Date) => (getLang() === "fa" ? jalali(d).m : d.getMonth());

/** Days in the month that holds `d`, in the UI's calendar. */
export function daysInMonth(d: Date): number {
  if (getLang() !== "fa") return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  // Jalali months are 31, 30 or 29/30 (Esfand) days; walk from day 29 until the month rolls over
  const { m } = jalali(d);
  const probe = new Date(d.getFullYear(), d.getMonth(), d.getDate() - jalali(d).day + 29);
  let n = 29;
  while (n < 31) {
    probe.setDate(probe.getDate() + 1);
    if (jalali(probe).m !== m) break;
    n++;
  }
  return n;
}

/** First day of the week: Saturday in Persian, Sunday in English (0 = Sunday). */
export const weekStart = () => (getLang() === "fa" ? 6 : 0);
