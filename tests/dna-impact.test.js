import { describe, expect, it } from 'vitest';

import { buildDNAImpactReport } from '../src/systems/dna-impact.js';

describe('dna-impact.js', () => {
  it('returns null when required inputs are missing', () => {
    expect(buildDNAImpactReport(null, [], { year: 2026, ledger: [] })).toBeNull();
    expect(buildDNAImpactReport({}, null, { year: 2026, ledger: [] })).toBeNull();
  });

  it('returns default insight when no modifiers are active', () => {
    const report = buildDNAImpactReport(
      { injuryRate: 1, devSpeed: 1, parity: 1, tradeFreq: 1, upsetChance: 1 },
      [{ roster: [], wins: 8 }],
      { year: 2026, ledger: [] }
    );
    expect(report.insights).toHaveLength(1);
    expect(report.insights[0].label).toContain('Default DNA');
  });

  it('builds insight entries for each modified DNA axis', () => {
    const teams = [
      { wins: 12, roster: [{ age: 22, ovr: 76, injury: 1 }, { age: 28, ovr: 85 }] },
      { wins: 4, roster: [{ age: 23, ovr: 78 }, { age: 31, ovr: 70, injury: 2 }] },
    ];
    const season = { year: 2027, ledger: [{ type: 'TRADE' }, { type: 'TRADE' }, { type: 'CUT' }] };
    const dna = { injuryRate: 1.2, devSpeed: 1.3, parity: 1.2, tradeFreq: 1.4, upsetChance: 1.5 };

    const report = buildDNAImpactReport(dna, teams, season);
    expect(report.year).toBe(2027);
    expect(report.insights).toHaveLength(5);
    expect(report.insights.map((i) => i.label)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Injury Rate'),
        expect.stringContaining('Dev Speed'),
        expect.stringContaining('Parity'),
        expect.stringContaining('Trade Freq'),
        expect.stringContaining('Upset Volatility'),
      ])
    );
  });
});
