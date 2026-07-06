import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { CallYourShotResult as CallYourShotResultPayload } from '@mfd/engine';
import { CallYourShotResult } from './CallYourShotResult';

function makeResult(outcome: CallYourShotResultPayload['outcome']): CallYourShotResultPayload {
  return {
    declaration: 'air_attack',
    success: outcome === 'hit',
    outcome,
    magnitude: 0.8,
    fanConfidenceDelta: outcome === 'hit' ? 3 : outcome === 'miss' ? -4 : 0,
    moraleDelta: 4,
    chemistryDelta: 1,
    devBonusMultiplier: 1.1,
    headline: 'Swagger matched tape',
    narrative: 'Narrative copy',
    reaction: {
      id: `reaction-${outcome}`,
      outcome,
      speaker: 'Mara Voss',
      speakerType: 'beat_writer',
      tone: outcome === 'miss' ? 'sarcastic' : outcome === 'hit' ? 'triumphant' : 'measured',
      headline: 'Quote headline',
      quote: 'That prediction changed the way the night felt.',
    },
  };
}

describe('CallYourShotResult', () => {
  it('renders the hit state', () => {
    const markup = renderToStaticMarkup(<CallYourShotResult result={makeResult('hit')} />);
    expect(markup).toContain('CALLED IT.');
    expect(markup).toContain('CONF +');
    expect(markup).toContain('resolveCallYourShot');
    expect(markup).toContain('GameDayPackage');
    expect(markup).toContain('Read-only receipt');
    expect(markup).toContain('Source: resolveCallYourShot resolves saved activeCallYourShot after the user game');
    expect(markup).toContain('stores callYourShotResult on the user GameResult');
    expect(markup).toContain('Opening this result does not re-evaluate the shot');
    expect(markup).toContain('apply another fan-confidence swing');
    expect(markup).toContain('change the saved game, rerun the game, or reroll saved outcomes');
  });

  it('renders the miss state', () => {
    const markup = renderToStaticMarkup(<CallYourShotResult result={makeResult('miss')} />);
    expect(markup).toContain('WHIFFED.');
    expect(markup).toContain('-4');
  });

  it('uses design tokens instead of inline color literals for result backgrounds', () => {
    const markup = (['hit', 'miss', 'partial'] as const)
      .map((outcome) => renderToStaticMarkup(<CallYourShotResult result={makeResult(outcome)} />))
      .join('\n');
    const resultStyles = [...markup.matchAll(/data-testid="call-your-shot-(hit|miss|partial)" style="([^"]+)"/g)]
      .map((match) => match[2]);

    expect(resultStyles).toHaveLength(3);
    for (const style of resultStyles) {
      expect(style).toContain('background:var(--mfd-result-');
      expect(style).not.toMatch(/background:linear-gradient/);
      expect(style).not.toMatch(/#050505|#000000|rgba\(/);
    }
  });

  it('renders nothing when no result is present', () => {
    const markup = renderToStaticMarkup(<CallYourShotResult result={null} />);
    expect(markup).toBe('');
  });
});
