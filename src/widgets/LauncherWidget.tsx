import { Globe } from "lucide-react";
import { Pad } from "./parts";
import { useWidgetConfig } from "./prefs";
import { openExternal } from "@/lib/tauri";
import type { WidgetBodyProps } from "./loader";

/** Favicons come straight from the site, so any URL the user adds gets a mark. */
function faviconFor(url: string) {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${host}`;
  } catch {
    return null;
  }
}

export default function LauncherWidget({ size }: WidgetBodyProps) {
  const { links } = useWidgetConfig("launcher");
  const count = size === "sm" ? 4 : size === "md" ? 6 : 9;
  const shown = links.slice(0, count);

  return (
    <Pad size={size} className="justify-between">
      <div className="text-[12.5px] font-bold tracking-tight">Launch</div>

      {shown.length === 0 ? (
        <div className="dim flex flex-1 items-center text-[11px] font-medium">
          Add sites or apps in this widget's settings.
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-3 content-center gap-2">
          {shown.map((l) => {
            const icon = faviconFor(l.url);
            return (
              <button
                key={l.url + l.name}
                data-nodrag
                title={`${l.name} — ${l.url}`}
                onClick={() => openExternal(l.url)}
                className="grid aspect-square place-items-center rounded-2xl bg-white/8
                           transition-colors hover:bg-white/16"
              >
                {icon ? (
                  <img
                    src={icon}
                    alt=""
                    width={size === "sm" ? 16 : 20}
                    height={size === "sm" ? 16 : 20}
                    className="rounded-[4px]"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Globe size={size === "sm" ? 15 : 18} strokeWidth={1.9} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </Pad>
  );
}
