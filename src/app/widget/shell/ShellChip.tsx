import type { ReactNode } from "react";

/** One of the small hover controls in the tile's corner. */
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
      title={title}
      onClick={onClick}
      className="flex size-5.5 items-center justify-center rounded-full opacity-70
                 transition-opacity hover:opacity-100"
    >
      {children}
    </button>
  );
}
