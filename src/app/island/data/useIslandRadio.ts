import { useRadio, useFavicon } from "@/shared/radio/useRadio";

/**
 * The radio as the island sees it: the manager's player state, a way to
 * drive it, and the station's icon ready to show.
 */
export function useIslandRadio() {
  const { state, send } = useRadio();
  const art = useFavicon(state.station?.favicon);
  const on = state.playing || state.buffering;
  return { state, send, art, on };
}

export type RadioRemote = ReturnType<typeof useIslandRadio>;
