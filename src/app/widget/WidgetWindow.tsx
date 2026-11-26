import { useCallback, useState } from "react";
import type { WidgetKind } from "@/shared/types/widget";
import type { MovedPayload } from "@/shared/desktop/protocol";
import { DataBoundary } from "./DataBoundary";
import { useConfigChannel } from "./useConfigChannel";
import { useWidgetDrag } from "./useWidgetDrag";
import { WidgetShell } from "./shell/WidgetShell";

/**
 * One widget, alone in its own frameless always-on-desktop OS window.
 */
export default function WidgetWindow({ kind }: { kind: WidgetKind }) {
  const { cfg, setCfg, send } = useConfigChannel(kind);
  const [hovered, setHovered] = useState(false);

  // reflect the drop locally right away; the manager is the one that persists it
  const onSettled = useCallback(
    ({ x, y, dock, display }: Omit<MovedPayload, "kind">) => {
      setCfg((c) =>
        c
          ? {
              ...c,
              widget: { ...c.widget, x, y, dock, display },
              area: c.areas[display] ?? c.area,
            }
          : c,
      );
    },
    [setCfg],
  );

  const { dragging, docking, onPointerDown, onPointerMove, onPointerUp } = useWidgetDrag(
    kind,
    cfg,
    onSettled,
  );

  if (!cfg) {
    // waiting for the manager's first config broadcast
    return <div className="tile tile-dark h-full w-full opacity-25" />;
  }

  return (
    <DataBoundary kind={kind}>
      <WidgetShell
        widget={cfg.widget}
        settings={cfg.settings}
        onBattery={cfg.onBattery}
        dragging={dragging}
        docking={docking}
        hovered={hovered}
        onHover={setHovered}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onAction={send}
      />
    </DataBoundary>
  );
}
