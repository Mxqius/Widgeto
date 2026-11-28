import type { ReactNode } from "react";

/**
 * One of the small hover controls in the tile's corner.
 *
 * It acts on press, not on click. Widget windows open without focus and sit on
 * the desktop layer, and on Windows the first press on such a window also
 * activates it, which can swallow the release, and with it the click. The
 * press itself always arrives (it is what dragging runs on), so that is what
 * this listens to. Keyboard activation still goes through `onClick`.
 */
export function ShellChip({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onClick={(e) => {
        // detail is 0 for Enter / Space; a mouse click was handled on press
        if (e.detail === 0) onClick();
      }}
      className="flex size-5.5 items-center justify-center rounded-full opacity-70
                 transition-opacity hover:opacity-100"
    >
      {children}
    </button>
  );
}
