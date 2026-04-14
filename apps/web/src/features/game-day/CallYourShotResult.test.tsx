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
  });

  it('renders the miss state', () => {
    const markup = renderToStaticMarkup(<CallYourShotResult result={makeResult('miss')} />);
    expect(markup).toContain('WHIFFED.');
    expect(markup).toContain('-4');
  });

  it('renders nothing when no result is present', () => {
    const markup = renderToStaticMarkup(<CallYourShotResult result={null} />);
    expect(markup).toBe('');
  });
});
