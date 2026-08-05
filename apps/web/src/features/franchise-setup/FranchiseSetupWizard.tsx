/**
 * FranchiseSetupWizard — The First 10 Minutes.
 *
 * Full-screen guided franchise onboarding that walks users through 10 phases
 * with an Assistant GM character providing data-driven commentary.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MfdStepper, PixelButton, PixelPanel } from '@mfd/design-system/components';
import {
  PHASE_META,
  agmOnBlueprint,
  agmOnCapStrategy,
  agmOnDepthChart,
  agmOnGoalSelection,
  agmOnHireCoach,
  agmOnHireScout,
  agmOnIntelBriefing,
  agmOnRosterOverview,
  agmOnSchemeSelection,
  agmReactsToGoalChoice,
  agmReactsToSchemeChoice,
  generateBlueprint,
  generateCapBriefing,
  generateCapPackages,
  generateCoachingReview,
  generateDepthChartContext,
  generateGoalContext,
  generateIntelBriefing,
  generateDayOneNarrativePack,
  generateRosterOverview,
  generateSchemeContext,
  generateSetupColdOpen,
  generateSetupForecast,
  generateTeamCrisisProfile,
  createSetupState,
  getAGMGreeting,
  getBlueprintClosingMonologue,
  getCoachCandidates,
  getGoalReaction,
  getSchemeReaction,
  getScoutCandidates,
  getSelectedAGM,
  getTeachingTips,
  getTopPressureCard,
  isPhaseComplete,
  previewSetupForecastChange,
} from '@mfd/engine';
import type { AGMReaction, CapPosture, CultureMandate, DepthChartPhilosophy, GoalOption, SchemeOption, SetupPhase } from '@mfd/engine';
import type { ChipHostDialogueOverride } from '../companion';
import {
  selectSetupPhaseIndex,
  selectSetupState,
  useGameStore,
} from '../../app/store/game-store';
import { monoSm, pixelSm } from '../shared/pixelUi';
import { AGMStage, type AGMStageState } from './AGMStage';
import { DayOneDecisionLedger, type DayOneDecisionLedgerEntry } from './DayOneBetLedger';
import { BlueprintPhase } from './phases/BlueprintPhase';
import { CapStrategyPhase } from './phases/CapStrategyPhase';
import { DepthChartPhase } from './phases/DepthChartPhase';
import { IntelBriefingPhase } from './phases/IntelBriefingPhase';
import { MeetRosterPhase } from './phases/MeetRosterPhase';
import { SetGoalsPhase } from './phases/SetGoalsPhase';
import { SetSchemePhase } from './phases/SetSchemePhase';
import { ChooseAGMPhase } from './ChooseAGMPhase';
import { ForecastBoard } from './ForecastBoard';
import { HireCoachPhase } from './HireCoachPhase';
import { HireScoutPhase } from './HireScoutPhase';
import { PhaseTransitionOverlay } from './PhaseTransitionOverlay';
import { SetupColdOpen } from './SetupColdOpen';
import {
  finalizeSetupRun,
  markPreludeDismissed,
  readFirstTenMinutesCompleted,
  readPreludeDismissed,
  readSetupRunMode,
  setupRunId,
  type SetupRunMode,
} from './setupPersistence';
import {
  buildTransitionOverlayData,
  deriveGoalReactionSentiment,
  deriveSchemeReactionSentiment,
  getNextSetupPhase,
  getTeachingTipTopicForPhase,
} from './setupPolish';
import {
  buildPrimaryActionProps,
  getPrimaryActionDisabledReason,
  useStageActionRegistry,
  type SetupStageActionId,
} from './stageActionRegistry';
import './FranchiseSetupWizard.css';

const READ_ONLY_PHASES = new Set<SetupPhase>(['intel_briefing', 'meet_roster', 'blueprint']);

function formatChoiceLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncateChipSummary(text: string, maxLength = 240): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function compactChipDetail(text: string, maxLength = 220): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function compactChipContextClause(text: string, maxLength = 140): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const firstClause = normalized.split(';')[0]?.trim() ?? normalized;
  if (firstClause.length <= maxLength) return firstClause;
  const clipped = firstClause.slice(0, maxLength).trimEnd().replace(/\s+\S*$/, '');
  return clipped.length > 0 ? clipped : firstClause;
}

function stripTerminalPunctuation(text: string): string {
  return text.replace(/[.!?]+$/u, '');
}

export function buildColdOpenChipDialogue({
  coldOpen,
  forecastSummary,
}: {
  coldOpen: ReturnType<typeof generateSetupColdOpen>;
  forecastSummary: string;
}): ChipHostDialogueOverride {
  const consequence = compactChipContextClause(forecastSummary, 86);
  const setupContext = `Why: ownership expects a named Week 1 starter, backup, cap move, or coach. Week 1 danger: ${stripTerminalPunctuation(consequence)}.`;

  return {
    pose: 'reviewing-tablet',
    text: truncateChipSummary(
      'Must Do: hire the Assistant GM — your first call, Coach. My first setup priority follows yours: cap space, starter and backup roles, the Week 1 game plan, or owner patience.',
    ),
    contextDetails: [
      'Decision up next: hire the Assistant GM whose promise matches the first Week 1 danger to track.',
      'Consequence: choose cap-first and I keep money warnings up front; starter jobs and the coach responsible for Week 1 still need fixing before kickoff.',
      setupContext,
      'Where: choose the advisor promise that matches the biggest Week 1 danger: cap space, roster roles, game plan, or owner patience.',
    ],
  };
}

export interface SetupPhaseChipDialogueInput {
  phase: SetupPhase;
  coldOpen: ReturnType<typeof generateSetupColdOpen>;
  forecastSummary: string;
  topPressureLabel?: string | null;
  topPressureOpened?: boolean;
  agmName?: string | null;
  activeReaction?: AGMReaction | null;
}

const SETUP_PHASE_CHIP_GUIDANCE: Record<SetupPhase, {
  pose: ChipHostDialogueOverride['pose'];
  text: string;
  why: string;
  decision: string;
  where: string;
  consequence: string;
}> = {
  choose_agm: {
    pose: 'reviewing-tablet',
    text: 'Must Do: hire the Assistant GM — your first call, Coach. My first setup priority follows yours: cap space, starter and backup roles, the Week 1 game plan, or owner patience.',
    why: 'this hire decides whether I call out cap space, starter and backup roles, the Week 1 game plan, or owner patience first.',
    decision: 'hire the Assistant GM whose promise matches the first Week 1 danger to track.',
    where: 'choose the advisor promise that matches the biggest Week 1 danger: cap space, roster roles, game plan, or owner patience.',
    consequence: 'choose cap-first and I keep money warnings up front; starter jobs and the coach responsible for Week 1 still need fixing before kickoff.',
  },
  intel_briefing: {
    pose: 'pointing-at-tape',
    text: 'Must Do: open the highlighted Intel card before advancing. It names whether roster, cap, staff, or owner patience needs action first before Week 1.',
    why: 'the highlighted Intel card names the Week 1 starter, cap, game-plan, or owner-patience consequence before you spend a hire, scheme choice, cap choice, or promise.',
    decision: 'open the highlighted Intel card, then apply the named fix when you choose staff, scheme, lineup, cap, or goals.',
    where: 'open the highlighted Intel card in Franchise Intel before pressing Next.',
    consequence: 'skipping Intel leaves one Week 1 decision unnamed: exposed starter, cap squeeze, no coach owning the game plan, or no cover for an injury.',
  },
  meet_roster: {
    pose: 'reviewing-tablet',
    text: 'Must Do: name protected stars and first backups before roster moves. Contracts that block injury replacements make Week 1 fixes harder.',
    why: 'this roster step names which star to protect, which starter or first backup needs cover, and which cap space must stay open for injury depth.',
    decision: 'name the strongest player to protect and the exposed starter or first-backup job that needs cover before one injury changes the lineup.',
    where: 'open Meet Roster now, then open Depth Chart, Contracts, or Free Agency after setup if the starter or first-backup job remains uncovered.',
    consequence: 'skipping this leaves stars unprotected, first-backup jobs uncovered, and cap space tied up before Week 1.',
  },
  hire_coach: {
    pose: 'calling-play',
    text: "Must Do: hire the coach whose calls match today's starters. A coach-player gap slows install, costs development reps, and exposes Week 1 assignments.",
    why: 'the coach sets practice installs, development reps, and which calls current starters must learn before kickoff.',
    decision: 'hire the coach whose scheme and teaching match the players already on the roster.',
    where: 'choose the coach plan on this screen before scouting; match it to the quarterback, line, coverage players, and defenders.',
    consequence: 'a coach-player gap slows install, costs development reps, and leaves protection or coverage assignments unassigned for Week 1.',
  },
  hire_scout: {
    pose: 'note-taking',
    text: 'Must Do: hire scouting for the starter, backup, or future replacement free agency would overprice. Missing scout info wastes picks and veteran bids.',
    why: 'the scout finds medical limits, assigned-role gaps, and coachability warnings before you spend draft picks or free-agent money.',
    decision: 'hire the scouting director who names the starter, backup, or future replacement that free agency would overprice.',
    where: 'choose the scout on this screen before scheme choices; name medical limits, assigned-role gaps, and coachability warnings before picks get wasted.',
    consequence: 'incomplete scout info misses future starter or backup answers, wastes picks, and turns draft misses into expensive veteran bids.',
  },
  set_scheme: {
    pose: 'think',
    text: 'Must Do: choose schemes that protect current starters. Bad fits create missed assignments and force Depth Chart or Game Plan protection by Week 1.',
    why: 'scheme match decides which starters know their assignments now and which positions need protection in Depth Chart or Game Plan.',
    decision: 'choose offense and defense schemes that protect current starters before planning for players you do not have yet.',
    where: 'pick both scheme cards before moving to the depth chart.',
    consequence: 'a scheme-player gap creates missed assignments, slows install, and costs points in the opener.',
  },
  depth_chart: {
    pose: 'point-left',
    text: 'Must Do: set starters deliberately. Higher-rated players reduce matchup mistakes, veterans cut assignment misses, and young starters trade Week 1 points for development snaps.',
    why: 'depth order decides who plays tired snaps, injury snaps, and late-game snaps before the opener uses that saved substitute.',
    decision: 'choose whether each unsettled position needs veteran mistake control or young-player development snaps.',
    where: 'set the depth-chart philosophy now, then open Depth Chart again before Advance Week.',
    consequence: 'unplanned depth order puts a player without the assigned role on the field when fatigue or injuries hit.',
  },
  cap_strategy: {
    pose: 'skeptical',
    text: 'Must Do: choose the cap plan before moves. Restructures create cap space now by moving money into future seasons.',
    why: 'the cap plan decides whether a Week 1 upgrade spends future cap space needed for injuries, trades, extensions, and next offseason.',
    decision: 'choose how much future cap space you are willing to spend for a Week 1 roster upgrade.',
    where: 'pick the cap package before owner goals and before any later contracts or trades.',
    consequence: 'creating cap space now limits injury replacements, trades, extensions, and next offseason.',
  },
  set_goals: {
    pose: 'concern',
    text: 'Must Do: pick defensible promises. Owner goals become expectations, and misses cut owner patience even after roster upgrades.',
    why: 'owner promises turn normal losses into judgment calls, so goals must match starters, depth, cap space, and owner patience.',
    decision: 'pick goals that match starter strength, injury depth, cap space, and owner patience.',
    where: 'choose season goals and team rules before the final blueprint.',
    consequence: 'missed promises cut owner patience for normal losses, budget asks, and roster resets.',
  },
  blueprint: {
    pose: 'mic-check',
    text: 'Must Do: open the blueprint before Week 1. It locks staff, scouting, scheme, lineup rules, cap plan, and owner promises.',
    why: 'this is the last setup screen to catch a setup mistake before Week 1; after kickoff, fixes cost cap space, morale, or owner patience.',
    decision: 'catch one staff, scheme, lineup, cap, or owner-promise mistake now, before the season starts.',
    where: 'open the blueprint and go back if a locked choice leaves starters, cap space, staff, or owner goals unprotected.',
    consequence: 'Week 1 starts from this plan; later fixes cost time, cap space, morale, or owner patience.',
  },
};

function setupFocusLabel(label: string): string {
  if (label === 'Week 1 Readiness') return 'Week 1 Plan';
  if (label === 'Scheme Cohesion') return 'Scheme Fit';
  if (label === 'Culture Stability') return 'Team Morale';
  if (label === 'Cap Flexibility') return 'Cap Space';
  if (label === 'Owner Heat') return 'Owner Patience';
  return label;
}

export function buildSetupPhaseChipDialogue({
  phase,
  coldOpen,
  forecastSummary,
  topPressureLabel = null,
  topPressureOpened = false,
  agmName = null,
  activeReaction = null,
}: SetupPhaseChipDialogueInput): ChipHostDialogueOverride {
  if (phase === 'choose_agm') {
    return buildColdOpenChipDialogue({ coldOpen, forecastSummary });
  }

  const guidance = SETUP_PHASE_CHIP_GUIDANCE[phase];
  const details = [
    `Decision up next: ${guidance.decision}`,
    `Consequence: ${guidance.consequence}`,
    `Why: ${guidance.why}`,
    `Where: ${guidance.where}`,
    `Owner expectation: ${coldOpen.ownerExpectation}`,
    agmName ? `Advisor hired: ${agmName}.` : null,
    topPressureLabel
      ? `Setup focus: ${setupFocusLabel(topPressureLabel)}${topPressureOpened ? ' is open.' : ' still needs to be opened.'}`
      : null,
    `Current setup consequence: ${forecastSummary}`,
    activeReaction
      ? `Latest choice consequence: ${activeReaction.reaction}${activeReaction.followUp ? ` ${activeReaction.followUp}` : ''}`
      : null,
  ].filter((detail): detail is string => Boolean(detail));

  return {
    pose: guidance.pose,
    text: truncateChipSummary(guidance.text),
    contextDetails: details.map((detail) => compactChipDetail(detail)),
  };
}

export function buildSetupSchemeFollowUp(
  option: Pick<SchemeOption, 'staffAligned' | 'transitionPenalty'>,
): string | null {
  if (option.staffAligned) {
    return 'This scheme matches the current staff, so Week 1 missed-assignment chance is lower. Still define roles before kickoff; missed assignments still show up in a familiar scheme.';
  }

  if (option.transitionPenalty > 0) {
    return 'Consequence: this scheme needs extra Week 1 prep. Open Depth Chart and Game Plan to protect changed roles; otherwise slower install creates missed assignments.';
  }

  return null;
}

export function buildSetupGoalFollowUp(
  goal: Pick<GoalOption, 'difficulty' | 'reason' | 'recommended'>,
): string {
  if (goal.recommended) return goal.reason;

  if (goal.difficulty === 'hard') {
    return 'Consequence: this goal cuts owner patience fast after losses. If starters, injury depth, or cap space cannot absorb October losses, rushed trades or contract pushes follow.';
  }

  if (goal.difficulty === 'easy') {
    return 'Consequence: this lower-demand goal protects owner patience longer, but missing it still makes losses trigger lineup, trade, and morale consequences.';
  }

  return 'Consequence: this goal is judged every week. Roster, Depth Chart, and Game Plan must defend it before each Advance Week or lineup, trade, and morale questions get louder.';
}

export function FranchiseSetupWizard({
  companionPanel = null,
  companionPrimaryActionActive = false,
  onCompanionActionChange,
  onCompanionDialogueChange,
  onStageAdvance,
}: {
  companionPanel?: ReactNode | null;
  companionPrimaryActionActive?: boolean;
  onCompanionActionChange?: (action: ReactNode | null) => void;
  onCompanionDialogueChange?: (dialogue: ChipHostDialogueOverride | null) => void;
  onStageAdvance?: (stageId: SetupStageActionId) => void;
} = {}) {
  const game = useGameStore((s) => s.game!);
  const setupState = useGameStore(selectSetupState)!;
  const phaseIndex = useGameStore(selectSetupPhaseIndex);
  const { advanceSetup, goBackSetup, applySetupChoice, toggleSetupDrilldown, completeSetup } = useGameStore((s) => s.actions);

  const userTeam = useMemo(() => Object.values(game.teams).find((team) => team.isUser)!, [game.teams]);
  const teamId = userTeam.id;
  const teamName = `${userTeam.city} ${userTeam.name}`;
  const decisions = setupState.decisions;
  const currentRunId = useMemo(() => setupRunId(game.seed, teamId, game.year), [game.seed, teamId, game.year]);

  const [setupRunMode] = useState<SetupRunMode>(() => (
    typeof window !== 'undefined' ? (readSetupRunMode(window.localStorage) ?? 'full') : 'full'
  ));
  const [firstTenMinutesCompleted] = useState<boolean>(() => (
    typeof window !== 'undefined' ? readFirstTenMinutesCompleted(window.localStorage) : false
  ));
  const [coldOpenDismissed, setColdOpenDismissed] = useState<boolean>(() => (
    typeof window !== 'undefined' ? readPreludeDismissed(window.localStorage, currentRunId) : false
  ));
  const [reducedMotion] = useState<boolean>(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ));
  const [schemeReaction, setSchemeReaction] = useState<AGMReaction | null>(null);
  const [goalReaction, setGoalReaction] = useState<AGMReaction | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionOverlay, setTransitionOverlay] = useState<{ flavorText: string; loadingTip: string } | null>(null);
  const [isLaunchingSeason, setIsLaunchingSeason] = useState(false);

  const isFastLaneRun = setupRunMode === 'fast_lane';

  const phaseData = useMemo(() => {
    switch (setupState.currentPhase) {
      case 'choose_agm':
        return null;
      case 'intel_briefing':
        return generateIntelBriefing(game, teamId);
      case 'meet_roster':
        return generateRosterOverview(game, teamId);
      case 'hire_coach':
        return generateCoachingReview(game, teamId);
      case 'hire_scout':
        return generateIntelBriefing(game, teamId);
      case 'set_scheme':
        return generateSchemeContext(game, teamId);
      case 'depth_chart':
        return generateDepthChartContext(
          game,
          teamId,
          decisions.offenseScheme && decisions.defenseScheme
            ? { off: decisions.offenseScheme, def: decisions.defenseScheme }
            : undefined,
          decisions.depthChartPhilosophy,
        );
      case 'cap_strategy':
        return generateCapBriefing(game, teamId);
      case 'set_goals':
        return generateGoalContext(game, teamId);
      case 'blueprint':
        return generateBlueprint(game, teamId, decisions);
      default:
        return null;
    }
  }, [setupState.currentPhase, game, teamId, decisions]);

  const agmProfile = useMemo(
    () => (decisions.agmProfileId ? getSelectedAGM(decisions.agmProfileId) : null),
    [decisions.agmProfileId],
  );
  const agmGreeting = useMemo(
    () => (agmProfile ? getAGMGreeting(agmProfile, teamName) : null),
    [agmProfile, teamName],
  );
  const crisisProfile = useMemo(
    () => setupState.crisisProfile ?? generateTeamCrisisProfile(game, teamId),
    [setupState.crisisProfile, game, teamId],
  );
  const forecastBoard = useMemo(
    () => setupState.forecastBoard ?? generateSetupForecast(game, teamId, decisions),
    [setupState.forecastBoard, game, teamId, decisions],
  );
  const coldOpen = useMemo(
    () => generateSetupColdOpen(game, teamId),
    [game, teamId],
  );
  const capPackages = useMemo(
    () => generateCapPackages(game, teamId),
    [game, teamId],
  );
  const schemeCatalog = useMemo(
    () => generateSchemeContext(game, teamId),
    [game, teamId],
  );
  const baseLedgerDecisions = useMemo(
    () => createSetupState().decisions,
    [],
  );
  const narrativePack = useMemo(
    () => generateDayOneNarrativePack(game, teamId, decisions),
    [game, teamId, decisions],
  );
  const topPressureCard = useMemo(
    () => getTopPressureCard(crisisProfile),
    [crisisProfile],
  );
  const topPressureOpened = useMemo(
    () => setupState.openedDrilldowns.includes(topPressureCard.id),
    [setupState.openedDrilldowns, topPressureCard.id],
  );
  const coachCandidates = useMemo(() => getCoachCandidates(), []);
  const scoutCandidates = useMemo(() => getScoutCandidates(), []);

  const coachPreviewById = useMemo(
    () => Object.fromEntries(
      coachCandidates.map((candidate) => [
        candidate.id,
        previewSetupForecastChange(game, teamId, decisions, { headCoachId: candidate.id }),
      ]),
    ),
    [coachCandidates, game, teamId, decisions],
  );
  const scoutPreviewById = useMemo(
    () => Object.fromEntries(
      scoutCandidates.map((candidate) => [
        candidate.id,
        previewSetupForecastChange(game, teamId, decisions, { scoutingDirectorId: candidate.id }),
      ]),
    ),
    [scoutCandidates, game, teamId, decisions],
  );
  const offensePreviewBySchemeId = useMemo(() => {
    if (setupState.currentPhase !== 'set_scheme' || !phaseData) return {};
    return Object.fromEntries(
      (phaseData as ReturnType<typeof generateSchemeContext>).offenseOptions.map((option) => [
        option.schemeId,
        previewSetupForecastChange(game, teamId, decisions, { offenseScheme: option.schemeId }),
      ]),
    );
  }, [setupState.currentPhase, phaseData, game, teamId, decisions]);
  const defensePreviewBySchemeId = useMemo(() => {
    if (setupState.currentPhase !== 'set_scheme' || !phaseData) return {};
    return Object.fromEntries(
      (phaseData as ReturnType<typeof generateSchemeContext>).defenseOptions.map((option) => [
        option.schemeId,
        previewSetupForecastChange(game, teamId, decisions, { defenseScheme: option.schemeId }),
      ]),
    );
  }, [setupState.currentPhase, phaseData, game, teamId, decisions]);
  const depthPreviewByPhilosophy = useMemo(
    () => ({
      best_players: previewSetupForecastChange(game, teamId, decisions, { depthChartPhilosophy: 'best_players' }),
      veterans_first: previewSetupForecastChange(game, teamId, decisions, { depthChartPhilosophy: 'veterans_first' }),
      youth_bet: previewSetupForecastChange(game, teamId, decisions, { depthChartPhilosophy: 'youth_bet' }),
    }),
    [game, teamId, decisions],
  );
  const capPreviewByPosture = useMemo(
    () => ({
      protect_future: previewSetupForecastChange(game, teamId, decisions, { capPosture: 'protect_future' }),
      balanced: previewSetupForecastChange(game, teamId, decisions, { capPosture: 'balanced' }),
      push_chips: previewSetupForecastChange(game, teamId, decisions, { capPosture: 'push_chips' }),
    }),
    [game, teamId, decisions],
  );
  const mandatePreviewById = useMemo(
    () => ({
      accountability: previewSetupForecastChange(game, teamId, decisions, { cultureMandate: 'accountability' }),
      player_led: previewSetupForecastChange(game, teamId, decisions, { cultureMandate: 'player_led' }),
      development_first: previewSetupForecastChange(game, teamId, decisions, { cultureMandate: 'development_first' }),
    }),
    [game, teamId, decisions],
  );

  const agmDialogue = useMemo(() => {
    if (!phaseData || !agmProfile) return null;
    switch (setupState.currentPhase) {
      case 'intel_briefing':
        return agmOnIntelBriefing(phaseData as ReturnType<typeof generateIntelBriefing>, agmProfile);
      case 'meet_roster':
        return agmOnRosterOverview(phaseData as ReturnType<typeof generateRosterOverview>, agmProfile);
      case 'hire_coach':
        return agmOnHireCoach(phaseData as ReturnType<typeof generateCoachingReview>, agmProfile);
      case 'hire_scout':
        return agmOnHireScout(phaseData as ReturnType<typeof generateIntelBriefing>, agmProfile);
      case 'set_scheme':
        return agmOnSchemeSelection(phaseData as ReturnType<typeof generateSchemeContext>, agmProfile);
      case 'depth_chart':
        return agmOnDepthChart(phaseData as ReturnType<typeof generateDepthChartContext>, agmProfile);
      case 'cap_strategy':
        return agmOnCapStrategy(phaseData as ReturnType<typeof generateCapBriefing>, agmProfile);
      case 'set_goals':
        return agmOnGoalSelection(phaseData as ReturnType<typeof generateGoalContext>, agmProfile);
      case 'blueprint':
        return agmOnBlueprint(phaseData as ReturnType<typeof generateBlueprint>, agmProfile);
      default:
        return null;
    }
  }, [setupState.currentPhase, phaseData, agmProfile]);

  const currentMeta = PHASE_META.find((phase) => phase.id === setupState.currentPhase) ?? PHASE_META[0]!;
  const isIntelBriefingPhase = setupState.currentPhase === 'intel_briefing';
  const isLastPhase = setupState.currentPhase === 'blueprint';
  const showColdOpen = setupState.currentPhase === 'choose_agm'
    && !isFastLaneRun
    && !firstTenMinutesCompleted
    && !decisions.agmProfileId
    && !coldOpenDismissed;
  const showFastLaneIntel = isFastLaneRun && isIntelBriefingPhase;
  const requireTopPressureOpened = isIntelBriefingPhase && !isFastLaneRun;
  const canAdvance = showColdOpen
    ? true
    : READ_ONLY_PHASES.has(setupState.currentPhase)
      ? (!isIntelBriefingPhase || !requireTopPressureOpened || topPressureOpened)
      : isPhaseComplete(setupState, setupState.currentPhase, { requireTopPressureOpened });
  const showStage = setupState.currentPhase !== 'choose_agm' && agmProfile !== null && !showFastLaneIntel;
  const defaultAgmPreviewId = narrativePack.recommendedAgmId;
  const decisionLedgerEntries = useMemo<DayOneDecisionLedgerEntry[]>(() => {
    const entries: DayOneDecisionLedgerEntry[] = [];

    if (agmProfile) {
      const scene = narrativePack.agmScenes[agmProfile.id];
      entries.push({
        id: 'agm',
        label: 'AGM',
        choice: agmProfile.name,
        readinessDelta: 0,
        volatilityDelta: 0,
        summaryLine: scene?.dayOnePromise ?? agmProfile.selectionPitch,
      });
    }

    if (decisions.headCoachId) {
      const coach = coachCandidates.find((candidate) => candidate.id === decisions.headCoachId);
      const preview = previewSetupForecastChange(game, teamId, baseLedgerDecisions, { headCoachId: decisions.headCoachId });
      entries.push({
        id: 'coach',
        label: 'Head Coach',
        choice: coach?.name ?? decisions.headCoachId,
        readinessDelta: preview.weekOneReadinessDelta,
        volatilityDelta: preview.weekOneVolatilityDelta,
        summaryLine: preview.summaryLine,
      });
    }

    if (decisions.scoutingDirectorId) {
      const scout = scoutCandidates.find((candidate) => candidate.id === decisions.scoutingDirectorId);
      const preview = previewSetupForecastChange(game, teamId, baseLedgerDecisions, { scoutingDirectorId: decisions.scoutingDirectorId });
      entries.push({
        id: 'scout',
        label: 'Scouting Director',
        choice: scout?.name ?? decisions.scoutingDirectorId,
        readinessDelta: preview.weekOneReadinessDelta,
        volatilityDelta: preview.weekOneVolatilityDelta,
        summaryLine: preview.summaryLine,
      });
    }

    if (decisions.offenseScheme) {
      const scheme = schemeCatalog.offenseOptions.find((entry) => entry.schemeId === decisions.offenseScheme);
      const preview = previewSetupForecastChange(game, teamId, baseLedgerDecisions, { offenseScheme: decisions.offenseScheme });
      entries.push({
        id: 'offense',
        label: 'Offense Scheme',
        choice: scheme?.label ?? formatChoiceLabel(decisions.offenseScheme),
        readinessDelta: preview.weekOneReadinessDelta,
        volatilityDelta: preview.weekOneVolatilityDelta,
        summaryLine: preview.summaryLine,
      });
    }

    if (decisions.defenseScheme) {
      const scheme = schemeCatalog.defenseOptions.find((entry) => entry.schemeId === decisions.defenseScheme);
      const preview = previewSetupForecastChange(game, teamId, baseLedgerDecisions, { defenseScheme: decisions.defenseScheme });
      entries.push({
        id: 'defense',
        label: 'Defense Scheme',
        choice: scheme?.label ?? formatChoiceLabel(decisions.defenseScheme),
        readinessDelta: preview.weekOneReadinessDelta,
        volatilityDelta: preview.weekOneVolatilityDelta,
        summaryLine: preview.summaryLine,
      });
    }

    if (decisions.depthChartPhilosophy) {
      const preview = previewSetupForecastChange(game, teamId, baseLedgerDecisions, { depthChartPhilosophy: decisions.depthChartPhilosophy });
      entries.push({
        id: 'depth',
        label: 'Depth Philosophy',
        choice: formatChoiceLabel(decisions.depthChartPhilosophy),
        readinessDelta: preview.weekOneReadinessDelta,
        volatilityDelta: preview.weekOneVolatilityDelta,
        summaryLine: preview.summaryLine,
      });
    }

    if (decisions.capPosture) {
      const packageOption = capPackages.find((entry) => entry.posture === decisions.capPosture);
      const preview = previewSetupForecastChange(game, teamId, baseLedgerDecisions, { capPosture: decisions.capPosture });
      entries.push({
        id: 'cap',
        label: 'Cap Package',
        choice: packageOption?.label ?? formatChoiceLabel(decisions.capPosture),
        readinessDelta: preview.weekOneReadinessDelta,
        volatilityDelta: preview.weekOneVolatilityDelta,
        summaryLine: preview.summaryLine,
      });
    }

    if (decisions.cultureMandate) {
      const preview = previewSetupForecastChange(game, teamId, baseLedgerDecisions, { cultureMandate: decisions.cultureMandate });
      entries.push({
        id: 'culture',
        label: 'Team Rules',
        choice: formatChoiceLabel(decisions.cultureMandate),
        readinessDelta: preview.weekOneReadinessDelta,
        volatilityDelta: preview.weekOneVolatilityDelta,
        summaryLine: preview.summaryLine,
      });
    }

    return entries;
  }, [
    agmProfile,
    narrativePack.agmScenes,
    coachCandidates,
    scoutCandidates,
    decisions.headCoachId,
    decisions.scoutingDirectorId,
    decisions.offenseScheme,
    decisions.defenseScheme,
    decisions.depthChartPhilosophy,
    decisions.capPosture,
    decisions.cultureMandate,
    game,
    teamId,
    baseLedgerDecisions,
    schemeCatalog.offenseOptions,
    schemeCatalog.defenseOptions,
    capPackages,
  ]);

  const teachingNarration = useMemo(() => {
    if (!agmProfile) return null;
    if (setupState.currentPhase === 'hire_coach') {
      return agmProfile.teachingNarration.what_is_a_head_coach;
    }
    if (setupState.currentPhase === 'hire_scout') {
      return agmProfile.teachingNarration.what_is_a_scouting_director;
    }
    return null;
  }, [agmProfile, setupState.currentPhase]);
  const panelDialogue = setupState.currentPhase === 'hire_coach' || setupState.currentPhase === 'hire_scout'
    ? null
    : agmDialogue;
  const teachingTipTopic = getTeachingTipTopicForPhase(setupState.currentPhase);
  const teachingTips = useMemo(
    () => (agmProfile && teachingTipTopic ? getTeachingTips(agmProfile.id, teachingTipTopic) : undefined),
    [agmProfile, teachingTipTopic],
  );
  const blueprintMonologue = useMemo(
    () => (agmProfile && setupState.currentPhase === 'blueprint'
      ? (setupState.decisions.agmClosingWords ?? getBlueprintClosingMonologue(agmProfile.id))
      : null),
    [agmProfile, setupState.currentPhase, setupState.decisions.agmClosingWords],
  );
  const runtimeCliffhanger = useMemo(() => {
    if (setupState.currentPhase !== 'blueprint' || !phaseData) return undefined;
    return {
      opponentIdentity: narrativePack.blueprint.opponentIdentity,
      ifThisWorks: narrativePack.blueprint.ifThisWorks,
      ifThisBreaks: narrativePack.blueprint.ifThisBreaks,
      unresolvedDanger: narrativePack.blueprint.unresolvedDanger,
      decisionSummary: decisionLedgerEntries.map((entry) => `${entry.label}: ${entry.choice}. ${entry.summaryLine}`),
    };
  }, [setupState.currentPhase, phaseData, narrativePack.blueprint, decisionLedgerEntries]);

  const handleNext = useCallback(async () => {
    if (showColdOpen) {
      setColdOpenDismissed(true);
      if (typeof window !== 'undefined') {
        markPreludeDismissed(window.localStorage, currentRunId);
      }
      return;
    }

    if (READ_ONLY_PHASES.has(setupState.currentPhase) && !decisions.acknowledged.includes(setupState.currentPhase)) {
      await applySetupChoice({ acknowledged: [...decisions.acknowledged, setupState.currentPhase] });
    }

    if (isLastPhase) {
      setIsLaunchingSeason(true);
      if (typeof window !== 'undefined') {
        finalizeSetupRun(window.localStorage, currentRunId);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      await completeSetup();
      return;
    }

    if (setupState.currentPhase === 'set_goals' && agmProfile) {
      await applySetupChoice({ agmClosingWords: getBlueprintClosingMonologue(agmProfile.id) });
    }

    const nextPhase = getNextSetupPhase(setupState.currentPhase);
    if (agmProfile && nextPhase) {
      setTransitionOverlay(buildTransitionOverlayData(game.seed, agmProfile.id, setupState.currentPhase, nextPhase));
    }

    setIsTransitioning(true);
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    await advanceSetup({ requireTopPressureOpened });
    setSchemeReaction(null);
    setGoalReaction(null);
    setTransitionOverlay(null);
    setIsTransitioning(false);
  }, [
    showColdOpen,
    setupState.currentPhase,
    decisions.acknowledged,
    isLastPhase,
    applySetupChoice,
    completeSetup,
    currentRunId,
    agmProfile,
    game.seed,
    advanceSetup,
    requireTopPressureOpened,
  ]);

  const handleBack = useCallback(async () => {
    await goBackSetup();
    setSchemeReaction(null);
    setGoalReaction(null);
    setTransitionOverlay(null);
    setIsTransitioning(false);
  }, [goBackSetup]);

  const handleSkipColdOpen = useCallback(() => {
    setColdOpenDismissed(true);
    if (typeof window !== 'undefined') {
      markPreludeDismissed(window.localStorage, currentRunId);
    }
  }, [currentRunId]);

  const handleSelectOffense = useCallback(async (schemeId: string) => {
    await applySetupChoice({ offenseScheme: schemeId });
    if (decisions.defenseScheme && phaseData && agmProfile) {
      setSchemeReaction(
        agmReactsToSchemeChoice(
          schemeId,
          decisions.defenseScheme,
          phaseData as ReturnType<typeof generateSchemeContext>,
          agmProfile,
        ),
      );
      return;
    }

    if (phaseData && agmProfile) {
      const option = (phaseData as ReturnType<typeof generateSchemeContext>).offenseOptions.find((entry) => entry.schemeId === schemeId);
      if (!option) return;
      setSchemeReaction({
        sentiment: deriveSchemeReactionSentiment(option),
        reaction: getSchemeReaction(agmProfile.id, schemeId),
        followUp: buildSetupSchemeFollowUp(option),
      });
    }
  }, [applySetupChoice, decisions.defenseScheme, phaseData, agmProfile]);

  const handleSelectDefense = useCallback(async (schemeId: string) => {
    await applySetupChoice({ defenseScheme: schemeId });
    if (decisions.offenseScheme && phaseData && agmProfile) {
      setSchemeReaction(
        agmReactsToSchemeChoice(
          decisions.offenseScheme,
          schemeId,
          phaseData as ReturnType<typeof generateSchemeContext>,
          agmProfile,
        ),
      );
      return;
    }

    if (phaseData && agmProfile) {
      const option = (phaseData as ReturnType<typeof generateSchemeContext>).defenseOptions.find((entry) => entry.schemeId === schemeId);
      if (!option) return;
      setSchemeReaction({
        sentiment: deriveSchemeReactionSentiment(option),
        reaction: getSchemeReaction(agmProfile.id, schemeId),
        followUp: buildSetupSchemeFollowUp(option),
      });
    }
  }, [applySetupChoice, decisions.offenseScheme, phaseData, agmProfile]);

  const handleSelectDepthPhilosophy = useCallback(async (philosophy: DepthChartPhilosophy) => {
    await applySetupChoice({ depthChartPhilosophy: philosophy });
  }, [applySetupChoice]);

  const handleSelectCapPosture = useCallback(async (posture: CapPosture) => {
    await applySetupChoice({ capPosture: posture });
  }, [applySetupChoice]);

  const handleToggleGoal = useCallback(async (goalId: string) => {
    const current = [...decisions.seasonGoals];
    const index = current.indexOf(goalId);
    if (index >= 0) {
      current.splice(index, 1);
      setGoalReaction(null);
    } else if (current.length < 3) {
      current.push(goalId);
    }
    await applySetupChoice({ seasonGoals: current });

    if (index >= 0 || !phaseData || !agmProfile) {
      return;
    }

    const goal = (phaseData as ReturnType<typeof generateGoalContext>).availableGoals.find((entry) => entry.id === goalId);
    if (!goal) {
      setGoalReaction(null);
      return;
    }

    if (current.length === 3) {
      setGoalReaction(agmReactsToGoalChoice(current, phaseData as ReturnType<typeof generateGoalContext>, agmProfile));
      return;
    }

    setGoalReaction({
      sentiment: deriveGoalReactionSentiment(goal),
      reaction: getGoalReaction(agmProfile.id, goalId),
      followUp: buildSetupGoalFollowUp(goal),
    });
  }, [applySetupChoice, decisions.seasonGoals, phaseData, agmProfile]);

  const handleSelectCultureMandate = useCallback(async (mandate: CultureMandate) => {
    await applySetupChoice({ cultureMandate: mandate });
    if (!agmProfile) return;
    setGoalReaction({
      sentiment: mandate === 'player_led' ? 'like_it' : mandate === 'accountability' ? 'love_it' : 'concerned',
      reaction: mandate === 'player_led'
        ? 'Choose player-led when veterans have authority to enforce roles; leaders without authority let Week 1 mistakes spread.'
        : mandate === 'accountability'
          ? 'Choose accountability when staff has authority to enforce roles; it cuts repeat mistakes, but harsh rules hit morale after losses.'
          : 'Choose development-first when young players already have package, backup, or starter jobs; giving unassigned players too many reps costs early games.',
      followUp: 'After each of the first four weeks, open Locker Room for morale and Depth Chart for missed assignments before Advance Week.',
    });
  }, [applySetupChoice, agmProfile]);

  const activeReaction = setupState.currentPhase === 'set_scheme'
    ? schemeReaction
    : setupState.currentPhase === 'set_goals'
      ? goalReaction
      : null;
  const setupChipDialogue = useMemo<ChipHostDialogueOverride | null>(
    () => buildSetupPhaseChipDialogue({
      phase: setupState.currentPhase,
      coldOpen,
      forecastSummary: forecastBoard.summary,
      topPressureLabel: topPressureCard.label,
      topPressureOpened,
      agmName: agmProfile?.name ?? null,
      activeReaction,
    }),
    [
      activeReaction,
      agmProfile?.name,
      coldOpen,
      forecastBoard.summary,
      setupState.currentPhase,
      topPressureCard.label,
      topPressureOpened,
    ],
  );
  const stageState = useMemo<AGMStageState>(() => {
    if (setupState.currentPhase === 'intel_briefing') return 'point';
    if (setupState.currentPhase === 'meet_roster' || setupState.currentPhase === 'cap_strategy') return 'concern';
    if (setupState.currentPhase === 'blueprint') return 'approve';
    if (activeReaction?.sentiment === 'love_it' || activeReaction?.sentiment === 'like_it') return 'approve';
    if (activeReaction?.sentiment === 'disagree' || activeReaction?.sentiment === 'concerned') return 'concern';
    if (setupState.currentPhase === 'set_scheme' || setupState.currentPhase === 'set_goals') return 'talk';
    return 'idle';
  }, [setupState.currentPhase, activeReaction]);
  const stageHeadline = useMemo(() => {
    if (setupState.currentPhase === 'intel_briefing') return crisisProfile.headline;
    if (setupState.currentPhase === 'blueprint' && phaseData) {
      return (phaseData as ReturnType<typeof generateBlueprint>).weekOneCliffhanger.threat;
    }
    return panelDialogue?.intro ?? agmGreeting ?? currentMeta.label;
  }, [setupState.currentPhase, crisisProfile.headline, phaseData, panelDialogue, agmGreeting, currentMeta.label]);
  const stageSubhead = useMemo(() => {
    if (setupState.currentPhase === 'intel_briefing') return crisisProfile.weekOneThreat;
    if (setupState.currentPhase === 'blueprint' && phaseData) {
      return (phaseData as ReturnType<typeof generateBlueprint>).weekOneCliffhanger.unknown;
    }
    return panelDialogue?.recommendation ?? currentMeta.subtitle;
  }, [setupState.currentPhase, crisisProfile.weekOneThreat, phaseData, panelDialogue, currentMeta.subtitle]);
  const showStageContextPanels = !isIntelBriefingPhase;
  const showStageGuidancePanel = !isIntelBriefingPhase
    && (panelDialogue || teachingNarration || activeReaction || blueprintMonologue);
  const showSetupStageRail = Boolean(showStageContextPanels || showStageGuidancePanel);
  const advanceHint = useMemo(() => {
    if (isLaunchingSeason) return 'Loading Week 1.';
    if (isTransitioning) return 'Moving to the next setup decision.';
    if (canAdvance) {
      if (showColdOpen) return 'Assistant GM hire is next.';
      if (isLastPhase) return 'Ready to start Week 1.';
      return 'Ready for the next decision.';
    }
    if (setupState.currentPhase === 'choose_agm') return 'Decision needed: hire your Assistant GM.';
    if (isIntelBriefingPhase && requireTopPressureOpened) {
      return `Decision needed: open ${topPressureCard.label}.`;
    }
    return `Decision needed: ${currentMeta.subtitle}.`;
  }, [
    canAdvance,
    currentMeta.subtitle,
    isLastPhase,
    isIntelBriefingPhase,
    isLaunchingSeason,
    isTransitioning,
    requireTopPressureOpened,
    setupState.currentPhase,
    showColdOpen,
    topPressureCard.label,
  ]);
  const primaryActionDisabled = !canAdvance || isTransitioning || isLaunchingSeason;
  const stageActionRegistration = useStageActionRegistry({
    showColdOpen,
    currentPhase: setupState.currentPhase,
    seasonGoalCount: decisions.seasonGoals.length,
    cultureMandateSelected: Boolean(decisions.cultureMandate),
    isLaunchingSeason,
  }, onStageAdvance);
  const primaryActionDisabledReason = getPrimaryActionDisabledReason(!primaryActionDisabled, advanceHint);
  const primaryActionProps = useMemo(
    () => buildPrimaryActionProps(stageActionRegistration, primaryActionDisabledReason),
    [primaryActionDisabledReason, stageActionRegistration],
  );
  const primaryActionLabel = showColdOpen
    ? 'Hire Assistant GM'
    : isLastPhase
      ? 'START WEEK 1'
      : 'Next';
  const showCompanionPrimaryAction = false;
  const companionPrimaryAction = null;

  useEffect(() => {
    onCompanionActionChange?.(companionPrimaryAction);
    return () => {
      onCompanionActionChange?.(null);
    };
  }, [companionPrimaryAction, onCompanionActionChange]);

  useEffect(() => {
    onCompanionDialogueChange?.(setupChipDialogue);
    return () => {
      onCompanionDialogueChange?.(null);
    };
  }, [onCompanionDialogueChange, setupChipDialogue]);

  return (
    <div
      className="mfd-setup-shell"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--mfd-bg)',
        color: 'var(--mfd-text)',
        overflow: 'hidden',
      }}
    >
      <div
        className="mfd-setup-header"
        data-mfd-setup-header="true"
        style={{
          padding: '12px clamp(12px, 1.5vw, 20px)',
          borderBottom: '2px solid var(--mfd-border)',
          background: 'var(--mfd-bg-2)',
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 320px) minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
          <div style={{ ...pixelSm, color: 'var(--mfd-gold)', whiteSpace: 'nowrap' }}>
            YOUR FIRST DAY
          </div>
          <div style={{ ...pixelSm, color: 'var(--mfd-text)', lineHeight: 1.35 }}>
            {currentMeta.label.toUpperCase()}
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.4 }}>
            {currentMeta.subtitle}
          </div>
        </div>
        <div
          data-mfd-setup-stepper="true"
          style={{
            minWidth: 0,
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarColor: 'var(--mfd-gold) var(--mfd-bg-2)',
          }}
        >
          <MfdStepper
            steps={PHASE_META.map((phase) => ({ label: phase.label }))}
            activeStep={phaseIndex}
            orientation="horizontal"
            style={{ minWidth: '700px' }}
          />
        </div>
        <div style={{ display: 'grid', gap: '6px', justifyItems: 'end', minWidth: '88px' }}>
          <div style={{ ...monoSm, color: 'var(--mfd-text)', whiteSpace: 'nowrap' }}>
            {phaseIndex + 1} / {PHASE_META.length}
          </div>
          <div
            aria-hidden="true"
            style={{
              width: '72px',
              height: '6px',
              border: '1px solid var(--mfd-border)',
              background: 'var(--mfd-bg)',
            }}
          >
            <div
              style={{
                width: `${((phaseIndex + 1) / PHASE_META.length) * 100}%`,
                height: '100%',
                background: 'var(--mfd-gold)',
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="mfd-setup-content"
        data-mfd-setup-content="true"
        data-mfd-setup-companion-active={companionPanel || companionPrimaryActionActive ? 'true' : 'false'}
        style={{
          flex: 1,
          overflow: 'hidden',
          padding: 'clamp(12px, 1.5vw, 20px)',
        }}
      >
        {showColdOpen ? (
          <div
            className="mfd-setup-dashboard mfd-setup-dashboard--cold-open"
            data-mfd-setup-has-companion={companionPanel ? 'true' : 'false'}
            data-mfd-setup-has-summary="false"
          >
            {companionPanel ? (
              <aside className="mfd-setup-dashboard__companion">
                {companionPanel}
              </aside>
            ) : null}
            <main className="mfd-setup-dashboard__primary">
              <SetupColdOpen
                coldOpen={coldOpen}
                reducedMotion={reducedMotion}
                onSkip={handleSkipColdOpen}
              />
            </main>
          </div>
        ) : setupState.currentPhase === 'choose_agm' ? (
          <div className="mfd-setup-choice-grid mfd-setup-choice-grid--assistant-gm">
            <main className="mfd-setup-choice-grid__primary">
              <ChooseAGMPhase
                committedProfileId={decisions.agmProfileId}
                initialPreviewProfileId={defaultAgmPreviewId}
                topPressureId={topPressureCard.id}
                teamName={teamName}
                crisisHeadline={coldOpen.crisisHeadline}
                weekOneThreat={coldOpen.weekOneThreat}
                recommendedProfileId={narrativePack.recommendedAgmId}
                narrativeScenes={narrativePack.agmScenes}
                reducedMotion={reducedMotion}
                railAddon={companionPanel}
                onHire={async (profileId) => applySetupChoice({ agmProfileId: profileId })}
              />
            </main>
          </div>
        ) : showFastLaneIntel || !showStage || !agmProfile ? (
          <div
            className="mfd-setup-dashboard"
            data-mfd-setup-has-companion={companionPanel ? 'true' : 'false'}
          >
            {companionPanel ? (
              <aside className="mfd-setup-dashboard__companion">
                {companionPanel}
              </aside>
            ) : null}
            <main className="mfd-setup-dashboard__primary">
              {setupState.currentPhase === 'intel_briefing' && phaseData ? (
                <IntelBriefingPhase
                  data={phaseData as ReturnType<typeof generateIntelBriefing>}
                  crisis={crisisProfile}
                  openedDrilldowns={setupState.openedDrilldowns}
                  requiredPressureId={null}
                  briefDiagnosis={coldOpen}
                  supportCopy={narrativePack.intelBriefing}
                  onToggleDrilldown={(pressureId) => { void toggleSetupDrilldown(pressureId); }}
                />
              ) : null}
            </main>
            <aside className="mfd-setup-dashboard__summary">
              <ForecastBoard forecast={forecastBoard} />
              <DayOneDecisionLedger entries={decisionLedgerEntries} />
              <PixelPanel title="Fast Lane Diagnosis" accent="cyan">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>{teamName.toUpperCase()}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                    {narrativePack.intelBriefing.fastLaneDiagnosis}
                  </div>
                </div>
              </PixelPanel>
            </aside>
          </div>
        ) : (
          <AGMStage
            agm={agmProfile}
            state={stageState}
            headline={stageHeadline}
            subhead={stageSubhead}
            reducedMotion={reducedMotion}
            railAddon={companionPanel}
          >
            <div className="mfd-setup-phase-kicker">
              <div style={{ ...pixelSm, color: 'var(--mfd-gold)', fontSize: '10px', marginBottom: '4px' }}>
                {currentMeta.label.toUpperCase()}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{currentMeta.subtitle}</div>
            </div>

            <div className="mfd-setup-stage-grid" data-mfd-setup-has-rail={showSetupStageRail ? 'true' : 'false'}>
              <main className="mfd-setup-stage-grid__primary">
                <div key={setupState.currentPhase} style={{ animation: 'mfd-fadein 0.3s ease-out' }}>
                  {setupState.currentPhase === 'intel_briefing' && phaseData ? (
                    <IntelBriefingPhase
                      data={phaseData as ReturnType<typeof generateIntelBriefing>}
                      crisis={crisisProfile}
                      openedDrilldowns={setupState.openedDrilldowns}
                      requiredPressureId={requireTopPressureOpened ? topPressureCard.id : null}
                      supportCopy={narrativePack.intelBriefing}
                      onToggleDrilldown={(pressureId) => { void toggleSetupDrilldown(pressureId); }}
                    />
                  ) : null}
                  {setupState.currentPhase === 'meet_roster' && phaseData ? (
                    <MeetRosterPhase data={phaseData as ReturnType<typeof generateRosterOverview>} />
                  ) : null}
                  {setupState.currentPhase === 'hire_coach' && agmProfile ? (
                    <HireCoachPhase
                      agmId={agmProfile.id}
                      selectedCoachId={decisions.headCoachId}
                      previewByCoachId={coachPreviewById}
                      onHire={async (coachId) => applySetupChoice({ headCoachId: coachId })}
                    />
                  ) : null}
                  {setupState.currentPhase === 'hire_scout' && agmProfile ? (
                    <HireScoutPhase
                      agmId={agmProfile.id}
                      selectedScoutId={decisions.scoutingDirectorId}
                      previewByScoutId={scoutPreviewById}
                      onHire={async (scoutId) => applySetupChoice({ scoutingDirectorId: scoutId })}
                    />
                  ) : null}
                  {setupState.currentPhase === 'set_scheme' && phaseData ? (
                    <SetSchemePhase
                      data={phaseData as ReturnType<typeof generateSchemeContext>}
                      selectedOffense={decisions.offenseScheme}
                      selectedDefense={decisions.defenseScheme}
                      previewByOffenseSchemeId={offensePreviewBySchemeId}
                      previewByDefenseSchemeId={defensePreviewBySchemeId}
                      onSelectOffense={handleSelectOffense}
                      onSelectDefense={handleSelectDefense}
                    />
                  ) : null}
                  {setupState.currentPhase === 'depth_chart' && phaseData ? (
                    <DepthChartPhase
                      data={phaseData as ReturnType<typeof generateDepthChartContext>}
                      selectedPhilosophy={decisions.depthChartPhilosophy}
                      previewByPhilosophy={depthPreviewByPhilosophy}
                      onSelectPhilosophy={handleSelectDepthPhilosophy}
                    />
                  ) : null}
                  {setupState.currentPhase === 'cap_strategy' && phaseData ? (
                    <CapStrategyPhase
                      data={phaseData as ReturnType<typeof generateCapBriefing>}
                      packages={capPackages}
                      selectedPosture={decisions.capPosture}
                      previewByPosture={capPreviewByPosture}
                      onSelectPosture={handleSelectCapPosture}
                    />
                  ) : null}
                  {setupState.currentPhase === 'set_goals' && phaseData ? (
                    <SetGoalsPhase
                      data={phaseData as ReturnType<typeof generateGoalContext>}
                      selectedGoals={decisions.seasonGoals}
                      onToggleGoal={handleToggleGoal}
                      selectedMandate={decisions.cultureMandate}
                      mandatePreviewById={mandatePreviewById}
                      onSelectMandate={handleSelectCultureMandate}
                    />
                  ) : null}
                  {setupState.currentPhase === 'blueprint' && phaseData ? (
                    <BlueprintPhase
                      data={phaseData as ReturnType<typeof generateBlueprint>}
                      runtimeCliffhanger={runtimeCliffhanger}
                    />
                  ) : null}
                </div>
              </main>

              {showSetupStageRail ? (
                <aside className="mfd-setup-stage-grid__rail">
                  {showStageContextPanels ? <ForecastBoard forecast={forecastBoard} /> : null}
                  {showStageContextPanels ? <DayOneDecisionLedger entries={decisionLedgerEntries} /> : null}

                  {showStageGuidancePanel ? (
                    <PixelPanel title="AGM Guidance" accent="gold">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {setupState.currentPhase === 'intel_briefing' && agmGreeting ? (
                          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>&ldquo;{agmGreeting}&rdquo;</div>
                        ) : null}
                        {panelDialogue?.intro ? (
                          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{panelDialogue.intro}</div>
                        ) : null}
                        {panelDialogue?.recommendation ? (
                          <div style={{ ...monoSm, color: 'var(--mfd-cyan)', lineHeight: 1.6 }}>{panelDialogue.recommendation}</div>
                        ) : null}
                        {teachingNarration ? (
                          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{teachingNarration}</div>
                        ) : null}
                        {activeReaction ? (
                          <div style={{ ...monoSm, color: 'var(--mfd-gold)', lineHeight: 1.6 }}>{activeReaction.reaction}</div>
                        ) : null}
                        {activeReaction?.followUp ? (
                          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{activeReaction.followUp}</div>
                        ) : null}
                        {blueprintMonologue ? (
                          <div style={{ ...monoSm, color: 'var(--mfd-green)', lineHeight: 1.6 }}>{blueprintMonologue}</div>
                        ) : null}
                        {teachingTips && teachingTips.length > 0 ? (
                          <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', lineHeight: 1.6 }}>
                            {teachingTips.join(' ')}
                          </div>
                        ) : null}
                      </div>
                    </PixelPanel>
                  ) : null}
                </aside>
              ) : null}
            </div>
          </AGMStage>
        )}
      </div>

      <div
        className="mfd-setup-command-bar"
        style={{
          padding: '12px clamp(12px, 1.5vw, 20px)',
          borderTop: '2px solid var(--mfd-border)',
          background: 'var(--mfd-bg-2)',
          display: 'grid',
          gridTemplateColumns: showCompanionPrimaryAction
            ? 'minmax(88px, auto) minmax(0, 1fr)'
            : 'minmax(88px, auto) minmax(0, 1fr) minmax(120px, auto)',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <PixelButton
          accent="default"
          onClick={() => { void handleBack(); }}
          disabled={phaseIndex === 0 || isTransitioning || isLaunchingSeason}
        >
          Back
        </PixelButton>
        <div style={{ display: 'grid', gap: '4px', justifyItems: 'center', minWidth: 0 }}>
          <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', textAlign: 'center' }}>
            {teamName}
          </div>
          <div
            id="mfd-setup-advance-reason"
            data-mfd-setup-advance-hint="true"
            data-mfd-primary-action-reason={primaryActionDisabledReason ?? undefined}
            style={{
              ...monoSm,
              color: canAdvance ? 'var(--mfd-cyan)' : 'var(--mfd-gold)',
              lineHeight: 1.35,
              textAlign: 'center',
            }}
          >
            {advanceHint}
          </div>
        </div>
        {showCompanionPrimaryAction ? null : (
          <PixelButton
            {...primaryActionProps}
            accent="gold"
            onClick={() => { void handleNext(); }}
            disabled={primaryActionDisabled}
            style={{ minWidth: '148px' }}
          >
            {primaryActionLabel}
          </PixelButton>
        )}
      </div>

      {isTransitioning && transitionOverlay ? (
        <PhaseTransitionOverlay
          flavorText={transitionOverlay.flavorText}
          loadingTip={transitionOverlay.loadingTip}
        />
      ) : null}

      {isLaunchingSeason ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 70,
            background: 'var(--mfd-gold)',
            pointerEvents: 'none',
            animation: 'mfd-launch-flash 0.45s ease-out forwards',
          }}
        />
      ) : null}

      <style>{`
        @keyframes mfd-launch-flash {
          0% { opacity: 0; }
          35% { opacity: 0.18; }
          100% { opacity: 0; }
        }

        @keyframes mfd-setup-primary-action-pulse {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        .mfd-setup-primary-action--spotlight:not(:disabled) {
          animation: mfd-setup-primary-action-pulse 1.1s steps(4, end) infinite;
        }

        .mfd-setup-primary-action--spotlight:focus-visible {
          outline: 3px solid var(--mfd-cyan);
          outline-offset: 3px;
        }

        @media (prefers-reduced-motion: reduce) {
          .mfd-setup-primary-action--spotlight {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
