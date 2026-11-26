import { motion } from "motion/react";
import { AppWindow, Cpu, Feather, ShieldCheck } from "lucide-react";
import { Reveal, SectionHead } from "../components/Reveal";

const STACK = ["Tauri", "Rust", "React", "TypeScript", "Tailwind CSS", "WebView2"];

const FACTS = [
  { icon: AppWindow, title: "One window per widget", text: "Frameless, transparent, skip-taskbar, always on the desktop. The manager only places, sizes, docks, shows and hides them." },
  { icon: Cpu, title: "A native core", text: "System stats, media, audio, the island's watcher and AI requests all run in Rust. There's no separate service to start." },
  { icon: Feather, title: "Built to stay light", text: "Widget windows load only what they need — no animation library, no UI kit, no store. A build-time guard keeps it that way." },
  { icon: ShieldCheck, title: "Private by default", text: "No telemetry, no account. Notes, tasks and calendar stay on your machine; the only check-in is an optional update check." },
];

function Bar({ label, mb, max, color, delay }: { label: string; mb: number; max: number; color: string; delay: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[14px]">
        <span className="text-ink-300">{label}</span>
        <span className="font-semibold tabular-nums">~{mb} MB</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${(mb / max) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

const TREE = `main window          ─ the manager: owns all state
  └── DesktopMap     ─ live map of each monitor
  └── useDesktopSync ─ reconciles OS windows

w-<kind> windows     ─ one per visible widget
                       frameless · transparent
                       skipTaskbar · alwaysOnBottom

island               ─ the Dynamic Island
capture              ─ the quick-capture bar`;

export function InsideSection() {
  return (
    <section id="inside" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead
          eyebrow="Under the hood"
          title={
            <>
              Widgets that live on the desktop,
              <br />
              <span className="text-ink-400">not inside an app.</span>
            </>
          }
        >
          Each widget is its own OS window. The main window is a manager, and it's the single source of truth — widget
          windows are read-only replicas that report back only what you did.
        </SectionHead>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <Reveal className="card overflow-hidden p-0">
            <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-5 py-3.5">
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="ml-3 font-mono text-[12px] text-ink-400">how it fits together</span>
            </div>
            <pre className="overflow-x-auto p-6 font-mono text-[12.5px] leading-[1.75] text-ink-200">{TREE}</pre>
          </Reveal>

          <Reveal delay={0.08} className="card p-7">
            <h3 className="text-[16px] font-semibold">Low-memory mode</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-300">
              Drops the tile blur, stretches every poll, and hands compositing back to the CPU. Measured with all thirteen
              widgets on the desktop and the manager parked in the tray:
            </p>
            <div className="mt-7 space-y-5">
              <Bar label="Default" mb={342} max={360} color="linear-gradient(90deg,#4a4d55,#9598a1)" delay={0} />
              <Bar label="Low-memory mode" mb={255} max={360} color="linear-gradient(90deg,#7c5cff,#ff4dd8)" delay={0.15} />
            </div>
            <p className="mt-6 text-[13px] leading-relaxed text-ink-400">
              Committed private bytes. Thirteen widget windows cost about 57 MB together — roughly 4 MB each.
            </p>
          </Reveal>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.06} className="card p-6">
              <Icon size={20} className="text-[#c9bcff]" />
              <h3 className="mt-4 text-[15.5px] font-semibold">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-300">{text}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-2 text-[13px] text-ink-400">Built with</span>
          {STACK.map((s) => (
            <span key={s} className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-ink-200 ring-1 ring-white/10">
              {s}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
