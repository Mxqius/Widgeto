/** Vertical tick-mark meter, as on the battery card. */
export function TickMeter({
  value,
  accent,
  height = 56,
  ticks = 26,
  labels,
}: {
  value: number;
  accent: string;
  height?: number;
  ticks?: number;
  labels?: [string, string, string];
}) {
  const filled = Math.round((Math.min(100, Math.max(0, value)) / 100) * ticks);
  return (
    <div className="w-full">
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {Array.from({ length: ticks }).map((_, i) => {
          const on = i < filled;
          const isEdge = i === filled - 1;
          return (
            <div
              key={i}
              className="flex-1 rounded-[1px] transition-[height,background] duration-300"
              style={{
                height: isEdge ? "100%" : on ? "58%" : "34%",
                background: on && isEdge ? accent : "currentColor",
                opacity: on ? (isEdge ? 1 : 0.55) : 0.14,
              }}
            />
          );
        })}
      </div>
      {labels && (
        <div className="dimmer mt-2 flex justify-between text-[10px] font-medium tabular-nums">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
          <span>{labels[2]}</span>
        </div>
      )}
    </div>
  );
}
