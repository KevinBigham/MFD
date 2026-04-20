import { describe, expect, it } from 'vitest';
import { makeTeam } from './test-helpers';
import { buildBroadcastCommentary, type BroadcastCommentaryGame } from './broadcast-commentary';

function buildTeam(id: 'KC' | 'DEN', city: string, name: string, isUser = false) {
  const team = makeTeam(id, 'AFC', 'West', isUser, id === 'KC' ? 84 : 82);
  team.city = city;
  team.name = name;
  team.abbr = id;
  team.icon = id;
  return team;
}

function buildGame(): BroadcastCommentaryGame {
  const homeTeam = buildTeam('KC', 'Kansas City', 'BBQ Fountains', true);
  const awayTeam = buildTeam('DEN', 'Denver', 'Wall Street');

  homeTeam.roster[0]!.firstName = 'Cole';
  homeTeam.roster[0]!.lastName = 'Turner';
  homeTeam.roster[0]!.name = 'Cole Turner';
  awayTeam.roster[0]!.firstName = 'Miles';
  awayTeam.roster[0]!.lastName = 'Ledger';
  awayTeam.roster[0]!.name = 'Miles Ledger';

  const players = [...homeTeam.roster, ...awayTeam.roster].reduce<BroadcastCommentaryGame['players']>((map, player) => {
    map[player.id] = player;
    return map;
  }, {});

  return {
    year: 2026,
    week: 9,
    teams: {
      KC: homeTeam,
      DEN: awayTeam,
    },
    players,
    playerArchive: [
      {
        playerId: homeTeam.roster[0]!.id,
        firstName: 'Cole',
        lastName: 'Turner',
        name: 'Cole Turner',
        positions: ['QB'],
        jerseyNumber: homeTeam.roster[0]!.jerseyNumber,
        peakOvr: 90,
        peakYear: 2025,
        firstYear: 2022,
        lastYear: 2026,
        retirementYear: null,
        teamHistory: [
          { teamId: 'DEN', firstYear: 2022, lastYear: 2025 },
          { teamId: 'KC', firstYear: 2026, lastYear: 2026 },
        ],
      },
    ],
    franchiseHistory: [
      {
        year: 2025,
        teamId: 'KC',
        wins: 13,
        losses: 4,
        ties: 0,
        record: '13-4',
        pointDifferential: 118,
        playoffFinish: 'champion',
        majorEvents: [],
        awardsWon: [],
        recordsBroken: [],
      },
      {
        year: 2025,
        teamId: 'DEN',
        wins: 10,
        losses: 7,
        ties: 0,
        record: '10-7',
        pointDifferential: 41,
        playoffFinish: 'wild_card',
        majorEvents: [],
        awardsWon: [],
        recordsBroken: [],
      },
    ],
    relationships: [
      {
        id: `${homeTeam.roster[0]!.id}:${awayTeam.roster[0]!.id}:family:2024`,
        fromId: homeTeam.roster[0]!.id,
        toId: awayTeam.roster[0]!.id,
        type: 'family',
        year: 2024,
        strength: 92,
        note: 'brothers in a Sunday split',
      },
    ],
  } as BroadcastCommentaryGame;
}

describe('broadcast-commentary', () => {
  it('returns stadium and rivalry pregame storylines from team identity content', () => {
    const commentary = buildBroadcastCommentary(buildGame(), {
      homeTeamId: 'KC',
      awayTeamId: 'DEN',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Smokehouse'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('The Cookout'))).toBe(true);
  });

  it('builds revenge commentary for a former player facing his old team', () => {
    const commentary = buildBroadcastCommentary(buildGame(), {
      homeTeamId: 'KC',
      awayTeamId: 'DEN',
      seed: 51,
    });

    expect(commentary.pregame.some((line) => line.includes('Cole Turner'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('Denver Wall Street'))).toBe(true);
  });

  it('turns active cross-team relationship edges into commentary lines', () => {
    const commentary = buildBroadcastCommentary(buildGame(), {
      homeTeamId: 'KC',
      awayTeamId: 'DEN',
      seed: 50,
    });

    expect(commentary.pregame.some((line) => line.includes('family on both sidelines'))).toBe(true);
    expect(commentary.inGame.some((line) => line.includes('family thread'))).toBe(true);
  });

  it('writes recap lines from rivalry context and the final score', () => {
    const commentary = buildBroadcastCommentary(buildGame(), {
      homeTeamId: 'KC',
      awayTeamId: 'DEN',
      seed: 50,
      result: { awayScore: 24, homeScore: 27 },
    });

    expect(commentary.recap[0]).toContain('The Cookout');
    expect(commentary.recap[0]).toContain('24-27');
  });

  it('stays deterministic for the same seed and matchup', () => {
    const game = buildGame();
    const first = buildBroadcastCommentary(game, {
      homeTeamId: 'KC',
      awayTeamId: 'DEN',
      seed: 77,
      result: { awayScore: 20, homeScore: 23 },
    });
    const second = buildBroadcastCommentary(game, {
      homeTeamId: 'KC',
      awayTeamId: 'DEN',
      seed: 77,
      result: { awayScore: 20, homeScore: 23 },
    });

    expect(second).toEqual(first);
  });

  it('returns empty output when the matchup teams are missing', () => {
    const commentary = buildBroadcastCommentary(buildGame(), {
      homeTeamId: 'KC',
      awayTeamId: 'MIA',
      seed: 10,
    });

    expect(commentary).toEqual({
      pregame: [],
      inGame: [],
      recap: [],
    });
  });
});
