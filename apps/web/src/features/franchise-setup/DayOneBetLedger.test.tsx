import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { DayOneBetLedger } from './DayOneBetLedger';

describe('DayOneBetLedger', () => {
  it('renders cumulative day one bets with readiness, volatility, and consequence framing', () => {
    const html = renderToStaticMarkup(
      <DayOneBetLedger
        entries={[
          {
            id: 'agm',
            label: 'AGM',
            bet: 'Marcus Webb',
            readinessDelta: 0,
            volatilityDelta: 0,
            summaryLine: 'Cap discipline keeps the opener from feeling panicked.',
          },
          {
            id: 'cap',
            label: 'Cap Package',
            bet: 'Push Chips',
            readinessDelta: 4,
            volatilityDelta: 3,
            summaryLine: 'Push chips buys room now, raises owner heat later.',
          },
        ]}
      />,
    );

    expect(html).toContain('DAY 1 BET LEDGER');
    expect(html).toContain('Marcus Webb');
    expect(html).toContain('Push Chips');
    expect(html).toContain('WK1 +4');
    expect(html).toContain('VOL +3');
    expect(html).toContain('raises owner heat later');
  });
});
