import {
  BatteryCharging, BatteryLow, BatteryMedium, CaseUpper, Cloud, CloudLightning, CloudRain, CloudSnow,
  CloudSun, Coffee, Download, Mic, PlugZap, StickyNote, Sun, Timer, Video, Volume1, Volume2, VolumeX,
} from "lucide-react";
import type { Volume, Weather } from "@/shared/ipc/commands";
import type { ActivityIcon } from "../data/useActivities";

export function WeatherGlyph({ icon, size, className }: { icon: Weather["icon"]; size: number; className?: string }) {
  const I = { sun: Sun, part: CloudSun, cloud: Cloud, rain: CloudRain, snow: CloudSnow, storm: CloudLightning }[icon] ?? Cloud;
  const tone = icon === "sun" ? "#fcd34d" : icon === "part" ? "#fde68a" : "#cbd5e1";
  return <I size={size} className={className} style={{ color: tone }} />;
}

export function VolumeGlyph({ v, size, className }: { v: Volume | undefined; size: number; className?: string }) {
  const I = !v || v.muted || v.level === 0 ? VolumeX : v.level < 0.5 ? Volume1 : Volume2;
  return <I size={size} className={className} />;
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
    case "mic":
      return <Mic size={size} />;
    case "camera":
      return <Video size={size} />;
    case "caps":
      return <CaseUpper size={size} />;
    case "update":
      return <Download size={size} />;
    default:
      return <BatteryMedium size={size} />;
  }
}

/** The two privacy dots: green for the camera, orange for the microphone. */
export const CAMERA_TONE = "#4ade80";
export const MIC_TONE = "#fb923c";
