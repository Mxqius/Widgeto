import { useEffect, useRef, useState } from "react";
import { Pad } from "../ui";
import { useWidgetConfig } from "../prefs";
import { useLocal } from "../lib/hooks";
import { usePageVisible } from "../lib/visibility";
import { bySize, isSm } from "../lib/scale";
import type { WidgetBodyProps } from "./props";

type Mood = "idle" | "curious" | "happy" | "excited" | "sleepy" | "asleep";
export type Species = "cat" | "bun" | "blob" | "fox";

const SLEEPY_AFTER = 45_000;
const ASLEEP_AFTER = 75_000;

interface Puff {
  id: number;
  x: number;
  drift: number;
  glyph: string;
}

const STATUS: Record<Mood, string> = {
  asleep: "zzz…",
  sleepy: "sleepy",
  excited: "so happy!!",
  happy: "happy!",
  curious: "hi there",
  idle: "hanging out",
};

/**
 * A small resident creature. It breathes and blinks on its own, tracks the
 * cursor when you hover, bounces and throws hearts when petted, gets excited
 * on a quick flurry of pets, and dozes off if left alone — waking the moment
 * you touch it. Four species, all drawn from the same rig.
 *
 * The motion is CSS keyframes, so the browser composites it; the two timers
 * below only drive state changes, and both stop while the tile is covered —
 * nobody is watching a hidden pet blink.
 */
export default function PetWidget({ size }: WidgetBodyProps) {
  const cfg = useWidgetConfig("pet");
  const species = cfg.species as Species;
  const visible = usePageVisible();

  const [mood, setMood] = useState<Mood>("idle");
  const [blink, setBlink] = useState(false);
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const [bounce, setBounce] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [pets, setPets] = useLocal("widgeto.pet.pets", 0);

  const lastTouch = useRef(Date.now());
  const recent = useRef<number[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);
  const puffId = useRef(0);
  /** every timer this widget has in flight, so unmount can cancel all of them */
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const hue = cfg.hue;
  const body = `hsl(${hue} 82% 72%)`;
  const deep = `hsl(${hue} 74% 60%)`;
  const blush = `hsl(${hue} 90% 66%)`;

  useEffect(() => {
    const live = timers.current;
    return () => {
      live.forEach(clearTimeout);
      live.clear();
    };
  }, []);

  /** setTimeout that cannot outlive the widget. */
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
    return t;
  };

  /* ---------------------------------------------------------- blinking -- */
  useEffect(() => {
    if (!visible) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      // irregular blinks read as alive; a metronome does not
      t = setTimeout(
        () => {
          setBlink(true);
          later(() => setBlink(false), 130);
          loop();
        },
        2200 + Math.random() * 3600,
      );
    };
    loop();
    return () => clearTimeout(t);
  }, [visible]);

  /* ------------------------------------------------- idle glances + doze */
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => {
      const quiet = Date.now() - lastTouch.current;
      setMood((m) => {
        if (m === "happy" || m === "excited" || m === "curious") return m;
        if (quiet > ASLEEP_AFTER) return "asleep";
        if (quiet > SLEEPY_AFTER) return "sleepy";
        return "idle";
      });
      setLook((l) =>
        Date.now() - lastTouch.current > 4000 && Math.random() > 0.55
          ? { x: (Math.random() - 0.5) * 3.4, y: (Math.random() - 0.5) * 1.8 }
          : l,
      );
    }, 2500);
    return () => clearInterval(t);
  }, [visible]);

  const onMove = (e: React.PointerEvent) => {
    const el = hostRef.current;
    if (!el) return;
    lastTouch.current = Date.now();
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    setLook({ x: Math.max(-1, Math.min(1, dx)) * 4, y: Math.max(-1, Math.min(1, dy)) * 2.6 });
    setMood((m) => (m === "happy" || m === "excited" ? m : "curious"));
  };

  const pet = () => {
    lastTouch.current = Date.now();
    setPets((n) => n + 1);
    setBounce((b) => b + 1);

    // three pets inside four seconds and it gets properly excited
    const now = Date.now();
    recent.current = [...recent.current, now].filter((t) => now - t < 4000);
    const excited = recent.current.length >= 3;
    setMood(excited ? "excited" : "happy");

    const glyphs = excited ? ["♥", "✦", "★"] : ["♥"];
    const burst = Array.from({ length: excited ? 5 : 3 }, () => ({
      id: puffId.current++,
      x: 26 + Math.random() * 48,
      drift: (Math.random() - 0.5) * 30,
      glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
    }));
    setPuffs((h) => [...h, ...burst]);
    later(() => setPuffs((h) => h.filter((x) => !burst.some((b) => b.id === x.id))), 1100);
    later(() => setMood((m) => (m === "happy" || m === "excited" ? "idle" : m)), 1600);
  };

  const asleep = mood === "asleep";
  const sleepy = mood === "sleepy" || asleep;
  const eyesShut = blink || asleep;
  const glad = mood === "happy" || mood === "excited";
  const small = isSm(size);

  return (
    <Pad size={size} className="items-center justify-between">
      <div
        ref={hostRef}
        data-nodrag
        onPointerMove={onMove}
        onPointerLeave={() => {
          setLook({ x: 0, y: 0 });
          setMood((m) => (glad ? m : "idle"));
        }}
        onClick={pet}
        className="relative flex w-full flex-1 cursor-pointer items-center justify-center"
        title={`Pet ${cfg.name}`}
      >
        {puffs.map((p) => (
          <span
            key={p.id}
            className="pointer-events-none absolute text-[13px]"
            style={{
              left: `${p.x}%`,
              bottom: "52%",
              // @ts-expect-error custom property consumed by the keyframes
              "--drift": `${p.drift}px`,
              animation: "pet-heart 1.1s ease-out forwards",
            }}
          >
            {p.glyph}
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
            maxHeight: bySize(size, 84, 118, 150),
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
            <Tail species={species} deep={deep} still={asleep} />
            <Ears species={species} body={body} blush={blush} perked={mood === "curious" || glad} />
            <Body species={species} body={body} deep={deep} />

            {/* eyes */}
            {eyesShut ? (
              <>
                <path d={`M${37 + look.x} 58 q5 4 10 0`} stroke="#1b1b1f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                <path d={`M${53 + look.x} 58 q5 4 10 0`} stroke="#1b1b1f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
              </>
            ) : glad ? (
              <>
                <path d={`M${37 + look.x} 59 q5 -5 10 0`} stroke="#1b1b1f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                <path d={`M${53 + look.x} 59 q5 -5 10 0`} stroke="#1b1b1f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx={42 + look.x} cy={57 + look.y} rx="4.4" ry="5.2" fill="#1b1b1f" />
                <ellipse cx={58 + look.x} cy={57 + look.y} rx="4.4" ry="5.2" fill="#1b1b1f" />
                <circle cx={43.6 + look.x} cy={55 + look.y} r="1.6" fill="#fff" />
                <circle cx={59.6 + look.x} cy={55 + look.y} r="1.6" fill="#fff" />
              </>
            )}

            <ellipse cx="33" cy="66" rx="4.6" ry="3" fill={blush} opacity={glad ? 0.85 : 0.5} />
            <ellipse cx="67" cy="66" rx="4.6" ry="3" fill={blush} opacity={glad ? 0.85 : 0.5} />

            {glad ? (
              <path d="M45 65 q5 7 10 0" stroke="#1b1b1f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            ) : sleepy ? (
              <path d="M46 67 h8" stroke="#1b1b1f" strokeWidth="2.2" strokeLinecap="round" />
            ) : (
              <path d="M46 65 q4 3 8 0" stroke="#1b1b1f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            )}

            <ellipse cx="38" cy="88" rx="8" ry="5" fill={deep} />
            <ellipse cx="62" cy="88" rx="8" ry="5" fill={deep} />
          </g>
        </svg>
      </div>

      <div className="flex w-full items-baseline justify-between">
        <span className="truncate text-[12px] font-bold tracking-tight">{cfg.name}</span>
        <span className="dim shrink-0 text-[10px] font-semibold">{STATUS[mood]}</span>
      </div>
      {!small && (
        <div className="dimmer w-full text-[9.5px] font-semibold tabular-nums">
          {pets} {pets === 1 ? "pet" : "pets"}
        </div>
      )}
    </Pad>
  );
}

/* ------------------------------------------------------------- the species */

function Body({ species, body, deep }: { species: Species; body: string; deep: string }) {
  if (species === "blob") {
    return (
      <>
        <path
          d="M50 34 C74 34 82 52 82 64 C82 80 68 90 50 90 C32 90 18 80 18 64 C18 52 26 34 50 34 Z"
          fill={body}
        />
        <ellipse cx="50" cy="72" rx="20" ry="15" fill="#fff" opacity={0.2} />
      </>
    );
  }
  if (species === "bun") {
    return (
      <>
        <ellipse cx="50" cy="64" rx="28" ry="27" fill={body} />
        <ellipse cx="50" cy="72" rx="19" ry="15" fill="#fff" opacity={0.24} />
        <circle cx="82" cy="76" r="6" fill={deep} />
      </>
    );
  }
  if (species === "fox") {
    return (
      <>
        <path d="M50 36 L78 58 L68 86 H32 L22 58 Z" fill={body} />
        <path d="M50 60 L66 84 H34 Z" fill="#fff" opacity={0.26} />
      </>
    );
  }
  return (
    <>
      <ellipse cx="50" cy="62" rx="30" ry="28" fill={body} />
      <ellipse cx="50" cy="70" rx="21" ry="18" fill="#fff" opacity={0.22} />
    </>
  );
}

function Ears({
  species,
  body,
  blush,
  perked,
}: {
  species: Species;
  body: string;
  blush: string;
  perked: boolean;
}) {
  const lift = perked ? -4 : 0;
  if (species === "blob") return null;

  const style = { transform: `translateY(${lift}px)`, transition: "transform 220ms ease-out" };

  if (species === "bun") {
    return (
      <g style={style}>
        <ellipse cx="38" cy="26" rx="6" ry="17" fill={body} />
        <ellipse cx="62" cy="26" rx="6" ry="17" fill={body} />
        <ellipse cx="38" cy="27" rx="2.8" ry="11" fill={blush} opacity={0.6} />
        <ellipse cx="62" cy="27" rx="2.8" ry="11" fill={blush} opacity={0.6} />
      </g>
    );
  }
  if (species === "fox") {
    return (
      <g style={style}>
        <path d="M28 46 L20 18 L44 34 Z" fill={body} />
        <path d="M72 46 L80 18 L56 34 Z" fill={body} />
        <path d="M30 43 L25 26 L38 34 Z" fill={blush} opacity={0.7} />
        <path d="M70 43 L75 26 L62 34 Z" fill={blush} opacity={0.7} />
      </g>
    );
  }
  return (
    <g style={style}>
      <path d="M30 40 L26 22 L44 32 Z" fill={body} />
      <path d="M70 40 L74 22 L56 32 Z" fill={body} />
      <path d="M32 37 L30 27 L40 33 Z" fill={blush} opacity={0.65} />
      <path d="M68 37 L70 27 L60 33 Z" fill={blush} opacity={0.65} />
    </g>
  );
}

function Tail({ species, deep, still }: { species: Species; deep: string; still: boolean }) {
  if (species === "bun" || species === "blob") return null;
  const wide = species === "fox";
  return (
    <path
      d={wide ? "M74 76 q22 -2 16 -22" : "M76 74 q16 -4 14 -18"}
      fill="none"
      stroke={deep}
      strokeWidth={wide ? 11 : 7}
      strokeLinecap="round"
      style={{
        transformOrigin: "76px 74px",
        animation: still ? "none" : "pet-tail 2.2s ease-in-out infinite",
      }}
    />
  );
}
