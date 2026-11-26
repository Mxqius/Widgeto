export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const uid = () => Math.random().toString(36).slice(2, 9);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function pad(n: number, len = 2) {
  return String(Math.floor(n)).padStart(len, "0");
}
