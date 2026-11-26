import { useMemo } from "react";
import { Globe } from "lucide-react";
import { Pad } from "../ui";
import { useWidgetConfig } from "../prefs";
import { launch } from "@/shared/ipc/commands";
import { bySize, isSm } from "../lib/scale";
import type { WidgetBodyProps } from "./props";

const WEB = /^https?:\/\//i;
const BARE_HOST = /^[\w.-]+\.[a-z]{2,}/i;

/** Favicons come straight from the site, so any URL the user adds gets a mark. */
function faviconFor(url: string) {
  // only web links have a favicon; exes and files fall back to a glyph
  if (!WEB.test(url) && !BARE_HOST.test(url)) return null;
  try {
    const host = new URL(WEB.test(url) ? url : `https://${url}`).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${host}`;
  } catch {
    return null;
  }
}

export default function LauncherWidget({ size }: WidgetBodyProps) {
  const { links } = useWidgetConfig("launcher");
  const count = bySize(size, 4, 6, 9);
  const cols = isSm(size) ? 2 : 3;

  const shown = useMemo(
    () => links.slice(0, count).map((l) => ({ ...l, icon: faviconFor(l.url) })),
    [links, count],
  );

  const glyph = bySize(size, 15, 18);
  const px = bySize(size, 16, 20);

  return (
    <Pad size={size} className="justify-between">
      <div className="text-[12.5px] font-bold tracking-tight">Launch</div>

      {shown.length === 0 ? (
        <div className="dim flex flex-1 items-center text-[11px] font-medium">
          Add sites or apps in this widget&rsquo;s settings.
        </div>
      ) : (
        <div
          className="grid flex-1 content-center gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {shown.map((l) => (
            <button
              key={l.url + l.name}
              data-nodrag
              title={`${l.name} — ${l.url}`}
              onClick={() => void launch(l.url).catch(() => {})}
              className="grid min-h-0 place-items-center rounded-2xl bg-white/8
                         transition-colors hover:bg-white/16"
              style={{ aspectRatio: isSm(size) ? "1.5 / 1" : "1 / 1" }}
            >
              {l.icon ? (
                <img
                  src={l.icon}
                  alt=""
                  width={px}
                  height={px}
                  className="rounded-[4px]"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <Globe size={glyph} strokeWidth={1.9} />
              )}
            </button>
          ))}
        </div>
      )}
    </Pad>
  );
}
