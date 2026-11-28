import { forwardRef, useEffect, useState } from "react";
import { Check, Sun } from "lucide-react";
import { Segmented, cn } from "@/app/manager/ui";
import { ACCENTS } from "@/app/manager/ui/accents";
import { useApp } from "@/app/manager/store";
import { StepHeader } from "../parts";
import type { Draft, SetDraft } from "../draft";
import { digits, useT } from "@/app/manager/i18n";

import { fmtDate } from "@/shared/i18n/format";
export const MakeItYours = forwardRef<HTMLHeadingElement, { draft: Draft; set: SetDraft }>(
  function MakeItYours({ draft, set }, ref) {
    const t = useT();
    const accent = useApp((s) => s.settings.accent);
    const update = useApp((s) => s.update);

    return (
      <>
        <StepHeader ref={ref} eyebrow={t("Look and feel")} title={t("Make it yours")}>
          {t("Pick an accent and the formats your widgets use. The preview updates as you go.")}
        </StepHeader>

        <div className="flex flex-wrap items-start gap-8">
          <div className="min-w-60 flex-1 space-y-6">
            <Control label={t("Accent colour")}>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("Accent colour")}>
                {ACCENTS.map((c) => {
                  const on = accent === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={c}
                      onClick={() => update({ accent: c })}
                      className={cn(
                        "grid size-8 place-items-center rounded-full outline-none transition-transform duration-150 hover:scale-110",
                        "focus-visible:ring-2 focus-visible:ring-white/60",
                        on && "ring-2 ring-white/75 ring-offset-2 ring-offset-ink-900",
                      )}
                      style={{ background: c, boxShadow: on ? `0 0 22px -4px ${c}` : undefined }}
                    >
                      {on && (
                        <Check
                          size={14}
                          strokeWidth={3}
                          className={c === "#e8e8e8" ? "text-black" : "text-white"}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </Control>

            <Control label={t("Clock")}>
              <Segmented
                layoutId="ob-clock"
                value={draft.clock24h ? "24" : "12"}
                onChange={(v) => set({ clock24h: v === "24" })}
                options={[
                  { value: "24", label: t("24-hour") },
                  { value: "12", label: t("12-hour") },
                ]}
              />
            </Control>

            <Control label={t("Temperature")}>
              <Segmented
                layoutId="ob-temp"
                value={draft.temperatureUnit}
                onChange={(v) => set({ temperatureUnit: v })}
                options={[
                  { value: "C", label: t("Celsius") },
                  { value: "F", label: t("Fahrenheit") },
                ]}
              />
            </Control>
          </div>

          <Preview clock24h={draft.clock24h} unit={draft.temperatureUnit} />
        </div>
      </>
    );
  },
);

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-xs mb-2">{label}</div>
      {children}
    </div>
  );
}

/** Two tiles drawn the way the desktop draws them, in the chosen formats. */
function Preview({ clock24h, unit }: { clock24h: boolean; unit: "C" | "F" }) {
  const t = useT();
  const now = useNow();
  const h = now.getHours();
  const hh = clock24h ? String(h).padStart(2, "0") : String(h % 12 || 12);
  const mm = String(now.getMinutes()).padStart(2, "0");
  const date = fmtDate(now, { weekday: "long", day: "numeric" });
  const deg = (c: number) => digits(unit === "C" ? c : Math.round((c * 9) / 5 + 32));

  return (
    <div className="flex gap-2.5" aria-label={t("Preview")}>
      <div className="tile tile-dark flex size-38 flex-col justify-between rounded-[30px] p-4 ring-1 ring-white/8">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="dim text-[11px] font-medium">{t("Local time")}</span>
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="numeral text-[40px] leading-none">
              {digits(`${hh}:${mm}`)}
            </span>
            {!clock24h && (
              <span className="text-[12px] font-semibold" style={{ color: "var(--accent)" }}>
                {h < 12 ? t("AM") : t("PM")}
              </span>
            )}
          </div>
          <div className="dimmer mt-1 text-[11px]">{date}</div>
        </div>
      </div>

      <div className="tile tile-light flex size-38 flex-col justify-between rounded-[30px] p-4">
        <div className="flex items-center justify-between">
          <span className="dim text-[11px] font-medium">{t("Sunny")}</span>
          <Sun size={16} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <div className="numeral text-[44px] leading-none">{deg(22)}°</div>
          <div className="dimmer mt-1 text-[11px] tabular-nums">
            {t("H {hi}° · L {lo}°", { hi: deg(25), lo: deg(14) })}
          </div>
        </div>
      </div>
    </div>
  );
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
