import type { SizeKey } from "@/shared/types/widget";

/**
 * Pick a per-size value. The two-argument form means "small, then everything
 * else", which is the shape most of these took as nested ternaries.
 */
export function bySize<T>(size: SizeKey, sm: T, md: T, lg: T = md): T {
  return size === "sm" ? sm : size === "md" ? md : lg;
}

export const isSm = (size: SizeKey) => size === "sm";
export const isLg = (size: SizeKey) => size === "lg";
