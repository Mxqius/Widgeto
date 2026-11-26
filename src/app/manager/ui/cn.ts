import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Manager-only. Widget code uses plain `cx` from shared: none of its class
 * lists ever conflict, and tailwind-merge is ~26 KB that would otherwise be
 * parsed in all thirteen widget windows to do nothing.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
