import { describe, expect, it } from 'vitest';
import { advanceOffseason } from './offseason';
import { generateTradeOffers } from './trade-market';
import { applyTeamPhilosophies, derivePhilosophy } from './ai-philosophy';
import { makeLeagueState } from './test-helpers';

function historyEntry(
  teamId: string,
  year: number,
  wins: number,
  losses: number,
  playoffFinish = 'regular_season',
) {
  return {
    year,
    teamId,
    wins,
    losses,
    ties: 0,
    record: `${wins}-${losses}`,
    pointDifferential: (wins - losses) * 8,
    playoffFinish,
    majorEvents: [],
    awardsWon: [],
    recordsBroken: [],
  };
}

describe('ai philosophy', () => {
  it('derives the same philosophy for the same inputs', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afce2!;
    const recentRecords = [
      historyEntry(team.id, 2024, 11, 6, 'divisional_exit'),
      historyEntry(team.id, 2025, 12, 5, 'conference_final_exit'),
    ];
    const capStatus = { capSpace: 9, deadCap: 4, capUsed: 212 };

    const first = derivePhilosophy(team, recentRecords, capStatus, 27.8);
    const second = derivePhilosophy(team, recentRecords, capStatus, 27.8);

    expect(first).toBe('contend');
    expect(second).toBe(first);
  });

  it('reaches all four philosophy states from plausible team inputs', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afce2!;

    expect(derivePhilosophy(
      team,
      [historyEntry(team.id, 2025, 12, 5, 'conference_final_exit'), historyEntry(team.id, 2026, 11, 6, 'divisional_exit')],
      { capSpace: 8, deadCap: 5, capUsed: 218 },
      28.4,
    )).toBe('contend');

    expect(derivePhilosophy(
      team,
      [historyEntry(team.id, 2024, 4, 13, 'missed_playoffs'), historyEntry(team.id, 2025, 5, 12, 'missed_playoffs'), historyEntry(team.id, 2026, 6, 11, 'missed_playoffs')],
      { capSpace: 24, deadCap: 2, capUsed: 187 },
      24.3,
    )).toBe('rebuild');

    expect(derivePhilosophy(
      team,
      [historyEntry(team.id, 2025, 9, 8, 'regular_season'), historyEntry(team.id, 2026, 8, 9, 'regular_season')],
      { capSpace: 11, deadCap: 7, capUsed: 203 },
      27.1,
    )).toBe('maintain');

    expect(derivePhilosophy(
      team,
      [historyEntry(team.id, 2025, 11, 6, 'divisional_exit'), historyEntry(team.id, 2026, 7, 10, 'regular_season')],
      { capSpace: -6, deadCap: 30, capUsed: 239 },
      29.8,
    )).toBe('fire_sale');
  });

  it('uses fire_sale to open veteran trade offers that maintain will skip', () => {
    const maintainGame = makeLeagueState('offseason');
    const fireSaleGame = makeLeagueState('offseason');
    const maintainUser = maintainGame.teams.afce1!;
    const fireSaleUser = fireSaleGame.teams.afce1!;
    Object.values(maintainGame.teams).forEach((team) => { team.isUser = team.id === maintainUser.id; });
    Object.values(fireSaleGame.teams).forEach((team) => { team.isUser = team.id === fireSaleUser.id; });
    maintainUser.draftPicks = [{
      round: 1,
      pick: 12,
      originalTeamId: maintainUser.id,
      currentTeamId: maintainUser.id,
      year: maintainGame.year,
      isCompPick: false,
    }];
    fireSaleUser.draftPicks = [{
      round: 1,
      pick: 12,
      originalTeamId: fireSaleUser.id,
      currentTeamId: fireSaleUser.id,
      year: fireSaleGame.year,
      isCompPick: false,
    }];
    const maintainSeller = maintainGame.teams.afce2!;
    const fireSaleSeller = fireSaleGame.teams.afce2!;
    const maintainVeteran = maintainSeller.roster.find((player) => player.pos === 'QB')!;
    const fireSaleVeteran = fireSaleSeller.roster.find((player) => player.pos === 'QB')!;

    maintainSeller.gmStrategy = 'neutral';
    maintainSeller.philosophy = 'maintain';
    maintainSeller.capSpace = -5;
    maintainSeller.deadCap = 29;
    maintainVeteran.age = 33;
    maintainVeteran.ovr = 84;
    maintainVeteran.tradeBlock = false;

    fireSaleSeller.gmStrategy = 'neutral';
    fireSaleSeller.philosophy = 'fire_sale';
    fireSaleSeller.capSpace = -5;
    fireSaleSeller.deadCap = 29;
    fireSaleVeteran.age = 33;
    fireSaleVeteran.ovr = 84;
    fireSaleVeteran.tradeBlock = false;

    const maintainOffers = generateTradeOffers(maintainGame);
    const fireSaleOffers = generateTradeOffers(fireSaleGame);

    expect(maintainOffers.some((offer) => offer.receive.some((asset) => asset.playerId === maintainVeteran.id))).toBe(false);
    expect(fireSaleOffers.some((offer) => offer.receive.some((asset) => asset.playerId === fireSaleVeteran.id))).toBe(true);
  });

  it('persists philosophy across an offseason tick', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afce2!;
    game.year = 2027;
    game.franchiseHistory = [
      historyEntry(team.id, 2025, 11, 6, 'divisional_exit'),
      historyEntry(team.id, 2026, 12, 5, 'conference_final_exit'),
    ];
    team.philosophy = 'contend';
    team.capSpace = 7;
    team.deadCap = 4;

    advanceOffseason(game);

    expect(game.teams[team.id]?.philosophy).toBe('contend');
  });

  it('emits a single headline when a philosophy changes', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afce2!;
    game.franchiseHistory = [
      historyEntry(team.id, 2025, 11, 6, 'divisional_exit'),
      historyEntry(team.id, 2026, 7, 10, 'regular_season'),
    ];
    team.philosophy = 'maintain';
    team.capSpace = -6;
    team.deadCap = 31;

    const first = applyTeamPhilosophies(game, 2026);
    const second = applyTeamPhilosophies(game, 2026);

    expect(first).toHaveLength(1);
    expect(first[0]?.headline).toContain('FIRE SALE');
    expect(second).toEqual([]);
  });
});
