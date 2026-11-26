/**
 * Small motion helpers shared by the widget drag and the manager's window
 * mover. Both animate real OS windows, so everything here is framerate
 * independent — a dropped frame must not change how far a widget travels.
 */

/** Classic ease-out: fast departure, long soft landing. No overshoot. */
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Hermite ramp, used to turn "how near are we" into "how hard does it pull". */
export const smoothstep = (t: number) => {
  const c = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return c * c * (3 - 2 * c);
};

/**
 * Exponential approach towards `target`, resolved for the elapsed time rather
 * than a per-frame constant. `tau` is the time constant in ms: after `tau` the
 * remaining distance is down to ~37%.
 */
export function approach(current: number, target: number, dt: number, tau: number) {
  if (tau <= 0) return target;
  const next = current + (target - current) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 0.05 ? target : next;
}
