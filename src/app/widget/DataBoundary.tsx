import { Suspense, lazy, type ReactNode } from "react";
import type { WidgetKind } from "@/shared/types/widget";
import { NEEDS_QUERY } from "./bodies";

const QueryScope = lazy(() => import("./data/QueryScope"));

/**
 * Provides a query client, but only to the widgets that ask anything of it.
 * Seven of the thirteen kinds never fetch; wrapping those in a provider meant
 * every window paid for the library and a live client with no observers.
 */
export function DataBoundary({ kind, children }: { kind: WidgetKind; children: ReactNode }) {
  if (!NEEDS_QUERY.has(kind)) return <>{children}</>;
  return (
    <Suspense fallback={null}>
      <QueryScope>{children}</QueryScope>
    </Suspense>
  );
}
