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
    background: 'var(--mfd-result-hit-bg)',
    badgeText: 'CONF +',
  },
  miss: {
    title: 'WHIFFED.',
    accent: 'red',
    background: 'var(--mfd-result-miss-bg)',
    badgeText: 'CONF -',
  },
  partial: {
    title: 'CLOSE ENOUGH.',
    accent: 'cyan',
    background: 'var(--mfd-result-partial-bg)',
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px',
            border: '2px solid var(--mfd-border)',
            background: 'var(--mfd-bg-2)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="cyan">resolveCallYourShot</PixelBadge>
            <PixelBadge variant="gold">GameDayPackage</PixelBadge>
            <PixelBadge variant="default">Read-only receipt</PixelBadge>
          </div>
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', lineHeight: 1.6, color: 'var(--mfd-text-dim)' }}>
            Source: resolveCallYourShot resolves saved activeCallYourShot after the user game, applies the fan-confidence delta, clears activeCallYourShot, and stores callYourShotResult on the user GameResult. GameDayPackage copies that payload for recap display. Opening this result does not re-evaluate the shot, apply another fan-confidence swing, queue audio, change the saved game, rerun the game, or reroll saved outcomes.
          </div>
        </div>
      </div>
    </PixelPanel>
  );
}
