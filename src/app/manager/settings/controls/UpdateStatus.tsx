import { useApp } from "@/app/manager/store";

/** Manual "check now", separate from the silent check that runs at startup. */
export function UpdateStatus() {
  const pendingUpdate = useApp((st) => st.pendingUpdate);
  const status = useApp((st) => st.updateCheckStatus);
  const checkForUpdates = useApp((st) => st.checkForUpdates);

  const label = pendingUpdate
    ? `update available · ${pendingUpdate.version}`
    : status === "checking"
      ? "checking…"
      : status === "upToDate"
        ? "up to date"
        : status === "error"
          ? "couldn't check"
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
        Check
      </button>
    </div>
  );
}
