import { ArrowDown, ArrowUp } from "lucide-react";
import { Pad, Stat, TickMeter } from "../ui";
import { useNet } from "../data/useLocalStats";
import { useTrail } from "../lib/useTrail";
import { useWidgetConfig } from "../prefs";
import { bytesRate } from "../lib/format";
import { bySize, isLg, isSm } from "../lib/scale";
import type { WidgetBodyProps } from "./props";
import { digits, useT } from "../i18n";

export default function NetworkWidget({ size }: WidgetBodyProps) {
  const t = useT();
  const cfg = useWidgetConfig("network");
  const { data } = useNet(cfg.refreshSec);
  const down = data?.downBps ?? 0;
  const up = data?.upBps ?? 0;
  const trail = useTrail(down);

  // scale the meter against the busiest moment we have seen, so an idle link
  // is not permanently pinned at zero
  const peak = Math.max(...trail, 64 * 1024);
  const [dv, du] = bytesRate(down);
  const [uv, uu] = bytesRate(up);
  const small = isSm(size);

  return (
    <Pad size={size} className="justify-between">
      <div>
        <Stat value={digits(dv)} unit={t(du)} size={bySize(size, 26, 34, 42)} />
        <div className="dim mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold">
          <ArrowDown size={10} /> {t("DOWN")}
        </div>
      </div>

      <TickMeter
        value={(down / peak) * 100}
        accent="var(--accent)"
        height={bySize(size, 22, 34, 46)}
        ticks={small ? 14 : 24}
      />

      <div className="flex items-baseline justify-between">
        <span className="dim flex items-center gap-1 text-[10.5px] font-semibold">
          <ArrowUp size={10} /> {t("UP")}
        </span>
        <span className="numeral text-[13px]">
          {digits(uv)}
          <span className="dim ms-0.5 text-[9.5px]">{t(uu)}</span>
        </span>
      </div>

      {isLg(size) && data && (
        <div className="flex items-baseline justify-between">
          <span className="dim text-[10.5px] font-semibold">{t("SESSION")}</span>
          <span className="numeral text-[13px]">{t("{n} GB", { n: (data.totalRx / 1_000_000_000).toFixed(1) })}</span>
        </div>
      )}
    </Pad>
  );
}
