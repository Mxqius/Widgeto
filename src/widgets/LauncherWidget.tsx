import { motion } from "motion/react";
import {
  Chrome, Code2, Figma, Github, LayoutGrid, MessageSquare, Music, Terminal,
} from "lucide-react";
import { Shell } from "./parts";
import { openExternal } from "@/lib/tauri";
import type { SizeKey } from "@/lib/types";

const APPS = [
  { name: "Browser", icon: Chrome, color: "#4aa8ff", url: "https://vercel.com" },
  { name: "Editor", icon: Code2, color: "#7c6cff", url: "https://code.visualstudio.com" },
  { name: "GitHub", icon: Github, color: "#c1c3c9", url: "https://github.com" },
  { name: "Figma", icon: Figma, color: "#ff7a5c", url: "https://figma.com" },
  { name: "Chat", icon: MessageSquare, color: "#31d0aa", url: "https://slack.com" },
  { name: "Music", icon: Music, color: "#e05fd0", url: "https://open.spotify.com" },
  { name: "Terminal", icon: Terminal, color: "#f2b544", url: "https://learn.microsoft.com/windows/terminal/" },
  { name: "Docs", icon: LayoutGrid, color: "#9aa4b2", url: "https://tauri.app" },
];

export default function LauncherWidget({ size }: { size: SizeKey }) {
  const count = size === "sm" ? 4 : size === "md" ? 6 : 8;

  return (
    <Shell title="Quick launch" icon={<LayoutGrid size={12} />}>
      <div className="grid flex-1 grid-cols-4 content-center gap-1.5">
        {APPS.slice(0, count).map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.button
              key={a.name}
              data-nodrag
              title={a.name}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, type: "spring", stiffness: 460, damping: 28 }}
              whileHover={{ y: -3, scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => openExternal(a.url)}
              className="group flex aspect-square flex-col items-center justify-center gap-1 rounded-xl
                         border border-white/6 bg-white/[0.03] transition-colors hover:bg-white/[0.07]"
            >
              <Icon size={16} strokeWidth={1.8} style={{ color: a.color }} />
              <span className="text-[8.5px] font-medium text-ink-500 group-hover:text-ink-300">
                {a.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </Shell>
  );
}
