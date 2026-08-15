export function ProcessCircuit() {
  const d = "M 520 168 H 628 V 72 H 778 V 248 H 868 V 338";

  return (
    <svg
      className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
      viewBox="0 0 1000 560"
      fill="none"
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="circuit-bloom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={d}
        stroke="#1a100b"
        strokeWidth="14"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      <path
        d={d}
        className="circuit-glow"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinejoin="miter"
        strokeLinecap="square"
        filter="url(#circuit-bloom)"
        opacity="0.45"
      />
      <path
        d={d}
        className="circuit-current"
        stroke="var(--accent-hot)"
        strokeWidth="2.2"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      <path
        d="M 856 326 L 868 338 L 880 326"
        stroke="#1a100b"
        strokeWidth="10"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      <path
        d="M 856 326 L 868 338 L 880 326"
        className="circuit-current"
        stroke="var(--accent-hot)"
        strokeWidth="2.2"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
    </svg>
  );
}
