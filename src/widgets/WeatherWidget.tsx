import { useEffect, useState } from "react";
import { Cloud, CloudRain, CloudSun, Snowflake, Sun, Zap } from "lucide-react";
import { Muted, Pad, Say } from "./parts";
import { useWidgetConfig, useWidgetPrefs } from "./prefs";
import { setApiBase, getWeather, type WeatherNow } from "@/lib/api";
import type { WidgetBodyProps } from "./loader";

const ICONS = {
  sun: Sun,
  part: CloudSun,
  cloud: Cloud,
  rain: CloudRain,
  snow: Snowflake,
  storm: Zap,
};

/** Shown until the API answers, and kept if it never does. */
const SAMPLE: WeatherNow = {
  place: "Amsterdam",
  country: "NL",
  tempC: 21,
  feelsC: 20,
  humidity: 38,
  windKph: 11,
  condition: "partly cloudy",
  icon: "part",
  forecast: [],
};

export default function WeatherWidget({ size }: WidgetBodyProps) {
  const { temperatureUnit: unit, apiBase } = useWidgetPrefs();
  const cfg = useWidgetConfig("weather");
  const [wx, setWx] = useState<WeatherNow>(SAMPLE);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let alive = true;
    setApiBase(apiBase);
    const load = async () => {
      const res = await getWeather(cfg.place);
      if (alive && res) {
        setWx(res);
        setLive(true);
      }
    };
    void load();
    const t = setInterval(load, 10 * 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [cfg.place, apiBase]);

  const t = (c: number) => (unit === "C" ? c : Math.round((c * 9) / 5 + 32));
  const Icon = ICONS[wx.icon] ?? CloudSun;

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

      {!live && (
        <div className="dimmer mt-1 text-[9.5px] font-semibold">sample · server offline</div>
      )}
    </Pad>
  );
}
