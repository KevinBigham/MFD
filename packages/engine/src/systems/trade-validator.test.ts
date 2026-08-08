import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { validateTradeTransaction, getTradeAssetKey } from './trade-validator';
import { acceptTradeOffer, generateTradeOffers } from './trade-market';
import { initializeOffseasonState } from './offseason';
import { makeLeagueState } from './test-helpers';
import type { GameState, Player, DraftPick, TradeOfferAsset } from '../types';

function makeMockGame(): GameState {
  return {
    seed: 12345,
    year: 2026,
    week: 4,
    phase: 'regular_season',
    userTeamId: 'team-a',
    teams: {
      'team-a': {
        id: 'team-a',
        city: 'Chicago',
        name: 'Bears',
        abbr: 'CHI',
        wins: 2,
        losses: 1,
        ownerId: 'owner-a',
        capSpace: 20,
        roster: [
          { id: 'player-1', name: 'Player One', pos: 'WR', age: 24, ovr: 82, teamId: 'team-a' } as Player,
          { id: 'player-2', name: 'Player Two', pos: 'CB', age: 25, ovr: 78, teamId: 'team-a' } as Player,
        ],
        staff: { hc: null },
        owner: null,
        fatigueState: {},
        practiceSquad: [],
        mentoringPairs: [],
        trainingAssignments: {},
        draftPicks: [
          { currentTeamId: 'team-a', originalTeamId: 'team-a', year: 2026, round: 1, pick: 10 } as DraftPick,
        ],
        txLog: [],
      },
      'team-b': {
        id: 'team-b',
        city: 'Detroit',
        name: 'Lions',
        abbr: 'DET',
        wins: 1,
        losses: 2,
        ownerId: 'owner-b',
        capSpace: 15,
        roster: [
          { id: 'player-3', name: 'Player Three', pos: 'RB', age: 23, ovr: 85, teamId: 'team-b' } as Player,
        ],
        staff: { hc: null },
        owner: null,
        fatigueState: {},
        practiceSquad: [],
        mentoringPairs: [],
        trainingAssignments: {},
        draftPicks: [
          { currentTeamId: 'team-b', originalTeamId: 'team-b', year: 2026, round: 2, pick: 42 } as DraftPick,
        ],
        txLog: [],
      },
    },
    players: {
      'player-1': { id: 'player-1', name: 'Player One', pos: 'WR', age: 24, ovr: 82, teamId: 'team-a' } as Player,
      'player-2': { id: 'player-2', name: 'Player Two', pos: 'CB', age: 25, ovr: 78, teamId: 'team-a' } as Player,
      'player-3': { id: 'player-3', name: 'Player Three', pos: 'RB', age: 23, ovr: 85, teamId: 'team-b' } as Player,
    },
    conditionalPicks: [
      {
        id: 'cond-1',
        toTeamId: 'team-a',
        fromTeamId: 'team-b',
        resolved: false,
        basePick: { currentTeamId: 'team-a', originalTeamId: 'team-a', year: 2026, round: 3, pick: 70 },
        condition: { type: 'playoff_snap_threshold', targetSnaps: 50, upgradeRound: 2 },
        description: 'Conditional 3rd round pick',
      },
    ],
    offseasonState: {
      freeAgents: [],
      draftClass: [],
      retiredPlayers: [],
      trainingCampResults: [],
      tradeOffers: [],
    },
    activeProposals: [],
    news: [],
    socialFeed: [],
  } as unknown as GameState;
}

describe('trade-validator', () => {
  it('validates a clean player-for-player trade under canonical offer contract', () => {
    const game = makeMockGame();
    // In canonical TradeOffer contract:
    // offer.toTeamId = 'team-a' (user)
    // offer.fromTeamId = 'team-b' (AI)
    // offer.send = assets owned by 'team-a' (YOU SEND)
    // offer.receive = assets owned by 'team-b' (YOU RECEIVE)
    const result = validateTradeTransaction(game, {
      fromTeamId: 'team-b',
      toTeamId: 'team-a',
      assetsFromFromTeam: [
        { type: 'player', teamId: 'team-b', playerId: 'player-3', pickId: null, description: 'Player Three' },
      ],
      assetsFromToTeam: [
        { type: 'player', teamId: 'team-a', playerId: 'player-1', pickId: null, description: 'Player One' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('validates a clean player/pick mixed trade', () => {
    const game = makeMockGame();
    const result = validateTradeTransaction(game, {
      fromTeamId: 'team-b',
      toTeamId: 'team-a',
      assetsFromFromTeam: [
        { type: 'pick', teamId: 'team-b', playerId: null, pickId: 'team-b-2026-2-42-team-b', description: 'Round 2 pick' },
      ],
      assetsFromToTeam: [
        { type: 'player', teamId: 'team-a', playerId: 'player-1', pickId: null, description: 'Player One' },
      ],
    });

    expect(result.ok).toBe(true);
  });

  it('accepts real generated offers from generateTradeOffers pipeline', () => {
    const game = makeLeagueState('offseason', 1);
    game.offseasonState = initializeOffseasonState(game);
    const userTeam = game.teams.afce1;
    userTeam.roster[0]!.tradeBlock = true;

    const offers = generateTradeOffers(game);
    expect(offers.length).toBeGreaterThan(0);

    game.offseasonState!.tradeOffers = offers;
    const targetOffer = offers[0]!;

    const initialPlayerIds = new Set(Object.keys(game.players));
    const initialPickCount = Object.values(game.teams).reduce((acc, t) => acc + t.draftPicks.length, 0);

    const result = acceptTradeOffer(game, targetOffer.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Verify asset movement & identity conservation
    expect(Object.keys(result.nextState.players).sort()).toEqual([...initialPlayerIds].sort());
    const finalPickCount = Object.values(result.nextState.teams).reduce((acc, t) => acc + t.draftPicks.length, 0);
    expect(finalPickCount).toBe(initialPickCount);

    // Verify canonical game.players teamId agrees with roster
    for (const team of Object.values(result.nextState.teams)) {
      for (const player of team.roster) {
        expect(result.nextState.players[player.id]?.teamId).toBe(team.id);
      }
    }
  });

  it('rejects player missing from game.players dictionary', () => {
    const game = makeMockGame();
    delete game.players['player-1'];

    const result = validateTradeTransaction(game, {
      fromTeamId: 'team-b',
      toTeamId: 'team-a',
      assetsFromFromTeam: [
        { type: 'player', teamId: 'team-b', playerId: 'player-3', pickId: null, description: 'Player Three' },
      ],
      assetsFromToTeam: [
        { type: 'player', teamId: 'team-a', playerId: 'player-1', pickId: null, description: 'Player One' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === 'MISSING_PLAYER')).toBe(true);
  });

  it('rejects player duplicated on another team roster', () => {
    const game = makeMockGame();
    // Put player-1 on team-b's roster as well
    game.teams['team-b']!.roster.push(game.teams['team-a']!.roster[0]!);

    const result = validateTradeTransaction(game, {
      fromTeamId: 'team-b',
      toTeamId: 'team-a',
      assetsFromFromTeam: [
        { type: 'player', teamId: 'team-b', playerId: 'player-3', pickId: null, description: 'Player Three' },
      ],
      assetsFromToTeam: [
        { type: 'player', teamId: 'team-a', playerId: 'player-1', pickId: null, description: 'Player One' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === 'PLAYER_NOT_ON_ROSTER')).toBe(true);
  });

  it('rejects pick duplicated across teams', () => {
    const game = makeMockGame();
    // Put team-b's pick on team-a's draftPicks as well
    game.teams['team-a']!.draftPicks.push(game.teams['team-b']!.draftPicks[0]!);

    const result = validateTradeTransaction(game, {
      fromTeamId: 'team-b',
      toTeamId: 'team-a',
      assetsFromFromTeam: [
        { type: 'pick', teamId: 'team-b', playerId: null, pickId: 'team-b-2026-2-42-team-b', description: 'Round 2 pick' },
      ],
      assetsFromToTeam: [],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === 'PICK_NOT_OWNED')).toBe(true);
  });

  it('rejects conditional pick when physical base pick is missing from owner draftPicks', () => {
    const game = makeMockGame();
    // cond-1 base pick is team-a round 3 pick 70. Remove all picks from team-a.
    game.teams['team-a']!.draftPicks = [];

    const result = validateTradeTransaction(game, {
      fromTeamId: 'team-a',
      toTeamId: 'team-b',
      assetsFromFromTeam: [
        { type: 'conditional_pick', teamId: 'team-a', playerId: null, pickId: null, conditionalPickId: 'cond-1', description: 'Conditional pick' },
      ],
      assetsFromToTeam: [],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === 'PICK_NOT_OWNED')).toBe(true);
  });

  describe('deterministic executable trade fuzzing', () => {
    it('executes 100 deterministic seeds of real trade transactions asserting conservation and zero state leaks', () => {
      for (let seedIndex = 1; seedIndex <= 100; seedIndex += 1) {
        const rng = mulberry32(seedIndex * 10007);
        const game = makeLeagueState('offseason', seedIndex);
        game.offseasonState = initializeOffseasonState(game);

        const teamKeys = Object.keys(game.teams);
        const userTeamId = teamKeys[0]!;
        const aiTeamId = teamKeys[1]!;
        const userTeam = game.teams[userTeamId]!;
        const aiTeam = game.teams[aiTeamId]!;

        const initialPlayerIds = new Set(Object.keys(game.players));
        const initialPickCount = Object.values(game.teams).reduce((sum, t) => sum + t.draftPicks.length, 0);

        const userPlayer = userTeam.roster[0];
        const aiPlayer = aiTeam.roster[0];

        if (!userPlayer || !aiPlayer) continue;

        const isStale = seedIndex % 3 === 0;
        const targetPlayerId = isStale ? `non-existent-player-${seedIndex}` : aiPlayer.id;

        const offer = {
          id: `fuzz-offer-${seedIndex}`,
          fromTeamId: aiTeamId,
          toTeamId: userTeamId,
          direction: 'inbound' as const,
          summary: `Fuzz offer ${seedIndex}`,
          status: 'pending' as const,
          send: [{ type: 'player' as const, teamId: userTeamId, playerId: userPlayer.id, pickId: null, description: userPlayer.lastName }],
          receive: [{ type: 'player' as const, teamId: aiTeamId, playerId: targetPlayerId, pickId: null, description: 'Target' }],
        };

        game.offseasonState.tradeOffers = [offer];

        const result = acceptTradeOffer(game, offer.id);

        if (isStale) {
          expect(result.ok, `Seed ${seedIndex} offer ${offer.id} expected failed preflight`).toBe(false);
          if (!result.ok) {
            // Assert clone-on-write unmutated input state
            expect(game.teams[userTeamId]!.roster.some((p) => p.id === userPlayer.id)).toBe(true);
            expect(game.teams[aiTeamId]!.roster.some((p) => p.id === aiPlayer.id)).toBe(true);
          }
        } else {
          expect(result.ok, `Seed ${seedIndex} offer ${offer.id} expected successful trade`).toBe(true);
          if (result.ok) {
            const nextGame = result.nextState;

            // Asset movement verification
            expect(nextGame.teams[userTeamId]!.roster.some((p) => p.id === aiPlayer.id), `Seed ${seedIndex} user team received aiPlayer`).toBe(true);
            expect(nextGame.teams[aiTeamId]!.roster.some((p) => p.id === userPlayer.id), `Seed ${seedIndex} ai team received userPlayer`).toBe(true);

            // Conservation checks
            expect(Object.keys(nextGame.players).sort()).toEqual([...initialPlayerIds].sort());
            const finalPickCount = Object.values(nextGame.teams).reduce((sum, t) => sum + t.draftPicks.length, 0);
            expect(finalPickCount).toBe(initialPickCount);

            // Canonical mapping checks
            for (const team of Object.values(nextGame.teams)) {
              for (const player of team.roster) {
                expect(nextGame.players[player.id]?.teamId, `Seed ${seedIndex} player ${player.id} teamId`).toBe(team.id);
              }
            }

            // Global roster uniqueness check
            const seenPlayers = new Set<string>();
            for (const team of Object.values(nextGame.teams)) {
              for (const player of team.roster) {
                expect(seenPlayers.has(player.id), `Seed ${seedIndex} duplicate player ${player.id}`).toBe(false);
                seenPlayers.add(player.id);
              }
            }
          }
        }
      }
    });
  });
});
