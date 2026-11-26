import { useRef, type CSSProperties } from "react";

/**
 * What is left of the island once it is tucked into the top edge: a short
 * grip, tinted while something is live (the track's colour, or the accent
 * during a focus session). It stretches when the pointer finds it, and an
 * activity that would have popped out glows through it instead.
 */
export function TuckHandle({ hover, tone, live, ping }: {
  hover: boolean;
  /** colour of whatever is live; null when nothing is */
  tone: string | null;
  live: boolean;
  ping: { n: number; tone: string };
}) {
  // pings from before this handle appeared are old news
  const seen = useRef(ping.n);
  const pinged = ping.n > seen.current;
  const style = {
    "--grip": tone ?? "rgba(255, 255, 255, 0.42)",
    "--ping": ping.tone,
  } as CSSProperties;
  return (
    <div className="island-tucked" data-hover={hover || undefined} data-live={live || undefined} style={style}>
      {/* keyed on the ping, so every activity replays the glow */}
      <i key={ping.n} className={`island-grip ${pinged ? "is-ping" : "is-in"}`} />
    </div>
  );
}
