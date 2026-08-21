import { useNow } from "@/lib/hooks";
import { useWidgetPrefs } from "./prefs";
import { pad } from "@/lib/utils";
import type { WidgetBodyProps } from "./loader";

/**
 * A white circular face: hairline ticks, black hour/minute hands and a single
 * orange second hand, with the city + digital time tucked under the centre.
 */
export default function ClockWidget({ size }: WidgetBodyProps) {
  const now = useNow(1000);
  const { clock24h } = useWidgetPrefs();

  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours();
  const hh = clock24h ? pad(h) : pad(((h + 11) % 12) + 1);

  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {[12, 3, 6, 9].map((n, i) => {
          const a = (i * 90 * Math.PI) / 180;
          return (
            <text
              key={n}
              x={50 + Math.sin(a) * 36}
              y={50 - Math.cos(a) * 36 + 3.4}
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="600"
              fill="#0a0a0b"
            >
              {n}
            </text>
          );
        })}
        {Array.from({ length: 60 }).map((_, i) => {
          if (i % 15 === 0) return null;
          const a = (i * 6 * Math.PI) / 180;
          const major = i % 5 === 0;
          return (
            <line
              key={i}
              x1={50 + Math.sin(a) * (major ? 41 : 43)}
              y1={50 - Math.cos(a) * (major ? 41 : 43)}
              x2={50 + Math.sin(a) * 44.5}
              y2={50 - Math.cos(a) * 44.5}
              stroke="#0a0a0b"
              strokeOpacity={major ? 0.38 : 0.14}
              strokeWidth={major ? 1 : 0.6}
              strokeLinecap="round"
            />
          );
        })}

        <g style={{ transform: `rotate(${(h % 12) * 30 + m * 0.5}deg)`, transformOrigin: "50px 50px" }}>
          <rect x="48.9" y="27" width="2.2" height="25" rx="1.1" fill="#0a0a0b" />
        </g>
        <g style={{ transform: `rotate(${m * 6 + s * 0.1}deg)`, transformOrigin: "50px 50px" }}>
          <rect x="49.3" y="16" width="1.5" height="36" rx="0.75" fill="#0a0a0b" />
        </g>
        <g style={{ transform: `rotate(${s * 6}deg)`, transformOrigin: "50px 50px" }}>
          <rect x="49.7" y="14" width="0.7" height="40" rx="0.35" fill="var(--accent)" />
        </g>
        <circle cx="50" cy="50" r="2" fill="var(--accent)" />
        <circle cx="50" cy="50" r="0.9" fill="#fbfbfa" />
      </svg>

      <div
        className="absolute inset-x-0 flex items-center justify-center gap-1 text-[11px] font-semibold tabular-nums"
        style={{ top: "63%" }}
      >
        <span style={{ color: "var(--accent)" }}>{size === "sm" ? "" : "AMS"}</span>
        <span>
          {hh}:{pad(m)}
        </span>
      </div>
    </div>
  );
}
