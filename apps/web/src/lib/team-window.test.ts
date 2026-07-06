import { describe, expect, it } from 'vitest';
import { computeTeamWindow, type TeamWindowInput, type TeamWindowPlayerInput } from './team-window';

function starter(id: string, pos: TeamWindowPlayerInput['pos'], age: number, ovr: number): TeamWindowPlayerInput {
  return { id, pos, age, ovr, isStarter: true };
}

function picks(teamId: string, rounds: number[], startYear = 2030) {
  return rounds.map((round, index) => ({
    round,
    year: startYear + (index % 2),
    currentTeamId: teamId,
  }));
}

const allInRoster = [
  starter('qb', 'QB', 34, 90),
  starter('wr', 'WR', 31, 84),
  starter('te', 'TE', 30, 82),
  starter('ol', 'OL', 32, 81),
  starter('dl', 'DL', 30, 80),
  starter('lb', 'LB', 31, 79),
  starter('cb', 'CB', 26, 76),
];

const contendRoster = [
  starter('qb', 'QB', 29, 91),
  starter('wr', 'WR', 27, 86),
  starter('te', 'TE', 30, 82),
  starter('ol', 'OL', 28, 81),
  starter('dl', 'DL', 29, 80),
  starter('lb', 'LB', 31, 78),
  starter('cb', 'CB', 25, 77),
];

const retoolRoster = [
  starter('qb', 'QB', 25, 79),
  starter('wr', 'WR', 24, 78),
  starter('te', 'TE', 26, 77),
  starter('ol', 'OL', 25, 76),
  starter('dl', 'DL', 26, 76),
  starter('lb', 'LB', 28, 74),
  starter('cb', 'CB', 29, 73),
];

const rebuildRoster = [
  starter('qb', 'QB', 23, 72),
  starter('wr', 'WR', 24, 71),
  starter('te', 'TE', 25, 70),
  starter('ol', 'OL', 26, 69),
  starter('dl', 'DL', 27, 70),
  starter('lb', 'LB', 28, 71),
  starter('cb', 'CB', 23, 68),
];

describe('computeTeamWindow', () => {
  it('classifies ALL_IN with aging contender, tight cap, and thin premium picks', () => {
    const window = computeTeamWindow({
      teamId: 'det',
      currentYear: 2029,
      roster: allInRoster,
      draftPicks: picks('det', [1, 2, 4]),
      capSpace: 2.4,
      gmStrategy: 'contend',
      philosophy: 'contend',
      wins: 10,
      losses: 3,
      teamNeeds: { capFlexibility: 'tight', criticalNeeds: ['CB'] },
    });

    expect(window).toEqual({
      phase: 'ALL_IN',
      confidence: 'clear',
      drivers: [
        { label: 'Aging contender core', detail: 'QB 34, 6 starters 30+, core 82 OVR.' },
        { label: 'Tight cap space', detail: '$2.4M cap space with tight.' },
        { label: 'Thin premium picks', detail: '1 first and 2 top-2-round picks in the next two drafts.' },
        { label: 'Contend posture', detail: 'Contend philosophy / Contend GM strategy. Front office is signaling a current-window push.' },
      ],
      sourceRefs: ['team:det:roster', 'team:det:cap', 'team:det:draftPicks', 'team:det:gmStrategy'],
    });
  });

  it('classifies CONTEND from a strong spine and winning current record', () => {
    const window = computeTeamWindow({
      teamId: 'aus',
      currentYear: 2029,
      roster: contendRoster,
      draftPicks: picks('aus', [1, 1, 2, 3]),
      capSpace: 18,
      gmStrategy: 'contend',
      philosophy: 'maintain',
      wins: 11,
      losses: 4,
      franchiseHistory: [
        { teamId: 'aus', year: 2028, wins: 10, losses: 7, playoffFinish: 'wild_card' },
      ],
    });

    expect(window.phase).toBe('CONTEND');
    expect(window.confidence).toBe('clear');
    expect(window.drivers).toEqual([
      { label: 'Contender spine', detail: 'QB 91 OVR, core 82 OVR, 2 starters 30+.' },
      { label: 'Contend posture', detail: 'Maintain philosophy / Contend GM strategy. Front office is signaling a current-window push.' },
      { label: 'Current results', detail: '11-4 record keeps the club in the race.' },
      { label: 'Recent results', detail: '10 average wins over 1 saved season, 1 playoff finish.' },
    ]);
  });

  it('classifies RETOOL from young starters and flexible cap space', () => {
    const window = computeTeamWindow({
      teamId: 'por',
      currentYear: 2029,
      roster: retoolRoster,
      draftPicks: picks('por', [1, 1, 3, 4]),
      capSpace: 38,
      gmStrategy: 'neutral',
      philosophy: 'maintain',
      wins: 6,
      losses: 7,
    });

    expect(window.phase).toBe('RETOOL');
    expect(window.confidence).toBe('clear');
    expect(window.drivers).toEqual([
      { label: 'Retoolable core', detail: '5 starters 26 or younger, core 76 OVR.' },
      { label: 'Flexible cap space', detail: '$38.0M cap space leaves optionality for bids or extensions.' },
      { label: 'Balanced posture', detail: 'Maintain philosophy / Neutral GM strategy. No saved posture forces a buy-or-sell lane.' },
    ]);
  });

  it('classifies REBUILD from sell posture, weak roster, picks, and poor results', () => {
    const window = computeTeamWindow({
      teamId: 'oma',
      currentYear: 2029,
      roster: rebuildRoster,
      draftPicks: picks('oma', [1, 1, 1, 2, 2, 3]),
      capSpace: 42,
      gmStrategy: 'rebuild',
      philosophy: 'fire_sale',
      wins: 3,
      losses: 9,
    });

    expect(window.phase).toBe('REBUILD');
    expect(window.confidence).toBe('clear');
    expect(window.drivers).toEqual([
      { label: 'Front-office sell signal', detail: 'Fire Sale philosophy / Rebuild GM strategy. Fire-sale posture points toward picks and cap space.' },
      { label: 'Roster floor', detail: 'QB 72 OVR, core 70 OVR.' },
      { label: 'Pick inventory', detail: '3 firsts and 5 top-2-round picks in the next two drafts.' },
      { label: 'Flexible cap space', detail: '$42.0M cap space leaves optionality for bids or extensions.' },
    ]);
  });

  it('marks confidence mixed when contend roster signals fight rebuild posture', () => {
    const window = computeTeamWindow({
      teamId: 'mix',
      currentYear: 2029,
      roster: contendRoster,
      draftPicks: picks('mix', [1, 2, 3]),
      capSpace: 16,
      gmStrategy: 'rebuild',
      philosophy: 'rebuild',
      wins: 10,
      losses: 5,
    });

    expect(window.phase).toBe('CONTEND');
    expect(window.confidence).toBe('mixed');
    expect(window.drivers.slice(0, 2)).toEqual([
      { label: 'Contender spine', detail: 'QB 91 OVR, core 82 OVR, 2 starters 30+.' },
      { label: 'Rebuild posture', detail: 'Rebuild philosophy / Rebuild GM strategy. Current posture favors youth and future assets.' },
    ]);
  });

  it('handles sparse optional inputs without throwing', () => {
    const window = computeTeamWindow({ teamId: 'empty' });

    expect(window).toEqual({
      phase: 'RETOOL',
      confidence: 'mixed',
      drivers: [
        { label: 'Balanced posture', detail: 'Maintain philosophy / Neutral GM strategy. No saved posture forces a buy-or-sell lane.' },
        { label: 'Sparse roster read', detail: 'Roster inputs are missing, so the window stays conservative.' },
      ],
      sourceRefs: ['team:empty:gmStrategy', 'team:empty:roster-missing'],
    });
  });

  it('is deterministic and caps drivers at four', () => {
    const input: TeamWindowInput = {
      teamId: 'det',
      currentYear: 2029,
      roster: allInRoster,
      draftPicks: picks('det', [1, 2, 4]),
      capSpace: 2.4,
      gmStrategy: 'contend',
      philosophy: 'contend',
      wins: 10,
      losses: 3,
      franchiseHistory: [
        { teamId: 'det', year: 2028, wins: 12, losses: 5, playoffFinish: 'conference' },
        { teamId: 'det', year: 2027, wins: 11, losses: 6, playoffFinish: 'wild_card' },
      ],
      teamNeeds: { capFlexibility: 'tight', criticalNeeds: ['CB'] },
    };

    expect(computeTeamWindow(input)).toEqual(computeTeamWindow(input));
    expect(computeTeamWindow(input).drivers).toHaveLength(4);
  });
});
