import { Blocks, Info, Keyboard, Magnet, MonitorCog, Palette } from "lucide-react";

export const TABS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "layout", label: "Layout & docking", icon: Magnet },
  { id: "widgets", label: "Widgets", icon: Blocks },
  { id: "system", label: "Desktop & system", icon: MonitorCog },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "about", label: "About", icon: Info },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export const BLURB: Record<TabId, string> = {
  appearance: "Tune the glass, the accent and the density of your widgets.",
  layout: "Control how your widgets snap, dock and arrange themselves.",
  widgets: "Shared formats, and where your live data comes from.",
  system: "How Widgeto and your widgets behave on your desktop.",
  shortcuts: "Everything you can do without touching the mouse.",
  about: "Version, what it is built on, and what to send if something breaks.",
};

export const SHORTCUTS = [
  { combo: "Ctrl+,", what: "Open settings" },
  { combo: "Ctrl+G", what: "Auto-arrange the desktop" },
  { combo: "Ctrl+D", what: "Dock everything to zones" },
  { combo: "Close window", what: "Keeps Widgeto running in the tray" },
  { combo: "Ctrl+L", what: "Lock / unlock every widget" },
  { combo: "Esc", what: "Close the current overlay" },
];
