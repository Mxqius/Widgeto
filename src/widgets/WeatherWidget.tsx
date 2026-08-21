import { motion } from "motion/react";
import { Cloud, CloudRain, CloudSun, Droplets, Sun, Wind } from "lucide-react";
import { Shell } from "./parts";
import { useApp } from "@/store/useApp";
import type { SizeKey } from "@/lib/types";

const ICONS = { sun: Sun, cloud: Cloud, rain: CloudRain, part: CloudSun };
type Cond = keyof typeof ICONS;

const FORECAST: { day: string; c: Cond; hi: number; lo: number }[] = [
  { day: "Tue", c: "part", hi: 22, lo: 14 },
  { day: "Wed", c: "sun", hi: 25, lo: 15 },
  { day: "Thu", c: "rain", hi: 19, lo: 13 },
  { day: "Fri", c: "cloud", hi: 18, lo: 12 },
  { day: "Sat", c: "sun", hi: 24, lo: 16 },
];

export default function WeatherWidget({ size }: { size: SizeKey }) {
  const unit = useApp((s) => s.settings.temperatureUnit);
  const t = (c: number) => (unit === "C" ? c : Math.round((c * 9) / 5 + 32));
  const days = size === "sm" ? 3 : size === "md" ? 4 : 5;

  return (
    <Shell title="Amsterdam" icon={<CloudSun size={12} />} right={<span>Feels {t(20)}°</span>}>
      <div className="flex items-start gap-3">
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ color: "var(--accent)" }}
        >
          <CloudSun size={size === "sm" ? 30 : 38} strokeWidth={1.4} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start leading-none">
            <span className="text-[30px] font-semibold tracking-tight text-white tabular-nums">
              {t(21)}
            </span>
            <span className="mt-1 ml-0.5 text-[14px] text-ink-400">°{unit}</span>
          </div>
          <div className="mt-1 text-[11.5px] text-ink-400">Partly cloudy</div>
        </div>
        {size !== "sm" && (
          <div className="flex shrink-0 flex-col gap-1 pr-12">
            <span className="flex items-center gap-1 text-[10.5px] text-ink-400">
              <Droplets size={10} /> 38%
            </span>
            <span className="flex items-center gap-1 text-[10.5px] text-ink-400">
              <Wind size={10} /> 11 km/h
            </span>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-end gap-1 pt-3">
        {FORECAST.slice(0, days).map((f, i) => {
          const Icon = ICONS[f.c];
          return (
            <motion.div
              key={f.day}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.05 }}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 transition-colors hover:bg-white/5"
            >
              <span className="text-[9.5px] font-medium text-ink-500">{f.day}</span>
              <Icon size={13} className="text-ink-300" strokeWidth={1.6} />
              <span className="font-mono text-[10px] text-ink-200 tabular-nums">{t(f.hi)}°</span>
            </motion.div>
          );
        })}
      </div>
    </Shell>
  );
}
