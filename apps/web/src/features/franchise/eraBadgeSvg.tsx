export type EraBadgeVariant =
  | 'rebuilding'
  | 'building'
  | 'contender'
  | 'dynasty'
  | 'golden-age'
  | 'fall-from-grace';

export function resolveEraBadgeVariant(name: string): EraBadgeVariant {
  if (/dark|fall|grace|slump/i.test(name)) return 'fall-from-grace';
  if (/rebuild/i.test(name)) return 'rebuilding';
  if (/build|rise/i.test(name)) return 'building';
  if (/dynasty|crown/i.test(name)) return 'dynasty';
  if (/gold|age/i.test(name)) return 'golden-age';
  if (/contend|playoff|window/i.test(name)) return 'contender';
  return 'contender';
}

function accentForVariant(variant: EraBadgeVariant): string {
  if (variant === 'dynasty' || variant === 'golden-age') return 'var(--mfd-gold)';
  if (variant === 'building') return 'var(--mfd-cyan)';
  if (variant === 'contender') return 'var(--mfd-green)';
  if (variant === 'fall-from-grace') return 'var(--mfd-red)';
  return 'var(--mfd-text-dim)';
}

function pathsForVariant(variant: EraBadgeVariant) {
  switch (variant) {
    case 'building':
      return [
        'M24 128 H96 V142 H24 Z',
        'M30 96 H48 V128 H30 Z',
        'M52 72 H70 V128 H52 Z',
        'M74 44 H92 V128 H74 Z',
        'M30 86 H92 V92 H30 Z',
      ];
    case 'contender':
      return [
        'M18 128 L60 34 L102 128 Z',
        'M36 126 L60 72 L84 126 Z',
        'M54 50 L60 34 L66 50 L60 58 Z',
        'M48 104 H72 V112 H48 Z',
      ];
    case 'dynasty':
      return [
        'M26 78 L42 42 L60 76 L78 42 L94 78 V112 H26 Z',
        'M34 112 H86 V126 H34 Z',
        'M42 132 H78 V142 H42 Z',
        'M52 34 H68 V44 H52 Z',
      ];
    case 'golden-age':
      return [
        'M56 24 H64 V50 H56 Z',
        'M56 110 H64 V140 H56 Z',
        'M18 78 H48 V86 H18 Z',
        'M72 78 H102 V86 H72 Z',
        'M32 46 L38 40 L54 58 L48 64 Z',
        'M66 58 L82 40 L88 46 L72 64 Z',
        'M38 122 L32 116 L48 98 L54 104 Z',
        'M72 98 L88 116 L82 122 L66 104 Z',
        'M38 60 H82 V102 H38 Z',
      ];
    case 'fall-from-grace':
      return [
        'M32 38 H88 V52 H32 Z',
        'M42 52 H78 V120 H42 Z',
        'M28 120 H92 V138 H28 Z',
        'M58 52 L68 72 L58 92 L70 120 H58 L48 96 L58 76 L48 52 Z',
      ];
    case 'rebuilding':
    default:
      return [
        'M24 118 H50 V138 H24 Z',
        'M54 104 H80 V138 H54 Z',
        'M84 88 H104 V138 H84 Z',
        'M28 72 H50 V86 H28 Z',
        'M54 58 H76 V72 H54 Z',
        'M80 42 H100 V56 H80 Z',
      ];
  }
}

export function EraBadgeSvg({
  variant,
  title,
}: {
  variant: EraBadgeVariant;
  title: string;
}) {
  const accent = accentForVariant(variant);
  const paths = pathsForVariant(variant);

  return (
    <svg
      viewBox="0 0 120 160"
      role="img"
      aria-label={title}
      data-era-badge-variant={variant}
      style={{ width: '120px', height: '160px', display: 'block' }}
    >
      <title>{title}</title>
      <path d="M14 18 H106 V146 H14 Z" fill="var(--mfd-bg-dim)" />
      <path d="M20 24 H100 V140 H20 Z" fill="var(--mfd-bg-2)" />
      {paths.map((path) => (
        <path key={path} d={path} fill={accent} />
      ))}
      <path d="M28 30 H92 V36 H28 Z" fill="var(--mfd-text)" />
      <path d="M28 144 H92 V150 H28 Z" fill={accent} />
    </svg>
  );
}
