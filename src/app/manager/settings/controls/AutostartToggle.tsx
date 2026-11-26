import { useEffect, useState } from "react";
import { Toggle } from "@/app/manager/ui";
import { useApp } from "@/app/manager/store";
import { isAutostartEnabled, setAutostart } from "@/app/manager/desktop/startup";

/**
 * Reads the real OS registration rather than our own setting — it can be
 * revoked outside the app, and showing a stale "on" would be a lie.
 */
export function AutostartToggle() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const update = useApp((st) => st.update);

  useEffect(() => {
    let alive = true;
    void isAutostartEnabled().then((v) => {
      if (alive) setOn(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Toggle
      checked={on}
      onChange={async (v) => {
        if (busy) return;
        setBusy(true);
        setOn(v); // optimistic, corrected below if the OS refuses
        const actual = await setAutostart(v);
        setOn(actual);
        update({ launchAtLogin: actual });
        setBusy(false);
      }}
    />
  );
}
