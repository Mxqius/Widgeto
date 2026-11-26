import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Cpu, Globe2, HardDrive, LayoutGrid } from "lucide-react";
import clsx from "clsx";
import { SectionHead } from "../components/Reveal";
import { Widget, WIDGETS, type WidgetInfo } from "../widgets";

const FILTERS = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "machine", label: "Your machine", icon: Cpu },
  { id: "live", label: "Live data", icon: Globe2 },
  { id: "local", label: "Local & private", icon: HardDrive },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

const SOURCE: Record<WidgetInfo["source"], { label: string; dot: string }> = {
  machine: { label: "Reads your machine", dot: "#ff4dd8" },
  live: { label: "Live public data", dot: "#60a5fa" },
  local: { label: "Stored locally", dot: "#3ddc84" },
};

export function WidgetsSection() {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = WIDGETS.filter((w) => filter === "all" || w.source === filter);

  return (
    <section id="widgets" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead
          eyebrow="The widgets"
          title={
            <>
              Twelve widgets and a pet.
              <br />
              <span className="text-ink-400">None of them faked.</span>
            </>
          }
        >
          System, network and battery read the real machine. Weather and markets come from live public data.
          Notes, tasks and calendar are real, and stay on your computer. Every tile below is live — click around.
        </SectionHead>

        <LayoutGroup>
          <div className="mt-12 flex flex-wrap gap-2">
            {FILTERS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={clsx(
                  "relative flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors",
                  filter === id ? "text-white" : "text-ink-300 hover:text-white",
                )}
              >
                {filter === id && (
                  <motion.span
                    layoutId="filter-pill"
                    className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/15"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <Icon size={15} className="relative" />
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>

          <motion.div layout className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {shown.map((w) => (
                <motion.article
                  layout
                  key={w.kind}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  className="card group relative overflow-hidden p-6"
                >
                  <div
                    className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full opacity-[0.13] blur-3xl transition-opacity duration-700 group-hover:opacity-30"
                    style={{ background: w.accent }}
                  />
                  <div className="relative flex justify-center py-4">
                    <div className="transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.02]">
                      <Widget kind={w.kind} />
                    </div>
                  </div>
                  <div className="relative mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[17px] font-semibold tracking-tight">{w.name}</h3>
                      <span className="flex items-center gap-1.5 text-[12px] text-ink-400">
                        <span className="size-1.5 rounded-full" style={{ background: SOURCE[w.source].dot }} />
                        {SOURCE[w.source].label}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-300">{w.blurb}</p>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      </div>
    </section>
  );
}
