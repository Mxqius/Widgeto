import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Download, SkipForward } from "lucide-react";
import { useApp } from "@/app/manager/store";

/**
 * Mounted once in ManagerApp. Renders nothing until a background or manual
 * check finds a version newer than what's installed (see `checkForUpdates`
 * in the store) — this component is purely presentational.
 */
export default function UpdateDialog() {
  const pendingUpdate = useApp((s) => s.pendingUpdate);
  const dismiss = useApp((s) => s.dismissUpdateDialog);
  const skip = useApp((s) => s.skipUpdateVersion);
  const install = useApp((s) => s.installPendingUpdate);

  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);

  if (!pendingUpdate) return null;

  const runInstall = async () => {
    setError(false);
    setInstalling(true);
    try {
      await install(setProgress);
      // on success the app relaunches; nothing left to do here
    } catch {
      setInstalling(false);
      setError(true);
    }
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !installing) dismiss();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-980 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup
          className="popup fixed top-1/2 left-1/2 z-990 w-95 -translate-x-1/2 -translate-y-1/2
                     rounded-2xl border border-white/8 bg-ink-850/95 p-5 backdrop-blur-xl
                     shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] outline-none"
        >
          <Dialog.Title className="text-[15px] font-semibold text-white">
            Widgeto {pendingUpdate.version} is available
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-[12px] text-ink-500">
            You're on {pendingUpdate.currentVersion}.
          </Dialog.Description>

          {pendingUpdate.body && (
            <div className="mt-3 max-h-32 overflow-y-auto rounded-lg border border-white/6 bg-black/20 p-2.5 text-[11.5px] leading-relaxed whitespace-pre-wrap text-ink-400">
              {pendingUpdate.body}
            </div>
          )}

          {installing ? (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full transition-[width] duration-200"
                  style={{ width: `${progress}%`, background: "var(--accent)" }}
                />
              </div>
              <p className="mt-2 text-[11px] text-ink-500">
                {progress > 0 ? `Downloading… ${progress}%` : "Starting download…"}
              </p>
            </div>
          ) : (
            <>
              {error && (
                <p className="mt-3 text-[11.5px] text-red-300/90">
                  Couldn't download the update. Try again later.
                </p>
              )}
              <div className="mt-4 flex flex-wrap justify-end gap-1.5">
                <button className="btn" onClick={skip}>
                  <SkipForward size={13} /> Skip this version
                </button>
                <button className="btn" onClick={dismiss}>
                  Remind me later
                </button>
                <button className="btn btn-primary" onClick={runInstall}>
                  <Download size={13} /> Download &amp; Install
                </button>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
