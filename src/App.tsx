import { Suspense, lazy, useMemo } from "react";
import type { WidgetKind } from "@/lib/types";
import { WIDGET_KINDS } from "@/widgets/registry";

/**
 * Two completely separate entry points sharing one bundle entry:
 *
 *   index.html?w=<kind>  -> that widget alone, in its desktop window
 *   index.html           -> the manager
 *
 * They are lazily imported so a widget window never downloads or parses the
 * manager, settings, widget library or Base UI — across twelve windows that is
 * the difference between twelve full app copies and twelve small ones.
 */
const ManagerApp = lazy(() => import("./ManagerApp"));
const CaptureWindow = lazy(() => import("./screens/CaptureWindow"));
const WidgetWindow = lazy(() => import("./screens/WidgetWindow"));

export default function App() {
  const capture = useMemo(
    () => new URLSearchParams(window.location.search).has("capture"),
    [],
  );
  const kind = useMemo(() => {
    const w = new URLSearchParams(window.location.search).get("w");
    return w && (WIDGET_KINDS as string[]).includes(w) ? (w as WidgetKind) : null;
  }, []);

  return (
    <Suspense fallback={null}>
      {capture ? <CaptureWindow /> : kind ? <WidgetWindow kind={kind} /> : <ManagerApp />}
    </Suspense>
  );
}
