import type { WidgetKind } from "@/shared/types/widget";
import { EVT, type ConfigSetPayload } from "@/shared/desktop/protocol";
import { isTauri } from "@/shared/lib/env";

/**
 * Persist a change to this widget's own settings. The manager owns the store,
 * so the change goes there and comes back as a fresh config push.
 */
export async function saveConfig(kind: WidgetKind, patch: Record<string, unknown>) {
  if (!isTauri()) return;
  const { emit } = await import("@tauri-apps/api/event");
  await emit(EVT.config_set, { kind, patch } satisfies ConfigSetPayload);
}
