import { Cloud, CloudRain, CloudSun, Snowflake, Sun, Zap } from "lucide-react";
import { Muted, Pad, Say } from "../ui";
import { useWidgetConfig, useWidgetPrefs } from "../prefs";
import { useWeather } from "../data/useRemote";
import { bySize } from "../lib/scale";
import type { WidgetBodyProps } from "./props";
import { conditionShort } from "@/shared/i18n/weather";
import { digits, useT } from "../i18n";

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
  const { data: wx, live, source } = useWeather(cfg.place, cfg.refreshSec);

  const tr = useT();
  const t = (c: number) => digits(unit === "C" ? c : Math.round((c * 9) / 5 + 32));
  const Icon = ICONS[wx.icon as keyof typeof ICONS] ?? CloudSun;

  const big = bySize(size, 20, 25, 31);
  const small = bySize(size, 14, 17, 21);

  return (
    <Pad size={size} className="justify-center gap-1">
      <Say>
        <span style={{ fontSize: big }}>
          {t(wx.tempC)}&deg;{unit}
        </span>{" "}
        <span style={{ fontSize: small }}>
          <Muted>{tr("now")}</Muted>
        </span>
      </Say>
      <Say>
        <span style={{ fontSize: small }}>
          <Muted>{tr("in")}</Muted>
        </span>{" "}
        <span style={{ fontSize: big }}>{wx.place}</span>
      </Say>
      <Say>
        <span style={{ fontSize: small }}>
          <Muted>{tr("feels")}</Muted>
        </span>{" "}
        <span style={{ fontSize: big }}>{t(wx.feelsC)}&deg;</span>
      </Say>

      <div className="mt-1.5 flex items-center gap-1.5">
        <Icon size={bySize(size, 16, 20)} strokeWidth={2} className="shrink-0" />
        <Say style={{ fontSize: big }}>{conditionShort(wx.condition)}</Say>
      </div>

      {!live ? (
        <div className="dimmer mt-1 text-[9.5px] font-semibold">{tr("sample data")}</div>
      ) : source === "stale" ? (
        <div className="dimmer mt-1 text-[9.5px] font-semibold">{tr("last known")}</div>
      ) : null}
    </Pad>
  );
}
