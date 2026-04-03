/**
 * Central game state store — Zustand + Immer.
 *
 * Holds the full GameState from @mfd/engine and exposes actions
 * that call engine functions to mutate state.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  ContractOffer,
  DashboardWidget,
  DraftTradeOffer,
  ExtensionEvaluation,
  ExtensionOffer,
  GamePlan,
  GameState,
  OpponentReport,
  SeasonPhase,
  Team,
  TradeOfferAsset,
  TradeProposal,
  TrainingFocus,
  WeeklySummary,
} from '@mfd/engine';
import {
  addToWatchlist,
  addToPracticeSquad as addToPracticeSquadEngine,
  activateFromIR as activateFromIREngine,
  advanceTutorial as advanceTutorialEngine,
  applyDraftTradeOffer,
  applyExtensionOffer,
  assignTraining as assignTrainingEngine,
  acceptCounterProposal as acceptCounterProposalEngine,
  completeTutorialAction as completeTutorialActionEngine,
  cutPlayerToWaivers as cutPlayerToWaiversEngine,
  createTradeProposal as createTradeProposalEngine,
  dismissTutorial as dismissTutorialEngine,
  elevateFromPracticeSquad as elevateFromPracticeSquadEngine,
  evaluateExtension,
  fireScout as fireScoutEngine,
  buildDraftWarRoomState,
  hireMedicalStaff as hireMedicalStaffEngine,
  hireScout as hireScoutEngine,
  makePlayerPromise as makePlayerPromiseEngine,
  mulberry32,
  placeOnIR as placeOnIREngine,
  postJune1Cut,
  refreshStoredFATargetBoard,
  removeFromPracticeSquad as removeFromPracticeSquadEngine,
  removeFromWatchlist,
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
  resetGamePlan as resetGamePlanEngine,
  setGamePlan as setGamePlanEngine,
  unpinWidget as unpinDashboardWidget,
  upsertOpponentReport as upsertOpponentReportEngine,
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
  cutPlayer: (teamId: string, playerId: string, options?: { postJune1?: boolean }) => Promise<void>;
  toggleTradeBlock: (teamId: string, playerId: string) => void;
  setStarter: (teamId: string, playerId: string, isStarter: boolean) => void;
  addToPracticeSquad: (teamId: string, playerId: string) => Promise<void>;
  removeFromPracticeSquad: (teamId: string, playerId: string) => Promise<void>;
  elevatePracticeSquadPlayer: (teamId: string, playerId: string) => Promise<void>;
  releasePSPlayer: (teamId: string, playerId: string) => Promise<void>;
  elevatePSPlayer: (teamId: string, playerId: string) => Promise<void>;
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
  toggleFATargetWatchlist: (playerId: string) => Promise<void>;
  refreshFATargetBoard: () => Promise<void>;
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
  acceptDraftTradeOffer: (offer: DraftTradeOffer) => Promise<void>;
  rejectDraftTradeOffer: (offer: DraftTradeOffer) => Promise<void>;
  refreshWarRoom: () => Promise<void>;
  makeDraftPick: (prospectId: string) => Promise<void>;
  submitExtensionOffer: (playerId: string, offer: ExtensionOffer) => Promise<ExtensionEvaluation | null>;
  makePromise: (teamId: string, playerId: string, promiseType: 'starter' | 'no_trade' | 'restructure') => Promise<void>;

  // Owner
  refreshOwner: (teamId: string) => void;

  // Coaching
  addClinicXP: (teamId: string, track: string, amount: number) => void;

  // Season phase
  setPhase: (phase: SeasonPhase) => void;
  setDifficulty: (difficulty: GameState['difficulty']) => Promise<void>;
  setAdaptiveDifficultyEnabled: (enabled: boolean) => Promise<void>;
  saveGamePlan: (plan: GamePlan, report?: OpponentReport | null) => Promise<void>;
  clearGamePlan: () => Promise<void>;
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
    const buildIntelSeed = (game: GameState, salt: string) => {
      const saltHash = [...salt].reduce((hash, char) => ((hash * 33) ^ char.charCodeAt(0)) >>> 0, 5381);
      return (game.seed ^ (game.year * 131) ^ (game.week * 977) ^ saltHash) >>> 0;
    };
    const intelRng = (game: GameState, salt: string) => mulberry32(buildIntelSeed(game, salt));
    const applyPostJune1CutToGame = (game: GameState, teamId: string, playerId: string) => {
      const team = game.teams[teamId];
      const player = game.players[playerId];
      if (!team || !player?.contract) return;

      const rosterIndex = team.roster.findIndex((entry) => entry.id === playerId);
      if (rosterIndex === -1) return;

      const preCutCapHit = calcCapHit(player.contract);
      const impact = postJune1Cut(player, team, game.year);
      const currentYearDeadCap = Math.max(0, impact.deadCap - impact.acceleratedCap);

      team.deadCap = Math.round((team.deadCap + currentYearDeadCap) * 10) / 10;
      team.capUsed = Math.round((team.capUsed - (preCutCapHit - currentYearDeadCap)) * 10) / 10;
      team.capSpace = Math.round((getSalaryCap(game.year) - team.capUsed) * 10) / 10;

      team.roster.splice(rosterIndex, 1);
      team.practiceSquad = team.practiceSquad.filter((entry) => entry.playerId !== playerId);
      player.teamId = null;
      player.contract = null;
      game.waiverWire.push({
        playerId,
        releasedByTeamId: teamId,
        createdYear: game.year,
        createdWeek: game.week,
        expiresYear: game.year,
        expiresWeek: game.week + 1,
      });
      team.txLog.push({
        type: 'CUT',
        year: game.year,
        week: game.week,
        playerId,
        fromTeamId: teamId,
        notes: 'Post-June 1 designation',
      });
    };
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

      cutPlayer: async (teamId, playerId, options) => {
        const current = get().game;
        if (!current) return;
        if (options?.postJune1) {
          const nextGame = cloneForMutation(current);
          applyPostJune1CutToGame(nextGame, teamId, playerId);
          await commitGame(nextGame);
          return;
        }
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

      releasePSPlayer: async (teamId, playerId) => {
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

      elevatePSPlayer: async (teamId, playerId) => {
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

      toggleFATargetWatchlist: async (playerId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        nextGame.faTargetBoard = nextGame.faTargetBoard.watchlist.includes(playerId)
          ? removeFromWatchlist(nextGame.faTargetBoard, playerId)
          : addToWatchlist(nextGame.faTargetBoard, playerId);
        await commitGame(nextGame);
      },

      refreshFATargetBoard: async () => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam) return;
        const freeAgents = nextGame.freeAgents
          .map((playerId) => nextGame.players[playerId])
          .filter((player): player is NonNullable<typeof player> => Boolean(player));
        refreshStoredFATargetBoard(nextGame, userTeam, freeAgents, intelRng(nextGame, `fa-board:${userTeam.id}`));
        await commitGame(nextGame);
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

      acceptDraftTradeOffer: async (offer) => {
        const current = get().game;
        if (!current) return;
        const nextGame = applyDraftTradeOffer(current, offer);
        nextGame.warRoomState = buildDraftWarRoomState(nextGame, intelRng(nextGame, `war-room:${offer.targetPick}`));
        await commitGame(nextGame);
      },

      rejectDraftTradeOffer: async (offer) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        if (nextGame.warRoomState) {
          nextGame.warRoomState.incomingOffers = nextGame.warRoomState.incomingOffers.filter((entry) =>
            !(entry.from === offer.from && entry.targetPick === offer.targetPick && entry.reasoning === offer.reasoning));
        }
        await commitGame(nextGame);
      },

      refreshWarRoom: async () => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        nextGame.warRoomState = buildDraftWarRoomState(nextGame, intelRng(nextGame, `war-room:${nextGame.week}:${nextGame.phase}`));
        await commitGame(nextGame);
      },

      makeDraftPick: async (prospectId) => {
        const current = get().game;
        if (!current) return;
        const result = makeDraftPickEngine(current, prospectId);
        await commitGame(result.nextState);
      },

      submitExtensionOffer: async (playerId, offer) => {
        const current = get().game;
        if (!current) return null;
        const nextGame = cloneForMutation(current);
        const player = nextGame.players[playerId];
        const userTeam = Object.values(nextGame.teams).find((entry) => entry.isUser) ?? null;
        const team = player && userTeam && player.teamId === userTeam.id ? userTeam : null;
        if (!player || !team) return null;

        const evaluation = evaluateExtension(offer, player, team, nextGame);

        if (evaluation.playerAccepts) {
          const acceptedState = applyExtensionOffer(nextGame, team.id, offer);
          acceptedState.contractExtensions = acceptedState.contractExtensions.map((entry) =>
            entry.playerId === playerId && entry.teamId === team.id
              ? {
                ...entry,
                reasoning: evaluation.reasoning,
                counterOffer: null,
              }
              : entry);
          await commitGame(acceptedState);
          return evaluation;
        }

        nextGame.contractExtensions = [
          ...nextGame.contractExtensions.filter((entry) => !(entry.playerId === playerId && entry.teamId === team.id)),
          {
            playerId,
            teamId: team.id,
            status: evaluation.counterOffer ? 'countered' : 'rejected',
            offer,
            counterOffer: evaluation.counterOffer ?? null,
            reasoning: evaluation.reasoning,
            year: nextGame.year,
            week: nextGame.week,
          },
        ];
        await commitGame(nextGame);
        return evaluation;
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

      saveGamePlan: async (plan, report) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        if (report) {
          upsertOpponentReportEngine(nextGame, report);
        }
        setGamePlanEngine(nextGame, plan, report);
        await commitGame(nextGame);
      },

      clearGamePlan: async () => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        resetGamePlanEngine(nextGame);
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
