import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Download, Hand, MousePointer2 } from "lucide-react";
import { DesktopMock } from "../components/DesktopMock";
import { GithubMark } from "../components/GithubMark";
import { RELEASES, REPO } from "../lib/links";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const mock = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: mock, offset: ["start end", "start 0.25"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [22, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  const glow = useTransform(scrollYProgress, [0, 1], [0.35, 0.8]);

  return (
    <section id="top" className="relative overflow-hidden pt-36 pb-24 sm:pt-44">
      {/* backdrop */}
      <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_50%_20%,black_20%,transparent_70%)]" />
      <div className="pointer-events-none absolute top-[-280px] left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[#6b4dff] opacity-25 blur-[140px]" />

      <div className="relative mx-auto max-w-6xl px-5 text-center">
        <motion.a
          href={REPO}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="eyebrow group hover:bg-white/8"
        >
          <span className="rounded-full bg-[#7c5cff]/25 px-2 py-0.5 text-[11px] text-[#c9bcff]">New</span>
          Ask AI, right from the island
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </motion.a>

        <motion.h1
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.08, ease }}
          className="h-display mx-auto mt-7 max-w-4xl text-[52px] sm:text-[84px] lg:text-[100px]"
        >
          Your desktop,
          <br />
          <span className="text-gradient">more alive.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease }}
          className="mx-auto mt-7 max-w-2xl text-[18px] leading-relaxed text-ink-300 sm:text-[20px]"
        >
          Real widgets that live <em className="text-ink-100 not-italic">on</em> your desktop, not inside an app
          window. Twelve of them, a little pet, and a Dynamic Island that grows into whatever is going on.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <a href={RELEASES} target="_blank" rel="noreferrer" className="btn btn-primary h-12 px-6 text-[15px]">
            <Download size={17} />
            Download for Windows
          </a>
          <a href={REPO} target="_blank" rel="noreferrer" className="btn btn-ghost h-12 px-6 text-[15px]">
            <GithubMark size={17} />
            Star on GitHub
          </a>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-4 text-[13px] text-ink-400"
        >
          Free and open source · MIT licensed · Built for Windows
        </motion.p>
      </div>

      <div className="relative mx-auto mt-20 max-w-[1200px] px-4 [perspective:1600px]">
        <motion.div
          ref={mock}
          style={{ rotateX, scale, transformOrigin: "50% 0%" }}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.35, ease }}
          className="relative"
        >
          <motion.div
            style={{ opacity: glow }}
            className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 rounded-[60px] bg-gradient-to-b from-[#7c5cff]/50 via-[#ff4dd8]/20 to-transparent blur-3xl"
          />
          <DesktopMock />
        </motion.div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-ink-400">
          <span className="flex items-center gap-1.5">
            <Hand size={14} /> Drag the widgets — they dock at the edges
          </span>
          <span className="flex items-center gap-1.5">
            <MousePointer2 size={14} /> Hover the island, or scroll on it
          </span>
        </div>
      </div>
    </section>
  );
}
