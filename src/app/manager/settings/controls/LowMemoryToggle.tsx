import { useState } from "react";
import { Toggle } from "@/app/manager/ui";
import { useApp } from "@/app/manager/store";
import { setLowMemory } from "@/app/manager/desktop/startup";

/**
 * The frontend half takes effect immediately — the blur goes, the polls
 * stretch. The native half is a set of WebView2 browser flags, and those are
 * read once when the runtime environment is created, so they only land on the
 * next launch. Saying so beats leaving the user to wonder.
 *
 * The flags are where the actual memory goes: turning off GPU compositing is
 * worth roughly a quarter of the app's committed memory, far more than
 * anything the JavaScript side can give back.
 */
export function LowMemoryToggle() {
  const on = useApp((st) => st.settings.lowMemory);
  const update = useApp((st) => st.update);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {pending && <span className="text-[11px] font-semibold text-ink-400">restart to finish</span>}
      <Toggle
        checked={on}
        onChange={(v) => {
          update({ lowMemory: v });
          void setLowMemory(v);
          setPending(true);
        }}
      />
    </div>
  );
}
