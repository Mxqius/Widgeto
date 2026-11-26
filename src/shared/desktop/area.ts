/** Work area of a monitor, in *logical* pixels, including its screen origin. */
export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
  name: string;
}

/** Fallback used in the browser so the manager still renders a plausible desktop. */
export const BROWSER_AREA: Area = { x: 0, y: 0, w: 1920, h: 1032, scale: 1, name: "Preview" };

/** The monitor whose work area contains a point, or the nearest one. */
export function areaAt(areas: Area[], x: number, y: number): number {
  const hit = areas.findIndex(
    (a) => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h,
  );
  if (hit >= 0) return hit;

  let best = 0;
  let bestDist = Infinity;
  areas.forEach((a, i) => {
    const cx = Math.max(a.x, Math.min(x, a.x + a.w));
    const cy = Math.max(a.y, Math.min(y, a.y + a.h));
    const d = (cx - x) ** 2 + (cy - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}
