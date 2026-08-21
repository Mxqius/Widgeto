import { useEffect, useState } from "react";
import { Check, Copy, FolderOpen, Heart, RefreshCw } from "lucide-react";
import { useApp } from "@/store/useApp";
import { WIDGETS } from "@/widgets/registry";
import { isTauri } from "@/lib/utils";

interface Build {
  name: string;
  version: string;
  identifier: string;
  tauriVersion: string;
  platform: string;
  arch: string;
  renderer: string;
}

const UNKNOWN = "—";

/**
 * Read at runtime rather than typed into this file, so a version bump can
 * never leave a stale number behind in the UI.
 */
function useBuild(): Build {
  const [b, setB] = useState<Build>({
    name: "Widgeto",
    version: UNKNOWN,
    identifier: UNKNOWN,
    tauriVersion: UNKNOWN,
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
        const [name, version, identifier, tauriVersion, host] = await Promise.all([
          app.getName(),
          app.getVersion(),
          app.getIdentifier(),
          app.getTauriVersion(),
          invoke<{ platform: string; arch: string }>("host_info"),
        ]);
        if (alive) {
          setB((p) => ({
            ...p,
            name,
            version,
            identifier,
            tauriVersion,
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

const YEAR = new Date().getFullYear();

export default function About() {
  const b = useBuild();
  const widgets = useApp((s) => s.widgets);
  const live = widgets.filter((w) => w.open).length;
  const [copied, setCopied] = useState(false);

  const diagnostics = [
    `Widgeto ${b.version}`,
    `${b.platform} (${b.arch})`,
    `App engine ${b.tauriVersion} · Renderer ${b.renderer}`,
    `${live} of ${WIDGETS.length} widgets active`,
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(diagnostics);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked; the values are on screen anyway */
    }
  };

  const openData = async () => {
    if (!isTauri()) return;
    try {
      const { appConfigDir } = await import("@tauri-apps/api/path");
      const { openPath } = await import("@tauri-apps/plugin-opener");
      await openPath(await appConfigDir());
    } catch {
      /* nothing to open outside the desktop app */
    }
  };

  return (
    <div className="space-y-3">
      {/* ------------------------------------------------------- identity */}
      <div className="surface-flat overflow-hidden rounded-2xl">
        <div className="flex items-start gap-4 p-5">
          <div
            className="grid size-14 shrink-0 place-items-center rounded-2xl text-[20px] font-bold text-white"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 34px -8px var(--accent)",
            }}
          >
            W
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3 className="text-[19px] font-semibold tracking-tight text-white">Widgeto</h3>
              <span className="chip font-mono">{b.version}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">
              Desktop widgets that live right on your desktop — a clock, your weather, tasks,
              notes and more, always in view and always where you left them.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-white/6 bg-white/[0.04]">
          <div className="bg-ink-900 px-3 py-2.5">
            <div className="label-xs">Active widgets</div>
            <div className="mt-0.5 text-[12px] text-ink-200">
              {live} of {WIDGETS.length}
            </div>
          </div>
          <div className="bg-ink-900 px-3 py-2.5">
            <div className="label-xs">System</div>
            <div className="mt-0.5 truncate text-[12px] text-ink-200">
              {b.platform} · {b.arch}
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- privacy */}
      <div className="surface-flat rounded-2xl p-4">
        <h4 className="label-xs mb-1.5">Privacy</h4>
        <p className="text-[12px] leading-relaxed text-ink-400">
          Widgeto runs entirely on your machine. There's no account, no sign-in and nothing about
          you is collected or sent anywhere. Weather and market prices come from public data
          providers — Open-Meteo and CoinGecko — purely to show you current conditions and prices;
          everything else (your notes, tasks and settings) never leaves this device.
        </p>
      </div>

      {/* -------------------------------------------------------- support */}
      <div className="surface-flat rounded-2xl p-4">
        <h4 className="label-xs mb-2.5">Support</h4>
        <div className="flex flex-wrap gap-1.5">
          <button className="btn" onClick={copy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy diagnostic info"}
          </button>
          <button className="btn" onClick={openData}>
            <FolderOpen size={13} /> Open app data folder
          </button>
          <button className="btn" onClick={() => window.location.reload()}>
            <RefreshCw size={13} /> Restart Widgeto
          </button>
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-ink-600">
          If something isn't working right, copy the diagnostic info above and include it when you
          report the issue.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-white/6 bg-black/30 p-3 font-mono text-[10.5px] leading-relaxed text-ink-400">
          {diagnostics}
        </pre>
      </div>

      <div className="space-y-1 pt-1 pb-2 text-center">
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-600">
          Made with <Heart size={11} style={{ color: "var(--accent)" }} /> for a tidier desktop
        </p>
        <p className="text-[10.5px] text-ink-700">© {YEAR} Widgeto. All rights reserved.</p>
      </div>
    </div>
  );
}
