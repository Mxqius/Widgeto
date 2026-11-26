import { useEffect, useState } from "react";

/**
 * Whether this widget's frame is actually on screen.
 *
 * Widget windows are never minimised — they sit pinned to the desktop — but
 * Windows' occlusion tracking marks a fully covered window hidden, and
 * Chromium turns that into a `visibilitychange`. When it fires there is no
 * point animating a clock nobody can see; when it does not, this stays `true`
 * and every timer behaves exactly as it did before.
 */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  );

  useEffect(() => {
    const read = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", read);
    return () => document.removeEventListener("visibilitychange", read);
  }, []);

  return visible;
}
