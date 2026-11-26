import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Download } from "lucide-react";
import { GithubMark } from "./GithubMark";
import clsx from "clsx";
import { Logo } from "./Logo";
import { RELEASES, REPO } from "../lib/links";
import { scrollToId } from "../lib/scroll";

const LINKS = [
  { id: "widgets", label: "Widgets" },
  { id: "island", label: "Dynamic Island" },
  { id: "arrange", label: "Layout" },
  { id: "features", label: "Features" },
  { id: "inside", label: "Under the hood" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3"
    >
      <nav
        className={clsx(
          "flex w-full max-w-6xl items-center gap-6 rounded-full px-3 py-2 pl-4 transition-all duration-500",
          scrolled
            ? "bg-ink-900/70 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-xl"
            : "bg-transparent",
        )}
      >
        <a href="#top" onClick={(e) => { e.preventDefault(); scrollToId("top"); }} aria-label="Widgeto home">
          <Logo />
        </a>
        <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={(e) => { e.preventDefault(); scrollToId(l.id); }}
              className="rounded-full px-3 py-1.5 text-[14px] font-medium text-ink-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <a href={REPO} target="_blank" rel="noreferrer" className="btn btn-ghost h-9 px-3.5 text-[13.5px]" aria-label="Widgeto on GitHub">
            <GithubMark size={16} />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <a href={RELEASES} target="_blank" rel="noreferrer" className="btn btn-primary h-9 px-4 text-[13.5px]">
            <Download size={15} />
            Download
          </a>
        </div>
      </nav>
    </motion.header>
  );
}
