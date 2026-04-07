import { describe, expect, it } from 'vitest';

import { HEADLINES, PRESS_QUESTIONS } from '../src/systems/postgame-presser.js';

describe('postgame-presser.js', () => {
  it('has unique press question ids', () => {
    const ids = PRESS_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('triggers close-win and rivalry questions for narrow rivalry win', () => {
    const context = { won: true, lost: false, margin: 3, isRivalry: true };
    const active = PRESS_QUESTIONS.filter((q) => q.trigger(context)).map((q) => q.id);

    expect(active).toContain('close_win');
    expect(active).toContain('rivalry_any');
    expect(active).not.toContain('big_win');
    expect(active).not.toContain('bad_loss');
  });

  it('triggers bad-loss and rivalry questions for blowout rivalry loss', () => {
    const context = { won: false, lost: true, margin: 21, isRivalry: true };
    const active = PRESS_QUESTIONS.filter((q) => q.trigger(context)).map((q) => q.id);

    expect(active).toContain('bad_loss');
    expect(active).toContain('rivalry_any');
    expect(active).not.toContain('close_loss');
  });

  it('generates sorted headlines and caps output at six', () => {
    const teams = [
      {
        id: 'me',
        icon: '🦅',
        abbr: 'PHI',
        wins: 9,
        losses: 3,
        pf: 360,
        streak: 5,
        _prevRank: 8,
        roster: [
          { name: 'Young QB', pos: 'QB', age: 22, isStarter: true, ovr: 84, pffWeek: 85, stats: { passYds: 3900 } },
          { name: 'Young WR', pos: 'WR', age: 23, isStarter: true, ovr: 76, pffWeek: 81, stats: { recYds: 920 } },
          { name: 'Edge Rusher', pos: 'DL', age: 27, isStarter: true, ovr: 83, pffWeek: 72, stats: { sacks: 10 } },
        ],
      },
      {
        id: 'ai1',
        icon: '🐻',
        abbr: 'CHI',
        wins: 10,
        losses: 2,
        pf: 370,
        streak: 4,
        roster: [{ pos: 'OL', isStarter: true, ovr: 62 }],
      },
      {
        id: 'ai2',
        icon: '🦬',
        abbr: 'BUF',
        wins: 8,
        losses: 4,
        pf: 340,
        streak: -4,
        roster: [{ pos: 'CB', isStarter: true, ovr: 64 }],
      },
      { id: 'ai3', icon: '⭐', abbr: 'DAL', wins: 8, losses: 4, pf: 330, streak: 1, roster: [] },
      { id: 'ai4', icon: '🦁', abbr: 'DET', wins: 7, losses: 5, pf: 320, streak: 1, roster: [] },
      { id: 'ai5', icon: '⚡', abbr: 'LAC', wins: 6, losses: 6, pf: 300, streak: 1, roster: [] },
      { id: 'ai6', icon: '🐬', abbr: 'MIA', wins: 6, losses: 6, pf: 290, streak: 1, roster: [] },
      { id: 'ai7', icon: '🐦', abbr: 'SEA', wins: 5, losses: 7, pf: 280, streak: 1, roster: [] },
    ];

    const headlines = HEADLINES.generate(teams, 'me', { week: 10 }, null);

    expect(headlines.length).toBeLessThanOrEqual(6);
    expect(headlines[0].priority).toBeGreaterThanOrEqual(headlines[headlines.length - 1].priority);
    expect(headlines.some((h) => h.text.includes('jumped'))).toBe(true);
    expect(headlines.some((h) => h.text.includes('win streak'))).toBe(true);
  });
});
