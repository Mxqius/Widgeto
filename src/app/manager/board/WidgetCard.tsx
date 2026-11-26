import { memo } from "react";
import { Check, Lock, LockOpen, Monitor, Plus, SlidersHorizontal } from "lucide-react";
import { Tip, cn } from "@/app/manager/ui";
import { useApp } from "@/app/manager/store";
import type { WidgetDef } from "@/app/manager/widgets/catalogue";
import type { SizeKey, WidgetInstance, WidgetKind } from "@/shared/types/widget";

const SIZES: SizeKey[] = ["sm", "md", "lg"];

/**
 * Memoised, and subscribed to `lockAll` rather than the whole settings object.
 * The board hands every card the same `def` and callbacks, so only the card
 * whose own widget record changed re-renders — tinting one widget used to
 * re-render all thirteen, each with two tooltips and an icon set, on every
 * frame of a colour drag.
 */
export const WidgetCard = memo(function WidgetCard({
  def,
  widget,
  tuning,
  onTune,
}: {
  def: WidgetDef;
  widget: WidgetInstance;
  tuning: boolean;
  onTune: (kind: WidgetKind | null) => void;
}) {
  const lockAll = useApp((s) => s.settings.lockAll);
  const areas = useApp((s) => s.areas);
  const setOpen = useApp((s) => s.setOpen);
  const setSize = useApp((s) => s.setSize);
  const setDisplay = useApp((s) => s.setDisplay);
  const toggleLock = useApp((s) => s.toggleLock);

  const Icon = def.icon;
  const locked = widget.locked || lockAll;

  return (
    <div
      className={cn(
        "group flex flex-col gap-2 rounded-xl border p-3 transition-colors",
        widget.open
          ? "border-white/8 bg-white/[0.035]"
          : "border-white/5 bg-transparent hover:border-white/8",
      )}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={() => setOpen(def.kind, !widget.open)}
          title={widget.open ? "Remove from desktop" : "Add to desktop"}
          className="relative grid size-9 shrink-0 place-items-center rounded-[10px] border border-white/8 transition-transform active:scale-95"
          style={{
            background: `color-mix(in srgb, ${def.accent} ${widget.open ? 20 : 9}%, transparent)`,
            color: def.accent,
            opacity: widget.open ? 1 : 0.5,
          }}
        >
          <Icon size={16} />
          <span
            className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full border-2 border-ink-950"
            style={{ background: widget.open ? def.accent : "#3a3a40" }}
          >
            {widget.open ? (
              <Check size={8} strokeWidth={4} className="text-white" />
            ) : (
              <Plus size={8} strokeWidth={4} className="text-white" />
            )}
          </span>
        </button>

        <div className={cn("min-w-0 flex-1", !widget.open && "opacity-55")}>
          <div className="truncate text-[12.5px] font-medium text-ink-100">{def.name}</div>
          <div className="truncate text-[10.5px] text-ink-500">
            {widget.open
              ? `${Math.round(widget.x)}, ${Math.round(widget.y)}${widget.dock ? ` · ${widget.dock}` : ""}`
              : def.description}
          </div>
        </div>

        <Tip label="Widget settings">
          <button
            className="btn size-7 shrink-0 px-0"
            data-selected={tuning}
            onClick={() => onTune(tuning ? null : def.kind)}
          >
            <SlidersHorizontal size={12} />
          </button>
        </Tip>
      </div>

      {widget.open && (
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 rounded-lg border border-white/6 bg-white/3 p-0.5">
            {SIZES.map((sz) => (
              <button
                key={sz}
                onClick={() => setSize(def.kind, sz)}
                title={`${sz.toUpperCase()} size`}
                className={cn(
                  "h-6 w-7 rounded-md text-[10px] font-semibold uppercase transition-colors",
                  widget.size === sz
                    ? "bg-white/12 text-white"
                    : "text-ink-500 hover:text-ink-300",
                )}
              >
                {sz[0]}
              </button>
            ))}
          </div>
          {areas.length > 1 && (
            <div className="flex items-center gap-0.5 rounded-lg border border-white/6 bg-white/3 p-0.5">
              <Monitor size={11} className="ml-1 text-ink-500" />
              {areas.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setDisplay(def.kind, i)}
                  title={`Move to ${a.name || `display ${i + 1}`}`}
                  className={cn(
                    "h-6 w-6 rounded-md text-[10px] font-semibold transition-colors",
                    widget.display === i
                      ? "bg-white/12 text-white"
                      : "text-ink-500 hover:text-ink-300",
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1" />
          <Tip label={locked ? "Unlock position" : "Lock position"}>
            <button
              className="btn size-7 px-0"
              data-selected={locked}
              onClick={() => toggleLock(def.kind)}
            >
              {locked ? <Lock size={12} /> : <LockOpen size={12} />}
            </button>
          </Tip>
        </div>
      )}
    </div>
  );
});
