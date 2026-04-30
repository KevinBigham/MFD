export type MvpPlaqueRibbonVariant = 'mvp' | 'opoy' | 'dpoy' | 'coty';

interface MvpPlaqueSvgProps {
  awardType: MvpPlaqueRibbonVariant;
  title?: string;
}

const ribbonFillByAward: Record<MvpPlaqueRibbonVariant, string> = {
  mvp: 'var(--mfd-gold)',
  opoy: 'var(--mfd-green)',
  dpoy: 'var(--mfd-red)',
  coty: 'var(--mfd-cyan)',
};

export function getMvpPlaqueRibbonFill(awardType: MvpPlaqueRibbonVariant): string {
  return ribbonFillByAward[awardType];
}

export function MvpPlaqueSvg({ awardType, title = 'Franchise award plaque' }: MvpPlaqueSvgProps) {
  const ribbonFill = getMvpPlaqueRibbonFill(awardType);

  return (
    <svg
      viewBox="0 0 120 180"
      role="img"
      aria-label={title}
      data-testid="mvp-plaque-svg"
      data-ribbon-variant={awardType}
      data-ribbon-fill={ribbonFill}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <pattern id={`wood-grain-${awardType}`} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M0 4 C4 1 8 7 16 3" fill="none" stroke="var(--mfd-bg-0)" strokeWidth="1.5" />
          <path d="M0 12 C5 15 10 9 16 13" fill="none" stroke="var(--mfd-bg-3)" strokeWidth="1.5" />
        </pattern>
      </defs>
      <path d="M16 20 L104 20 L112 32 L112 166 L104 174 L16 174 L8 166 L8 32 Z" fill="var(--mfd-bg-dim)" />
      <path d="M22 28 L98 28 L104 36 L104 158 L98 166 L22 166 L16 158 L16 36 Z" fill={`url(#wood-grain-${awardType})`} />
      <path d="M22 28 L98 28 L104 36 L104 158 L98 166 L22 166 L16 158 L16 36 Z" fill="var(--mfd-bg-2)" opacity="0.78" />
      <path d="M18 18 L102 18 L110 30 L104 38 L16 38 L10 30 Z" fill={ribbonFill} />
      <path d="M10 30 L2 44 L18 42 L16 38 Z" fill={ribbonFill} opacity="0.75" />
      <path d="M110 30 L118 44 L102 42 L104 38 Z" fill={ribbonFill} opacity="0.75" />
      <path d="M60 52 L68 70 L88 72 L72 84 L78 104 L60 93 L42 104 L48 84 L32 72 L52 70 Z" fill="var(--mfd-gold)" />
      <path d="M60 60 L65 72 L78 74 L68 82 L72 94 L60 87 L48 94 L52 82 L42 74 L55 72 Z" fill="var(--mfd-bg-0)" opacity="0.35" />
      <path d="M24 116 L96 116 L96 148 L24 148 Z" fill="var(--mfd-gold)" />
      <path d="M30 122 L90 122 L90 142 L30 142 Z" fill="var(--mfd-bg-dim)" opacity="0.3" />
      <path d="M28 154 L92 154 L96 160 L24 160 Z" fill="var(--mfd-bg-0)" />
    </svg>
  );
}
