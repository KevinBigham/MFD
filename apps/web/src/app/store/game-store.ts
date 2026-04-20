/**
 * Central game state store — Zustand + Immer.
 *
 * Holds the full GameState from @mfd/engine and exposes actions
 * that call engine functions to mutate state.
 */
import { useCallback } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  AudioCue,
  BreakingNewsEvent,
  CapCandidate,
  CapHealthReport,
  CapMove,
  CareerTimeline,
  ContingencyRule,
  ContractOffer,
  DashboardWidget,
  DraftTradeOffer,
  ExtensionEvaluation,
  ExtensionOffer,
  GameEvent,
  GamePlan,
  GameState,
  LeagueRuleKey,
  LeagueRuleValue,
  MilestoneReached,
  OpponentReport,
  Position,
  PressureCard,
  RelocationDestination,
  RecordChase,
  SeasonPhase,
  StaffCandidate,
  StaffRole,
  StatLeaderEntry,
  Team,
  TradeOfferAsset,
  TradeProposal,
  TrainingFocus,
  WeeklyPrepPlan,
  WeeklySummary,
  BrokenRecord,
  MultiYearProjection,
  PressConferenceQueueEntry,
  PressConferenceResponseTier,
  } from '@mfd/engine';
import type { ShotDeclaration, AlumniMentor, DynastyEra } from '@mfd/engine';
import {
  acceptEndorsement as acceptEndorsementEngine,
  addToWatchlist,
  addToPracticeSquad as addToPracticeSquadEngine,
  activateFromIR as activateFromIREngine,
  acceptStadiumDeal as acceptStadiumDealEngine,
  advanceTutorial as advanceTutorialEngine,
  applyCBADealToRules,
  applyDraftTradeOffer,
  applyRuleChange,
  applySchemeChange,
  applyExtensionOffer,
  appointCaptain,
  assignTraining as assignTrainingEngine,
  buildCapScenario,
  callTeamMeeting as callTeamMeetingEngine,
  acceptCounterProposal as acceptCounterProposalEngine,
  advanceDeadlineClock as advanceDeadlineClockEngine,
  buildCoachingMarket,
  castVote as castRuleVote,
  checkCBAStatus,
  completeTutorialAction as completeTutorialActionEngine,
  createCapMovePost,
  createGovernancePost,
  createLaborPost,
  diffRules,
  cutPlayerToWaivers as cutPlayerToWaiversEngine,
  createTradeProposal as createTradeProposalEngine,
  finalizeExpansionDraft as finalizeExpansionDraftEngine,
  dismissTutorial as dismissTutorialEngine,
  elevateFromPracticeSquad as elevateFromPracticeSquadEngine,
  evaluateExtension,
  fireStaffMember,
  fireScout as fireScoutEngine,
  buildDraftWarRoomState,
  finalizeDeadline as finalizeDeadlineEngine,
  getActiveRule,
  hireMedicalStaff as hireMedicalStaffEngine,
  hireStaffCandidate,
  hireScout as hireScoutEngine,
  initCBA,
  initCommissioner,
  initLaborState,
  initLeagueRules,
  initializeLockerRoom,
  initializeOffseasonState,
  LEAGUE_RULE_DEFINITIONS,
  getRelocationDestinations,
  getPlayerCareerTimeline,
  getStatLeaderboard,
  makeExpansionPick as makeExpansionPickEngine,
  makePlayerPromise as makePlayerPromiseEngine,
  mulberry32,
  negotiateCBA,
  placeOnIR as placeOnIREngine,
  postJune1Cut,
  protectPlayers as protectExpansionPlayersEngine,
  refreshStoredFATargetBoard,
  relocateTeam as relocateTeamEngine,
  removeFromPracticeSquad as removeFromPracticeSquadEngine,
  removeFromWatchlist,
  recordGovernanceNews,
  recordLaborNews,
  ratifyCBA,
  resolveLockout,
  resolveVote,
  restructureContract, backloadContract,
  calcCapHit, calcDeadMoney,
  promoteCoordinator,
  mapGameResultToAudioCues,
  createAudioCue,
  generateBreakingNews,
  getPressConferenceScenarioContent,
  runProDay as runProDayEngine,
  runPrivateWorkout as runPrivateWorkoutEngine,
  simulateBackload,
  simulateAIVotes,
  simulateCut,
  simulateExtension,
  simulateRestructure,
  updateOwnerApproval,
  updateSystemFit,
  earnXP,
  getSalaryCap,
  assignKickReturner as assignKickReturnerEngine,
  assignPuntReturner as assignPuntReturnerEngine,
  startDynastyEra as startDynastyEraEngine,
  hireMentor as hireMentorEngine,
  fireMentor as fireMentorEngine,
  createLayout as createDashboardLayout,
  pinWidget as pinDashboardWidget,
  reorderWidgets as reorderDashboardWidgets,
  generateSetupForecast,
  generateTeamCrisisProfile,
  submitReSignOffer as submitReSignOfferEngine,
  submitFreeAgentBid as submitFreeAgentBidEngine,
  signStreetFreeAgent as signStreetFreeAgentEngine,
  advanceSetupPhase as advanceSetupPhaseEngine,
  goBackSetupPhase as goBackSetupPhaseEngine,
  applySetupDecision as applySetupDecisionEngine,
  finalizeSetup as finalizeSetupEngine,
  toggleSetupDrilldown as toggleSetupDrilldownEngine,
  runScoutingAction as runScoutingActionEngine,
  rejectCounterProposal as rejectCounterProposalEngine,
  submitWaiverClaim as submitWaiverClaimEngine,
  startScenario as startScenarioEngine,
  startFarewellTour as startFarewellTourEngine,
  switchLayout as switchDashboardLayout,
  triggerCaptainRally as triggerCaptainRallyEngine,
  toggleScoutingWatchlist as toggleScoutingWatchlistEngine,
  submitProposal as submitTradeProposalEngine,
  acceptTradeOffer as acceptTradeOfferEngine,
  rejectTradeOffer as rejectTradeOfferEngine,
  upgradeStadium as upgradeStadiumEngine,
  makeDraftPick as makeDraftPickEngine,
  resetGamePlan as resetGamePlanEngine,
  setGamePlan as setGamePlanEngine,
  unpinWidget as unpinDashboardWidget,
  upsertOpponentReport as upsertOpponentReportEngine,
  upgradeFacility as upgradeFacilityEngine,
  getDefaultHalftimeDecisionSetting,
} from '@mfd/engine';
import type { SetupDecisions } from '@mfd/engine';
import { autosaveDynasty, loadLatestAutosaveGame } from './persistence';
import {
  buildPressConferenceTemplateContext,
  interpolatePressConferencePool,
} from '../../lib/pressConferenceContent';
import {
  selectCapCandidates,
  selectCapHealth,
  selectMultiYearProjection,
  selectPlayerTimeline,
  selectRecentBrokenRecords,
  selectRecentMilestones,
  selectRecordChases,
  type GameStoreState,
} from './selectors';
import { runAdvanceWeek, runPreviewHalftimeDecision } from './sim';
import { useUiStore } from './ui-store';
import { createSeedGameState, getTeamOptions } from './seed';
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
  executeCapMoves: (moves: CapMove[]) => Promise<void>;
  executeCapMove: (move: CapMove) => Promise<void>;
  negotiateContract: (playerId: string, offer: ContractOffer) => Promise<void>;

  // Week advance
  advanceWeek: () => Promise<WeeklySummary | null>;
  resolveHalftimeDecision: (choice: 'stick' | 'switch' | 'gamble') => Promise<WeeklySummary | null>;
  watchBroadcast: (gameId: string) => void;
  advanceDeadlineClock: (minutes: number) => Promise<void>;
  acceptDeadlineOffer: (offerId: string) => Promise<void>;
  rejectDeadlineOffer: (offerId: string) => Promise<void>;
  finalizeDeadline: () => Promise<void>;

  // Offseason actions
  submitReSignOffer: (playerId: string, offer: ContractOffer) => Promise<void>;
  submitFreeAgentBid: (playerId: string, offer: ContractOffer) => Promise<void>;
  signStreetFreeAgent: (playerId: string, offer: ContractOffer) => Promise<void>;
  toggleFATargetWatchlist: (playerId: string) => Promise<void>;
  refreshFATargetBoard: () => Promise<void>;
  upgradeStadium: () => Promise<void>;
  acceptNamingRights: (dealIndex: number) => Promise<void>;
  relocateTeam: (destinationId: string) => Promise<void>;
  protectExpansionPlayers: (playerIds: string[]) => Promise<void>;
  finalizeExpansionDraft: () => Promise<void>;
  runScoutingAction: (prospectId: string, action: 'film' | 'combine' | 'interview') => Promise<void>;
  runProDay: (prospectId: string) => Promise<void>;
  runPrivateWorkout: (prospectId: string) => Promise<void>;
  toggleScoutingWatchlist: (prospectId: string) => Promise<void>;
  hireScout: (scoutId: string) => Promise<void>;
  fireScout: (scoutId: string) => Promise<void>;
  callTeamMeeting: () => Promise<void>;
  triggerCaptainRally: (captainId: string) => Promise<void>;
  acceptEndorsement: (dealId: string) => Promise<void>;
  declineEndorsement: (dealId: string) => Promise<void>;
  startFarewellTour: (playerId: string) => Promise<void>;
  electCaptain: (playerId: string) => Promise<void>;
  voteOnProposal: (proposalId: string, vote: 'yes' | 'no' | 'abstain') => Promise<void>;
  petitionRuleChange: (ruleKey: LeagueRuleKey, proposedValue: LeagueRuleValue) => Promise<void>;
  voteOnCBA: (vote: 'approve' | 'reject') => Promise<void>;
  advanceCBANegotiation: () => Promise<void>;
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
  refreshCoachingMarket: () => Promise<void>;
  hireStaff: (role: StaffRole, candidate: StaffCandidate) => Promise<void>;
  fireStaff: (role: StaffRole) => Promise<void>;
  promoteStaff: (fromRole: 'OC' | 'DC') => Promise<void>;
  applyTeamSchemeChange: (offenseScheme: string, defenseScheme: string) => Promise<void>;
  setHeadCoachSkillSelection: (branch: string, tier: number) => Promise<void>;

  // Season phase
  setPhase: (phase: SeasonPhase) => void;
  setDifficulty: (difficulty: GameState['difficulty']) => Promise<void>;
  setHalftimeDecisions: (setting: GameState['settings']['halftimeDecisions']) => Promise<void>;
  setAdaptiveDifficultyEnabled: (enabled: boolean) => Promise<void>;
  startScenarioChallenge: (scenarioId: string) => Promise<void>;
  saveGamePlan: (plan: GamePlan, report?: OpponentReport | null) => Promise<void>;
  clearGamePlan: () => Promise<void>;
  saveWeeklyPrepPlan: (plan: WeeklyPrepPlan, report?: OpponentReport | null) => Promise<void>;
  clearWeeklyPrepPlan: () => Promise<void>;
  respondToPressConference: (
    conferenceId: string,
    tier: PressConferenceResponseTier,
    response: string,
  ) => Promise<void>;
  clearAudioQueue: () => Promise<void>;
  dismissBreakingNews: () => Promise<void>;
  pinWidget: (widgetType: DashboardWidget) => Promise<void>;
  unpinWidget: (widgetType: DashboardWidget) => Promise<void>;
  switchLayout: (layoutId: string) => Promise<void>;
  saveLayout: (name: string, widgets: DashboardWidget[], columns: 2 | 3, layoutId?: string) => Promise<void>;
  assignKickReturner: (teamId: string, playerId: string) => Promise<void>;
  assignPuntReturner: (teamId: string, playerId: string) => Promise<void>;

  // Dynasty systems
  nameDynastyEra: (eraName: string) => Promise<void>;
  hireMentor: (mentorId: string) => Promise<void>;
  fireMentor: (mentorId: string) => Promise<void>;
  setCallYourShot: (declaration: ShotDeclaration | null) => Promise<void>;
  recordManualSave: () => void;

  // Franchise Setup
  advanceSetup: (options?: { requireTopPressureOpened?: boolean }) => Promise<void>;
  goBackSetup: () => Promise<void>;
  applySetupChoice: (decision: Partial<SetupDecisions>) => Promise<void>;
  toggleSetupDrilldown: (pressureId: PressureCard['id']) => Promise<void>;
  completeSetup: () => Promise<void>;

  // Undo
  undo: () => Promise<void>;
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
    const offensePlanFromPrep = (focus: WeeklyPrepPlan['offensiveFocus']): GamePlan['offensiveScheme'] => {
      if (focus === 'attack_secondary') return 'pass_heavy';
      if (focus === 'attack_front') return 'run_heavy';
      if (focus === 'feed_star') return 'spread';
      if (focus === 'protect_qb') return 'balanced';
      return 'balanced';
    };
    const defensePlanFromPrep = (focus: WeeklyPrepPlan['defensiveFocus']): GamePlan['defensiveScheme'] => {
      if (focus === 'heat_qb') return 'blitz_heavy';
      if (focus === 'limit_explosive') return 'coverage';
      if (focus === 'stop_run') return 'contain';
      if (focus === 'erase_wr1') return 'aggressive';
      return 'base';
    };
    const buildGamePlanFromWeeklyPrep = (plan: WeeklyPrepPlan): GamePlan => ({
      offensiveScheme: offensePlanFromPrep(plan.offensiveFocus),
      defensiveScheme: defensePlanFromPrep(plan.defensiveFocus),
      keyMatchup: plan.keyMatchupPlayerId ? { playerA: plan.keyMatchupPlayerId, playerB: plan.opponentTeamId } : null,
      gamePlanBonus: 0,
      contingencyRules: plan.contingencyRules ?? [],
      trickPlays: plan.trickPlays ?? [],
    });
    const findUserGameResult = (game: GameState, playedWeek: number) => {
      const team = Object.values(game.teams).find((entry) => entry.isUser) ?? null;
      if (!team) return null;
      const week = game.schedule.find((entry) => entry.week === playedWeek);
      return week?.games.find((entry) =>
        (entry.homeTeamId === team.id || entry.awayTeamId === team.id) && entry.result,
      )?.result ?? null;
    };
    const parseScoreDiff = (finalScore: string): number => {
      const [left = 0, right = 0] = finalScore.split('-').map((part) => Number(part.trim()));
      if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
      return Math.abs(left - right);
    };
    const findLatestGameDayPackage = (game: GameState) =>
      game.gameDayState.recentPackages.find((entry) => entry.id === game.gameDayState.latestPackageId) ?? null;
    const resolvePressConferenceScenario = (game: GameState): string | null => {
      const latestPackage = findLatestGameDayPackage(game);
      if (!latestPackage) return null;
      if (latestPackage.phase === 'playoffs') {
        const userTeam = Object.values(game.teams).find((entry) => entry.isUser) ?? null;
        const latestHistory = userTeam
          ? [...game.franchiseHistory]
            .reverse()
            .find((entry) => entry.teamId === userTeam.id && entry.year === game.year)
          : null;
        if (latestHistory?.playoffFinish === 'champion') return 'super_bowl_win';
        if (latestHistory?.playoffFinish === 'super_bowl_runner_up') return 'super_bowl_loss';
        return latestPackage.result === 'win' ? 'playoff_win' : latestPackage.result === 'loss' ? 'playoff_loss' : null;
      }
      if (latestPackage.rivalry) {
        return latestPackage.result === 'win' ? 'rivalry_win' : latestPackage.result === 'loss' ? 'rivalry_loss' : null;
      }
      const diff = parseScoreDiff(latestPackage.finalScore);
      if (latestPackage.result === 'win') return diff >= 14 ? 'win_blowout' : 'win_close';
      if (latestPackage.result === 'loss') return diff >= 14 ? 'loss_blowout' : 'loss_close';
      return null;
    };
    const buildPressConferenceQueueEntry = (game: GameState): PressConferenceQueueEntry | null => {
      const conference = game.recentPressConferences[0];
      if (!conference || conference.type !== 'postgame') return null;
      const scenario = resolvePressConferenceScenario(game);
      if (!scenario) return null;
      const content = getPressConferenceScenarioContent(scenario);
      if (!content) return null;
      const latestPackage = findLatestGameDayPackage(game);
      const team = conference.teamId ? game.teams[conference.teamId] ?? null : null;
      const opponent = latestPackage?.opponentTeamId ? game.teams[latestPackage.opponentTeamId] ?? null : null;
      const context = buildPressConferenceTemplateContext({
        packageData: latestPackage,
        teamName: team ? `${team.city} ${team.name}` : null,
        opponentName: opponent ? `${opponent.city} ${opponent.name}` : null,
        speaker: conference.speaker,
      });
      return {
        conferenceId: conference.id,
        teamId: conference.teamId,
        year: conference.year,
        week: conference.week,
        speaker: conference.speaker,
        topic: conference.topic,
        scenario,
        responses: {
          high: interpolatePressConferencePool(content.answers_high_ambition, context),
          mid: interpolatePressConferencePool(content.answers_mid, context),
          low: interpolatePressConferencePool(content.answers_low_ambition, context),
        },
      };
    };
    const buildPostAdvanceAudioQueue = (game: GameState, playedWeek: number): AudioCue[] => {
      const result = findUserGameResult(game, playedWeek);
      if (!result) return [];
      const userTeam = Object.values(game.teams).find((entry) => entry.isUser) ?? null;
      const latestSummary = game.weekSummaries.find((entry) => entry.week === playedWeek) ?? game.weekSummaries.at(-1) ?? null;
      const teamStats = Object.values(result.stats);
      const touchdowns = teamStats.reduce((sum, stats) => sum + stats.passTDs + stats.rushTDs, 0);
      const fieldGoals = teamStats.reduce((sum, stats) => sum + stats.fgMade, 0);
      const turnovers = teamStats.reduce((sum, stats) => sum + stats.turnovers, 0);
      const sacks = teamStats.reduce((sum, stats) => sum + stats.sacks, 0);
      const bigPlays = Math.min(3, result.broadcast?.highlights.filter((highlight) => highlight.isBigPlay).length ?? 0);
      const cues = mapGameResultToAudioCues({
        touchdowns,
        fieldGoals,
        turnovers,
        sacks,
        bigPlays,
        overtime: result.overtime,
      });
      if ((latestSummary?.injuries.length ?? 0) > 0) {
        cues.push(createAudioCue('injury', 'high', {
          source: 'weekly-summary',
          week: latestSummary?.week ?? playedWeek,
          injuries: latestSummary?.injuries.length ?? 0,
        }));
      }
      if (result.callYourShotResult) {
        const outcome = result.callYourShotResult.outcome;
        cues.push({
          event: outcome === 'hit' ? 'achievement_unlocked' : outcome === 'miss' ? 'turnover' : 'notification',
          priority: outcome === 'hit' ? 'high' : outcome === 'miss' ? 'high' : 'medium',
          metadata: {
            source: 'call_your_shot',
            // TODO Sprint 37: swap synth fallback for packaged cue assets when audio/cue/call-hit.ogg and call-miss.ogg land.
            requestedAsset: outcome === 'hit' ? 'audio/cue/call-hit.ogg' : outcome === 'miss' ? 'audio/cue/call-miss.ogg' : 'audio/cue/call-partial.ogg',
          },
        });
      }
      const latestHistory = userTeam
        ? [...game.franchiseHistory]
          .reverse()
          .find((entry) => entry.teamId === userTeam.id && entry.year === game.year)
        : null;
      if (latestHistory?.playoffFinish === 'champion') {
        cues.push(createAudioCue('super_bowl_win', 'critical', {
          source: 'championship',
          year: game.year,
          teamId: latestHistory.teamId,
        }));
      } else if (latestHistory?.playoffFinish === 'super_bowl_runner_up') {
        cues.push(createAudioCue('super_bowl_loss', 'critical', {
          source: 'championship',
          year: game.year,
          teamId: latestHistory.teamId,
        }));
      }
      if (game.phase === 'offseason') {
        cues.push(createAudioCue('season_end', 'high', {
          source: 'season-transition',
          year: game.year,
        }));
      }
      return cues;
    };
    const buildBreakingNewsQueue = (game: GameState): BreakingNewsEvent[] => {
      const rng = mulberry32(buildIntelSeed(game, `breaking-news:${game.year}:${game.week}`));
      return generateBreakingNews(game, rng);
    };
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
      team.capSpace = Math.round((getSalaryCap(game.year, game) - team.capUsed) * 10) / 10;

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
    const ensurePostGameUi = (game: GameState) => {
      game.postGameUi = game.postGameUi ?? {
        pressConferenceQueue: [],
        audioCueQueue: [],
        pendingHalftimeDecision: null,
      };
      return game.postGameUi;
    };
    const appendAudioCue = (
      game: GameState,
      event: AudioCue['event'],
      priority?: AudioCue['priority'],
      metadata?: AudioCue['metadata'],
    ) => {
      const postGameUi = ensurePostGameUi(game);
      postGameUi.audioCueQueue = [
        ...postGameUi.audioCueQueue,
        createAudioCue(event, priority, metadata),
      ].slice(-20);
    };
    const navigateTo = (path: string) => {
      if (typeof window === 'undefined') return;
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    };
    const adjustFranchiseCap = (team: Team, amount: number) => {
      team.capSpace = Math.round((team.capSpace + amount) * 10) / 10;
      team.capUsed = Math.round(Math.max(0, team.capUsed - amount) * 10) / 10;
    };
    const resolveRelocationDestination = (team: Team, destinationId: string): RelocationDestination | null =>
      getRelocationDestinations(team.franchiseIdentity, team.city)
        .find((destination) => destination.abbr === destinationId || destination.city === destinationId) ?? null;
    const completeExpansionPreview = (game: GameState) => {
      let state = game.expansionDraftState;
      while (state && state.phase !== 'complete' && state.picksRemaining > 0) {
        state = makeExpansionPickEngine(state, '');
      }
      game.expansionDraftState = state;
      return state;
    };
    const deadlineResolvedEvent = (game: GameState): GameEvent => ({
      id: `trade-deadline-resolved-${game.year}-${game.week}`,
      type: 'trade_deadline_resolved',
      timestamp: Date.now(),
      description: `Trade deadline resolved in week ${game.week}.`,
      data: {
        year: game.year,
        week: game.week,
      },
    });
    const userTeamIndexFor = (game: GameState): number => {
      const userTeam = Object.values(game.teams).find((team) => team.isUser) ?? null;
      if (!userTeam) return 0;
      const options = getTeamOptions();
      return options.find((option) => option.city === userTeam.city && option.name === userTeam.name)?.index ?? 0;
    };
    const clampMeter = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
    const getUserTeam = (game: GameState): Team | null =>
      Object.values(game.teams).find((team) => team.isUser) ?? null;
    const majorityThreshold = (game: GameState) => Math.floor(Object.keys(game.teams).length / 2) + 1;
    const isCBAInterruptStatus = (status: GameState['cbaState']['status']) =>
      status === 'negotiating' || status === 'awaiting_owner_vote' || status === 'lockout';
    const ensureGovernanceState = (game: GameState) => {
      game.leagueRules ??= initLeagueRules(game.year);
      game.cbaState ??= initCBA(game.year);
      game.commissionerState ??= initCommissioner(game.year);
      game.laborState ??= initLaborState();
    };
    const refreshLeagueCapSpace = (game: GameState) => {
      const salaryCap = getSalaryCap(game.year, game);
      for (const team of Object.values(game.teams)) {
        team.capSpace = Math.round((salaryCap - team.capUsed) * 10) / 10;
      }
    };
    const roundMoney = (value: number) => Math.round(value * 10) / 10;
    const syncTeamCapTotals = (game: GameState, team: Team) => {
      const contractCommitments = team.roster.reduce((sum, player) => sum + calcCapHit(player.contract ?? null), 0);
      team.capUsed = roundMoney(contractCommitments + team.deadCap);
      team.capSpace = roundMoney(getSalaryCap(game.year, game) - team.capUsed);
    };
    const syncPlayerContractReference = (game: GameState, teamId: string, playerId: string) => {
      const team = game.teams[teamId];
      const teamPlayer = team?.roster.find((entry) => entry.id === playerId) ?? null;
      const player = game.players[playerId];
      if (!team || !teamPlayer || !player) return;
      player.teamId = teamId;
      player.contract = teamPlayer.contract;
    };
    const buildCapMoveOffer = (playerId: string, years: number, avgSalary: number): ExtensionOffer => {
      const newYears = Math.max(1, Math.min(5, years));
      const newAvgSalary = roundMoney(Math.max(0.5, avgSalary));
      const signingBonus = roundMoney(newAvgSalary * newYears * 0.2);
      const guaranteedAmount = roundMoney(newAvgSalary * Math.min(newYears, 2));
      const yearlyProration = roundMoney(signingBonus / newYears);
      return {
        playerId,
        newYears,
        newAvgSalary,
        guaranteedAmount,
        signingBonus,
        capHitByYear: Array.from({ length: newYears }, (_, index) =>
          roundMoney(newAvgSalary * (1 + index * 0.04) + yearlyProration)),
      };
    };
    const applyOwnerMoodDelta = (team: Team, delta: number) => {
      team.ownerMood = clampMeter((team.ownerMood ?? team.owner.approval ?? 50) + delta);
      team.owner.approval = clampMeter((team.owner.approval ?? team.ownerMood ?? 50) + delta);
    };
    const addGovernanceNarrative = (
      game: GameState,
      headline: string,
      body: string,
      options?: {
        sentiment?: 'positive' | 'neutral' | 'negative' | 'hype' | 'sarcastic';
        importance?: 'minor' | 'major' | 'breaking';
        idSuffix?: string;
      },
    ) => {
      recordGovernanceNews(game, headline, body, {
        importance: options?.importance ?? 'major',
        idSuffix: options?.idSuffix,
      });
      game.socialFeed = [
        createGovernancePost(headline, game.week, intelRng(game, `governance:${headline}:${game.leagueNews.length}`), {
          sentiment: options?.sentiment ?? 'neutral',
        }),
        ...game.socialFeed,
      ].slice(0, 200);
    };
    const addLaborNarrative = (
      game: GameState,
      headline: string,
      body: string,
      options?: {
        sentiment?: 'positive' | 'neutral' | 'negative' | 'hype' | 'sarcastic';
        importance?: 'minor' | 'major' | 'breaking';
        idSuffix?: string;
      },
    ) => {
      recordLaborNews(game, headline, body, {
        importance: options?.importance ?? 'major',
        idSuffix: options?.idSuffix,
      });
      game.socialFeed = [
        createLaborPost(headline, game.week, intelRng(game, `labor:${headline}:${game.leagueNews.length}`), {
          sentiment: options?.sentiment ?? 'neutral',
        }),
        ...game.socialFeed,
      ].slice(0, 200);
    };
    const summarizeRuleDiffs = (before: GameState['leagueRules'], after: GameState['leagueRules']) => {
      const changes = diffRules(before, after).filter((entry) => entry.changed);
      if (changes.length === 0) return 'No terms changed.';
      return changes.slice(0, 3).map((entry) => `${entry.label}: ${entry.before} -> ${entry.after}`).join('; ');
    };
    const cbaOwnerVoteForTeam = (
      game: GameState,
      teamId: string,
      proposal: NonNullable<GameState['cbaState']['negotiationState']>['currentProposal'],
    ): 'approve' | 'reject' => {
      const team = game.teams[teamId];
      const currentTerms = game.cbaState.currentDeal?.terms;
      if (!team || !proposal || !currentTerms) return 'approve';

      let score = 0;
      if (team.franchiseIdentity.marketSize === 'small' || team.franchiseIdentity.marketSize === 'medium') {
        score += proposal.terms.revenueSplit >= currentTerms.revenueSplit ? 2 : -1;
      } else {
        score += proposal.terms.revenueSplit <= currentTerms.revenueSplit + 0.01 ? 1 : -2;
      }

      score += proposal.terms.capGrowthRate <= currentTerms.capGrowthRate + 0.005 ? 1 : -1;
      score += proposal.terms.capFloorPct <= currentTerms.capFloorPct + 0.02 ? 1 : -1;
      score += team.gmStrategy === 'contend'
        ? proposal.terms.playoffSeeds >= currentTerms.playoffSeeds ? 1 : -1
        : proposal.terms.practiceSquadSize >= currentTerms.practiceSquadSize ? 1 : 0;
      score += proposal.terms.franchiseTagLimit > currentTerms.franchiseTagLimit && team.gmStrategy === 'contend' ? -1 : 0;
      score += proposal.terms.rosterLimit >= currentTerms.rosterLimit ? 1 : 0;

      return score >= 0 ? 'approve' : 'reject';
    };

    const snapshotForUndo = (label: string) => {
      const current = get().game;
      if (current) {
        set((s) => {
          s.undoSnapshot = JSON.parse(JSON.stringify(current)) as GameState;
          s.undoLabel = label;
        });
      }
    };

    const clearUndo = () => {
      set((s) => {
        s.undoSnapshot = null;
        s.undoLabel = null;
      });
    };

    return ({
    game: null,
    initialized: false,
    undoSnapshot: null,
    undoLabel: null,

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
        snapshotForUndo('Cut Player');
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

      restructure: (teamId, playerId) => {
        snapshotForUndo('Restructure');
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
        });
      },

      backload: (teamId, playerId, voidYears = 2) => {
        snapshotForUndo('Backload');
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
        });
      },

      executeCapMoves: async (moves) => {
        if (moves.length === 0) return;
        snapshotForUndo('Cap Moves');

        const current = get().game;
        if (!current) return;

        let nextGame = cloneForMutation(current);
        const userTeam = getUserTeam(nextGame);
        if (!userTeam) return;

        let scenario = buildCapScenario(userTeam, nextGame);
        const previews: Array<{
          move: CapMove;
          capSaved: number;
          playerName: string;
        }> = [];

        for (const move of moves) {
          if (move.type === 'trade') {
            return;
          }

          const playerName = nextGame.players[move.playerId]?.name
            ?? userTeam.roster.find((player) => player.id === move.playerId)?.name
            ?? move.playerId;

          const preview = move.type === 'restructure'
            ? simulateRestructure(scenario, move.playerId)
            : move.type === 'backload'
              ? simulateBackload(scenario, move.playerId, move.params?.voidYears ?? 1)
              : move.type === 'cut'
                ? simulateCut(scenario, move.playerId, false)
                : move.type === 'post_june_1_cut'
                  ? simulateCut(scenario, move.playerId, true)
                  : simulateExtension(
                    scenario,
                    move.playerId,
                    move.params?.years ?? 2,
                    move.params?.avgSalary ?? 1,
                  );

          if (!preview.success) {
            return;
          }

          previews.push({
            move,
            capSaved: preview.capSaved,
            playerName,
          });
          scenario = preview.scenario;
        }

        for (const [index, preview] of previews.entries()) {
          const team = nextGame.teams[userTeam.id];
          if (!team) return;

          const rosterPlayer = team.roster.find((player) => player.id === preview.move.playerId) ?? null;

          if (preview.move.type === 'restructure') {
            if (!rosterPlayer?.contract) return;
            const result = restructureContract({ contract: rosterPlayer.contract });
            if (!result.ok) return;
            syncPlayerContractReference(nextGame, team.id, preview.move.playerId);
            syncTeamCapTotals(nextGame, team);
          } else if (preview.move.type === 'backload') {
            if (!rosterPlayer?.contract) return;
            const result = backloadContract({ contract: rosterPlayer.contract }, preview.move.params?.voidYears ?? 1);
            if (!result.ok) return;
            syncPlayerContractReference(nextGame, team.id, preview.move.playerId);
            syncTeamCapTotals(nextGame, team);
          } else if (preview.move.type === 'cut') {
            const result = cutPlayerToWaiversEngine(nextGame, team.id, preview.move.playerId);
            nextGame = result.nextState;
          } else if (preview.move.type === 'post_june_1_cut') {
            applyPostJune1CutToGame(nextGame, team.id, preview.move.playerId);
          } else if (preview.move.type === 'extend') {
            if (!rosterPlayer) return;
            nextGame = applyExtensionOffer(
              nextGame,
              team.id,
              buildCapMoveOffer(
                preview.move.playerId,
                preview.move.params?.years ?? 2,
                preview.move.params?.avgSalary ?? rosterPlayer.contract?.baseSalary ?? 1,
              ),
            );
            syncTeamCapTotals(nextGame, nextGame.teams[team.id]!);
          }

          const currentTeam = nextGame.teams[userTeam.id];
          if (!currentTeam) return;

          nextGame.socialFeed = [
            createCapMovePost(
              currentTeam,
              preview.playerName,
              preview.move.type,
              preview.capSaved,
              nextGame.week,
              intelRng(nextGame, `cap-move:${preview.move.type}:${preview.move.playerId}:${index}`),
            ),
            ...nextGame.socialFeed,
          ].slice(0, 200);
        }

        syncTeamCapTotals(nextGame, nextGame.teams[userTeam.id]!);
        refreshLeagueCapSpace(nextGame);
        await commitGame(nextGame);
      },

      executeCapMove: async (move) => {
        await get().actions.executeCapMoves([move]);
      },

      advanceWeek: async () => {
        const current = get().game;
        if (!current) return null;
        clearUndo(); // Week advance is not undoable

        if (current.postGameUi?.pendingHalftimeDecision) {
          return null;
        }

        const deadlineWeek = Number(getActiveRule(current.leagueRules ?? initLeagueRules(current.year), 'trade_deadline_week', current.year));
        const shouldPauseForHalftime = !(
          current.phase === 'regular_season'
          && current.week === deadlineWeek
        );

        const halftimePreview = shouldPauseForHalftime
          ? await runPreviewHalftimeDecision(current)
          : null;
        if (halftimePreview) {
          const nextGame = cloneForMutation(current);
          nextGame.postGameUi = nextGame.postGameUi ?? {
            pressConferenceQueue: [],
            audioCueQueue: [],
            pendingHalftimeDecision: null,
          };
          nextGame.postGameUi.pendingHalftimeDecision = halftimePreview;
          nextGame.postGameUi.audioCueQueue = [
            ...nextGame.postGameUi.audioCueQueue,
            createAudioCue('halftime', 'medium', {
              source: 'halftime-decision',
              week: nextGame.week,
            }),
          ].slice(-20);
          await commitGame(nextGame);
          return null;
        }

        const result = await runAdvanceWeek(current);
        const nextGame = result.nextState;
        ensureGovernanceState(nextGame);
        const deadlineInterrupted = current.phase === 'regular_season'
          && current.week === 9
          && nextGame.week === current.week
          && Boolean(nextGame.tradeDeadlineState?.isDeadlineWeek);
        const cbaInterrupted = (nextGame.phase === 'offseason' || nextGame.phase === 'preseason')
          && isCBAInterruptStatus(nextGame.cbaState.status);

        if (deadlineInterrupted) {
          await commitGame(nextGame);
          navigateTo('/trade-deadline');
          return null;
        }

        if (nextGame.expansionDraftState) {
          await commitGame(nextGame);
          navigateTo('/expansion-draft');
          return null;
        }

        if (cbaInterrupted) {
          await commitGame(nextGame);
          navigateTo('/cba');
          return null;
        }

        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;

        if (userTeam) {
          updateSystemFit(userTeam);
        }

        nextGame.postGameUi = nextGame.postGameUi ?? {
          pressConferenceQueue: [],
          audioCueQueue: [],
          pendingHalftimeDecision: null,
        };
        const pressConferenceQueueEntry = buildPressConferenceQueueEntry(nextGame);
        if (pressConferenceQueueEntry && !nextGame.postGameUi.pressConferenceQueue.some((entry) => entry.conferenceId === pressConferenceQueueEntry.conferenceId)) {
          nextGame.postGameUi.pressConferenceQueue = [
            pressConferenceQueueEntry,
            ...nextGame.postGameUi.pressConferenceQueue,
          ].slice(0, 4);
        }
        nextGame.postGameUi.audioCueQueue = [
          ...nextGame.postGameUi.audioCueQueue,
          ...buildPostAdvanceAudioQueue(nextGame, current.week),
        ].slice(-20);
        nextGame.breakingNewsQueue = buildBreakingNewsQueue(nextGame).slice(0, 5);

        completeTutorialActionEngine(nextGame, 'week:advance');
        await commitGame(nextGame);

        return nextGame.weekSummaries.at(-1) ?? null;
      },

      resolveHalftimeDecision: async (choice) => {
        const current = get().game;
        const pending = current?.postGameUi?.pendingHalftimeDecision;
        if (!current || !pending) return null;

        const result = await runAdvanceWeek(current, {
          halftimeDecision: {
            choice,
            suggestion: pending.suggestion,
          },
        });
        const nextGame = result.nextState;
        ensureGovernanceState(nextGame);

        nextGame.postGameUi = nextGame.postGameUi ?? {
          pressConferenceQueue: [],
          audioCueQueue: [],
          pendingHalftimeDecision: null,
        };
        nextGame.postGameUi.pendingHalftimeDecision = null;

        const deadlineInterrupted = current.phase === 'regular_season'
          && current.week === 9
          && nextGame.week === current.week
          && Boolean(nextGame.tradeDeadlineState?.isDeadlineWeek);
        const cbaInterrupted = (nextGame.phase === 'offseason' || nextGame.phase === 'preseason')
          && isCBAInterruptStatus(nextGame.cbaState.status);

        if (deadlineInterrupted) {
          await commitGame(nextGame);
          navigateTo('/trade-deadline');
          return null;
        }

        if (nextGame.expansionDraftState) {
          await commitGame(nextGame);
          navigateTo('/expansion-draft');
          return null;
        }

        if (cbaInterrupted) {
          await commitGame(nextGame);
          navigateTo('/cba');
          return null;
        }

        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (userTeam) {
          updateSystemFit(userTeam);
        }

        const pressConferenceQueueEntry = buildPressConferenceQueueEntry(nextGame);
        if (pressConferenceQueueEntry && !nextGame.postGameUi.pressConferenceQueue.some((entry) => entry.conferenceId === pressConferenceQueueEntry.conferenceId)) {
          nextGame.postGameUi.pressConferenceQueue = [
            pressConferenceQueueEntry,
            ...nextGame.postGameUi.pressConferenceQueue,
          ].slice(0, 4);
        }
        nextGame.postGameUi.audioCueQueue = [
          ...nextGame.postGameUi.audioCueQueue,
          ...buildPostAdvanceAudioQueue(nextGame, current.week),
        ].slice(-20);
        nextGame.breakingNewsQueue = buildBreakingNewsQueue(nextGame).slice(0, 5);

        completeTutorialActionEngine(nextGame, 'week:advance');
        await commitGame(nextGame);

        return nextGame.weekSummaries.at(-1) ?? null;
      },

      watchBroadcast: (gameId) => {
        useUiStore.getState().setBroadcastGameId(gameId);
        navigateTo('/broadcast');
      },

      advanceDeadlineClock: async (minutes) => {
        const current = get().game;
        const deadlineState = current?.tradeDeadlineState;
        if (!current || !deadlineState) return;
        const nextGame = cloneForMutation(current);
        nextGame.tradeDeadlineState = advanceDeadlineClockEngine(deadlineState, minutes, mulberry32(buildIntelSeed(current, `deadline:${deadlineState.minutesRemaining}:${minutes}`)));
        await commitGame(nextGame);
      },

      acceptDeadlineOffer: async (offerId) => {
        const current = get().game;
        const deadlineState = current?.tradeDeadlineState;
        if (!current || !deadlineState) return;
        const pendingOffer = deadlineState.pendingOffers.find((offer) => offer.id === offerId);
        if (!pendingOffer) return;

        const stagedGame = cloneForMutation(current);
        stagedGame.offseasonState = initializeOffseasonState(stagedGame);
        stagedGame.offseasonState.tradeOffers = [...deadlineState.pendingOffers];
        const result = acceptTradeOfferEngine(stagedGame, offerId);

        if (result.nextState.tradeDeadlineState) {
          result.nextState.tradeDeadlineState.pendingOffers = deadlineState.pendingOffers.filter((offer) => offer.id !== offerId);
          result.nextState.tradeDeadlineState.tickerMessages = [
            ...deadlineState.tickerMessages,
            `USER MOVE: ${pendingOffer.summary}`,
          ].slice(-20);
        }
        result.nextState.offseasonState = null;
        await commitGame(result.nextState);
      },

      rejectDeadlineOffer: async (offerId) => {
        const current = get().game;
        const deadlineState = current?.tradeDeadlineState;
        if (!current || !deadlineState) return;
        const nextGame = cloneForMutation(current);
        nextGame.tradeDeadlineState = {
          ...deadlineState,
          pendingOffers: deadlineState.pendingOffers.filter((offer) => offer.id !== offerId),
          tickerMessages: [
            ...deadlineState.tickerMessages,
            'USER MOVE: Offer declined before the market moved on.',
          ].slice(-20),
        };
        await commitGame(nextGame);
      },

      finalizeDeadline: async () => {
        const current = get().game;
        const deadlineState = current?.tradeDeadlineState;
        if (!current || !deadlineState) return;

        const resolvedState = finalizeDeadlineEngine(current, deadlineState);
        resolvedState.eventLog = [...resolvedState.eventLog, deadlineResolvedEvent(resolvedState)];

        const result = await runAdvanceWeek(resolvedState);
        const nextGame = result.nextState;
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;

        if (userTeam) {
          updateSystemFit(userTeam);
        }

        completeTutorialActionEngine(nextGame, 'week:advance');
        await commitGame(nextGame);
        navigateTo('/game-day');
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

      signStreetFreeAgent: async (playerId, offer) => {
        const current = get().game;
        if (!current) return;
        const result = signStreetFreeAgentEngine(current, playerId, offer);
        appendAudioCue(result.nextState, 'free_agent_signed', 'high', {
          source: 'street-free-agent',
          playerId,
        });
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

      upgradeStadium: async () => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam) return;
        const result = upgradeStadiumEngine(userTeam.franchiseIdentity, userTeam);
        if (!result) return;
        userTeam.franchiseIdentity = result.identity;
        adjustFranchiseCap(userTeam, -result.cost);
        await commitGame(nextGame);
      },

      acceptNamingRights: async (dealIndex) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        const deal = nextGame.stadiumDealOffers[dealIndex];
        if (!userTeam || !deal) return;
        userTeam.franchiseIdentity = acceptStadiumDealEngine(userTeam.franchiseIdentity, deal);
        nextGame.stadiumDealOffers = [];
        await commitGame(nextGame);
      },

      relocateTeam: async (destinationId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam) return;
        const destination = resolveRelocationDestination(userTeam, destinationId);
        if (!destination) return;
        const relocated = relocateTeamEngine(
          userTeam,
          userTeam.franchiseIdentity,
          destination,
          nextGame.year,
          mulberry32(buildIntelSeed(nextGame, `relocate:${destination.abbr}`)),
        );
        adjustFranchiseCap(relocated.team, -destination.cost);
        nextGame.teams[userTeam.id] = relocated.team;
        for (const player of relocated.team.roster) {
          nextGame.players[player.id] = player;
        }
        await commitGame(nextGame);
        navigateTo('/franchise');
      },

      protectExpansionPlayers: async (playerIds) => {
        const current = get().game;
        if (!current?.expansionDraftState) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam || !nextGame.expansionDraftState) return;
        nextGame.expansionDraftState = protectExpansionPlayersEngine(nextGame.expansionDraftState, userTeam.id, playerIds);
        completeExpansionPreview(nextGame);
        await commitGame(nextGame);
      },

      finalizeExpansionDraft: async () => {
        const current = get().game;
        if (!current?.expansionDraftState) return;
        const nextGame = cloneForMutation(current);
        const previewState = completeExpansionPreview(nextGame);
        if (!previewState) return;
        const finalized = finalizeExpansionDraftEngine(
          nextGame,
          previewState,
          mulberry32(buildIntelSeed(nextGame, `expansion:${previewState.expansionTeam.abbr}`)),
        );
        await commitGame(finalized);
        navigateTo('/franchise');
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

      runPrivateWorkout: async (prospectId) => {
        const current = get().game;
        if (!current) return;
        const result = runPrivateWorkoutEngine(current, prospectId);
        await commitGame(result.nextState);
      },

      toggleScoutingWatchlist: async (prospectId) => {
        const current = get().game;
        if (!current?.offseasonState) return;
        const nextGame = cloneForMutation(current);
        const offseasonState = nextGame.offseasonState;
        if (!offseasonState) return;
        offseasonState.scoutingWatchlist = toggleScoutingWatchlistEngine(
          offseasonState.scoutingWatchlist ?? [],
          prospectId,
        );
        await commitGame(nextGame);
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

      callTeamMeeting: async () => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam) return;
        userTeam.lockerRoom = userTeam.lockerRoom ?? initializeLockerRoom(userTeam, intelRng(nextGame, `locker:init:${userTeam.id}`));
        const outcome = callTeamMeetingEngine(
          userTeam,
          userTeam.lockerRoom,
          intelRng(nextGame, `locker:meeting:${nextGame.year}:${nextGame.week}:${userTeam.id}`),
          nextGame.week,
        );
        userTeam.lockerRoom = outcome.lockerRoom;
        await commitGame(nextGame);
      },

      triggerCaptainRally: async (captainId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam) return;
        userTeam.lockerRoom = userTeam.lockerRoom ?? initializeLockerRoom(userTeam, intelRng(nextGame, `locker:init:${userTeam.id}`));
        userTeam.lockerRoom = triggerCaptainRallyEngine(userTeam.lockerRoom, captainId, userTeam, nextGame.week);
        await commitGame(nextGame);
      },

      acceptEndorsement: async (dealId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const deal = nextGame.endorsementOffers.find((entry) => entry.id === dealId);
        if (!deal) return;
        const player = nextGame.players[deal.playerId];
        if (!player) return;
        acceptEndorsementEngine(player, deal);
        nextGame.endorsementOffers = nextGame.endorsementOffers.filter((entry) => entry.id !== dealId);
        await commitGame(nextGame);
      },

      declineEndorsement: async (dealId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        nextGame.endorsementOffers = nextGame.endorsementOffers.filter((entry) => entry.id !== dealId);
        await commitGame(nextGame);
      },

      startFarewellTour: async (playerId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam) return;
        const player = userTeam.roster.find((entry) => entry.id === playerId);
        if (!player) return;
        nextGame.farewellTours = nextGame.farewellTours.filter((tour) => tour.playerId !== playerId);
        const seasonSchedule = nextGame.schedule.flatMap((week) =>
          week.games.map((game) => ({ ...game, week: week.week })),
        );
        nextGame.farewellTours.push(
          startFarewellTourEngine(
            player,
            userTeam,
            nextGame.week,
            intelRng(nextGame, `farewell:${playerId}:${nextGame.year}:${nextGame.week}`),
            seasonSchedule as typeof seasonSchedule & Parameters<typeof startFarewellTourEngine>[4],
            nextGame.teams,
          ),
        );
        await commitGame(nextGame);
      },

      electCaptain: async (playerId) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam) return;
        userTeam.lockerRoom = userTeam.lockerRoom ?? initializeLockerRoom(userTeam, intelRng(nextGame, `locker:init:${userTeam.id}`));
        userTeam.lockerRoom = appointCaptain(userTeam, userTeam.lockerRoom, playerId);
        await commitGame(nextGame);
      },

      voteOnProposal: async (proposalId, vote) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        ensureGovernanceState(nextGame);
        const userTeam = getUserTeam(nextGame);
        if (!userTeam) return;

        const proposal = nextGame.commissionerState.activeProposals.find((entry) => entry.id === proposalId);
        if (!proposal) return;

        let resolvedProposal = vote === 'abstain'
          ? { ...proposal, votes: { ...proposal.votes, [userTeam.id]: 'abstain' as const } }
          : castRuleVote(proposal, userTeam.id, vote);
        resolvedProposal = simulateAIVotes(resolvedProposal, nextGame);

        const result = resolveVote(resolvedProposal);
        const label = LEAGUE_RULE_DEFINITIONS[proposal.ruleKey].label;

        nextGame.commissionerState.activeProposals = nextGame.commissionerState.activeProposals
          .filter((entry) => entry.id !== proposalId);
        nextGame.commissionerState.history = [...nextGame.commissionerState.history, result];

        if (result.passed) {
          const beforeRules = structuredClone(nextGame.leagueRules);
          nextGame.leagueRules = applyRuleChange(nextGame.leagueRules, {
            key: proposal.ruleKey,
            newValue: proposal.proposedValue,
            source: proposal.source === 'commissioner' ? 'commissioner_vote' : 'owners_vote',
            proposedBy: proposal.proposedByTeamId ?? nextGame.commissionerState.name,
            effectiveYear: proposal.effectiveYear,
            rationale: proposal.rationale,
          });

          if (proposal.ruleKey === 'salary_cap_growth' || proposal.ruleKey === 'cap_floor_pct') {
            refreshLeagueCapSpace(nextGame);
          }

          const voteLine = `${result.yesVotes}-${result.noVotes}${result.abstains > 0 ? ` with ${result.abstains} abstain${result.abstains === 1 ? '' : 's'}` : ''}`;
          const summary = summarizeRuleDiffs(beforeRules, nextGame.leagueRules);
          addGovernanceNarrative(
            nextGame,
            `${label} approved`,
            `Owners passed ${label} by a ${voteLine} margin. The change takes effect in ${result.effectiveYear}. ${summary}`,
            {
              sentiment: 'positive',
              idSuffix: `${proposal.id}-passed`,
            },
          );
        } else {
          if (proposal.source === 'owner_petition' && proposal.proposedByTeamId === userTeam.id) {
            applyOwnerMoodDelta(userTeam, -10);
          }

          addGovernanceNarrative(
            nextGame,
            `${label} rejected`,
            `${nextGame.commissionerState.name}'s ${label} proposal failed ${result.yesVotes}-${result.noVotes}.`,
            {
              sentiment: 'negative',
              idSuffix: `${proposal.id}-failed`,
            },
          );
        }

        await commitGame(nextGame);
      },

      petitionRuleChange: async (ruleKey, proposedValue) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        ensureGovernanceState(nextGame);
        const userTeam = getUserTeam(nextGame);
        if (!userTeam) return;

        const definition = LEAGUE_RULE_DEFINITIONS[ruleKey];
        if (!definition?.petitionable) return;

        const currentValue = getActiveRule(nextGame.leagueRules, ruleKey, nextGame.year);
        if (JSON.stringify(currentValue) === JSON.stringify(proposedValue)) return;

        const proposalId = `petition-${nextGame.year}-${nextGame.week}-${ruleKey}-${nextGame.commissionerState.history.length + nextGame.commissionerState.activeProposals.length}`;
        nextGame.commissionerState.activeProposals = [
          ...nextGame.commissionerState.activeProposals.filter(
            (entry) => !(entry.source === 'owner_petition' && entry.proposedByTeamId === userTeam.id),
          ),
          {
            id: proposalId,
            ruleKey,
            currentValue,
            proposedValue,
            rationale: `${userTeam.city} ${userTeam.name} ownership petitioned to adjust ${definition.label.toLowerCase()}.`,
            source: 'owner_petition',
            votes: {},
            requiredMajority: majorityThreshold(nextGame),
            deadline: nextGame.year,
            effectiveYear: nextGame.year + 1,
            proposedByTeamId: userTeam.id,
          },
        ];

        addGovernanceNarrative(
          nextGame,
          `Rule petition filed for ${definition.label}`,
          `${userTeam.city} ${userTeam.name} ownership filed a petition to change ${definition.label}. If it fails, owner goodwill takes a hit.`,
          {
            sentiment: 'neutral',
            importance: 'minor',
            idSuffix: `${proposalId}-filed`,
          },
        );

        await commitGame(nextGame);
      },

      voteOnCBA: async (vote) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        ensureGovernanceState(nextGame);
        const userTeam = getUserTeam(nextGame);
        const negotiationState = nextGame.cbaState.negotiationState;
        const proposal = negotiationState?.currentProposal;
        if (!userTeam || !negotiationState || !proposal || nextGame.cbaState.status !== 'awaiting_owner_vote') return;

        const ownerVotes = {
          ...negotiationState.ownerVotes,
          [userTeam.id]: vote,
        };

        for (const team of Object.values(nextGame.teams).sort((a, b) => a.id.localeCompare(b.id))) {
          if (team.id === userTeam.id) continue;
          ownerVotes[team.id] = cbaOwnerVoteForTeam(nextGame, team.id, proposal);
        }

        const yesVotes = Object.values(ownerVotes).filter((entry) => entry === 'approve').length;
        const threshold = majorityThreshold(nextGame);

        if (yesVotes >= threshold) {
          const beforeRules = structuredClone(nextGame.leagueRules);
          nextGame.cbaState = ratifyCBA(nextGame.cbaState, proposal, nextGame.year);
          applyCBADealToRules(nextGame, nextGame.cbaState.currentDeal!);
          refreshLeagueCapSpace(nextGame);
          nextGame.laborState.activeStoppage = null;
          nextGame.laborState.unionSatisfaction = clampMeter(nextGame.laborState.unionSatisfaction + 10);

          const summary = summarizeRuleDiffs(beforeRules, nextGame.leagueRules);
          addGovernanceNarrative(
            nextGame,
            `New CBA ratified`,
            `Owners approved the new agreement ${yesVotes}-${Object.keys(nextGame.teams).length - yesVotes}. ${summary}`,
            {
              sentiment: 'positive',
              idSuffix: `cba-ratified-${nextGame.year}`,
            },
          );
          addLaborNarrative(
            nextGame,
            `Lockout threat ends with a new deal`,
            `After ${negotiationState.round} round(s), league business is back on track under a fresh agreement.`,
            {
              sentiment: 'positive',
              idSuffix: `cba-labor-ratified-${nextGame.year}`,
            },
          );
        } else {
          const nextStatus = negotiationState.round >= 5 ? 'lockout' : 'negotiating';
          nextGame.cbaState = {
            ...nextGame.cbaState,
            status: nextStatus,
            lockoutRisk: Math.min(100, nextGame.cbaState.lockoutRisk + 15),
            negotiationState: {
              ...negotiationState,
              currentProposal: null,
              ownerVotes: {},
              userVote: null,
              publicPressure: Math.min(100, negotiationState.publicPressure + 10),
            },
          };

          if (nextStatus === 'lockout') {
            nextGame.laborState.activeStoppage = {
              type: 'lockout',
              severity: 3,
              startWeek: nextGame.week,
              resolvedWeek: null,
              affectedTeams: Object.keys(nextGame.teams),
              moralePenalty: -10,
            };
            addLaborNarrative(
              nextGame,
              `League enters a lockout`,
              `Owners rejected the latest CBA ${yesVotes}-${Object.keys(nextGame.teams).length - yesVotes}, and league operations are now frozen.`,
              {
                sentiment: 'negative',
                importance: 'breaking',
                idSuffix: `cba-lockout-${nextGame.year}`,
              },
            );
          } else {
            addGovernanceNarrative(
              nextGame,
              `Owners reject the current CBA offer`,
              `The latest agreement failed ${yesVotes}-${Object.keys(nextGame.teams).length - yesVotes}. Negotiations will continue.`,
              {
                sentiment: 'negative',
                idSuffix: `cba-rejected-${nextGame.year}-${negotiationState.round}`,
              },
            );
          }
        }

        await commitGame(nextGame);
        if (isCBAInterruptStatus(nextGame.cbaState.status)) {
          navigateTo('/cba');
        }
      },

      advanceCBANegotiation: async () => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        ensureGovernanceState(nextGame);
        nextGame.cbaState.status = checkCBAStatus(nextGame.cbaState, nextGame.year);

        if (nextGame.cbaState.status === 'awaiting_owner_vote') {
          navigateTo('/cba');
          return;
        }

        if (nextGame.cbaState.status === 'lockout') {
          const resolution = resolveLockout(nextGame.cbaState, nextGame);
          if (!resolution.resolved) return;
          nextGame.cbaState = resolution.cba;
          applyCBADealToRules(nextGame, nextGame.cbaState.currentDeal!);
          refreshLeagueCapSpace(nextGame);
          nextGame.laborState.activeStoppage = null;
          nextGame.laborState.unionSatisfaction = clampMeter(nextGame.laborState.unionSatisfaction + 8);
          addLaborNarrative(
            nextGame,
            `Lockout resolved`,
            resolution.summary,
            {
              sentiment: 'positive',
              idSuffix: `lockout-resolved-${nextGame.year}`,
            },
          );
          await commitGame(nextGame);
          return;
        }

        if (nextGame.cbaState.status === 'active') {
          return;
        }

        const outcome = negotiateCBA(nextGame.cbaState, nextGame);
        nextGame.cbaState = outcome.cba;

        if (outcome.lockout) {
          nextGame.laborState.activeStoppage = {
            type: 'lockout',
            severity: 3,
            startWeek: nextGame.week,
            resolvedWeek: null,
            affectedTeams: Object.keys(nextGame.teams),
            moralePenalty: -10,
          };
          addLaborNarrative(
            nextGame,
            `CBA talks collapse`,
            outcome.summary,
            {
              sentiment: 'negative',
              importance: 'breaking',
              idSuffix: `cba-collapse-${nextGame.year}-${nextGame.cbaState.negotiationState?.round ?? 0}`,
            },
          );
        } else {
          addGovernanceNarrative(
            nextGame,
            `CBA round ${nextGame.cbaState.negotiationState?.round ?? 0}`,
            outcome.summary,
            {
              sentiment: outcome.dealReached ? 'positive' : 'neutral',
              importance: outcome.dealReached ? 'major' : 'minor',
              idSuffix: `cba-round-${nextGame.year}-${nextGame.cbaState.negotiationState?.round ?? 0}`,
            },
          );
        }

        await commitGame(nextGame);
        if (isCBAInterruptStatus(nextGame.cbaState.status)) {
          navigateTo('/cba');
        }
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
        snapshotForUndo('Accept Trade');
        const result = acceptTradeOfferEngine(current, offerId);
        appendAudioCue(result.nextState, 'trade_complete', 'high', {
          source: 'trade-center',
          offerId,
        });
        await commitGame(result.nextState);
      },

      rejectTradeOffer: async (offerId) => {
        const current = get().game;
        if (!current) return;
        const result = rejectTradeOfferEngine(current, offerId);
        appendAudioCue(result.nextState, 'trade_rejected', 'medium', {
          source: 'trade-center',
          offerId,
        });
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
        appendAudioCue(nextGame, 'trade_complete', 'high', {
          source: 'draft-trade',
          targetPick: offer.targetPick,
          from: offer.from,
        });
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
        appendAudioCue(nextGame, 'trade_rejected', 'medium', {
          source: 'draft-trade',
          targetPick: offer.targetPick,
          from: offer.from,
        });
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
        appendAudioCue(result.nextState, 'draft_pick', 'high', {
          source: 'draft-board',
          prospectId,
        });
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

      refreshCoachingMarket: async () => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam) return;
        nextGame.coachingMarket = buildCoachingMarket(nextGame, userTeam.id);
        await commitGame(nextGame);
      },

      hireStaff: async (role, candidate) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam) return;
        hireStaffCandidate(nextGame, userTeam.id, candidate, role);
        nextGame.coachingMarket = buildCoachingMarket(nextGame, userTeam.id);
        await commitGame(nextGame);
      },

      fireStaff: async (role) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam) return;
        fireStaffMember(nextGame, userTeam.id, role);
        nextGame.coachingMarket = buildCoachingMarket(nextGame, userTeam.id);
        await commitGame(nextGame);
      },

      promoteStaff: async (fromRole) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam) return;
        promoteCoordinator(nextGame, userTeam.id, fromRole);
        nextGame.coachingMarket = buildCoachingMarket(nextGame, userTeam.id);
        await commitGame(nextGame);
      },

      applyTeamSchemeChange: async (offenseScheme, defenseScheme) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (!userTeam) return;
        applySchemeChange(nextGame, userTeam.id, offenseScheme, defenseScheme);
        await commitGame(nextGame);
      },

      setHeadCoachSkillSelection: async (branch, tier) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        const coachId = userTeam?.staff.hc?.id;
        if (!userTeam || !coachId) return;
        userTeam.skillSelections[coachId] = {
          branch,
          tier,
          archForLookup: userTeam.staff.hc?.archetype,
        };
        await commitGame(nextGame);
      },

      setPhase: (phase) =>
        set((s) => {
          if (!s.game) return;
          s.game.phase = phase;
        }),

      setDifficulty: async (difficulty) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        nextGame.difficulty = difficulty;
        nextGame.settings.halftimeDecisions = getDefaultHalftimeDecisionSetting(difficulty);
        await commitGame(nextGame);
      },

      setHalftimeDecisions: async (setting) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        nextGame.settings.halftimeDecisions = current.difficulty === 'rookie' ? 'off' : setting;
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

      startScenarioChallenge: async (scenarioId) => {
        const current = get().game;
        const seed = Date.now();
        const userTeamIndex = current ? userTeamIndexFor(current) : 0;
        const difficulty = current?.difficulty ?? 'pro';
        const baseGame = createSeedGameState(seed, userTeamIndex, difficulty);
        if (current?.scenarioState?.completedScenarios.length) {
          baseGame.scenarioState = {
            activeScenario: undefined,
            scenarioSeason: 1,
            completedScenarios: structuredClone(current.scenarioState.completedScenarios),
          };
        }
        const nextGame = startScenarioEngine(scenarioId, baseGame, mulberry32(seed ^ (scenarioId.length * 97)));
        await commitGame(nextGame);
        navigateTo('/');
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

      saveWeeklyPrepPlan: async (plan, report) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        nextGame.weeklyPrepPlans = nextGame.weeklyPrepPlans ?? {};
        nextGame.weeklyPrepPlans[plan.teamId] = plan;
        if (report) {
          upsertOpponentReportEngine(nextGame, report);
        }
        const derivedPlan = buildGamePlanFromWeeklyPrep(plan);
        if (report?.keyPlayers?.[0]?.id && plan.keyMatchupPlayerId) {
          derivedPlan.keyMatchup = {
            playerA: plan.keyMatchupPlayerId,
            playerB: report.keyPlayers[0].id,
          };
        }
        setGamePlanEngine(nextGame, derivedPlan, report);
        await commitGame(nextGame);
      },

      clearWeeklyPrepPlan: async () => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const userTeam = Object.values(nextGame.teams).find((team) => team.isUser) ?? null;
        if (userTeam && nextGame.weeklyPrepPlans?.[userTeam.id]) {
          delete nextGame.weeklyPrepPlans[userTeam.id];
        }
        resetGamePlanEngine(nextGame);
        await commitGame(nextGame);
      },

      respondToPressConference: async (conferenceId, tier, response) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const entry = nextGame.postGameUi?.pressConferenceQueue.find((queueEntry) => queueEntry.conferenceId === conferenceId);
        if (!entry) return;
        entry.selectedTier = tier;
        entry.selectedResponse = response;
        await commitGame(nextGame);
      },

      clearAudioQueue: async () => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        nextGame.postGameUi = nextGame.postGameUi ?? {
          pressConferenceQueue: [],
          audioCueQueue: [],
          pendingHalftimeDecision: null,
        };
        nextGame.postGameUi.audioCueQueue = [];
        await commitGame(nextGame);
      },

      dismissBreakingNews: async () => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        nextGame.breakingNewsQueue = [...(nextGame.breakingNewsQueue ?? [])].slice(1);
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

      // ── Dynasty Systems ─────────────────────────────────
      nameDynastyEra: async (eraName: string) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const updated = startDynastyEraEngine(nextGame, eraName);
        await commitGame(updated);
      },

      hireMentor: async (mentorId: string) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const updated = hireMentorEngine(nextGame, mentorId);
        await commitGame(updated);
      },

      fireMentor: async (mentorId: string) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        const updated = fireMentorEngine(nextGame, mentorId);
        await commitGame(updated);
      },

      setCallYourShot: async (declaration: ShotDeclaration | null) => {
        const current = get().game;
        if (!current) return;
        const nextGame = cloneForMutation(current);
        nextGame.activeCallYourShot = declaration ?? undefined;
        await commitGame(nextGame);
      },

      recordManualSave: () => {
        set((s) => {
          if (s.game) {
            (s.game as GameState & { lastManualSaveYear?: number }).lastManualSaveYear = s.game.year;
          }
        });
      },

      // ── Franchise Setup ────────────────────────────────
      advanceSetup: async (options) => {
        const game = get().game;
        if (!game?.setupState) return;
        const userTeam = Object.values(game.teams).find((t) => t.isUser);
        if (!userTeam) return;
        const next = advanceSetupPhaseEngine(game.setupState, options);
        next.crisisProfile = generateTeamCrisisProfile(game, userTeam.id);
        next.forecastBoard = generateSetupForecast(game, userTeam.id, next.decisions);
        set((s) => { s.game!.setupState = next; });
      },
      goBackSetup: async () => {
        const game = get().game;
        if (!game?.setupState) return;
        const userTeam = Object.values(game.teams).find((t) => t.isUser);
        if (!userTeam) return;
        const next = goBackSetupPhaseEngine(game.setupState);
        next.crisisProfile = generateTeamCrisisProfile(game, userTeam.id);
        next.forecastBoard = generateSetupForecast(game, userTeam.id, next.decisions);
        set((s) => { s.game!.setupState = next; });
      },
      applySetupChoice: async (decision) => {
        const game = get().game;
        if (!game?.setupState) return;
        const userTeam = Object.values(game.teams).find((t) => t.isUser);
        if (!userTeam) return;
        const next = applySetupDecisionEngine(game.setupState, decision);
        next.crisisProfile = generateTeamCrisisProfile(game, userTeam.id);
        next.forecastBoard = generateSetupForecast(game, userTeam.id, next.decisions);
        set((s) => { s.game!.setupState = next; });
      },
      toggleSetupDrilldown: async (pressureId) => {
        const game = get().game;
        if (!game?.setupState) return;
        const next = toggleSetupDrilldownEngine(game.setupState, pressureId);
        set((s) => { s.game!.setupState = next; });
      },
      completeSetup: async () => {
        const game = get().game;
        if (!game?.setupState) return;
        const userTeam = Object.values(game.teams).find((t) => t.isUser);
        if (!userTeam) return;
        const nextGame = finalizeSetupEngine(game, userTeam.id, game.setupState);
        await commitGame(nextGame);
      },

      // ── Undo ────────────────────────────────────────────
      undo: async () => {
        const snapshot = get().undoSnapshot;
        if (!snapshot) return;
        set((s) => {
          s.game = snapshot;
          s.undoSnapshot = null;
          s.undoLabel = null;
        });
        await autosaveDynasty(snapshot);
      },
    },
  });
  }),
);

const EMPTY_TIMELINE = (playerId: string): CareerTimeline => ({
  playerId,
  playerName: '',
  pos: 'WR',
  seasons: [],
});

export function useRecordChases(): RecordChase[] {
  return useGameStore(selectRecordChases);
}

export function useRecentBrokenRecords(): BrokenRecord[] {
  return useGameStore(selectRecentBrokenRecords);
}

export function useRecentMilestones(): MilestoneReached[] {
  return useGameStore(selectRecentMilestones);
}

export function useCapHealth(): CapHealthReport {
  return useGameStore(selectCapHealth);
}

export function useCapCandidates(): CapCandidate[] {
  return useGameStore(selectCapCandidates);
}

export function useMultiYearProjection(): MultiYearProjection {
  return useGameStore(selectMultiYearProjection);
}

export function useLeagueLeaders() {
  const game = useGameStore((state) => state.game);
  return useCallback((stat: string, pos?: Position, season?: number): StatLeaderEntry[] => {
    if (!game) return [];
    return getStatLeaderboard(game, stat, season, pos);
  }, [game]);
}

export function usePlayerTimeline() {
  const game = useGameStore((state) => state.game);
  return useCallback((playerId: string): CareerTimeline => {
    if (!game) return EMPTY_TIMELINE(playerId);
    return getPlayerCareerTimeline(game, playerId);
  }, [game]);
}
