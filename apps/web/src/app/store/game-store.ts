/**
 * Central game state store — Zustand + Immer.
 *
 * Holds the full GameState from @mfd/engine and exposes actions
 * that call engine functions to mutate state.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  ContractOffer, DashboardWidget, GameState, SeasonPhase, Team, TradeOfferAsset, TradeProposal, TrainingFocus, WeeklySummary,
} from '@mfd/engine';
import {
  addToPracticeSquad as addToPracticeSquadEngine,
  activateFromIR as activateFromIREngine,
  advanceTutorial as advanceTutorialEngine,
  assignTraining as assignTrainingEngine,
  acceptCounterProposal as acceptCounterProposalEngine,
  completeTutorialAction as completeTutorialActionEngine,
  cutPlayerToWaivers as cutPlayerToWaiversEngine,
  createTradeProposal as createTradeProposalEngine,
  dismissTutorial as dismissTutorialEngine,
  elevateFromPracticeSquad as elevateFromPracticeSquadEngine,
  fireScout as fireScoutEngine,
  hireMedicalStaff as hireMedicalStaffEngine,
  hireScout as hireScoutEngine,
  makePlayerPromise as makePlayerPromiseEngine,
  placeOnIR as placeOnIREngine,
  removeFromPracticeSquad as removeFromPracticeSquadEngine,
  restructureContract, backloadContract,
  calcCapHit, calcDeadMoney,
  runProDay as runProDayEngine,
  updateOwnerApproval,
  updateSystemFit,
  earnXP,
  getSalaryCap,
  assignKickReturner as assignKickReturnerEngine,
  assignPuntReturner as assignPuntReturnerEngine,
  createLayout as createDashboardLayout,
  pinWidget as pinDashboardWidget,
  reorderWidgets as reorderDashboardWidgets,
  submitReSignOffer as submitReSignOfferEngine,
  submitFreeAgentBid as submitFreeAgentBidEngine,
  runScoutingAction as runScoutingActionEngine,
  rejectCounterProposal as rejectCounterProposalEngine,
  submitWaiverClaim as submitWaiverClaimEngine,
  switchLayout as switchDashboardLayout,
  submitProposal as submitTradeProposalEngine,
  acceptTradeOffer as acceptTradeOfferEngine,
  rejectTradeOffer as rejectTradeOfferEngine,
  makeDraftPick as makeDraftPickEngine,
  unpinWidget as unpinDashboardWidget,
  upgradeFacility as upgradeFacilityEngine,
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
  placeOnIR: (teamId: string, playerId: string) => Promise<void>;
  activateFromIR: (teamId: string, playerId: string) => Promise<void>;
  advanceTutorial: (actionId?: string) => Promise<void>;
  dismissTutorial: () => Promise<void>;

  // Contract actions
  restructure: (teamId: string, playerId: string) => void;
  backload: (teamId: string, playerId: string, voidYears?: number) => void;
  negotiateContract: (playerId: string, offer: ContractOffer) => Promise<void>;

  // Week advance
  advanceWeek: () => Promise<WeeklySummary | null>;

  // Offseason actions
  submitReSignOffer: (playerId: string, offer: ContractOffer) => Promise<void>;
  submitFreeAgentBid: (playerId: string, offer: ContractOffer) => Promise<void>;
  runScoutingAction: (prospectId: string, action: 'film' | 'combine' | 'interview') => Promise<void>;
  runProDay: (prospectId: string) => Promise<void>;
  hireScout: (scoutId: string) => Promise<void>;
  fireScout: (scoutId: string) => Promise<void>;
  upgradeFacility: (teamId: string, facilityType: 'training_complex' | 'medical_center' | 'film_room' | 'weight_room' | 'recovery_suite') => Promise<void>;
  hireMedicalStaff: (teamId: string, staffId: string) => Promise<void>;
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
  pinWidget: (widgetType: DashboardWidget) => Promise<void>;
  unpinWidget: (widgetType: DashboardWidget) => Promise<void>;
  switchLayout: (layoutId: string) => Promise<void>;
  saveLayout: (name: string, widgets: DashboardWidget[], columns: 2 | 3, layoutId?: string) => Promise<void>;
  assignKickReturner: (teamId: string, playerId: string) => Promise<void>;
  assignPuntReturner: (teamId: string, playerId: string) => Promise<void>;
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
    const runContractNegotiation = async (playerId: string, offer: ContractOffer) => {
      const current = get().game;
      if (!current) return;
      const result = submitReSignOfferEngine(current, playerId, offer);
      await commitGame(result.nextState);
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
          if (player) {
            player.isStarter = isStarter;
            if (isStarter) {
              completeTutorialActionEngine(s.game, 'depth_chart:update');
            }
          }
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
        completeTutorialActionEngine(nextGame, 'training:assign');
        await commitGame(nextGame);
      },

      placeOnIR: async (teamId, playerId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        placeOnIREngine(nextGame, teamId, playerId);
        await commitGame(nextGame);
      },

      activateFromIR: async (teamId, playerId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        activateFromIREngine(nextGame, teamId, playerId);
        await commitGame(nextGame);
      },

      advanceTutorial: async (actionId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        if (actionId) {
          completeTutorialActionEngine(nextGame, actionId);
        } else {
          advanceTutorialEngine(nextGame);
        }
        await commitGame(nextGame);
      },

      dismissTutorial: async () => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        dismissTutorialEngine(nextGame);
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

        completeTutorialActionEngine(nextGame, 'week:advance');
        await commitGame(nextGame);

        return nextGame.weekSummaries.at(-1) ?? null;
      },

      submitReSignOffer: async (playerId, offer) => {
        await runContractNegotiation(playerId, offer);
      },

      negotiateContract: async (playerId, offer) => {
        await runContractNegotiation(playerId, offer);
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
        completeTutorialActionEngine(result.nextState, 'scouting:action');
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

      upgradeFacility: async (teamId, facilityType) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        upgradeFacilityEngine(nextGame, teamId, facilityType);
        await commitGame(nextGame);
      },

      hireMedicalStaff: async (teamId, staffId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        hireMedicalStaffEngine(nextGame, teamId, staffId);
        await commitGame(nextGame);
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
        completeTutorialActionEngine(result.nextState, 'handshake:create');
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

      pinWidget: async (widgetType) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        pinDashboardWidget(nextGame, widgetType);
        await commitGame(nextGame);
      },

      unpinWidget: async (widgetType) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        unpinDashboardWidget(nextGame, widgetType);
        await commitGame(nextGame);
      },

      switchLayout: async (layoutId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        switchDashboardLayout(nextGame, layoutId);
        await commitGame(nextGame);
      },

      saveLayout: async (name, widgets, columns, layoutId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);

        if (layoutId) {
          const layout = nextGame.dashboardState?.layouts.find((entry) => entry.id === layoutId);
          if (layout) {
            layout.name = name;
            layout.columns = columns;
            reorderDashboardWidgets(nextGame, layoutId, widgets);
            switchDashboardLayout(nextGame, layoutId);
            await commitGame(nextGame);
            return;
          }
        }

        const layout = createDashboardLayout(nextGame, name, widgets, columns);
        switchDashboardLayout(nextGame, layout.id);
        await commitGame(nextGame);
      },

      assignKickReturner: async (teamId, playerId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        assignKickReturnerEngine(nextGame, teamId, playerId);
        await commitGame(nextGame);
      },

      assignPuntReturner: async (teamId, playerId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        assignPuntReturnerEngine(nextGame, teamId, playerId);
        await commitGame(nextGame);
      },
    },
  });
  }),
);
