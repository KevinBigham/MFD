import { describe, expect, it } from 'vitest';
import {
  generateBroadcast,
  generateDriveSummary,
  generateFinalNarrative,
  generatePlayCommentary,
  mulberry32,
  selectHighlights,
  type BroadcastOutput,
  type DriveNarrative,
  type GameResult,
  type PlayDescription,
} from '../index';
import { makeLeagueState } from './test-helpers';

function makeTeams() {
  const game = makeLeagueState('regular_season', 1);
  const home = structuredClone(game.teams.afce1!);
  const away = structuredClone(game.teams.afce2!);

  home.city = 'Nashville';
  home.name = 'Titans';
  away.city = 'Jacksonville';
  away.name = 'Jaguars';

  home.roster[0]!.name = 'Marcus Cole';
  home.roster[2]!.name = 'DeShawn Williams';
  home.roster[1]!.name = 'Isaiah Grant';
  home.roster[10]!.name = 'Evan Price';
  away.roster[0]!.name = 'Trevor Hale';
  away.roster[2]!.name = 'Jalen Frost';
  away.roster[1]!.name = 'Malik Boone';
  away.roster[10]!.name = 'Carter Wells';

  home.rivals[away.id] = { heat: 8 };
  away.rivals[home.id] = { heat: 8 };
  home.rivalries = [{
    teamId: away.id,
    heat: 72,
    trophyName: 'South Crown',
    history: [],
  }];
  away.rivalries = [{
    teamId: home.id,
    heat: 68,
    trophyName: 'South Crown',
    history: [],
  }];

  return { home, away };
}

function makeResult(): GameResult {
  return {
    id: 'game-2026-1-afce1-afce2',
    homeTeamId: 'afce1',
    awayTeamId: 'afce2',
    homeScore: 31,
    awayScore: 27,
    week: 1,
    year: 2026,
    overtime: false,
    mvpPlayerId: 'afce1-qb',
    stats: {
      afce1: {
        totalYards: 412,
        passingYards: 304,
        rushingYards: 108,
        turnovers: 1,
        sacks: 3,
        pressuresAllowed: 2,
        thirdDownConversions: 7,
        thirdDownAttempts: 13,
        timeOfPossession: 31,
        passAttempts: 35,
        passCompletions: 25,
        passTDs: 3,
        interceptions: 1,
        rushAttempts: 22,
        rushTDs: 1,
        fumbles: 0,
        penalties: 4,
        penaltyYards: 32,
        fgMade: 1,
        fgAttempted: 1,
        punts: 3,
        drives: 11,
        yacYards: 88,
        redZoneTrips: 4,
        redZoneScores: 4,
        quarterScores: [7, 10, 7, 7],
        playerLines: [
          { playerId: 'afce1-qb', name: 'Marcus Cole', pos: 'QB', passAtt: 35, passComp: 25, passYds: 304, passTD: 3, passINT: 1, sacked: 2 },
          { playerId: 'afce1-rb', name: 'Isaiah Grant', pos: 'RB', rushAtt: 18, rushYds: 94, rushTD: 1, rec: 3, recYds: 18, targets: 4 },
          { playerId: 'afce1-wr1', name: 'DeShawn Williams', pos: 'WR', rec: 7, recYds: 128, recTD: 1, targets: 10 },
          { playerId: 'afce1-wr2', name: 'Nico Hart', pos: 'WR', rec: 5, recYds: 82, recTD: 1, targets: 7 },
          { playerId: 'afce1-te', name: 'Grant Mercer', pos: 'TE', rec: 4, recYds: 39, recTD: 1, targets: 5 },
          { playerId: 'afce1-dl', name: 'Rashad King', pos: 'DL', tackles: 4, sacks: 2 },
          { playerId: 'afce1-cb', name: 'Tre Mason', pos: 'CB', tackles: 5, defINT: 1 },
          { playerId: 'afce1-k', name: 'Evan Price', pos: 'K', fgAtt: 1, fgMade: 1 },
        ],
      },
      afce2: {
        totalYards: 366,
        passingYards: 267,
        rushingYards: 99,
        turnovers: 2,
        sacks: 2,
        pressuresAllowed: 3,
        thirdDownConversions: 5,
        thirdDownAttempts: 12,
        timeOfPossession: 29,
        passAttempts: 33,
        passCompletions: 21,
        passTDs: 2,
        interceptions: 2,
        rushAttempts: 24,
        rushTDs: 1,
        fumbles: 0,
        penalties: 7,
        penaltyYards: 55,
        fgMade: 2,
        fgAttempted: 2,
        punts: 4,
        drives: 10,
        yacYards: 56,
        redZoneTrips: 4,
        redZoneScores: 3,
        quarterScores: [3, 7, 7, 10],
        playerLines: [
          { playerId: 'afce2-qb', name: 'Trevor Hale', pos: 'QB', passAtt: 33, passComp: 21, passYds: 267, passTD: 2, passINT: 2, sacked: 3 },
          { playerId: 'afce2-rb', name: 'Malik Boone', pos: 'RB', rushAtt: 20, rushYds: 83, rushTD: 1, rec: 2, recYds: 14, targets: 3 },
          { playerId: 'afce2-wr1', name: 'Jalen Frost', pos: 'WR', rec: 6, recYds: 109, recTD: 1, targets: 9 },
          { playerId: 'afce2-wr2', name: 'Keenan Vale', pos: 'WR', rec: 5, recYds: 74, recTD: 1, targets: 8 },
          { playerId: 'afce2-dl', name: 'Orlando Reese', pos: 'DL', tackles: 4, sacks: 2 },
          { playerId: 'afce2-s', name: 'Darius Lane', pos: 'S', tackles: 6, defINT: 2 },
          { playerId: 'afce2-k', name: 'Carter Wells', pos: 'K', fgAtt: 2, fgMade: 2 },
        ],
      },
    },
    weather: 'clear',
    matchupHighlight: null,
    broadcastNetwork: 'MFN',
    primetime: true,
    flexed: false,
    specialTeams: {
      afce1: {
        kickReturnYards: 32,
        puntReturnYards: 16,
        returnTouchdowns: 0,
        returnFumbles: 0,
        touchbacks: 4,
        netPuntAverage: 43,
        highlights: [],
      },
      afce2: {
        kickReturnYards: 27,
        puntReturnYards: 11,
        returnTouchdowns: 0,
        returnFumbles: 0,
        touchbacks: 4,
        netPuntAverage: 40,
        highlights: [],
      },
    },
  };
}

function makeScorelessResult(): GameResult {
  return {
    id: 'game-2026-1-afce1-afce2-quiet',
    homeTeamId: 'afce1',
    awayTeamId: 'afce2',
    homeScore: 0,
    awayScore: 0,
    week: 1,
    year: 2026,
    overtime: false,
    mvpPlayerId: null,
    stats: {
      afce1: {
        totalYards: 111,
        passingYards: 66,
        rushingYards: 45,
        turnovers: 1,
        sacks: 1,
        pressuresAllowed: 2,
        thirdDownConversions: 2,
        thirdDownAttempts: 12,
        timeOfPossession: 30,
        passAttempts: 20,
        passCompletions: 10,
        passTDs: 0,
        interceptions: 1,
        rushAttempts: 20,
        rushTDs: 0,
        fumbles: 0,
        penalties: 5,
        penaltyYards: 38,
        fgMade: 0,
        fgAttempted: 1,
        punts: 7,
        drives: 10,
        yacYards: 18,
        redZoneTrips: 0,
        redZoneScores: 0,
        quarterScores: [0, 0, 0, 0],
        playerLines: [],
      },
      afce2: {
        totalYards: 119,
        passingYards: 71,
        rushingYards: 48,
        turnovers: 1,
        sacks: 1,
        pressuresAllowed: 1,
        thirdDownConversions: 3,
        thirdDownAttempts: 11,
        timeOfPossession: 30,
        passAttempts: 21,
        passCompletions: 11,
        passTDs: 0,
        interceptions: 1,
        rushAttempts: 19,
        rushTDs: 0,
        fumbles: 0,
        penalties: 4,
        penaltyYards: 30,
        fgMade: 0,
        fgAttempted: 0,
        punts: 7,
        drives: 10,
        yacYards: 21,
        redZoneTrips: 0,
        redZoneScores: 0,
        quarterScores: [0, 0, 0, 0],
        playerLines: [],
      },
    },
    weather: 'wind',
    matchupHighlight: null,
    broadcastNetwork: 'CBS8',
    primetime: false,
    flexed: false,
    specialTeams: {
      afce1: {
        kickReturnYards: 0,
        puntReturnYards: 0,
        returnTouchdowns: 0,
        returnFumbles: 0,
        touchbacks: 4,
        netPuntAverage: 39,
        highlights: [],
      },
      afce2: {
        kickReturnYards: 0,
        puntReturnYards: 0,
        returnTouchdowns: 0,
        returnFumbles: 0,
        touchbacks: 4,
        netPuntAverage: 38,
        highlights: [],
      },
    },
  };
}

function flattenPlays(broadcast: BroadcastOutput): PlayDescription[] {
  return broadcast.quarters.flatMap((quarter) => quarter.flatMap((drive) => drive.plays));
}

describe('broadcast', () => {
  it('generates deterministic commentary for the same seeded play context', () => {
    const play: PlayDescription = {
      type: 'pass',
      yardsGained: 27,
      playerIds: ['afce1-qb'],
      commentary: '',
      excitement: 0.71,
      isBigPlay: true,
      isClutch: false,
    };

    const left = generatePlayCommentary(play, {
      scoreDiff: 3,
      quarter: 3,
      isRivalry: false,
      playerOvr: 94,
    }, mulberry32(101));
    const right = generatePlayCommentary(play, {
      scoreDiff: 3,
      quarter: 3,
      isRivalry: false,
      playerOvr: 94,
    }, mulberry32(101));

    expect(left).toBe(right);
  });

  it('generates deterministic broadcast output with the same seed', () => {
    const { home, away } = makeTeams();

    const left = generateBroadcast(makeResult(), home, away, mulberry32(17));
    const right = generateBroadcast(makeResult(), home, away, mulberry32(17));

    expect(left).toEqual(right);
  });

  it('flags big plays, touchdowns, turnovers, and clutch moments', () => {
    const { home, away } = makeTeams();
    const broadcast = generateBroadcast(makeResult(), home, away, mulberry32(21));
    const plays = flattenPlays(broadcast);

    expect(plays.some((play) => play.isBigPlay && play.yardsGained >= 20)).toBe(true);
    expect(plays.some((play) => play.type === 'touchdown' && play.isBigPlay)).toBe(true);
    expect(plays.some((play) => play.type === 'turnover' && play.isBigPlay)).toBe(true);
    expect(plays.some((play) => play.isClutch)).toBe(true);
  });

  it('balances highlight selection across halves when both halves have candidates', () => {
    const makePlay = (
      yardsGained: number,
      excitement: number,
      quarter: number,
      label: string,
      extra?: Partial<PlayDescription>,
    ): PlayDescription => ({
      type: 'pass',
      yardsGained,
      playerIds: [label],
      commentary: label,
      excitement,
      isBigPlay: yardsGained >= 20,
      isClutch: quarter === 4,
      ...extra,
    });

    const quarters: DriveNarrative[][] = [
      [{
        plays: [makePlay(28, 0.74, 1, 'q1-shot')],
        startYardLine: 25,
        endResult: 'touchdown',
        yardsTotal: 75,
        timeElapsed: 180,
        narrative: 'Q1 drive',
      }],
      [{
        plays: [makePlay(32, 0.77, 2, 'q2-strike')],
        startYardLine: 20,
        endResult: 'touchdown',
        yardsTotal: 80,
        timeElapsed: 160,
        narrative: 'Q2 drive',
      }],
      [{
        plays: [makePlay(45, 0.88, 3, 'q3-flip')],
        startYardLine: 18,
        endResult: 'touchdown',
        yardsTotal: 82,
        timeElapsed: 145,
        narrative: 'Q3 drive',
      }],
      [{
        plays: [
          makePlay(22, 0.81, 4, 'q4-clutch-a', { isClutch: true }),
          makePlay(12, 0.96, 4, 'q4-clutch-b', { type: 'touchdown', isBigPlay: true, isClutch: true }),
          makePlay(0, 0.93, 4, 'q4-pick', { type: 'turnover', isBigPlay: true, isClutch: true }),
        ],
        startYardLine: 30,
        endResult: 'touchdown',
        yardsTotal: 65,
        timeElapsed: 120,
        narrative: 'Q4 drive',
      }],
    ];

    const highlights = selectHighlights(quarters);
    const labels = highlights.map((play) => play.commentary);

    expect(highlights).toHaveLength(5);
    expect(labels).toContain('q2-strike');
    expect(labels.some((label) => label.startsWith('q1') || label.startsWith('q2'))).toBe(true);
    expect(labels.some((label) => label.startsWith('q3') || label.startsWith('q4'))).toBe(true);
  });

  it('builds drive summaries using real player names', () => {
    const drive: DriveNarrative = {
      plays: [
        {
          type: 'pass',
          yardsGained: 18,
          playerIds: ['afce1-qb', 'afce1-wr1'],
          commentary: 'Set-up play',
          excitement: 0.46,
          isBigPlay: false,
          isClutch: false,
        },
        {
          type: 'touchdown',
          yardsGained: 23,
          playerIds: ['afce1-qb', 'afce1-wr1'],
          commentary: 'Touchdown',
          excitement: 0.88,
          isBigPlay: true,
          isClutch: false,
        },
      ],
      startYardLine: 25,
      endResult: 'touchdown',
      yardsTotal: 75,
      timeElapsed: 188,
      narrative: '',
    };

    const summary = generateDriveSummary(drive, 'Titans', {
      'afce1-qb': 'Marcus Cole',
      'afce1-wr1': 'DeShawn Williams',
    });

    expect(summary).toContain('Titans');
    expect(summary).toContain('Marcus Cole');
    expect(summary).toContain('DeShawn Williams');
  });

  it('builds a final narrative with both teams and the final score', () => {
    const { home, away } = makeTeams();
    const broadcast = generateBroadcast(makeResult(), home, away, mulberry32(33));

    const narrative = generateFinalNarrative(broadcast, home, away, makeResult());

    expect(narrative).toContain('Titans');
    expect(narrative).toContain('Jaguars');
    expect(narrative).toContain('31-27');
  });

  it('handles a scoreless game without crashing', () => {
    const { home, away } = makeTeams();

    const broadcast = generateBroadcast(makeScorelessResult(), home, away, mulberry32(9));

    expect(broadcast.gameId).toBe('game-2026-1-afce1-afce2-quiet');
    expect(broadcast.quarters).toHaveLength(4);
    expect(broadcast.highlights.length).toBeLessThanOrEqual(5);
  });

  it('uses rivalry language in elevated moments', () => {
    const commentary = generatePlayCommentary({
      type: 'pass',
      yardsGained: 31,
      playerIds: ['afce1-qb'],
      commentary: '',
      excitement: 0.82,
      isBigPlay: true,
      isClutch: true,
    }, {
      scoreDiff: 3,
      quarter: 4,
      isRivalry: true,
      playerOvr: 92,
    }, mulberry32(5));

    expect(commentary).toMatch(/bad blood|rivalry|grudge|feud/i);
  });
});
