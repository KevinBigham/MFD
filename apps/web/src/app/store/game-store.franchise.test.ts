import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeExpansionDraft, mulberry32 } from '@mfd/engine';
import type { GameState } from '@mfd/engine';
import { createSeedGameState } from './seed';
import { useGameStore } from './game-store';

vi.mock('./persistence', () => ({
  autosaveDynasty: () => Promise.resolve(),
  loadLatestAutosaveGame: () => Promise.resolve(null),
}));

vi.mock('./sim', () => ({
  runAdvanceWeek: (game: GameState) => Promise.resolve({ nextState: game, events: [], consequences: [] }),
  runPreviewHalftimeDecision: () => Promise.resolve(null),
}));

function loadGame(game: GameState) {
  useGameStore.setState({ game, initialized: true });
}

function currentGame() {
  const game = useGameStore.getState().game;
  if (!game) {
    throw new Error('Expected game state');
  }
  return game;
}

function userTeam(game: GameState) {
  const team = Object.values(game.teams).find((entry) => entry.isUser);
  if (!team) {
    throw new Error('Expected user team');
  }
  return team;
}

describe('game-store franchise actions', () => {
  beforeEach(() => {
    useGameStore.setState({ game: null, initialized: false });
  });

  afterEach(() => {
    useGameStore.setState({ game: null, initialized: false });
  });

  it('upgrades the user stadium and spends cap space', async () => {
    const game = createSeedGameState(0);
    const team = userTeam(game);
    team.capSpace = 120;
    loadGame(game);

    await useGameStore.getState().actions.upgradeStadium();

    const nextTeam = userTeam(currentGame());
    expect(nextTeam.franchiseIdentity.stadiumLevel).toBe(2);
    expect(nextTeam.capSpace).toBe(70);
  });

  it('accepts naming rights offers and clears the offer board', async () => {
    const game = createSeedGameState(0);
    game.stadiumDealOffers = [
      { sponsorName: 'TechNova Field', revenuePerYear: 8, yearsTotal: 5, yearsRemaining: 5, prestigeBonus: 3 },
    ];
    loadGame(game);

    await useGameStore.getState().actions.acceptNamingRights(0);

    const nextGame = currentGame();
    expect(userTeam(nextGame).franchiseIdentity.stadiumName).toBe('TechNova Field');
    expect(nextGame.stadiumDealOffers).toEqual([]);
  });

  it('relocates the user franchise and records relocation history', async () => {
    const game = createSeedGameState(0);
    game.year = 2031;
    const team = userTeam(game);
    team.capSpace = 120;
    loadGame(game);

    await useGameStore.getState().actions.relocateTeam('LDN');

    const movedTeam = userTeam(currentGame());
    expect(movedTeam.city).toBe('London');
    expect(movedTeam.name).toBe('Monarchs');
    expect(movedTeam.franchiseIdentity.relocationHistory).toHaveLength(1);
  });

  it('does not relocate before the eligibility window', async () => {
    const game = createSeedGameState(0);
    game.year = 2028;
    const team = userTeam(game);
    team.capSpace = 120;
    loadGame(game);

    await useGameStore.getState().actions.relocateTeam('LDN');

    const unchangedTeam = userTeam(currentGame());
    expect(unchangedTeam.city).not.toBe('London');
    expect(unchangedTeam.franchiseIdentity.relocationHistory).toEqual([]);
  });

  it('does not relocate to a selected destination the franchise cannot afford', async () => {
    const game = createSeedGameState(0);
    game.year = 2031;
    const team = userTeam(game);
    team.capSpace = 40;
    loadGame(game);

    await useGameStore.getState().actions.relocateTeam('LDN');

    const unchangedTeam = userTeam(currentGame());
    expect(unchangedTeam.city).not.toBe('London');
    expect(unchangedTeam.capSpace).toBe(40);
    expect(unchangedTeam.franchiseIdentity.relocationHistory).toEqual([]);
  });

  it('protects expansion players and completes the preview draft', async () => {
    const game = createSeedGameState(0);
    const team = userTeam(game);
    game.year = 2037;
    game.expansionDraftState = initializeExpansionDraft(game, mulberry32(5));
    loadGame(game);

    const protectedIds = [...team.roster]
      .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))
      .slice(0, 15)
      .map((player) => player.id);

    await useGameStore.getState().actions.protectExpansionPlayers(protectedIds);

    expect(currentGame().expansionDraftState?.phase).toBe('complete');
    expect(currentGame().expansionDraftState?.selectedPlayers.length).toBeGreaterThan(0);
  });

  it('finalizes the expansion draft and adds the new franchise to the league', async () => {
    const game = createSeedGameState(0);
    const team = userTeam(game);
    game.year = 2037;
    game.expansionDraftState = initializeExpansionDraft(game, mulberry32(7));
    loadGame(game);

    const protectedIds = [...team.roster]
      .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))
      .slice(0, 15)
      .map((player) => player.id);

    await useGameStore.getState().actions.protectExpansionPlayers(protectedIds);
    await useGameStore.getState().actions.finalizeExpansionDraft();

    const nextGame = currentGame();
    expect(Object.keys(nextGame.teams)).toHaveLength(33);
    expect(nextGame.expansionDraftState).toBeUndefined();
  });
});
