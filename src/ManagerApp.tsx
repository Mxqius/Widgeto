import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Tooltip } from "@base-ui/react/tooltip";
import ManagerChrome from "@/components/ManagerChrome";
import WidgetLibrary from "@/components/WidgetLibrary";
import Manager from "@/screens/Manager";
import Settings from "@/screens/Settings";
import { useApp } from "@/store/useApp";
import { useDesktopSync } from "@/lib/useDesktopSync";
import { setAlwaysOnTop } from "@/lib/tauri";

export default function ManagerApp() {
  const [library, setLibrary] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const accent = useApp((s) => s.settings.accent);
  const update = useApp((s) => s.update);
  const autoArrangeNow = useApp((s) => s.autoArrangeNow);
  const redock = useApp((s) => s.redock);

  useDesktopSync();

  // the manager only needs the accent; widget glass tokens live in the widgets
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--accent", accent);
    r.setProperty("--accent-soft", `color-mix(in srgb, ${accent} 18%, transparent)`);
  }, [accent]);

  useEffect(() => {
    if (useApp.getState().settings.managerAlwaysOnTop) setAlwaysOnTop(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const typing =
        e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName);

      if (e.key === "Escape") {
        setLibrary(false);
        return;
      }
      if (!mod || typing) return;

      switch (e.key.toLowerCase()) {
        case "k":
          e.preventDefault();
          setLibrary((v) => !v);
          break;
        case ",":
          e.preventDefault();
          setSettingsOpen((v) => !v);
          break;
        case "g":
          e.preventDefault();
          autoArrangeNow();
          break;
        case "d":
          e.preventDefault();
          redock();
          break;
        case "l":
          e.preventDefault();
          update({ lockAll: !useApp.getState().settings.lockAll });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [autoArrangeNow, redock, update]);

  return (
    <Tooltip.Provider delay={350} closeDelay={80}>
      <div
        className="flex h-full w-full flex-col overflow-hidden rounded-xl"
        style={{
          background:
            "radial-gradient(900px 500px at 0% -10%, #17162e 0%, transparent 55%), radial-gradient(700px 460px at 100% 0%, #0d2b33 0%, transparent 50%), #08090a",
        }}
      >
        <ManagerChrome onOpenSettings={() => setSettingsOpen(true)} />

        <main className="relative min-h-0 flex-1">
          <Manager onOpenLibrary={() => setLibrary(true)} onOpenSettings={() => setSettingsOpen(true)} />
          <AnimatePresence>
            {settingsOpen && (
              <div className="absolute inset-0 z-[700]">
                <Settings onBack={() => setSettingsOpen(false)} />
              </div>
            )}
          </AnimatePresence>
        </main>

        <WidgetLibrary open={library} onOpenChange={setLibrary} />
      </div>
    </Tooltip.Provider>
  );
}
