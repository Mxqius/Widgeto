import { useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Search } from "lucide-react";
import { WIDGETS } from "@/widgets/registry";
import { useApp } from "@/store/useApp";

export default function WidgetLibrary({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const add = useApp((s) => s.add);
  const widgets = useApp((s) => s.widgets);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return WIDGETS;
    return WIDGETS.filter(
      (w) => w.name.toLowerCase().includes(t) || w.description.toLowerCase().includes(t),
    );
  }, [q]);

  const countOf = (kind: string) => widgets.filter((w) => w.kind === kind).length;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal keepMounted>
            <Dialog.Backdrop
              render={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 z-[800] bg-black/55 backdrop-blur-[3px]"
                />
              }
            />
            <Dialog.Popup
              render={
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 8 }}
                  transition={{ type: "spring", stiffness: 460, damping: 34 }}
                  className="fixed top-1/2 left-1/2 z-[810] flex max-h-[76vh] w-[min(720px,92vw)]
                             -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl
                             border border-white/8 bg-ink-900/92 backdrop-blur-2xl outline-none
                             shadow-[0_40px_100px_-20px_rgba(0,0,0,0.95)]"
                />
              }
            >
              <div className="flex items-center gap-2.5 border-b border-white/6 px-4 py-3">
                <Search size={15} className="text-ink-500" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search widgets…"
                  className="flex-1 bg-transparent text-[14px] text-ink-100 outline-none placeholder:text-ink-500"
                />
                <kbd className="chip font-mono">esc</kbd>
              </div>

              <div className="grid grid-cols-1 gap-1.5 overflow-y-auto p-3 sm:grid-cols-2">
                {results.map((w, i) => {
                  const Icon = w.icon;
                  const n = countOf(w.kind);
                  return (
                    <motion.button
                      key={w.kind}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.018, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => add(w.kind)}
                      className="group flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.025]
                                 p-3 text-left transition-colors hover:border-white/12 hover:bg-white/[0.055]"
                    >
                      <div
                        className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-white/8"
                        style={{
                          background: `color-mix(in srgb, ${w.accent} 16%, transparent)`,
                          color: w.accent,
                        }}
                      >
                        <Icon size={16} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-ink-100">{w.name}</span>
                          {n > 0 && <span className="chip">{n}</span>}
                        </div>
                        <div className="truncate text-[11.5px] text-ink-500">{w.description}</div>
                      </div>
                      <Plus
                        size={15}
                        className="shrink-0 text-ink-600 opacity-0 transition-opacity group-hover:opacity-100"
                        style={{ color: w.accent }}
                      />
                    </motion.button>
                  );
                })}
                {results.length === 0 && (
                  <div className="col-span-full py-10 text-center text-[13px] text-ink-500">
                    No widget matches “{q}”
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-white/6 px-4 py-2.5">
                <span className="text-[11.5px] text-ink-500">
                  {WIDGETS.length} widget types · click to add to the board
                </span>
                <Dialog.Close className="btn text-[12px]">Done</Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
