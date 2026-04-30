export function getTrophyStripeCount(championshipCount: number): 1 | 2 | 3 {
  if (championshipCount <= 1) return 1;
  if (championshipCount === 2) return 2;
  return 3;
}

export function LombardiTrophy({
  championshipCount,
  title = 'Championship trophy',
}: {
  championshipCount: number;
  title?: string;
}) {
  const stripeCount = getTrophyStripeCount(championshipCount);
  const stripes = Array.from({ length: stripeCount }, (_, index) => 108 + index * 9);

  return (
    <svg
      viewBox="0 0 80 160"
      role="img"
      aria-label={title}
      data-lombardi-trophy="true"
      data-stripe-count={stripeCount}
      style={{ width: '80px', height: '160px', display: 'block' }}
    >
      <title>{title}</title>
      <path
        d="M18 13 C31 2 55 8 64 24 C69 34 65 47 54 53 C41 61 20 55 12 40 C7 30 10 20 18 13 Z"
        fill="var(--mfd-gold)"
      />
      <path
        d="M22 19 C33 13 51 17 59 29 C55 27 50 27 45 29 C36 32 28 31 20 25 C20 23 21 21 22 19 Z"
        fill="var(--mfd-text)"
      />
      <path
        d="M42 48 C40 61 38 73 35 85 C34 90 37 94 43 94 C49 94 52 90 51 85 C49 72 47 59 46 47 Z"
        fill="var(--mfd-gold)"
      />
      <path
        d="M30 84 H56 L61 103 H25 Z"
        fill="var(--mfd-gold)"
      />
      <path
        d="M18 103 H68 L72 143 H14 Z"
        fill="var(--mfd-bg-dim)"
      />
      <path
        d="M10 143 H76 V154 H10 Z"
        fill="var(--mfd-bg-elevated)"
      />
      <path
        d="M20 114 H66 V120 H20 Z"
        fill="var(--mfd-gold)"
      />
      {stripes.map((y) => (
        <path
          key={y}
          d={`M24 ${y} H62 V${y + 3} H24 Z`}
          fill="var(--mfd-text)"
        />
      ))}
      <path
        d="M29 129 H57 V136 H29 Z"
        fill="var(--mfd-gold)"
      />
    </svg>
  );
}
