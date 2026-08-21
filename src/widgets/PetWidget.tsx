import { useEffect, useMemo, useRef, useState } from "react";
import { Pad } from "./parts";
import { useWidgetConfig } from "./prefs";
import type { WidgetBodyProps } from "./loader";

type Mood = "idle" | "curious" | "happy" | "sleepy" | "asleep";

/** ms of no interaction before the pet dozes off, then falls asleep. */
const SLEEPY_AFTER = 45_000;
const ASLEEP_AFTER = 75_000;

interface Heart {
  id: number;
  x: number;
  drift: number;
}

/**
 * A small resident creature. It breathes and blinks on its own, tracks the
 * cursor when you hover, bounces and throws hearts when petted, and dozes off
 * if left alone — waking again the moment you touch it.
 */
export default function PetWidget({ size }: WidgetBodyProps) {
  const cfg = useWidgetConfig("pet");
  const [mood, setMood] = useState<Mood>("idle");
  const [blink, setBlink] = useState(false);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [bounce, setBounce] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [pets, setPets] = useState(0);

  const lastTouch = useRef(Date.now());
  const hostRef = useRef<HTMLDivElement>(null);
  const heartId = useRef(0);

  const hue = cfg.hue;
  const body = `hsl(${hue} 82% 72%)`;
  const bodyDeep = `hsl(${hue} 74% 60%)`;
  const blush = `hsl(${hue} 90% 66%)`;

  /* ---------------------------------------------------------- blinking -- */
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      // irregular blinks read as alive; a metronome does not
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        loop();
      }, 2200 + Math.random() * 3600);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  /* ------------------------------------------------- idle glances + doze */
  useEffect(() => {
    const t = setInterval(() => {
      const quiet = Date.now() - lastTouch.current;
      setMood((m) => {
        if (m === "happy" || m === "curious") return m;
        if (quiet > ASLEEP_AFTER) return "asleep";
        if (quiet > SLEEPY_AFTER) return "sleepy";
        return "idle";
      });
      // a small look-around while awake and unbothered
      setLook((l) =>
        Date.now() - lastTouch.current > 4000 && Math.random() > 0.55
          ? { x: (Math.random() - 0.5) * 3.4, y: (Math.random() - 0.5) * 1.8 }
          : l,
      );
    }, 2500);
    return () => clearInterval(t);
  }, []);

  const wake = () => {
    lastTouch.current = Date.now();
  };

  /* ------------------------------------------------------------- events */
  const onMove = (e: React.PointerEvent) => {
    const el = hostRef.current;
    if (!el) return;
    wake();
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    setLook({ x: Math.max(-1, Math.min(1, dx)) * 4, y: Math.max(-1, Math.min(1, dy)) * 2.6 });
    setMood((m) => (m === "happy" ? m : "curious"));
  };

  const onLeave = () => {
    setLook({ x: 0, y: 0 });
    setMood((m) => (m === "happy" ? m : "idle"));
  };

  const pet = () => {
    wake();
    setPets((n) => n + 1);
    setMood("happy");
    setBounce((b) => b + 1);

    const burst = Array.from({ length: 3 }, () => ({
      id: heartId.current++,
      x: 30 + Math.random() * 40,
      drift: (Math.random() - 0.5) * 26,
    }));
    setHearts((h) => [...h, ...burst]);
    setTimeout(() => {
      setHearts((h) => h.filter((x) => !burst.some((b) => b.id === x.id)));
    }, 1100);
    setTimeout(() => setMood((m) => (m === "happy" ? "idle" : m)), 1500);
  };

  const asleep = mood === "asleep";
  const sleepy = mood === "sleepy" || asleep;
  const eyesShut = blink || asleep;

  const status = useMemo(() => {
    if (asleep) return "zzz…";
    if (mood === "sleepy") return "sleepy";
    if (mood === "happy") return "happy!";
    if (mood === "curious") return "hi there";
    return "hanging out";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, asleep]);

  const small = size === "sm";

  return (
    <Pad size={size} className="items-center justify-between">
      <div
        ref={hostRef}
        data-nodrag
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onClick={pet}
        className="relative flex flex-1 cursor-pointer items-center justify-center"
        style={{ width: "100%" }}
        title={`Pet ${cfg.name}`}
      >
        {/* floating hearts on a pet */}
        {hearts.map((h) => (
          <span
            key={h.id}
            className="pointer-events-none absolute text-[13px]"
            style={{
              left: `${h.x}%`,
              bottom: "52%",
              // @ts-expect-error custom property consumed by the keyframes
              "--drift": `${h.drift}px`,
              animation: "pet-heart 1.1s ease-out forwards",
            }}
          >
            ♥
          </span>
        ))}

        {asleep && (
          <span
            className="dim pointer-events-none absolute text-[12px] font-bold"
            style={{ left: "68%", bottom: "62%", animation: "pet-zzz 2.6s ease-in-out infinite" }}
          >
            z
          </span>
        )}

        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          style={{
            maxHeight: small ? 96 : 122,
            transformOrigin: "50% 92%",
            animation: asleep
              ? "pet-breathe-slow 4.6s ease-in-out infinite"
              : "pet-breathe 2.9s ease-in-out infinite",
          }}
        >
          <g
            key={bounce}
            style={{
              transformOrigin: "50% 92%",
              animation: bounce ? "pet-bounce 620ms cubic-bezier(0.2,1.4,0.4,1)" : undefined,
            }}
          >
            {/* tail */}
            <path
              d="M76 74 q16 -4 14 -18"
              fill="none"
              stroke={bodyDeep}
              strokeWidth="7"
              strokeLinecap="round"
              style={{
                transformOrigin: "76px 74px",
                animation: asleep ? "none" : "pet-tail 2.2s ease-in-out infinite",
              }}
            />

            {/* ears */}
            <path d="M30 40 L26 22 L44 32 Z" fill={body} />
            <path d="M70 40 L74 22 L56 32 Z" fill={body} />
            <path d="M32 37 L30 27 L40 33 Z" fill={blush} opacity={0.65} />
            <path d="M68 37 L70 27 L60 33 Z" fill={blush} opacity={0.65} />

            {/* body */}
            <ellipse cx="50" cy="62" rx="30" ry="28" fill={body} />
            <ellipse cx="50" cy="70" rx="21" ry="18" fill="#fff" opacity={0.22} />

            {/* eyes */}
            {eyesShut ? (
              <>
                <path
                  d={`M${37 + look.x} 58 q5 4 10 0`}
                  stroke="#1b1b1f"
                  strokeWidth="2.6"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={`M${53 + look.x} 58 q5 4 10 0`}
                  stroke="#1b1b1f"
                  strokeWidth="2.6"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <ellipse cx={42 + look.x} cy={57 + look.y} rx="4.4" ry="5.2" fill="#1b1b1f" />
                <ellipse cx={58 + look.x} cy={57 + look.y} rx="4.4" ry="5.2" fill="#1b1b1f" />
                <circle cx={43.6 + look.x} cy={55 + look.y} r="1.6" fill="#fff" />
                <circle cx={59.6 + look.x} cy={55 + look.y} r="1.6" fill="#fff" />
              </>
            )}

            {/* blush + mouth */}
            <ellipse cx="33" cy="66" rx="4.6" ry="3" fill={blush} opacity={0.5} />
            <ellipse cx="67" cy="66" rx="4.6" ry="3" fill={blush} opacity={0.5} />
            {mood === "happy" ? (
              <path d="M45 66 q5 6 10 0" stroke="#1b1b1f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            ) : sleepy ? (
              <path d="M46 67 h8" stroke="#1b1b1f" strokeWidth="2.2" strokeLinecap="round" />
            ) : (
              <path
                d="M46 65 q4 3 8 0"
                stroke="#1b1b1f"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
              />
            )}

            {/* paws */}
            <ellipse cx="38" cy="88" rx="8" ry="5" fill={bodyDeep} />
            <ellipse cx="62" cy="88" rx="8" ry="5" fill={bodyDeep} />
          </g>
        </svg>
      </div>

      <div className="flex w-full items-baseline justify-between">
        <span className="text-[12.5px] font-bold tracking-tight">{cfg.name}</span>
        <span className="dim text-[10.5px] font-semibold">{status}</span>
      </div>
      {!small && (
        <div className="dimmer w-full text-[9.5px] font-semibold tabular-nums">
          {pets} {pets === 1 ? "pet" : "pets"} today
        </div>
      )}
    </Pad>
  );
}
