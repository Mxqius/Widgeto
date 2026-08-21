import { useEffect, useState } from "react";
import { Check, Copy, FolderOpen, Heart, RefreshCw } from "lucide-react";
import { useApp } from "@/store/useApp";
import { WIDGETS } from "@/widgets/registry";
import { isTauri } from "@/lib/utils";

interface Build {
  name: string;
  version: string;
  identifier: string;
  tauri: string;
  platform: string;
  arch: string;
  webview: string;
}

const UNKNOWN = "—";

/**
 * Everything here is read at runtime rather than typed into the file, so a
 * version bump never leaves a stale string behind in the UI.
 */
function useBuild(): Build {
  const [b, setB] = useState<Build>({
    name: "Widgeto",
    version: UNKNOWN,
    identifier: UNKNOWN,
    tauri: UNKNOWN,
    platform: UNKNOWN,
    arch: UNKNOWN,
    webview: navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? UNKNOWN,
  });

  useEffect(() => {
    if (!isTauri()) return;
    let alive = true;
    (async () => {
      try {
        const app = await import("@tauri-apps/api/app");
        const { invoke } = await import("@tauri-apps/api/core");
        const [name, version, identifier, tauri, host] = await Promise.all([
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
            tauri,
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

const STACK: [string, string][] = [
  ["Tauri", "2"],
  ["React", "19"],
  ["Rust", "core + data"],
  ["Base UI", "primitives"],
  ["Tailwind", "v4"],
  ["Motion", "13"],
  ["TanStack Query", "v5"],
  ["Zustand", "state"],
];

/** Free, keyless services the widgets read from. Worth naming. */
const SOURCES: [string, string][] = [
  ["Open-Meteo", "weather and geocoding"],
  ["CoinGecko", "market prices"],
  ["sysinfo", "cpu, memory, disk, network"],
  ["starship-battery", "battery health"],
];

export default function About() {
  const b = useBuild();
  const widgets = useApp((s) => s.widgets);
  const live = widgets.filter((w) => w.open).length;
  const [copied, setCopied] = useState(false);

  const diagnostics = [
    `${b.name} ${b.version}`,
    `id        ${b.identifier}`,
    `tauri     ${b.tauri}`,
    `webview   Chromium ${b.webview}`,
    `platform  ${b.platform} ${b.arch}`,
    `widgets   ${live} of ${WIDGETS.length} on the desktop`,
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
              <h3 className="text-[19px] font-semibold tracking-tight text-white">{b.name}</h3>
              <span className="chip font-mono">{b.version}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">
              Desktop widgets that live on your desktop, not inside an app window. Each one is its
              own always-on-desktop window; this app places them and keeps them fed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-white/6 bg-white/[0.04] sm:grid-cols-4">
          {[
            ["Widgets", `${live}/${WIDGETS.length}`],
            ["Platform", `${b.platform} ${b.arch}`],
            ["Tauri", b.tauri],
            ["WebView", b.webview.split(".")[0]],
          ].map(([k, v]) => (
            <div key={k} className="bg-ink-900 px-3 py-2.5">
              <div className="label-xs">{k}</div>
              <div className="mt-0.5 truncate font-mono text-[12px] text-ink-200">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------- stack */}
      <div className="surface-flat rounded-2xl p-4">
        <h4 className="label-xs mb-2.5">Built with</h4>
        <div className="flex flex-wrap gap-1.5">
          {STACK.map(([name, note]) => (
            <span
              key={name}
              className="flex items-center gap-1.5 rounded-lg border border-white/6 bg-white/[0.03] px-2 py-1"
            >
              <span className="text-[11.5px] font-semibold text-ink-200">{name}</span>
              <span className="text-[10.5px] text-ink-600">{note}</span>
            </span>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------- sources */}
      <div className="surface-flat rounded-2xl p-4">
        <h4 className="label-xs mb-1">Data sources</h4>
        <p className="mb-2.5 text-[11px] text-ink-600">
          All keyless and read-only. Nothing about you is sent anywhere, and there is no account.
        </p>
        <div className="divide-y divide-white/5">
          {SOURCES.map(([name, what]) => (
            <div key={name} className="flex items-baseline justify-between py-1.5">
              <span className="text-[12px] font-medium text-ink-200">{name}</span>
              <span className="text-[11px] text-ink-500">{what}</span>
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------- actions */}
      <div className="surface-flat rounded-2xl p-4">
        <h4 className="label-xs mb-2.5">Troubleshooting</h4>
        <div className="flex flex-wrap gap-1.5">
          <button className="btn" onClick={copy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy diagnostics"}
          </button>
          <button className="btn" onClick={openData}>
            <FolderOpen size={13} /> Open data folder
          </button>
          <button className="btn" onClick={() => window.location.reload()}>
            <RefreshCw size={13} /> Reload manager
          </button>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-white/6 bg-black/30 p-3 font-mono text-[10.5px] leading-relaxed text-ink-400">
          {diagnostics}
        </pre>
      </div>

      <p className="flex items-center justify-center gap-1.5 pt-1 pb-2 text-[11px] text-ink-600">
        Made with <Heart size={11} style={{ color: "var(--accent)" }} /> for a tidier desktop
      </p>
    </div>
  );
}
