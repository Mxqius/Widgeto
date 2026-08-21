import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const uid = () => Math.random().toString(36).slice(2, 9);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function pad(n: number, len = 2) {
  return String(Math.floor(n)).padStart(len, "0");
}

export function isTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
