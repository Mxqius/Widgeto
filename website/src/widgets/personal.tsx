import { useEffect, useRef, useState } from "react";
import {
  Check,
  Code2,
  Folder,
  Globe,
  Mail,
  Music2,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  Terminal,
} from "lucide-react";
import clsx from "clsx";
import { Cover, Equalizer, Pad } from "./ui";

/* ------------------------------------------------------------------ tasks -- */

const START = [
  { t: "Reply to emails", done: true },
  { t: "Plan the week ahead", done: false },
  { t: "Book the dentist", done: false },
  { t: "Water the plants", done: false },
];

export function TasksWidget() {
  const [tasks, setTasks] = useState(START);
  const done = tasks.filter((t) => t.done).length;
  return (
    <Pad className="gap-2.5">
      <div>
        <div className="numeral text-[26px] leading-none">
          {done}
          <span className="dim text-[15px]">/{tasks.length}</span>
        </div>
        <div className="dim mt-1 text-[10px] font-semibold uppercase">Tasks done</div>
        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${(done / tasks.length) * 100}%`, background: "var(--accent)" }}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        {tasks.map((task, i) => (
          <button
            key={task.t}
            className="flex w-full items-center gap-2 text-left"
            onClick={() => setTasks((ts) => ts.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
          >
            <span
              className={clsx(
                "grid size-[14px] shrink-0 place-items-center rounded-[4px] border transition-colors",
                task.done ? "border-transparent" : "border-black/25",
              )}
              style={task.done ? { background: "var(--accent)" } : undefined}
            >
              {task.done && <Check size={10} strokeWidth={3.5} className="text-white" />}
            </span>
            <span className={clsx("text-[11.5px] font-medium", task.done && "dimmer line-through")}>{task.t}</span>
          </button>
        ))}
      </div>
    </Pad>
  );
}

/* ------------------------------------------------------------------ notes -- */

export function NotesWidget() {
  return (
    <Pad className="gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold">Notes</span>
        <span className="dimmer text-[10px] font-semibold tabular-nums">13w</span>
      </div>
      <p className="text-[12.5px] font-medium leading-[1.45]">
        Drag a widget near a corner and it docks itself.
        <br />
        <br />
        Double-click to resize.
      </p>
    </Pad>
  );
}

/* ------------------------------------------------------------------ music -- */

export function MusicWidget() {
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(88);
  const total = 241;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT((x) => (x + 1) % total), 1000);
    return () => clearInterval(id);
  }, [playing]);

  return (
    <div className="relative flex h-full flex-col p-[18px]">
      <div
        className="pointer-events-none absolute -top-10 -left-10 size-40 rounded-full opacity-50 blur-3xl"
        style={{ background: "#7b4dff" }}
      />
      <div className="relative flex items-start justify-between">
        <Cover size={64} radius={14} className={playing ? "" : "opacity-70"} />
        <Equalizer playing={playing} color="#a78bff" />
      </div>
      <div className="relative mt-auto">
        <div className="truncate text-[14px] font-semibold">Night Drive</div>
        <div className="dim truncate text-[11px] font-medium">The Midnight</div>
        <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-white transition-[width] duration-1000 ease-linear" style={{ width: `${(t / total) * 100}%` }} />
        </div>
        <div className="mt-2.5 flex items-center justify-center gap-5">
          <SkipBack size={14} className="fill-current opacity-80" />
          <button
            onClick={() => setPlaying((p) => !p)}
            className="grid size-8 place-items-center rounded-full bg-white text-black transition-transform active:scale-90"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={13} className="fill-current" /> : <Play size={13} className="ml-0.5 fill-current" />}
          </button>
          <SkipForward size={14} className="fill-current opacity-80" />
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- launcher -- */

const APPS = [
  { icon: Globe, bg: "#2563eb" },
  { icon: Music2, bg: "#16a34a" },
  { icon: Code2, bg: "#7c3aed" },
  { icon: Folder, bg: "#eab308" },
  { icon: Terminal, bg: "#27272a" },
  { icon: Mail, bg: "#ef4444" },
];

export function LauncherWidget() {
  return (
    <Pad className="gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold">Launch</span>
        <Settings size={12} className="dimmer" />
      </div>
      <div className="grid flex-1 grid-cols-3 gap-2">
        {APPS.map(({ icon: Icon, bg }, i) => (
          <div
            key={i}
            className="grid place-items-center rounded-2xl bg-white/[0.07] transition-transform hover:scale-105 active:scale-95"
          >
            <span className="grid size-8 place-items-center rounded-[10px]" style={{ background: bg }}>
              <Icon size={16} className="text-white" />
            </span>
          </div>
        ))}
      </div>
    </Pad>
  );
}

/* -------------------------------------------------------------------- pet -- */

const MOODS = ["hanging out", "hi there", "happy!", "so happy!!"];

export function PetWidget() {
  const [pets, setPets] = useState(0);
  const [hearts, setHearts] = useState<{ id: number; x: number; drift: number }[]>([]);
  const [bounce, setBounce] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [recent, setRecent] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const id = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!recent) return;
    const t = setTimeout(() => setRecent(0), 2600);
    return () => clearTimeout(t);
  }, [recent]);

  const pet = () => {
    setPets((p) => p + 1);
    setBounce((b) => b + 1);
    setRecent((r) => r + 1);
    const n = ++id.current;
    setHearts((h) => [...h, { id: n, x: 40 + Math.random() * 20, drift: (Math.random() - 0.5) * 50 }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== n)), 1100);
  };

  const onMove = (e: React.PointerEvent) => {
    const r = host.current?.getBoundingClientRect();
    if (!r) return;
    setLook({
      x: Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 2))),
      y: Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 2))),
    });
  };

  const mood = MOODS[Math.min(MOODS.length - 1, recent === 0 ? 0 : recent < 2 ? 2 : 3)];
  const body = "hsl(318 82% 72%)";
  const deep = "hsl(318 74% 60%)";
  const blush = "hsl(318 90% 66%)";
  const ex = look.x * 2.2;
  const ey = look.y * 1.6;

  return (
    <div
      ref={host}
      className="relative flex h-full cursor-pointer flex-col p-[18px]"
      onPointerMove={onMove}
      onPointerLeave={() => setLook({ x: 0, y: 0 })}
      onClick={pet}
    >
      <div className="relative flex flex-1 items-center justify-center">
        {hearts.map((h) => (
          <span
            key={h.id}
            className="pointer-events-none absolute text-[16px]"
            style={
              {
                left: `${h.x}%`,
                top: "22%",
                color: blush,
                "--drift": `${h.drift}px`,
                animation: "pet-heart 1.1s ease-out forwards",
              } as React.CSSProperties
            }
          >
            ♥
          </span>
        ))}
        <div key={bounce} style={{ animation: bounce ? "pet-bounce 520ms cubic-bezier(.3,.7,.4,1)" : undefined }}>
          <svg
            viewBox="0 0 120 110"
            width={118}
            height={108}
            style={{ animation: "pet-breathe 3.2s ease-in-out infinite", transformOrigin: "50% 100%" }}
            aria-label="A small pink cat"
          >
            <g style={{ animation: "pet-tail 2.4s ease-in-out infinite", transformOrigin: "92px 84px" }}>
              <path d="M92 86 C110 84 114 66 106 58" stroke={deep} strokeWidth="9" fill="none" strokeLinecap="round" />
            </g>
            <path d="M28 40 L24 12 L46 28 Z" fill={deep} />
            <path d="M92 40 L96 12 L74 28 Z" fill={deep} />
            <ellipse cx="60" cy="62" rx="40" ry="38" fill={body} />
            <ellipse cx="38" cy="96" rx="10" ry="6" fill={deep} />
            <ellipse cx="82" cy="96" rx="10" ry="6" fill={deep} />
            <g transform={`translate(${ex} ${ey})`}>
              {blink ? (
                <>
                  <path d="M41 58 q5 4 10 0" stroke="#2a0f24" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                  <path d="M69 58 q5 4 10 0" stroke="#2a0f24" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <ellipse cx="46" cy="57" rx="5" ry="6" fill="#2a0f24" />
                  <ellipse cx="74" cy="57" rx="5" ry="6" fill="#2a0f24" />
                  <circle cx="47.6" cy="54.6" r="1.7" fill="#fff" />
                  <circle cx="75.6" cy="54.6" r="1.7" fill="#fff" />
                </>
              )}
              <path d="M56 68 q4 4 8 0" stroke="#2a0f24" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
            <ellipse cx="34" cy="70" rx="6" ry="3.6" fill={blush} opacity="0.75" />
            <ellipse cx="86" cy="70" rx="6" ry="3.6" fill={blush} opacity="0.75" />
          </svg>
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[12.5px] font-semibold">Mochi</div>
          <div className="dimmer text-[10px] font-medium tabular-nums">
            {pets} {pets === 1 ? "pet" : "pets"}
          </div>
        </div>
        <span className="dim text-[10.5px] font-medium">{mood}</span>
      </div>
    </div>
  );
}
