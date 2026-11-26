/**
 * Real spring physics, baked into a CSS `linear()` easing.
 *
 * The island morphs between shapes with plain CSS transitions, so a widget
 * window-sized animation library is not needed — but a cubic-bezier cannot
 * overshoot and settle the way a spring does. `linear()` can: simulate the
 * spring once, sample the curve, and hand the browser the points.
 */
export interface Spring {
  /** a CSS easing function */
  easing: string;
  /** how long the spring takes to come to rest, in ms */
  ms: number;
}

export function spring(stiffness: number, damping: number, mass = 1): Spring {
  const dt = 1 / 1000;
  const curve: number[] = [];
  let x = 0;
  let v = 0;
  let still = 0;
  // semi-implicit Euler in 1 ms steps, until it has been at rest for 24 ms
  while (curve.length < 2000) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt;
    x += v * dt;
    curve.push(x);
    if (Math.abs(1 - x) < 0.002 && Math.abs(v) < 0.03) {
      if (++still > 24) break;
    } else still = 0;
  }

  const ms = curve.length;
  const N = 48;
  const stops = [0];
  for (let i = 1; i < N; i++) stops.push(curve[Math.round((i / N) * (ms - 1))]);
  stops.push(1);
  return { easing: `linear(${stops.map((n) => +n.toFixed(4)).join(", ")})`, ms };
}

/** Growing: a little overshoot, the way a live activity pops open. */
export const GROW = spring(290, 22);
/** Shrinking: critically damped, so the pill lands without wobbling. */
export const SETTLE = spring(340, 36);
/** Reduced motion: a short, plain ease. */
export const CALM: Spring = { easing: "cubic-bezier(0.2, 0, 0, 1)", ms: 180 };
