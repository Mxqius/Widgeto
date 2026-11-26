import { useContext } from "react";
import { PrefsContext } from "../prefs";

/**
 * How much to stretch every interval.
 *
 * The battery state arrives with the widget's config rather than being polled
 * here: this hook runs in all thirteen windows, and having each of them ask
 * the battery how it is doing would burn more power than the feature saves.
 */
export function useSlowdown(): number {
  const { powerSaver, onBattery, lowMemory } = useContext(PrefsContext);
  const saving = powerSaver === "always" || (powerSaver === "onBattery" && onBattery);
  if (lowMemory) return saving ? 8 : 4;
  return saving ? 4 : 1;
}
