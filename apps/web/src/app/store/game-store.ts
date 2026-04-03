/**
 * Central game state store — Zustand + Immer.
 *
 * Holds the full GameState from @mfd/engine and exposes actions
 * that call engine functions to mutate state.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  ContractOffer, GameState, SeasonPhase, Team, TradeOfferAsset, TradeProposal, TrainingFocus, WeeklySummary,
} from '@mfd/engine';
import {
  addToPracticeSquad as addToPracticeSquadEngine,
  assignTraining as assignTrainingEngine,
  acceptCounterProposal as acceptCounterProposalEngine,
  cutPlayerToWaivers as cutPlayerToWaiversEngine,
  createTradeProposal as createTradeProposalEngine,
  elevateFromPracticeSquad as elevateFromPracticeSquadEngine,
  fireScout as fireScoutEngine,
  hireScout as hireScoutEngine,
  makePlayerPromise as makePlayerPromiseEngine,
  removeFromPracticeSquad as removeFromPracticeSquadEngine,
  restructureContract, backloadContract,
  calcCapHit, calcDeadMoney,
  runProDay as runProDayEngine,
  updateOwnerApproval,
  updateSystemFit,
  earnXP,
  getSalaryCap,
  submitReSignOffer as submitReSignOfferEngine,
  submitFreeAgentBid as submitFreeAgentBidEngine,
  runScoutingAction as runScoutingActionEngine,
  rejectCounterProposal as rejectCounterProposalEngine,
  submitWaiverClaim as submitWaiverClaimEngine,
  submitProposal as submitTradeProposalEngine,
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
  cutPlayer: (teamId: string, playerId: string) => Promise<void>;
  toggleTradeBlock: (teamId: string, playerId: string) => void;
  setStarter: (teamId: string, playerId: string, isStarter: boolean) => void;
  addToPracticeSquad: (teamId: string, playerId: string) => Promise<void>;
  removeFromPracticeSquad: (teamId: string, playerId: string) => Promise<void>;
  elevatePracticeSquadPlayer: (teamId: string, playerId: string) => Promise<void>;
  submitWaiverClaim: (teamId: string, playerId: string) => Promise<void>;
  assignTraining: (teamId: string, playerId: string, focus: TrainingFocus) => Promise<void>;

  // Contract actions
  restructure: (teamId: string, playerId: string) => void;
  backload: (teamId: string, playerId: string, voidYears?: number) => void;

  // Week advance
  advanceWeek: () => Promise<WeeklySummary | null>;

  // Offseason actions
  submitReSignOffer: (playerId: string, offer: ContractOffer) => Promise<void>;
  submitFreeAgentBid: (playerId: string, offer: ContractOffer) => Promise<void>;
  runScoutingAction: (prospectId: string, action: 'film' | 'combine' | 'interview') => Promise<void>;
  runProDay: (prospectId: string) => Promise<void>;
  hireScout: (scoutId: string) => Promise<void>;
  fireScout: (scoutId: string) => Promise<void>;
  acceptTradeOffer: (offerId: string) => Promise<void>;
  rejectTradeOffer: (offerId: string) => Promise<void>;
  createTradeProposal: (
    fromTeamId: string,
    toTeamId: string,
    offering: TradeOfferAsset[],
    requesting: TradeOfferAsset[],
  ) => Promise<TradeProposal | null>;
  submitTradeProposal: (proposalId: string) => Promise<TradeProposal | null>;
  acceptCounter: (proposalId: string) => Promise<TradeProposal | null>;
  rejectCounter: (proposalId: string) => Promise<TradeProposal | null>;
  makeDraftPick: (prospectId: string) => Promise<void>;
  makePromise: (teamId: string, playerId: string, promiseType: 'starter' | 'no_trade' | 'restructure') => Promise<void>;

  // Owner
  refreshOwner: (teamId: string) => void;

  // Coaching
  addClinicXP: (teamId: string, track: string, amount: number) => void;

  // Season phase
  setPhase: (phase: SeasonPhase) => void;
  setDifficulty: (difficulty: GameState['difficulty']) => Promise<void>;
  setAdaptiveDifficultyEnabled: (enabled: boolean) => Promise<void>;
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

    const cloneForMutation = (game: GameState): GameState => structuredClone(game);

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

      cutPlayer: async (teamId, playerId) => {
        const current = get().game;
        if (!current) return;
        const result = cutPlayerToWaiversEngine(cloneForMutation(current), teamId, playerId);
        await commitGame(result.nextState);
      },

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

      addToPracticeSquad: async (teamId, playerId) => {
        const current = get().game;
        if (!current) return;
        const result = addToPracticeSquadEngine(cloneForMutation(current), teamId, playerId);
        await commitGame(result.nextState);
      },

      removeFromPracticeSquad: async (teamId, playerId) => {
        const current = get().game;
        if (!current) return;
        const result = removeFromPracticeSquadEngine(cloneForMutation(current), teamId, playerId);
        await commitGame(result.nextState);
      },

      elevatePracticeSquadPlayer: async (teamId, playerId) => {
        const current = get().game;
        if (!current) return;
        const result = elevateFromPracticeSquadEngine(cloneForMutation(current), teamId, playerId);
        await commitGame(result.nextState);
      },

      submitWaiverClaim: async (teamId, playerId) => {
        const current = get().game;
        if (!current) return;
        const result = submitWaiverClaimEngine(cloneForMutation(current), teamId, playerId);
        await commitGame(result.nextState);
      },

      assignTraining: async (teamId, playerId, focus) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        assignTrainingEngine(nextGame, teamId, playerId, focus);
        await commitGame(nextGame);
      },

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

      runProDay: async (prospectId) => {
        const current = get().game;
        if (!current) return;
        const result = runProDayEngine(current, prospectId);
        await commitGame(result.nextState);
      },

      hireScout: async (scoutId) => {
        const current = get().game;
        if (!current) return;
        const result = hireScoutEngine(current, scoutId);
        await commitGame(result.nextState);
      },

      fireScout: async (scoutId) => {
        const current = get().game;
        if (!current) return;
        const result = fireScoutEngine(current, scoutId);
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

      createTradeProposal: async (fromTeamId, toTeamId, offering, requesting) => {
        const current = get().game;
        if (!current) return null;
        const nextGame = cloneForMutation(current);
        const proposal = createTradeProposalEngine(nextGame, fromTeamId, toTeamId, offering, requesting);
        await commitGame(nextGame);
        return proposal;
      },

      submitTradeProposal: async (proposalId) => {
        const current = get().game;
        if (!current) return null;
        const nextGame = cloneForMutation(current);
        const { proposal } = submitTradeProposalEngine(nextGame, proposalId);
        await commitGame(nextGame);
        return proposal;
      },

      acceptCounter: async (proposalId) => {
        const current = get().game;
        if (!current) return null;
        const nextGame = cloneForMutation(current);
        const proposal = acceptCounterProposalEngine(nextGame, proposalId);
        await commitGame(nextGame);
        return proposal;
      },

      rejectCounter: async (proposalId) => {
        const current = get().game;
        if (!current) return null;
        const nextGame = cloneForMutation(current);
        const proposal = rejectCounterProposalEngine(nextGame, proposalId);
        await commitGame(nextGame);
        return proposal;
      },

      makeDraftPick: async (prospectId) => {
        const current = get().game;
        if (!current) return;
        const result = makeDraftPickEngine(current, prospectId);
        await commitGame(result.nextState);
      },

      makePromise: async (teamId, playerId, promiseType) => {
        const current = get().game;
        if (!current) return;
        const result = makePlayerPromiseEngine(cloneForMutation(current), teamId, playerId, promiseType);
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

      setAdaptiveDifficultyEnabled: async (enabled) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        nextGame.difficultyState.enabled = enabled;
        if (!enabled) {
          nextGame.difficultyState.adaptiveSlider = 50;
        }
        await commitGame(nextGame);
      },
    },
  });
  }),
);
