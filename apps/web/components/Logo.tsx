/** The bronze "M" mark (same geometry as the app icon), with optional wordmark. */
export function Logo({ size = 32, wordmark = false }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="MileWire">
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-hidden={wordmark}>
        <defs>
          <linearGradient id="mw-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#DB9446" />
            <stop offset="1" stopColor="#A8641F" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#mw-g)" />
        <polyline points="27,75 27,27 50,55 73,27 73,75" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {wordmark ? <span className="text-lg font-semibold tracking-tight text-foreground">MileWire</span> : null}
    </span>
  );
}
