export function Logo({ light = false }: { light?: boolean }) {
  const primary = light ? "#F5E6C4" : "var(--brand-green)";
  const gold = light ? "#F0C674" : "var(--brand-gold)";

  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path
          d="M20 3C11.7 3 5 9.7 5 18c0 5.8 3.3 10.9 8.2 13.4L20 37l6.8-5.6C31.7 28.9 35 23.8 35 18c0-8.3-6.7-15-15-15Z"
          fill={primary}
        />
        <path
          d="M20 9c3 4.5 3 9.5 0 14M20 9c-3 4.5-3 9.5 0 14"
          stroke={gold}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect x="15" y="21" width="2.4" height="7" fill={gold} />
        <rect x="19" y="18" width="2.4" height="10" fill={gold} />
        <rect x="23" y="22" width="2.4" height="6" fill={gold} />
      </svg>
      <div className="leading-tight">
        <div
          className="font-extrabold tracking-tight text-[1.05rem]"
          style={{ color: primary }}
        >
          Smart <span style={{ color: gold }}>Tourism</span>
        </div>
        <div
          className="text-[0.62rem] tracking-[0.18em] uppercase"
          style={{ color: light ? "#D8CBA5" : "var(--brand-gold)" }}
        >
          Discover Saudi Arabia
        </div>
      </div>
    </div>
  );
}
