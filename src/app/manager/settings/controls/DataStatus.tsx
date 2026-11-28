import { useState } from "react";
import { fetchHealth } from "@/shared/ipc/commands";
import { useT } from "@/app/manager/i18n";

/** Reports the Rust cache so the data layer can be sanity-checked in place. */
export function DataStatus() {
  const t = useT();
  const [state, setState] = useState<"idle" | "checking" | "up" | "down">("idle");
  const [cached, setCached] = useState(0);

  const check = async () => {
    setState("checking");
    try {
      const res = await fetchHealth();
      setCached(res.cached);
      setState(res.ok ? "up" : "down");
    } catch {
      setState("down");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {state !== "idle" && (
        <span
          className="text-[11.5px] font-semibold"
          style={{
            color:
              state === "up" ? "#3ddc84" : state === "down" ? "#ff6b6b" : "var(--color-ink-400)",
          }}
        >
          {state === "checking"
            ? t("checking…")
            : state === "up"
              ? t("ready · {n} cached", { n: cached })
              : t("unavailable")}
        </span>
      )}
      <button className="btn" onClick={check}>
        {t("Check")}
      </button>
    </div>
  );
}
