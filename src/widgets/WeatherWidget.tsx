import { Cloud, CloudRain, CloudSun, Snowflake, Sun, Zap } from "lucide-react";
import { Muted, Pad, Say } from "./parts";
import { useWidgetConfig, useWidgetPrefs } from "./prefs";
import { useWeather } from "@/lib/queries";
import type { WidgetBodyProps } from "./loader";

const ICONS = {
  sun: Sun,
  part: CloudSun,
  cloud: Cloud,
  rain: CloudRain,
  snow: Snowflake,
  storm: Zap,
};

export default function WeatherWidget({ size }: WidgetBodyProps) {
  const { temperatureUnit: unit } = useWidgetPrefs();
  const cfg = useWidgetConfig("weather");
  const { data: wx, live, source } = useWeather(cfg.place);

  const t = (c: number) => (unit === "C" ? c : Math.round((c * 9) / 5 + 32));
  const Icon = ICONS[wx.icon as keyof typeof ICONS] ?? CloudSun;

  const big = size === "sm" ? 20 : size === "md" ? 25 : 31;
  const small = size === "sm" ? 14 : size === "md" ? 17 : 21;

  return (
    <Pad size={size} className="justify-center gap-1">
      <Say>
        <span style={{ fontSize: big }}>
          {t(wx.tempC)}°{unit}
        </span>{" "}
        <span style={{ fontSize: small }}>
          <Muted>now</Muted>
        </span>
      </Say>
      <Say>
        <span style={{ fontSize: small }}>
          <Muted>in</Muted>
        </span>{" "}
        <span style={{ fontSize: big }}>{wx.place}</span>
      </Say>
      <Say>
        <span style={{ fontSize: small }}>
          <Muted>feels</Muted>
        </span>{" "}
        <span style={{ fontSize: big }}>{t(wx.feelsC)}°</span>
      </Say>

      <div className="mt-1.5 flex items-center gap-1.5">
        <Icon size={size === "sm" ? 16 : 20} strokeWidth={2} className="shrink-0" />
        <Say style={{ fontSize: big }}>{wx.condition.split(" ")[0]}</Say>
      </div>

      {!live ? (
        <div className="dimmer mt-1 text-[9.5px] font-semibold">sample data</div>
      ) : source === "stale" ? (
        <div className="dimmer mt-1 text-[9.5px] font-semibold">last known</div>
      ) : null}
    </Pad>
  );
}
