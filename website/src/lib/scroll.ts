import type Lenis from "lenis";

let lenis: Lenis | null = null;
export const setLenis = (l: Lenis | null) => {
  lenis = l;
};

/** Smoothly scrolls to a section, clearing the fixed nav. */
export function scrollToId(id: string) {
  const el = id === "top" ? 0 : document.getElementById(id);
  if (el === null) return;
  if (lenis) lenis.scrollTo(el, { offset: -72, duration: 1.4 });
  else if (el === 0) window.scrollTo({ top: 0, behavior: "smooth" });
  else el.scrollIntoView({ behavior: "smooth" });
}
