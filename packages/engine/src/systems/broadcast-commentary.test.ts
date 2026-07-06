import { describe, expect, it } from 'vitest';
import { makeTeam } from './test-helpers';
import { buildBroadcastCommentary, type BroadcastCommentaryGame } from './broadcast-commentary';

type BroadcastTestTeamId = 'ATL' | 'BAL' | 'BOS' | 'CHI' | 'CIN' | 'CLE' | 'DAL' | 'DET' | 'KC' | 'DEN' | 'NYC' | 'PHI' | 'PIT' | 'SEA' | 'SF';

function buildTeam(id: BroadcastTestTeamId, city: string, name: string, isUser = false) {
  const conference = id === 'ATL' || id === 'CHI' || id === 'DET' || id === 'SEA' || id === 'SF' ? 'NFC' : 'AFC';
  const division = id === 'ATL' || id === 'BAL' || id === 'BOS' || id === 'NYC' || id === 'PHI' ? 'East' : id === 'CHI' || id === 'CIN' || id === 'CLE' || id === 'DET' || id === 'PIT' ? 'North' : id === 'DAL' ? 'South' : 'West';
  const team = makeTeam(id, conference, division, isUser, id === 'KC' ? 84 : 82);
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
    expect(commentary.pregame.some((line) => line.includes('smoker-fountain'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('whole bowl smells like hickory'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('The Cookout'))).toBe(true);
  });

  it('returns standalone DEN stadium tradition when Denver is home', () => {
    const commentary = buildBroadcastCommentary(buildGame(), {
      homeTeamId: 'DEN',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Exchange'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('north deck'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('brass bell is ringing'))).toBe(true);
  });

  it('returns standalone ATL stadium tradition when Atlanta is home', () => {
    const game = buildGame();
    const atlTeam = buildTeam('ATL', 'Atlanta', 'Peaches');
    game.teams.ATL = atlTeam;
    for (const player of atlTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'ATL',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Orchard'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('The Pit Drop'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('gold peach pit'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('SWEET! AS! PEACH!'))).toBe(true);
  });

  it('returns standalone CIN stadium tradition when Cincinnati is home', () => {
    const game = buildGame();
    const cinTeam = buildTeam('CIN', 'Cincinnati', 'Flying Pigs');
    game.teams.CIN = cinTeam;
    for (const player of cinTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'CIN',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Sty'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('The Flight'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('chrome flying pig'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('PIGS! FLY! PIGS! FLY!'))).toBe(true);
  });

  it('returns standalone PHI stadium tradition when Philadelphia is home', () => {
    const game = buildGame();
    const phiTeam = buildTeam('PHI', 'Philadelphia', 'Bell-Ringers');
    game.teams.PHI = phiTeam;
    for (const player of phiTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'PHI',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Belfry'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('Liberty Bell Run'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('cracked bell is swinging'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('RING! THE! BELL!'))).toBe(true);
  });

  it('returns standalone BAL stadium tradition when Baltimore is home', () => {
    const game = buildGame();
    const balTeam = buildTeam('BAL', 'Baltimore', 'Crab Pickers');
    game.teams.BAL = balTeam;
    for (const player of balTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'BAL',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Crab Pot'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('Mallet Smash'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('giant mallet is raised'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('PICK! IT! PICK! IT!'))).toBe(true);
  });

  it('returns standalone CHI stadium tradition when Chicago is home', () => {
    const game = buildGame();
    const chiTeam = buildTeam('CHI', 'Chicago', 'Deep-Dish');
    game.teams.CHI = chiTeam;
    for (const player of chiTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'CHI',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Deep Freeze'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('The First Slice'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('six-foot pie'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('DEEP! DISH!'))).toBe(true);
  });

  it('returns standalone BOS stadium tradition when Boston is home', () => {
    const game = buildGame();
    const bosTeam = buildTeam('BOS', 'Boston', 'Chowderheads');
    game.teams.BOS = bosTeam;
    for (const player of bosTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'BOS',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Kettle'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('The Ladle Drop'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('harbor bell'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes("SOUP'S! ON!"))).toBe(true);
  });

  it('returns standalone CLE stadium tradition when Cleveland is home', () => {
    const game = buildGame();
    const cleTeam = buildTeam('CLE', 'Cleveland', 'Rockers');
    game.teams.CLE = cleTeam;
    for (const player of cleTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'CLE',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Garage'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('The Power Chord'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('opening solo'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('TURN! IT! UP!'))).toBe(true);
  });

  it('returns standalone DAL stadium tradition when Dallas is home', () => {
    const game = buildGame();
    const dalTeam = buildTeam('DAL', 'Dallas', 'Rodeos');
    game.teams.DAL = dalTeam;
    for (const player of dalTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'DAL',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Corral'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('The Buck-Off'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('silver mechanical bull'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('RIDE! FOR! THE! BRAND!'))).toBe(true);
  });

  it('returns standalone PIT stadium tradition when Pittsburgh is home', () => {
    const game = buildGame();
    const pitTeam = buildTeam('PIT', 'Pittsburgh', 'Iron Smelters');
    game.teams.PIT = pitTeam;
    for (const player of pitTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'PIT',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Furnace'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('The Pour'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('ceremonial ladle'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('SMELT! IT! DOWN!'))).toBe(true);
  });

  it('returns standalone NYC stadium tradition when New York City is home', () => {
    const game = buildGame();
    const nycTeam = buildTeam('NYC', 'New York City', 'Cabbies');
    game.teams.NYC = nycTeam;
    for (const player of nycTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'NYC',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Meter'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('The Honk'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('dispatch board'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('NEXT! STOP! FIRST DOWN!'))).toBe(true);
  });

  it('returns standalone SF stadium tradition when San Francisco is home', () => {
    const game = buildGame();
    const sfTeam = buildTeam('SF', 'San Francisco', 'Sourdoughs');
    game.teams.SF = sfTeam;
    for (const player of sfTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'SF',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Starter'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('Mother Dough Rising'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('Dough Keeper is feeding'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('RISE! AND! SHINE!'))).toBe(true);
  });

  it('returns standalone SEA stadium tradition when Seattle is home', () => {
    const game = buildGame();
    const seaTeam = buildTeam('SEA', 'Seattle', 'Grunge');
    game.teams.SEA = seaTeam;
    for (const player of seaTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'SEA',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Garage'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('Eleven-String Feedback'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('tunnel guitars'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('LOUD-ER! THAN! LOVE!'))).toBe(true);
  });

  it('returns standalone DET stadium tradition when Detroit is home', () => {
    const game = buildGame();
    const detTeam = buildTeam('DET', 'Detroit', 'Music Machine');
    game.teams.DET = detTeam;
    for (const player of detTeam.roster) {
      game.players[player.id] = player;
    }

    const commentary = buildBroadcastCommentary(game, {
      homeTeamId: 'DET',
      awayTeamId: 'KC',
      seed: 49,
    });

    expect(commentary.pregame.some((line) => line.includes('The Assembly Line'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('Motor City Bass Drop'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('assembly-belt countdown'))).toBe(true);
    expect(commentary.pregame.some((line) => line.includes('HIT! THE! BEAT!'))).toBe(true);
  });

  it('builds revenge commentary for a former player facing his old team', () => {
    const commentary = buildBroadcastCommentary(buildGame(), {
      homeTeamId: 'KC',
      awayTeamId: 'DEN',
      seed: 52,
    });

    const revengeLine = commentary.pregame.find((line) => line.includes('Cole Turner')) ?? '';
    expect(revengeLine).toContain('spent all week staring at the Denver Wall Street defense in the film room');
    expect(revengeLine).toContain('This is personal.');
    expect(revengeLine).not.toContain('{{');
    expect(revengeLine).not.toContain('reunion angle');
  });

  it('surfaces an authored revenge newsline only when the current team wins', () => {
    const winnerCommentary = buildBroadcastCommentary(buildGame(), {
      homeTeamId: 'KC',
      awayTeamId: 'DEN',
      seed: 52,
      result: { awayScore: 21, homeScore: 28 },
    });
    const newsline = winnerCommentary.recap.find((line) => line.startsWith('Newswire headline:')) ?? '';
    expect(newsline).toContain('Cole Turner');
    expect(newsline).not.toContain('{{');

    const loserCommentary = buildBroadcastCommentary(buildGame(), {
      homeTeamId: 'KC',
      awayTeamId: 'DEN',
      seed: 52,
      result: { awayScore: 28, homeScore: 21 },
    });
    expect(loserCommentary.recap.some((line) => line.startsWith('Newswire headline:'))).toBe(false);
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
