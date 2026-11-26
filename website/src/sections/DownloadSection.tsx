import { useState } from "react";
import { Check, Copy, Download, Terminal } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { LogoMark } from "../components/Logo";
import { GithubMark } from "../components/GithubMark";
import { Widget } from "../widgets";
import { RELEASES, REPO } from "../lib/links";

function CopyLine({ cmd }: { cmd: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(cmd);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      className="group flex w-full items-center gap-3 rounded-xl bg-black/40 px-4 py-3 text-left font-mono text-[13.5px] ring-1 ring-white/10 transition-colors hover:bg-black/60"
    >
      <span className="text-[#a08bff]">$</span>
      <span className="flex-1 text-ink-100">{cmd}</span>
      {done ? <Check size={15} className="text-[#4ade80]" /> : <Copy size={15} className="text-ink-500 group-hover:text-ink-200" />}
    </button>
  );
}

export function DownloadSection() {
  return (
    <section id="download" className="relative px-5 pt-4 pb-28 sm:pb-36">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] p-8 ring-1 ring-white/10 sm:p-14">
        <div className="absolute inset-0 bg-[#0e0a22]" />
        <div className="absolute -top-40 -left-40 size-[520px] rounded-full bg-[#5b3df5] opacity-50 blur-[120px]" />
        <div className="absolute -right-40 -bottom-56 size-[520px] rounded-full bg-[#ff4dd8] opacity-30 blur-[130px]" />

        <div className="pointer-events-none absolute top-10 right-10 hidden rotate-6 lg:block">
          <Widget kind="pet" size={170} />
        </div>
        <div className="pointer-events-none absolute right-52 bottom-12 hidden -rotate-6 lg:block">
          <Widget kind="clock" size={140} />
        </div>

        <div className="relative max-w-xl">
          <LogoMark size={52} />
          <h2 className="h-display mt-8 text-[44px] sm:text-[64px]">
            Make your desktop
            <br />
            <span className="text-gradient">yours again.</span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-200">
            Free, open source and MIT licensed. Grab the installer from GitHub Releases, or build it from source in two
            commands.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={RELEASES} target="_blank" rel="noreferrer" className="btn btn-primary h-12 px-6 text-[15px]">
              <Download size={17} />
              Download for Windows
            </a>
            <a href={REPO} target="_blank" rel="noreferrer" className="btn btn-ghost h-12 px-6 text-[15px]">
              <GithubMark size={17} />
              View the source
            </a>
          </div>
          <p className="mt-3 text-[13px] text-ink-400">
            The first release is on its way — until then, the Releases page will be empty.
          </p>

          <div className="mt-10">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink-300">
              <Terminal size={14} /> Run it from source
            </div>
            <div className="space-y-2">
              <CopyLine cmd="git clone https://github.com/Mxqius/Widgeto.git" />
              <CopyLine cmd="npm install && npm run app" />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
