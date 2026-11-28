import { memo, useState } from "react";
import { Check, Layers, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useApp } from "@/app/manager/store";
import { cn } from "@/app/manager/ui/cn";
import { useT } from "@/app/manager/i18n";

/**
 * Profiles across the top of the manager. Clicking one reshapes the desktop;
 * the built-ins lay themselves out for the current screen, saved ones restore
 * exact positions.
 *
 * Takes no props, so memoising it pins the whole row: it re-renders when the
 * profile list or the active one changes and at no other time, rather than on
 * every board render.
 */
/** The built-ins are named in the UI's language; saved ones keep what the user typed. */
const BUILTIN_NAME = { work: "Work", focus: "Focus", gaming: "Gaming" } as const;

function ProfileBar() {
  const t = useT();
  const nameOf = (p: { id: string; name: string; builtin?: boolean }) =>
    p.builtin && p.id in BUILTIN_NAME ? t(BUILTIN_NAME[p.id as keyof typeof BUILTIN_NAME]) : p.name;
  const profiles = useApp((s) => s.profiles);
  const active = useApp((s) => s.activeProfile);
  const applyProfile = useApp((s) => s.applyProfile);
  const saveProfile = useApp((s) => s.saveProfile);
  const updateProfile = useApp((s) => s.updateProfile);
  const renameProfile = useApp((s) => s.renameProfile);
  const deleteProfile = useApp((s) => s.deleteProfile);

  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const commitNew = () => {
    if (draft.trim()) saveProfile(draft);
    setDraft("");
    setNaming(false);
  };

  const commitRename = () => {
    if (editing) renameProfile(editing, editDraft);
    setEditing(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-600">
        <Layers size={12} /> {t("Profiles")}
      </span>

      {profiles.map((p) => {
        const on = active === p.id;
        if (editing === p.id) {
          return (
            <input
              key={p.id}
              autoFocus
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditing(null);
              }}
              className="field h-7 w-28 text-[12px]"
            />
          );
        }
        return (
          <div
            key={p.id}
            className={cn(
              "group flex items-center rounded-lg border transition-colors",
              on
                ? "border-transparent bg-(--accent-soft)"
                : "border-white/6 bg-white/3 hover:bg-white/6",
            )}
          >
            <button
              onClick={() => applyProfile(p.id)}
              title={
                p.builtin
                  ? t("{name} — lays its widgets out for this screen", { name: nameOf(p) })
                  : t("{name} — restores saved positions", { name: nameOf(p) })
              }
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-s-lg pe-1.5 ps-2.5 text-[12px] font-medium",
                on ? "text-white" : "text-ink-300",
              )}
            >
              {on && <Check size={11} />}
              <span dir="auto">{nameOf(p)}</span>
            </button>

            {/* saved profiles can be re-captured, renamed and removed */}
            {!p.builtin && (
              <span className="flex items-center pe-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  title={t("Save the current layout into this profile")}
                  onClick={() => updateProfile(p.id)}
                  className="grid size-5 place-items-center rounded text-ink-500 hover:text-white"
                >
                  <Save size={11} />
                </button>
                <button
                  title={t("Rename")}
                  onClick={() => {
                    setEditing(p.id);
                    setEditDraft(p.name);
                  }}
                  className="grid size-5 place-items-center rounded text-ink-500 hover:text-white"
                >
                  <Pencil size={11} />
                </button>
                <button
                  title={t("Delete")}
                  onClick={() => deleteProfile(p.id)}
                  className="grid size-5 place-items-center rounded text-ink-500 hover:text-red-300"
                >
                  <Trash2 size={11} />
                </button>
              </span>
            )}
          </div>
        );
      })}

      {naming ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitNew();
              if (e.key === "Escape") {
                setDraft("");
                setNaming(false);
              }
            }}
            placeholder={t("Profile name")}
            className="field h-7 w-32 text-[12px]"
          />
          <button className="btn size-7 px-0" onClick={commitNew} title={t("Save")}>
            <Check size={13} />
          </button>
          <button
            className="btn size-7 px-0"
            onClick={() => {
              setDraft("");
              setNaming(false);
            }}
            title={t("Cancel")}
          >
            <X size={13} />
          </button>
        </span>
      ) : (
        <button
          className="btn h-7 px-2 text-[12px]"
          onClick={() => setNaming(true)}
          title={t("Save the current desktop as a new profile")}
        >
          <Plus size={12} /> {t("Save current")}
        </button>
      )}
    </div>
  );
}

export default memo(ProfileBar);
