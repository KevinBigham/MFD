/**
 * Central game state store — Zustand + Immer.
 *
 * Holds the full GameState from @mfd/engine and exposes actions
 * that call engine functions to mutate state.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  ContractOffer, GameState, SeasonPhase, Team, WeeklySummary,
} from '@mfd/engine';
import {
  restructureContract, backloadContract,
  calcCapHit, calcDeadMoney,
  updateOwnerApproval,
  updateSystemFit,
  earnXP,
  getSalaryCap,
  submitReSignOffer as submitReSignOfferEngine,
  submitFreeAgentBid as submitFreeAgentBidEngine,
  runScoutingAction as runScoutingActionEngine,
  acceptTradeOffer as acceptTradeOfferEngine,
  rejectTradeOffer as rejectTradeOfferEngine,
  makeDraftPick as makeDraftPickEngine,
} from '@mfd/engine';
import { autosaveDynasty, loadLatestAutosaveGame } from './persistence';
import type { GameStoreState } from './selectors';
import { runAdvanceWeek } from './sim';
import { useUiStore } from './ui-store';
export * from './selectors';

// ── Store shape ────────────────────────────────────────────

interface GameActions {
  // Initialization
  newGame: (state: GameState) => Promise<void>;
  loadGame: (state: GameState) => void;
  loadLatestAutosave: () => Promise<boolean>;

  // Roster actions
  cutPlayer: (teamId: string, playerId: string) => void;
  toggleTradeBlock: (teamId: string, playerId: string) => void;
  setStarter: (teamId: string, playerId: string, isStarter: boolean) => void;

  // Contract actions
  restructure: (teamId: string, playerId: string) => void;
  backload: (teamId: string, playerId: string, voidYears?: number) => void;

  // Week advance
  advanceWeek: () => Promise<WeeklySummary | null>;

  // Offseason actions
  submitReSignOffer: (playerId: string, offer: ContractOffer) => Promise<void>;
  submitFreeAgentBid: (playerId: string, offer: ContractOffer) => Promise<void>;
  runScoutingAction: (prospectId: string, action: 'film' | 'combine' | 'interview') => Promise<void>;
  acceptTradeOffer: (offerId: string) => Promise<void>;
  rejectTradeOffer: (offerId: string) => Promise<void>;
  makeDraftPick: (prospectId: string) => Promise<void>;

  // Owner
  refreshOwner: (teamId: string) => void;

  // Coaching
  addClinicXP: (teamId: string, track: string, amount: number) => void;

  // Season phase
  setPhase: (phase: SeasonPhase) => void;
  setDifficulty: (difficulty: GameState['difficulty']) => Promise<void>;
}

interface GameStore extends GameStoreState {
  actions: GameActions;
}

// ── Store ──────────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  immer((set, get) => {
    const commitGame = async (nextGame: GameState) => {
      set((s) => {
        s.game = nextGame;
        s.initialized = true;
      });
      if (useUiStore.getState().autosaveEnabled) {
        await autosaveDynasty(nextGame);
      }
    };

    return ({
    game: null,
    initialized: false,

    actions: {
      newGame: async (initial) => {
        set((s) => {
          s.game = initial;
          s.initialized = true;
        });
        await autosaveDynasty(initial);
      },

      loadGame: (loaded) =>
        set((s) => {
          s.game = loaded;
          s.initialized = true;
        }),

      loadLatestAutosave: async () => {
        const latest = await loadLatestAutosaveGame();
        if (!latest) return false;

        set((s) => {
          s.game = latest;
          s.initialized = true;
        });
        return true;
      },

      cutPlayer: (teamId, playerId) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;

          const idx = team.roster.findIndex((p) => p.id === playerId);
          if (idx === -1) return;

          const player = team.roster[idx]!;

          // Calculate dead money if player has a contract
          if (player.contract) {
            const dead = calcDeadMoney(player.contract);
            team.deadCap += dead;
            team.capUsed -= calcCapHit(player.contract) - dead;
            team.capSpace = getSalaryCap(s.game.year) - team.capUsed;
          }

          // Remove from roster, add to free agents
          team.roster.splice(idx, 1);
          player.teamId = null;
          player.contract = null;
          s.game.freeAgents.push(playerId);
        }),

      toggleTradeBlock: (teamId, playerId) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;
          const player = team.roster.find((p) => p.id === playerId);
          if (player) player.tradeBlock = !player.tradeBlock;
        }),

      setStarter: (teamId, playerId, isStarter) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;
          const player = team.roster.find((p) => p.id === playerId);
          if (player) player.isStarter = isStarter;
        }),

      restructure: (teamId, playerId) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;
          const player = team.roster.find((p) => p.id === playerId);
          if (!player?.contract) return;

          // restructureContract takes { contract } wrapper
          const result = restructureContract({ contract: player.contract });
          if (result.ok) {
            // The engine mutates the contract in-place; update cap numbers
            team.capUsed -= result.savings;
            team.capSpace += result.savings;
          }
        }),

      backload: (teamId, playerId, voidYears = 2) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;
          const player = team.roster.find((p) => p.id === playerId);
          if (!player?.contract) return;

          const result = backloadContract({ contract: player.contract }, voidYears);
          if (result.ok) {
            team.capUsed -= result.savings;
            team.capSpace += result.savings;
          }
        }),

      advanceWeek: async () => {
        const current = get().game;
        if (!current) return null;

        const result = await runAdvanceWeek(current);
        const nextGame = result.nextState;
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;

        if (userTeam) {
          updateSystemFit(userTeam);
        }

        await commitGame(nextGame);

        return nextGame.weekSummaries.at(-1) ?? null;
      },

      submitReSignOffer: async (playerId, offer) => {
        const current = get().game;
        if (!current) return;
        const result = submitReSignOfferEngine(current, playerId, offer);
        await commitGame(result.nextState);
      },

      submitFreeAgentBid: async (playerId, offer) => {
        const current = get().game;
        if (!current) return;
        const result = submitFreeAgentBidEngine(current, playerId, offer);
        await commitGame(result.nextState);
      },

      runScoutingAction: async (prospectId, action) => {
        const current = get().game;
        if (!current) return;
        const result = runScoutingActionEngine(current, prospectId, action);
        await commitGame(result.nextState);
      },

      acceptTradeOffer: async (offerId) => {
        const current = get().game;
        if (!current) return;
        const result = acceptTradeOfferEngine(current, offerId);
        await commitGame(result.nextState);
      },

      rejectTradeOffer: async (offerId) => {
        const current = get().game;
        if (!current) return;
        const result = rejectTradeOfferEngine(current, offerId);
        await commitGame(result.nextState);
      },

      makeDraftPick: async (prospectId) => {
        const current = get().game;
        if (!current) return;
        const result = makeDraftPickEngine(current, prospectId);
        await commitGame(result.nextState);
      },

      refreshOwner: (teamId) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;

          const result = updateOwnerApproval(
            team.owner as unknown as import('@mfd/engine').OwnerState,
            team as unknown as Team,
            { year: s.game.year, week: s.game.week, phase: s.game.phase },
          );
          team.owner.approval = result.approval;
          team.owner.history.push({
            year: s.game.year,
            week: s.game.week,
            approval: result.approval,
            delta: result.delta,
          });
        }),

      addClinicXP: (teamId, track, amount) =>
        set((s) => {
          if (!s.game) return;
          const team = s.game.teams[teamId];
          if (!team) return;
          const result = earnXP(team.clinic, track, amount);
          team.clinic = result;
        }),

      setPhase: (phase) =>
        set((s) => {
          if (!s.game) return;
          s.game.phase = phase;
        }),

      setDifficulty: async (difficulty) => {
        const current = get().game;
        if (!current) return;
        const nextGame = {
          ...current,
          difficulty,
        };
        await commitGame(nextGame);
      },
    },
  });
  }),
);
