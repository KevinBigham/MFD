import { Lock } from 'lucide-react';
import type { Achievement } from '@mfd/engine';

export type MedalTier = Extract<Achievement['tier'], 'bronze' | 'silver' | 'gold'> | 'platinum';

function medalColor(tier: MedalTier): string {
  if (tier === 'silver') return 'var(--mfd-cyan)';
  if (tier === 'bronze') return 'var(--mfd-orange)';
  return 'var(--mfd-gold)';
}

export function AchievementMedalSvg({
  tier,
  locked,
  title,
}: {
  tier: MedalTier;
  locked: boolean;
  title: string;
}) {
  const displayTier = tier === 'platinum' ? 'gold' : tier;
  const color = locked ? 'var(--mfd-text-faint)' : medalColor(tier);
  const dim = locked ? '0.42' : '1';

  return (
    <svg
      viewBox="0 0 100 130"
      width="100"
      height="130"
      role="img"
      aria-label={title}
      data-medal-tier={displayTier}
      data-medal-locked={locked ? 'true' : 'false'}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M28 4h18l6 34H34z" fill={color} opacity={dim} />
      <path d="M54 4h18L66 38H48z" fill={color} opacity={locked ? '0.28' : '0.74'} />
      <circle cx="50" cy="72" r="34" fill="var(--mfd-bg-2)" stroke={color} strokeWidth="5" opacity={dim} />
      {displayTier === 'silver' ? (
        <g data-medal-gear="true" stroke={color} strokeWidth="4" strokeLinecap="square" opacity={dim}>
          <path d="M50 30v10" />
          <path d="M50 104v10" />
          <path d="M8 72h10" />
          <path d="M82 72h10" />
          <path d="M20 42l8 8" />
          <path d="M72 94l8 8" />
          <path d="M80 42l-8 8" />
          <path d="M28 94l-8 8" />
        </g>
      ) : null}
      {displayTier === 'gold' ? (
        <g data-medal-laurel="true" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity={dim}>
          <path d="M25 84c-8-14-6-30 5-42" />
          <path d="M75 84c8-14 6-30-5-42" />
          <path d="M23 76l-9-3" />
          <path d="M26 64l-10-1" />
          <path d="M30 52l-8-6" />
          <path d="M77 76l9-3" />
          <path d="M74 64l10-1" />
          <path d="M70 52l8-6" />
        </g>
      ) : null}
      <path
        d="M50 50l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z"
        fill={color}
        opacity={locked ? '0.32' : '0.9'}
      />
      <circle cx="50" cy="72" r="19" fill="none" stroke={color} strokeWidth="2" opacity={locked ? '0.24' : '0.5'} />
      {locked ? (
        <g transform="translate(37 58)">
          <Lock aria-hidden="true" width={26} height={26} color="var(--mfd-text-dim)" strokeWidth={3} />
        </g>
      ) : null}
    </svg>
  );
}
