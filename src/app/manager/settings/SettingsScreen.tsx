import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/app/manager/ui";
import { AboutTab } from "@/app/manager/about/AboutTab";
import { SidebarVersion } from "./controls/SidebarVersion";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { LayoutTab } from "./tabs/LayoutTab";
import { WidgetsTab } from "./tabs/WidgetsTab";
import { SystemTab } from "./tabs/SystemTab";
import { IslandTab } from "./tabs/IslandTab";
import { ShortcutsTab } from "./tabs/ShortcutsTab";
import { AiTab } from "./tabs/AiTab";
import { BLURB, TABS, type TabId } from "./tabs";
import { useT } from "@/app/manager/i18n";

const PANELS: Record<TabId, () => React.ReactElement> = {
  appearance: AppearanceTab,
  layout: LayoutTab,
  widgets: WidgetsTab,
  system: SystemTab,
  island: IslandTab,
  ai: AiTab,
  shortcuts: ShortcutsTab,
  about: AboutTab,
};

export default function SettingsScreen({
  onBack,
  initialTab = "appearance",
}: {
  onBack: () => void;
  initialTab?: TabId;
}) {
  const t = useT();
  const [tab, setTab] = useState<TabId>(initialTab);
  const Panel = PANELS[tab];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full w-full overflow-hidden bg-ink-950/92 backdrop-blur-2xl"
    >
      {/* ---------------------------------------------------------- sidebar */}
      <aside className="flex w-54.5 shrink-0 flex-col border-e border-white/6 p-3">
        <button onClick={onBack} className="btn mb-4 justify-start gap-2 px-2">
          <ArrowLeft size={14} className="rtl:-scale-x-100" /> {t("Back to board")}
        </button>

        <nav className="flex flex-col gap-0.5">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
                  active ? "text-white" : "text-ink-400 hover:bg-white/4 hover:text-ink-200",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="settings-tab"
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                    className="absolute inset-0 rounded-lg bg-white/7"
                  />
                )}
                <Icon size={14} className="relative z-10 shrink-0" />
                <span className="relative z-10">{t(item.label)}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />
        <SidebarVersion />
      </aside>

      {/* ----------------------------------------------------------- panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-155 px-7 py-8">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="mb-1 text-[19px] font-semibold tracking-tight text-white">
              {t(TABS.find((x) => x.id === tab)!.label)}
            </h2>
            <p className="mb-7 text-[12.5px] text-ink-500">{t(BLURB[tab])}</p>

            <Panel />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
