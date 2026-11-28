import { Minus, Pin, PinOff, Settings2, Square, X } from "lucide-react";
import { useApp } from "@/app/manager/store";
import { Tip } from "@/app/manager/ui";
import { isTauri } from "@/shared/lib/env";
import { setAlwaysOnTop, winClose, winMinimize, winToggleMax } from "@/app/manager/lib/window";
import { useT } from "@/app/manager/i18n";

export default function ManagerChrome({
  onOpenSettings,
  minimal = false,
}: {
  onOpenSettings: () => void;
  /** during first-run setup: just the name and the window buttons */
  minimal?: boolean;
}) {
  const t = useT();
  const s = useApp((st) => st.settings);
  const update = useApp((st) => st.update);
  const live = useApp((st) => st.widgets.filter((w) => w.open).length);

  return (
    // a window title bar: name on the left, window buttons on the right, in
    // every language — only the words inside it are translated
    <header
      dir="ltr"
      className="app-drag relative z-600 flex h-11 shrink-0 items-center gap-2 border-b border-white/6
                 bg-ink-950/80 px-2.5 backdrop-blur-xl"
    >
      <div className="flex items-center gap-2 ps-1">
        <div
          className="grid size-4.75 place-items-center rounded-md text-[10px] font-bold text-white"
          style={{ background: "var(--accent)", boxShadow: "0 0 16px -4px var(--accent)" }}
        >
          W
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-ink-100">Widgeto</span>
      </div>

      <div className="flex-1" />

      {!minimal && <span dir="auto" className="chip no-drag">{t("{n} on desktop", { n: live })}</span>}

      <div className="no-drag flex items-center gap-1.5">
        {!minimal && (
          <>
            <Tip label={t("Keep this manager above other windows")}>
              <button
                className="btn"
                data-selected={s.managerAlwaysOnTop}
                onClick={() => {
                  update({ managerAlwaysOnTop: !s.managerAlwaysOnTop });
                  setAlwaysOnTop(!s.managerAlwaysOnTop);
                }}
              >
                {s.managerAlwaysOnTop ? <Pin size={13} /> : <PinOff size={13} />}
              </button>
            </Tip>
            <Tip label={t("Settings")}>
              <button className="btn" onClick={onOpenSettings}>
                <Settings2 size={14} />
              </button>
            </Tip>
          </>
        )}

        {isTauri() && (
          <div className="ms-1 flex items-center gap-0.5 border-s border-white/[0.07] ps-1.5">
            <WinBtn onClick={winMinimize}>
              <Minus size={13} />
            </WinBtn>
            <WinBtn onClick={winToggleMax}>
              <Square size={10} />
            </WinBtn>
            <WinBtn danger onClick={winClose}>
              <X size={13} />
            </WinBtn>
          </div>
        )}
      </div>
    </header>
  );
}

function WinBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex size-7 items-center justify-center rounded-md text-ink-400 transition-colors ${
        danger ? "hover:bg-red-500/80 hover:text-white" : "hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
