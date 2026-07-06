import { describe, expect, it } from 'vitest';
import { buildPostWeekMoment } from './post-week-moment';
import type { GameDayPackage, WeeklySummary } from '../types';

function makeSummary(overrides: Partial<WeeklySummary> = {}): WeeklySummary {
  return {
    id: 'summary-2031-7-team-1',
    year: 2031,
    week: 7,
    phase: 'regular_season',
    teamId: 'team-1',
    opponentTeamId: 'team-2',
    opponentName: 'Austin Armadillos',
    result: 'win',
    teamScore: 31,
    opponentScore: 17,
    record: '5-2',
    headline: 'Week 7: Chicago Blaze beat Austin Armadillos 31-17',
    ownerDelta: 4,
    injuries: [
      {
        playerId: 'rb-1',
        playerName: 'Riley Brooks',
        severity: 'questionable',
        gamesOut: 1,
        type: 'ankle',
      },
    ],
    mvpPlayerId: 'qb-1',
    notes: ['Won the third-down battle', 'Closed the fourth quarter with a long drive'],
    ...overrides,
  };
}

function makePackage(overrides: Partial<GameDayPackage> = {}): GameDayPackage {
  return {
    id: 'gameday-2031-7-team-1',
    year: 2031,
    week: 7,
    phase: 'regular_season',
    teamId: 'team-1',
    opponentTeamId: 'team-2',
    headline: 'Week 7: Chicago Blaze beat Austin Armadillos 31-17',
    result: 'win',
    finalScore: '31-17',
    stakes: [{ label: 'Division pace', detail: 'The win protects a one-game lead.' }],
    turningPoints: [
      {
        label: 'Turnover edge',
        detail: 'Finished +2 in turnover margin and stole two short fields.',
        impact: 'positive',
      },
      {
        label: 'Pocket pressure',
        detail: 'Generated four sacks while allowing one.',
        impact: 'positive',
      },
    ],
    topPerformers: [{ playerId: 'qb-1', label: 'Drew Hart (QB)', statLine: '22/31, 286 yds, 3 TD' }],
    injuryNotes: ['Riley Brooks: ankle (questionable, 1 games)'],
    ceremony: null,
    pressConference: {
      theme: 'Statement win',
      opener: 'We played clean situational football.',
      quotes: [],
      speaker: 'Head Coach',
      tone: 'confident',
      topic: 'postgame win',
      reporterQuestions: [],
    },
    rivalry: {
      rivalryId: 'team-1::team-2',
      intensity: 72,
      tier: 'heated',
      ovrBoost: 3,
      headline: 'These teams brought real heat into kickoff.',
    },
    activeEffectSummaries: ['Captain speech kept the locker room aligned.'],
    autopsy: {
      diagnosis: 'Controlled passing rhythm kept the offense ahead of schedule.',
      leverage: 'Turnover margin and situational stops decided which drives ended in points.',
      nextFocus: ['Protect the injured backfield', 'Keep the pass rush disruptive'],
    },
    weather: 'clear',
    matchupHighlight: {
      label: 'Slot WR vs Nickel',
      detail: 'The slot matchup gave Chicago a repeatable third-down outlet.',
      advantage: 6,
    },
    broadcastNetwork: 'MFN',
    primetime: true,
    flexed: false,
    specialTeamsHighlights: ['Keenan Ward ripped off a 74-yard kick return that flipped the field.'],
    recordsMoments: [
      {
        playerId: 'qb-1',
        playerName: 'Drew Hart',
        teamId: 'team-1',
        stat: 'passingYards',
        newValue: 512,
        previousValue: 498,
        previousHolder: 'Old Star',
        category: 'singleGame',
        year: 2031,
        week: 7,
        narrative: 'Drew Hart reset the single-game passing mark.',
      },
    ],
    milestoneMoments: [],
    prepGrade: 'A',
    coachingNotes: ['Protection emphasis landed.'],
    carryForwardRecommendations: ['Keep the successful pass concept family active next week.'],
    ...overrides,
  };
}

describe('buildPostWeekMoment', () => {
  it('composes a package-backed post-week explanation from existing receipts', () => {
    const receipt = buildPostWeekMoment(makeSummary(), makePackage());

    expect(receipt).toMatchObject({
      id: 'post-week-2031-7-team-1',
      result: 'win',
      scoreLine: '31-17',
      record: '5-2',
      source: 'game-day-package',
    });
    expect(receipt?.whyItHappened.map((item) => item.label)).toContain('Tape Diagnosis');
    expect(receipt?.whyItHappened.map((item) => item.label)).toContain('Decision Point');
    expect(receipt?.whyItHappened.some((item) => item.detail.includes('Controlled passing rhythm'))).toBe(true);
    expect(receipt?.whyItHappened.some((item) => item.label === 'Game Stakes' && item.detail.includes('Division pace'))).toBe(true);
    expect(receipt?.whyItHappened.some((item) => item.label === 'Rivalry Heat' && item.detail.includes('real heat'))).toBe(true);
    expect(receipt?.whatChanged.some((item) => item.label === 'Owner Pulse' && item.detail.includes('+4'))).toBe(true);
    expect(receipt?.whatChanged.some((item) => item.label === 'Record Book')).toBe(true);
    expect(receipt?.whatChanged.some((item) => item.label === 'Conditions' && item.detail.includes('game recap'))).toBe(true);
    expect(receipt?.whatChanged.some((item) => item.detail.includes('game receipt'))).toBe(false);
    expect(receipt?.whatChanged.some((item) => item.label === 'Special Teams' && item.detail.includes('74-yard kick return'))).toBe(true);
    expect(receipt?.whatNow.some((item) => item.detail === 'Protect the injured backfield')).toBe(true);
    expect(receipt?.whatNow.some((item) => item.label === 'Podium Follow-Up' && item.detail.includes('Statement win'))).toBe(true);
    expect(receipt?.whatNow.some((item) => item.label === 'Coaching Note' && item.detail.includes('Protection emphasis'))).toBe(true);
    expect(receipt?.whatNow.some((item) => item.label === 'Film Room' && item.detail.includes('Prep graded A'))).toBe(true);
    expect(receipt?.whatNow.some((item) => item.label === 'Film Room' && item.detail.includes('same missed call repeats'))).toBe(true);
    expect(receipt?.whatNow.some((item) => item.label === 'Depth Chart' && item.detail.includes('unassigned player on the field'))).toBe(true);
    expect(receipt?.whatNow.some((item) => item.label === 'Film Room' && item.detail.includes('before locking the next plan'))).toBe(false);
    expect(receipt?.whatNow.some((item) => item.label === 'Depth Chart' && item.detail.includes('Verify injured roles'))).toBe(false);
  });

  it('falls back to weekly summary notes when no game-day package exists', () => {
    const receipt = buildPostWeekMoment(makeSummary({ ownerDelta: -2 }), null);

    expect(receipt?.source).toBe('summary');
    expect(receipt?.headline).toBe('Week 7: Chicago Blaze beat Austin Armadillos 31-17');
    expect(receipt?.scoreLine).toBe('31-17');
    expect(receipt?.whyItHappened.map((item) => item.detail)).toContain('Won the third-down battle');
    expect(receipt?.whatChanged.some((item) => item.label === 'Owner Pulse' && item.tone === 'negative')).toBe(true);
    expect(receipt?.whatNow.length).toBeGreaterThan(0);
  });

  it('uses direct post-week fallback instructions when no recommendation or injury exists', () => {
    const win = buildPostWeekMoment(makeSummary({ injuries: [], notes: [] }), makePackage({
      carryForwardRecommendations: [],
      coachingNotes: [],
      injuryNotes: [],
      prepGrade: undefined,
      pressConference: null,
      autopsy: { diagnosis: '', leverage: '', nextFocus: [] },
    }));
    const tie = buildPostWeekMoment(makeSummary({
      result: 'tie',
      injuries: [],
      notes: [],
      teamScore: 20,
      opponentScore: 20,
    }), makePackage({
      result: 'tie',
      finalScore: '20-20',
      carryForwardRecommendations: [],
      coachingNotes: [],
      injuryNotes: [],
      prepGrade: undefined,
      pressConference: null,
      autopsy: { diagnosis: '', leverage: '', nextFocus: [] },
    }));

    expect(win?.whatNow[0]?.detail).toBe('Open Film Room to see what worked, then keep the same plan when roster health still supports it.');
    expect(tie?.whatNow[0]?.detail).toBe('Open Recap and Game Plan before Advance Week; a tie usually means one matchup or depth issue still needs a decision.');
    expect(`${win?.whatNow[0]?.detail} ${tie?.whatNow[0]?.detail}`).not.toMatch(/clean pieces|leverage chance|only if/i);
  });

  it('returns null when no post-week source exists', () => {
    expect(buildPostWeekMoment(null, null)).toBeNull();
  });
});
