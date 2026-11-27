import type { RadioQuery } from "./protocol";

/**
 * Quick ways into the directory. Each is a query rather than a list of
 * streams, so nothing here goes stale when a station moves its URL.
 */
export interface RadioPreset {
  id: string;
  label: string;
  query: RadioQuery;
}

export const RADIO_PRESETS: RadioPreset[] = [
  { id: "popular", label: "Popular", query: {} },
  { id: "iran", label: "Iran", query: { countryCode: "IR" } },
  { id: "persian", label: "Persian", query: { language: "persian" } },
  { id: "pop", label: "Pop", query: { tag: "pop" } },
  { id: "jazz", label: "Jazz", query: { tag: "jazz" } },
  { id: "lofi", label: "Lo-fi", query: { tag: "lofi" } },
  { id: "classical", label: "Classical", query: { tag: "classical" } },
  { id: "news", label: "News", query: { tag: "news" } },
];
