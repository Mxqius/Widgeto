import { useBuild } from "@/app/manager/about/useBuild";

/** Live build info in place of a string that would go stale after an update. */
export function SidebarVersion() {
  const b = useBuild();
  return (
    <div className="rounded-xl border border-white/6 bg-white/2 p-3">
      <div className="text-[12px] font-medium text-ink-200">Widgeto</div>
      <div className="mt-0.5 text-[11px] text-ink-500">
        v{b.version}
      </div>
    </div>
  );
}
