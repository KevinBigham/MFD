import { describe, expect, it } from 'vitest';

import {
  AWARD_HISTORY_LOG,
  buildCareerPage,
  getMultiTimeWinners,
  getTrophyName,
  recordAwardHistory,
  setTrophyNameForRivalry,
} from '../src/systems/award-history.js';

describe('award-history.js', () => {
  it('recordAwardHistory appends entries and getMultiTimeWinners aggregates', () => {
    const startLen = AWARD_HISTORY_LOG.length;

    recordAwardHistory(
      {
        mvp: { name: 'Pat Field', pos: 'QB', team: 'PHI' },
        dpoy: { name: 'Max Rush', pos: 'DL', team: 'NYG' },
      },
      2026
    );
    recordAwardHistory(
      {
        mvp: { name: 'Pat Field', pos: 'QB', team: 'PHI' },
      },
      2027
    );

    const winners = getMultiTimeWinners('mvp');
    expect(AWARD_HISTORY_LOG.length).toBe(startLen + 2);
    expect(winners.some((w) => w.name === 'Pat Field' && w.count >= 2)).toBe(true);
  });

  it('trophy name helpers set/get/delete sorted rivalry keys', () => {
    let map = setTrophyNameForRivalry({}, 'DAL', 'PHI', 'The Grudge Cup');
    expect(getTrophyName(map, 'PHI', 'DAL')).toBe('The Grudge Cup');

    map = setTrophyNameForRivalry(map, 'PHI', 'DAL', '  ');
    expect(getTrophyName(map, 'DAL', 'PHI')).toBeNull();
  });

  it('buildCareerPage returns null for unknown player and full profile for known player', () => {
    const history = [
      {
        year: 2026,
        teams: [
          {
            abbr: 'PHI',
            icon: '🦅',
            roster: [
              {
                name: 'Pat Field',
                pos: 'QB',
                ovr: 86,
                age: 26,
                stats: { passYds: 4200, passTD: 31, int: 11 },
              },
            ],
          },
        ],
        mvp: { name: 'Pat Field' },
      },
      {
        year: 2027,
        teams: [
          {
            abbr: 'PHI',
            icon: '🦅',
            roster: [
              {
                name: 'Pat Field',
                pos: 'QB',
                ovr: 88,
                age: 27,
                stats: { passYds: 3900, passTD: 29, int: 9 },
              },
            ],
          },
        ],
      },
    ];

    expect(buildCareerPage('No Player', history, [])).toBeNull();
    const page = buildCareerPage('Pat Field', history, []);
    expect(page.yearsPlayed).toBe(2);
    expect(page.career.passYds).toBe(8100);
    expect(page.awards.some((a) => a.award === '🏆 MVP')).toBe(true);
  });
});
