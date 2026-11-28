/**
 * Which language the UI speaks, shared by every window kind.
 *
 * Each window holds its own copy of this little store: the manager resolves the
 * user's setting and pushes the result out with the config it already sends,
 * and every window also leaves the resolved language in localStorage (one
 * origin for all webviews) so the next window to open can come up in the right
 * language before its first config arrives.
 */
export type Lang = "en" | "fa";
/** What the user picked; "system" follows the OS display language. */
export type LangSetting = "system" | Lang;

const KEY = "widgeto.lang";

export const isRtl = (l: Lang) => l === "fa";

/** The OS display language, as the webview reports it. */
export function systemLang(): Lang {
  const l = (typeof navigator !== "undefined" && navigator.language) || "";
  return l.toLowerCase().startsWith("fa") ? "fa" : "en";
}

export const resolveLang = (s: LangSetting | undefined): Lang =>
  s === "en" || s === "fa" ? s : systemLang();

/** The language this window last ran in, or the OS's if it never ran. */
export function storedLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "en" || v === "fa") return v;
  } catch {
    /* storage unavailable */
  }
  return systemLang();
}

let current: Lang = "en";
const listeners = new Set<() => void>();
/** loaders registered by each window's dictionary; run before a switch lands */
const loaders = new Set<(l: Lang) => Promise<void>>();

export const getLang = () => current;

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function registerLoader(fn: (l: Lang) => Promise<void>) {
  loaders.add(fn);
}

let pending: Promise<void> = Promise.resolve();

/**
 * Switch the window's language. Strings for it are loaded first, so the UI
 * changes over in one step instead of flashing keys. Resolves once it has.
 */
export function setLang(l: Lang): Promise<void> {
  pending = pending.then(async () => {
    await Promise.all([...loaders].map((load) => load(l).catch(() => {})));
    const root = document.documentElement;
    root.lang = l;
    root.dir = isRtl(l) ? "rtl" : "ltr";
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* storage unavailable */
    }
    if (l === current) return;
    current = l;
    for (const fn of listeners) fn();
  });
  return pending;
}

/** Bring a window up in the language it last ran in, before the first render. */
export const bootLang = () => setLang(storedLang());
