import { Cloud, CloudRain, CloudSun, Sun } from "lucide-react";
import { Muted, Pad, Say } from "./parts";
import { useWidgetPrefs } from "./prefs";
import type { WidgetBodyProps } from "./loader";

const ICONS = { sun: Sun, cloud: Cloud, rain: CloudRain, part: CloudSun };

/**
 * The typographic card: one flowing sentence where the values carry the weight
 * and the connective words drop back.
 */
export default function WeatherWidget({ size }: WidgetBodyProps) {
  const { temperatureUnit: unit } = useWidgetPrefs();
  const t = (c: number) => (unit === "C" ? c : Math.round((c * 9) / 5 + 32));
  const Icon = ICONS.part;

  const big = size === "sm" ? 21 : size === "md" ? 26 : 32;
  const small = size === "sm" ? 15 : size === "md" ? 18 : 22;

  return (
    <Pad size={size} className="justify-center gap-1">
      <Say>
        <span style={{ fontSize: big }}>{t(28)}°{unit}</span>{" "}
        <span style={{ fontSize: small }}>
          <Muted>now</Muted>
        </span>
      </Say>
      <Say className="leading-tight">
        <span style={{ fontSize: small }}>
          <Muted>in</Muted>
        </span>{" "}
        <span style={{ fontSize: big }}>Chicago</span>
      </Say>
      <Say>
        <span style={{ fontSize: small }}>
          <Muted>feels</Muted>
        </span>{" "}
        <span style={{ fontSize: big }}>{t(38)}°</span>
      </Say>

      <div className="mt-2 flex items-center gap-1.5">
        <Icon size={size === "sm" ? 17 : 21} strokeWidth={2} className="shrink-0" />
        <Say>
          <span style={{ fontSize: big }}>sunny</span>{" "}
          <span style={{ fontSize: small }}>
            <Muted>next</Muted>
          </span>
        </Say>
      </div>
      <Say style={{ fontSize: big }}>
        <Muted>{size === "sm" ? "4 hrs" : "4 hours"}</Muted>
      </Say>
    </Pad>
  );
}
