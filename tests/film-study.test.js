import { describe, expect, it } from 'vitest';

import { FILM } from '../src/systems/film-study.js';

describe('film-study.js', () => {
  it('grades offense/defense/special teams and maps letter grades', () => {
    const off = FILM.gradeOff(31, { passYds: 320, rushYds: 120, sacks: 1, ints: 0, passTD: 3 });
    const def = FILM.gradeDef(17, { passYds: 180, rushYds: 70, sacks: 3, ints: 2 });
    const st = FILM.gradeST({ fgMade: 3, fgMiss: 1 }, {});

    expect(off).toBeGreaterThan(80);
    expect(def).toBeGreaterThan(80);
    expect(st).toBe(76);
    expect(FILM.letterGrade(91)).toBe('A+');
    expect(FILM.letterGrade(55)).toBe('C');
    expect(FILM.letterGrade(40)).toBe('F');
  });

  it('analyze builds win recap with targeted insights and close-game turning point', () => {
    const result = FILM.analyze(
      {
        home: 27,
        away: 24,
        weather: { temp: 44 },
        recap: {
          home: { sacks: 4, ints: 2, rushYds: 130, passYds: 310, fgMade: 2, fgMiss: 0 },
          away: { rushYds: 160, passYds: 360, sacks: 1, ints: 0, fgMade: 1, fgMiss: 1 },
        },
      },
      { id: 1, abbr: 'AAA' },
      { id: 2, abbr: 'BBB' },
      1
    );

    expect(result.won).toBe(true);
    expect(result.margin).toBe(3);
    expect(result.userTeam).toBe('AAA');
    expect(result.turning).toContain('final drive');
    expect(result.insights.length).toBeGreaterThan(2);
    expect(result.insights.some((i) => i.text.includes('sacks allowed'))).toBe(true);
    expect(result.insights.some((i) => i.text.includes('interceptions thrown'))).toBe(true);
    expect(result.insights.some((i) => i.text.includes('Ground game dominated'))).toBe(true);
  });

  it('analyze falls back to neutral insight and blowout turning narrative', () => {
    const result = FILM.analyze(
      {
        home: 10,
        away: 35,
        recap: {
          home: { sacks: 0, ints: 0, rushYds: 90, passYds: 220, fgMade: 1, fgMiss: 0 },
          away: { rushYds: 100, passYds: 240, sacks: 1, ints: 0, fgMade: 0, fgMiss: 0 },
        },
      },
      { id: 1, abbr: 'AAA' },
      { id: 2, abbr: 'BBB' },
      1
    );

    expect(result.won).toBe(false);
    expect(result.insights).toHaveLength(1);
    expect(result.insights[0].text).toContain('Competitive game');
    expect(result.turning).toContain('Outclassed in every phase');
  });
});
