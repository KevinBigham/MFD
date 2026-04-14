import type { CallYourShotResult as CallYourShotResultPayload } from '@mfd/engine';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';

interface CallYourShotResultProps {
  result?: CallYourShotResultPayload | null;
}

const THEMES: Record<NonNullable<CallYourShotResultPayload['outcome']>, {
  title: string;
  accent: 'gold' | 'red' | 'cyan';
  background: string;
  badgeText: string;
}> = {
  hit: {
    title: 'CALLED IT.',
    accent: 'gold',
    background: 'linear-gradient(135deg, var(--mfd-surface-0, #050505), var(--mfd-gold-ink, rgba(255, 215, 0, 0.12)))',
    badgeText: 'CONF +',
  },
  miss: {
    title: 'WHIFFED.',
    accent: 'red',
    background: 'linear-gradient(135deg, #000000, rgba(194, 59, 34, 0.22))',
    badgeText: 'CONF -',
  },
  partial: {
    title: 'CLOSE ENOUGH.',
    accent: 'cyan',
    background: 'linear-gradient(135deg, var(--mfd-surface-0, #050505), rgba(0, 196, 255, 0.12))',
    badgeText: 'CONF +/-',
  },
};

export function CallYourShotResult({ result }: CallYourShotResultProps) {
  if (!result) return null;

  const theme = THEMES[result.outcome];
  const confidenceDelta = result.fanConfidenceDelta > 0
    ? `+${result.fanConfidenceDelta}`
    : `${result.fanConfidenceDelta}`;

  return (
    <PixelPanel title="Call Your Shot" accent={theme.accent}>
      <div
        data-testid={`call-your-shot-${result.outcome}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '12px',
          background: theme.background,
          border: '2px solid var(--mfd-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              fontFamily: 'var(--mfd-font-pixel)',
              fontSize: '14px',
              letterSpacing: '1px',
              color: 'var(--mfd-text)',
            }}
            >
              {theme.title}
            </div>
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '12px', color: 'var(--mfd-text-dim)' }}>
              {result.headline}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant={theme.accent}>{theme.badgeText}</PixelBadge>
            <PixelBadge variant={result.fanConfidenceDelta >= 0 ? 'green' : 'red'}>
              {confidenceDelta}
            </PixelBadge>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '18px', color: 'var(--mfd-text)' }}>
          {result.reaction.headline}
        </div>
        <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '12px', lineHeight: 1.6, color: 'var(--mfd-text)' }}>
          "{result.reaction.quote}"
        </div>
        <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
          {result.reaction.speaker} // {result.reaction.speakerType.replace('_', ' ')}
        </div>
      </div>
    </PixelPanel>
  );
}
