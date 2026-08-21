import { Chrome, Code2, Figma, Github, MessageSquare, Music, Terminal, Wallet } from "lucide-react";
import { Pad } from "./parts";
import { openExternal } from "@/lib/tauri";
import type { WidgetBodyProps } from "./loader";

const APPS = [
  { name: "Browser", icon: Chrome, url: "https://vercel.com" },
  { name: "Editor", icon: Code2, url: "https://code.visualstudio.com" },
  { name: "GitHub", icon: Github, url: "https://github.com" },
  { name: "Figma", icon: Figma, url: "https://figma.com" },
  { name: "Chat", icon: MessageSquare, url: "https://slack.com" },
  { name: "Music", icon: Music, url: "https://open.spotify.com" },
  { name: "Terminal", icon: Terminal, url: "https://learn.microsoft.com/windows/terminal/" },
  { name: "Wallet", icon: Wallet, url: "https://tauri.app" },
];

export default function LauncherWidget({ size }: WidgetBodyProps) {
  const count = size === "sm" ? 4 : size === "md" ? 6 : 8;

  return (
    <Pad size={size} className="justify-between">
      <div className="text-[13px] font-bold tracking-tight">Launch</div>
      <div className="grid grid-cols-3 gap-2">
        {APPS.slice(0, count).map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.name}
              data-nodrag
              title={a.name}
              onClick={() => openExternal(a.url)}
              className="grid aspect-square place-items-center rounded-2xl bg-white/8
                         transition-colors hover:bg-white/16"
            >
              <Icon size={size === "sm" ? 15 : 18} strokeWidth={1.9} />
            </button>
          );
        })}
      </div>
    </Pad>
  );
}
