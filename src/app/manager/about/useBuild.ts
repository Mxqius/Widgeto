import { useEffect, useState } from "react";
import { isTauri } from "@/shared/lib/env";

export interface Build {
  name: string;
  version: string;
  identifier: string;
  platform: string;
  arch: string;
  renderer: string;
}

const UNKNOWN = "—";

/**
 * Read at runtime rather than typed into this file, so a version bump can
 * never leave a stale number behind in the UI.
 */
export function useBuild(): Build {
  const [b, setB] = useState<Build>({
    name: "Widgeto",
    version: UNKNOWN,
    identifier: UNKNOWN,
    platform: UNKNOWN,
    arch: UNKNOWN,
    renderer: navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? UNKNOWN,
  });

  useEffect(() => {
    if (!isTauri()) return;
    let alive = true;
    (async () => {
      try {
        const app = await import("@tauri-apps/api/app");
        const { invoke } = await import("@tauri-apps/api/core");
        const [name, version, identifier, host] = await Promise.all([
          app.getName(),
          app.getVersion(),
          app.getIdentifier(),
          invoke<{ platform: string; arch: string }>("host_info"),
        ]);
        if (alive) {
          setB((p) => ({
            ...p,
            name,
            version,
            identifier,
            platform: host.platform,
            arch: host.arch,
          }));
        }
      } catch {
        /* leave the placeholders in place */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return b;
}
