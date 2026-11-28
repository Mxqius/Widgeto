import { useApp } from "@/app/manager/store";
import { useT } from "@/app/manager/i18n";

/** Manual "check now", separate from the silent check that runs at startup. */
export function UpdateStatus() {
  const t = useT();
  const pendingUpdate = useApp((st) => st.pendingUpdate);
  const status = useApp((st) => st.updateCheckStatus);
  const checkForUpdates = useApp((st) => st.checkForUpdates);

  const label = pendingUpdate
    ? t("update available · {version}", { version: pendingUpdate.version })
    : status === "checking"
      ? t("checking…")
      : status === "upToDate"
        ? t("up to date")
        : status === "error"
          ? t("couldn’t check")
          : null;

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span
          className="text-[11.5px] font-semibold"
          style={{
            color: pendingUpdate
              ? "var(--accent)"
              : status === "upToDate"
                ? "#3ddc84"
                : status === "error"
                  ? "#ff6b6b"
                  : "var(--color-ink-400)",
          }}
        >
          {label}
        </span>
      )}
      <button className="btn" onClick={() => void checkForUpdates({ manual: true })}>
        {t("Check")}
      </button>
    </div>
  );
}
