import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Tooltip } from "@base-ui/react/tooltip";
import ManagerChrome from "./chrome/ManagerChrome";
import ManagerBoard from "./board/ManagerBoard";
import SettingsScreen from "./settings/SettingsScreen";
import UpdateDialog from "./updates/UpdateDialog";
import { useApp } from "./store";
import { TABS, type TabId } from "./settings/tabs";

const BACKDROP =
  "radial-gradient(900px 500px at 0% -10%, #17162e 0%, transparent 55%)," +
  "radial-gradient(700px 460px at 100% 0%, #0d2b33 0%, transparent 50%), #08090a";

/**
 * The visible manager. Mounted only while the window is actually on screen —
 * closing to the tray unmounts this whole tree, which is the point: it is the
 * heaviest thing in the app (Base UI, the animation library, the board and the
 * settings screen) and it spends most of its life invisible.
 */
export default function ManagerUI() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<TabId>("appearance");
  const request = useApp((s) => s.settingsRequest);
  const clearRequest = useApp((s) => s.clearSettingsRequest);

  // the island asked for a particular tab ("Open settings" on its Ask tab)
  useEffect(() => {
    if (!request) return;
    const tab = TABS.find((t) => t.id === request.tab)?.id;
    if (tab) {
      setSettingsTab(tab);
      setSettingsOpen(true);
    }
    clearRequest();
  }, [request, clearRequest]);
  const update = useApp((s) => s.update);
  const autoArrangeNow = useApp((s) => s.autoArrangeNow);
  const redock = useApp((s) => s.redock);

  const openSettings = () => {
    setSettingsTab("appearance");
    setSettingsOpen(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const typing =
        e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName);

      if (!mod || typing) return;

      switch (e.key.toLowerCase()) {
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
        style={{ background: BACKDROP }}
      >
        <ManagerChrome onOpenSettings={() => openSettings()} />

        <main className="relative min-h-0 flex-1">
          <ManagerBoard onOpenSettings={() => openSettings()} />
          <AnimatePresence>
            {settingsOpen && (
              <div className="absolute inset-0 z-700">
                <SettingsScreen
                  key={settingsTab}
                  initialTab={settingsTab}
                  onBack={() => setSettingsOpen(false)}
                />
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
      <UpdateDialog />
    </Tooltip.Provider>
  );
}
