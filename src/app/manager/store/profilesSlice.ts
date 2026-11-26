import { BUILTIN_PROFILES, snapshot } from "@/app/manager/desktop/profiles";
import { uid } from "@/shared/lib/math";
import type { ProfilesSlice, Slice } from "./types";

export const createProfilesSlice: Slice<ProfilesSlice> = (set, get) => ({
  profiles: BUILTIN_PROFILES,
  activeProfile: null,

  applyProfile: (id) => {
    const prof = get().profiles.find((p) => p.id === id);
    if (!prof) return;

    if (prof.entries) {
      // a saved profile restores exact geometry
      const entries = prof.entries;
      set({
        activeProfile: id,
        widgets: get().widgets.map((w) => {
          const e = entries[w.kind];
          return e ? { ...w, ...e } : { ...w, open: false };
        }),
      });
      return;
    }

    // a built-in only names its widgets; the arranger places them so the
    // profile fits whatever screen it is applied on
    const wanted = new Set(prof.kinds ?? []);
    set({
      activeProfile: id,
      widgets: get().widgets.map((w) => ({ ...w, open: wanted.has(w.kind), dock: null })),
    });
    get().autoArrangeNow();
  },

  saveProfile: (name) => {
    const id = uid();
    set({
      profiles: [
        ...get().profiles,
        { id, name: name.trim() || "Untitled", entries: snapshot(get().widgets) },
      ],
      activeProfile: id,
    });
    return id;
  },

  updateProfile: (id) =>
    set({
      profiles: get().profiles.map((p) =>
        p.id === id && !p.builtin ? { ...p, entries: snapshot(get().widgets) } : p,
      ),
      activeProfile: id,
    }),

  renameProfile: (id, name) =>
    set({
      profiles: get().profiles.map((p) =>
        p.id === id ? { ...p, name: name.trim() || p.name } : p,
      ),
    }),

  deleteProfile: (id) =>
    set({
      profiles: get().profiles.filter((p) => p.id !== id || p.builtin),
      activeProfile: get().activeProfile === id ? null : get().activeProfile,
    }),
});
