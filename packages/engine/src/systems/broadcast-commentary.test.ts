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

  it('turns an active cross-team relationship edge into commentary at exactly one stage', () => {
    // Sprint 53 regression: previously the same edge fired in pregame, in-game,
    // AND recap — so a single family thread became a thread the booth hammered
    // three times. After the fix, each edge surfaces once per game; the chosen
    // stage rotates deterministically off seed % 3.
    const family = (line: string) => line.includes('family');

    // seed 51 % 3 === 0 → pregame
    const pregameOnly = buildBroadcastCommentary(buildGame(), { homeTeamId: 'KC', awayTeamId: 'DEN', seed: 51 });
    expect(pregameOnly.pregame.some(family)).toBe(true);
    expect(pregameOnly.inGame.some(family)).toBe(false);
    expect(pregameOnly.recap.some(family)).toBe(false);

    // seed 49 % 3 === 1 → inGame
    const inGameOnly = buildBroadcastCommentary(buildGame(), { homeTeamId: 'KC', awayTeamId: 'DEN', seed: 49 });
    expect(inGameOnly.pregame.some(family)).toBe(false);
    expect(inGameOnly.inGame.some(family)).toBe(true);
    expect(inGameOnly.recap.some(family)).toBe(false);

    // seed 50 % 3 === 2 → recap
    const recapOnly = buildBroadcastCommentary(buildGame(), { homeTeamId: 'KC', awayTeamId: 'DEN', seed: 50 });
    expect(recapOnly.pregame.some(family)).toBe(false);
    expect(recapOnly.inGame.some(family)).toBe(false);
    expect(recapOnly.recap.some(family)).toBe(true);
  });

  it('writes recap lines from rivalry context and the final score', () => {
    const commentary = buildBroadcastCommentary(buildGame(), {
      homeTeamId: 'KC',
      awayTeamId: 'DEN',
      seed: 50,
      result: { awayScore: 24, homeScore: 27 },
    });

    expect(commentary.recap[0]).toContain('The Cookout');
    // Winner score first, regardless of home/away — KC won 27-24.
    expect(commentary.recap[0]).toContain('27-24');
    expect(commentary.recap[0]).not.toContain('24-27');
  });

  it('formats recap score winner-first when the away team wins', () => {
    const commentary = buildBroadcastCommentary(buildGame(), {
      homeTeamId: 'KC',
      awayTeamId: 'DEN',
      seed: 81,
      // DEN (away) wins 31-17.
      result: { awayScore: 31, homeScore: 17 },
    });

    // Winner score (31) precedes loser score (17), no matter which side won.
    expect(commentary.recap[0]).toContain('31-17');
    expect(commentary.recap[0]).not.toContain('17-31');
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
