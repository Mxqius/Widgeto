/** Hairline progress line, as under the album art. */
export function Line({ value, accent }: { value: number; accent?: string }) {
  const pct = Math.min(100, value);
  return (
    <div className="relative h-[2px] w-full rounded-full">
      <div className="absolute inset-0 rounded-full opacity-25" style={{ background: "currentColor" }} />
      <div
        className="absolute top-0 left-0 h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: accent ?? "currentColor" }}
      />
      <span
        className="absolute top-1/2 size-[7px] -translate-y-1/2 rounded-full transition-[left] duration-500"
        style={{ left: `calc(${pct}% - 3.5px)`, background: accent ?? "currentColor" }}
      />
    </div>
  );
}
