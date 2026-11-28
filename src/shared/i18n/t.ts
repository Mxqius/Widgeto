/**
 * Translation, gettext style: the English text *is* the key, so components
 * stay readable and English needs no dictionary at all. Each window owns a
 * Persian dictionary, loaded with a dynamic import only once Persian is in use.
 *
 * The key type comes from that dictionary, so `tsc` fails on any string that
 * is passed to `t` without a Persian translation.
 *
 *   t("Accent colour")
 *   t("{n} widgets", { n: 3 })   // numbers come out in Persian digits in fa
 */
import { useSyncExternalStore } from "react";
import { digits } from "./format";
import { getLang, registerLoader, subscribe, type Lang } from "./locale";

export type Vars = Record<string, string | number>;

function fill(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = vars[k];
    if (v === undefined) return m;
    return typeof v === "number" ? digits(v) : v;
  });
}

export function createT<K extends string>(load: () => Promise<{ default: Record<K, string> }>) {
  let fa: Record<K, string> | null = null;

  registerLoader(async (l: Lang) => {
    if (l === "fa" && !fa) fa = (await load()).default;
  });

  const t = (key: K, vars?: Vars): string =>
    fill(getLang() === "fa" && fa ? fa[key] || key : key, vars);

  /** Re-renders the component when the language changes; returns `t`. */
  const useT = () => {
    useSyncExternalStore(subscribe, getLang);
    return t;
  };

  return { t, useT };
}

/** Re-render on a language change, for components that only format. */
export const useLang = () => useSyncExternalStore(subscribe, getLang);
