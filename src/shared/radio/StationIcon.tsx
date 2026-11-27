import type { CSSProperties } from "react";
import { useFavicon } from "./useRadio";
import type { Station } from "./protocol";

/** A steady colour per station, so a tile without an icon is still recognisable. */
function hueOf(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)!) % 360;
  return h;
}

/** First letter worth showing — skips the spaces and symbols names often start with. */
function initial(name: string) {
  const m = name.match(/[\p{L}\p{N}]/u);
  return m ? m[0].toUpperCase() : "♪";
}

/**
 * A station's icon, falling back to a coloured tile with its initial. The
 * icon arrives as a data URL from the Rust side, so no window loads a remote
 * image.
 */
export function StationIcon({
  station,
  size,
  radius = 8,
  className,
  style,
}: {
  station: Pick<Station, "name" | "favicon"> | null;
  size: number;
  radius?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const src = useFavicon(station?.favicon);
  const name = station?.name ?? "";
  const box: CSSProperties = { width: size, height: size, borderRadius: radius, flexShrink: 0, ...style };

  if (src) {
    return (
      <img
        src={src}
        alt=""
        draggable={false}
        className={className}
        style={{ ...box, objectFit: "cover", background: "rgba(255,255,255,0.92)" }}
      />
    );
  }
  const h = hueOf(name);
  return (
    <div
      className={className}
      style={{
        ...box,
        display: "grid",
        placeItems: "center",
        background: `linear-gradient(135deg, hsl(${h} 55% 42%), hsl(${(h + 40) % 360} 60% 30%))`,
        color: "rgba(255,255,255,0.92)",
        fontWeight: 800,
        fontSize: Math.round(size * 0.44),
        lineHeight: 1,
      }}
    >
      {initial(name)}
    </div>
  );
}
