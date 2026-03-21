import { describe, expect, it } from 'vitest';
import { EXPORT_ENGINE } from '../src/systems/export-engine.js';

describe('export-engine', function () {
  var mockMy = { id: 1, name: 'Eagles', city: 'Philadelphia', icon: '🦅', wins: 12, losses: 4, roster: [{ name: 'Joe Star', pos: 'QB', ovr: 92, devTrait: 'superstar' }] };
  var mockHistory = [
    { year: 2027, winnerId: 1, teamRecords: [{ id: 1, wins: 14, losses: 3 }] },
    { year: 2028, winnerId: 2, teamRecords: [{ id: 1, wins: 10, losses: 7 }] },
  ];
  var mockSeason = { year: 2029, week: 10 };

  it('builds dynasty card with correct structure', function () {
    var card = EXPORT_ENGINE.dynastyCard(mockMy, mockHistory, mockSeason, 'TEST123', []);
    expect(card).toContain('Eagles');
    expect(card).toContain('RECORD');
    expect(card).toContain('TITLES');
    expect(card).toContain('SEED: TEST123');
    expect(card).toContain('MR. FOOTBALL DYNASTY');
  });

  it('builds draft ticker', function () {
    var ticker = EXPORT_ENGINE.draftTicker({ name: 'Joe Star', pos: 'QB', round: 1, pickNum: 3, ovr: 88, college: 'Alabama', teamName: 'Eagles', teamIcon: '🦅', devTrait: 'superstar' }, 'SEED1');
    expect(ticker).toContain('RD1 PK3');
    expect(ticker).toContain('QB Joe Star');
    expect(ticker).toContain('Alabama');
    expect(ticker).toContain('SEED1');
  });

  it('builds MFSN recap', function () {
    var recap = EXPORT_ENGINE.mfsnRecap(mockMy, mockSeason, mockHistory, null, null);
    expect(recap).toContain('F R O N T');
    expect(recap).toContain('Eagles');
    expect(recap).toContain('2029');
  });

  it('handles null inputs gracefully', function () {
    expect(EXPORT_ENGINE.dynastyCard(null, null, {}, '', [])).toBe('');
    expect(EXPORT_ENGINE.draftTicker(null, '')).toBe('');
    expect(EXPORT_ENGINE.mfsnRecap(null, null, null, null, null)).toBe('');
  });
});
