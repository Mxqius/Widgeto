import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useApp } from "@/app/manager/store";
import { configOf, type QuickLink } from "@/shared/widgets/config";
import { normaliseLaunchTarget } from "@/shared/lib/launchTarget";
import type { WidgetKind } from "@/shared/types/widget";
import { useT } from "@/app/manager/i18n";

/** Editable list of sites/apps for Quick Launch. */
export function LauncherPanel({ kind }: { kind: WidgetKind }) {
  const t = useT();
  const stored = useApp((s) => s.widgets.find((w) => w.kind === kind)?.config);
  const setConfig = useApp((s) => s.setConfig);
  const c = configOf("launcher", stored);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const save = (links: QuickLink[]) => setConfig(kind, { links });

  const add = () => {
    const target = normaliseLaunchTarget(url, name);
    if (!target) return;
    save([...c.links, target]);
    setName("");
    setUrl("");
  };

  return (
    <div className="py-1.5">
      <div className="mb-1.5 text-[12px] font-medium text-ink-100">
        {t("Shortcuts")}
        <span className="ms-1.5 text-[10.5px] text-ink-500">
          {t("a site, an .exe, a folder, or any app:// link")}
        </span>
      </div>

      <div className="mb-2 space-y-1">
        {c.links.map((l, i) => (
          <div
            key={`${l.url}-${i}`}
            className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/2 px-2 py-1.5"
          >
            <span dir="auto" className="w-24 shrink-0 truncate text-start text-[11.5px] font-medium text-ink-100">
              {l.name}
            </span>
            <span dir="ltr" className="min-w-0 flex-1 truncate text-start text-[10.5px] text-ink-500">{l.url}</span>
            <button
              title={t("Remove")}
              onClick={() => save(c.links.filter((_, n) => n !== i))}
              className="shrink-0 text-ink-600 transition-colors hover:text-red-300"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {c.links.length === 0 && (
          <div className="px-1 py-2 text-[11px] text-ink-500">{t("Nothing pinned yet.")}</div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          className="field h-7 w-24 text-[12px]"
          placeholder={t("Name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          dir="ltr"
          className="field h-7 flex-1 text-[12px]"
          placeholder={t("figma.com or C:\\App\\app.exe")}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn h-7 px-2" onClick={add} title={t("Add shortcut")}>
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
