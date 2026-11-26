import { Logo } from "./Logo";
import { ISSUES, LICENSE, README, RELEASES, REPO } from "../lib/links";

const COLS = [
  { title: "Product", links: [["Download", RELEASES], ["Documentation", README], ["Report an issue", ISSUES]] },
  { title: "Project", links: [["Source code", REPO], ["License (MIT)", LICENSE], ["فارسی", `${REPO}/blob/main/README.fa.md`]] },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-14 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-[14px] leading-relaxed text-ink-400">
            Real desktop widgets with a Dynamic Island. Your desktop, more alive.
          </p>
        </div>
        <div className="flex gap-16">
          {COLS.map((c) => (
            <div key={c.title}>
              <h4 className="text-[13px] font-semibold text-ink-200">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noreferrer" className="text-[14px] text-ink-400 transition-colors hover:text-white">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 pb-10 text-[13px] text-ink-500">
        © {new Date().getFullYear()} Widgeto · MIT licensed
      </div>
    </footer>
  );
}
