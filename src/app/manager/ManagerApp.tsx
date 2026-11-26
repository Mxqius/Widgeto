import { Suspense, lazy } from "react";
import ManagerRuntime from "./ManagerRuntime";
import { useManagerVisible } from "./useManagerVisible";

/**
 * The UI is behind a dynamic import as well as a mount guard. Someone who has
 * Widgeto start in the tray never parses Base UI, the animation library or the
 * board at all — the runtime below is the whole app until they open the window.
 */
const ManagerUI = lazy(() => import("./ManagerUI"));

export default function ManagerApp() {
  const visible = useManagerVisible();

  return (
    <>
      <ManagerRuntime />
      {visible && (
        <Suspense fallback={null}>
          <ManagerUI />
        </Suspense>
      )}
    </>
  );
}
