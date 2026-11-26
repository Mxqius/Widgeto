/** The app icon: a white W on a violet squircle. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a6bff" />
          <stop offset="1" stopColor="#5a3ff0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-bg)" />
      <path
        d="M8.2 10 L11.6 22 L16 14.2 L20.4 22 L23.8 10"
        stroke="#fff"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">Widgeto</span>
    </span>
  );
}
