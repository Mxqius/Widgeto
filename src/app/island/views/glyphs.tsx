import {
  BatteryCharging, BatteryLow, BatteryMedium, Cloud, CloudLightning, CloudRain, CloudSnow,
  CloudSun, Coffee, PlugZap, StickyNote, Sun, Timer,
} from "lucide-react";
import type { Weather } from "@/shared/ipc/commands";
import type { ActivityIcon } from "../data/useActivities";

export function WeatherGlyph({ icon, size, className }: { icon: Weather["icon"]; size: number; className?: string }) {
  const I = { sun: Sun, part: CloudSun, cloud: Cloud, rain: CloudRain, snow: CloudSnow, storm: CloudLightning }[icon] ?? Cloud;
  const tone = icon === "sun" ? "#fcd34d" : icon === "part" ? "#fde68a" : "#cbd5e1";
  return <I size={size} className={className} style={{ color: tone }} />;
}

export function ActivityGlyph({ icon, size }: { icon: ActivityIcon; size: number }) {
  switch (icon) {
    case "charging":
      return <BatteryCharging size={size} />;
    case "unplugged":
      return <PlugZap size={size} />;
    case "battery":
      return <BatteryLow size={size} />;
    case "focus":
      return <Timer size={size} />;
    case "break":
      return <Coffee size={size} />;
    case "note":
      return <StickyNote size={size} />;
    default:
      return <BatteryMedium size={size} />;
  }
}
