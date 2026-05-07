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
import type { AGMReaction, CapPosture, CultureMandate, DepthChartPhilosophy, SetupPhase } from '@mfd/engine';
import {
  selectSetupPhaseIndex,
  selectSetupState,
  useGameStore,
} from '../../app/store/game-store';
import { monoSm, pixelSm } from '../shared/pixelUi';
import { AGMStage, type AGMStageState } from './AGMStage';
import { DayOneBetLedger, type DayOneBetLedgerEntry } from './DayOneBetLedger';
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

const READ_ONLY_PHASES = new Set<SetupPhase>(['intel_briefing', 'meet_roster', 'blueprint']);

function formatChoiceLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function FranchiseSetupWizard({
  companionPrimaryActionActive = false,
  onCompanionActionChange,
  onStageAdvance,
}: {
  companionPrimaryActionActive?: boolean;
  onCompanionActionChange?: (action: ReactNode | null) => void;
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
  const [coldOpenBeatIndex, setColdOpenBeatIndex] = useState(0);
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
  const coldOpenLastBeatIndex = narrativePack.coldOpen.beats.length - 1;
  const betLedgerEntries = useMemo<DayOneBetLedgerEntry[]>(() => {
    const entries: DayOneBetLedgerEntry[] = [];

    if (agmProfile) {
      const scene = narrativePack.agmScenes[agmProfile.id];
      entries.push({
        id: 'agm',
        label: 'AGM',
        bet: agmProfile.name,
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
        bet: coach?.name ?? decisions.headCoachId,
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
        bet: scout?.name ?? decisions.scoutingDirectorId,
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
        label: 'Offense Identity',
        bet: scheme?.label ?? formatChoiceLabel(decisions.offenseScheme),
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
        label: 'Defense Identity',
        bet: scheme?.label ?? formatChoiceLabel(decisions.defenseScheme),
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
        bet: formatChoiceLabel(decisions.depthChartPhilosophy),
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
        bet: packageOption?.label ?? formatChoiceLabel(decisions.capPosture),
        readinessDelta: preview.weekOneReadinessDelta,
        volatilityDelta: preview.weekOneVolatilityDelta,
        summaryLine: preview.summaryLine,
      });
    }

    if (decisions.cultureMandate) {
      const preview = previewSetupForecastChange(game, teamId, baseLedgerDecisions, { cultureMandate: decisions.cultureMandate });
      entries.push({
        id: 'culture',
        label: 'Culture Mandate',
        bet: formatChoiceLabel(decisions.cultureMandate),
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
      betSummary: betLedgerEntries.map((entry) => `${entry.label}: ${entry.bet}. ${entry.summaryLine}`),
    };
  }, [setupState.currentPhase, phaseData, narrativePack.blueprint, betLedgerEntries]);

  const handleNext = useCallback(async () => {
    if (showColdOpen) {
      if (!reducedMotion && coldOpenBeatIndex < coldOpenLastBeatIndex) {
        setColdOpenBeatIndex((index) => Math.min(index + 1, coldOpenLastBeatIndex));
        return;
      }
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
    reducedMotion,
    coldOpenBeatIndex,
    coldOpenLastBeatIndex,
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
    if (showColdOpen && !reducedMotion && coldOpenBeatIndex > 0) {
      setColdOpenBeatIndex((index) => Math.max(0, index - 1));
      return;
    }
    await goBackSetup();
    setSchemeReaction(null);
    setGoalReaction(null);
    setTransitionOverlay(null);
    setIsTransitioning(false);
  }, [showColdOpen, reducedMotion, coldOpenBeatIndex, goBackSetup]);

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
        followUp: option.staffAligned
          ? 'Staff alignment is already working in your favor.'
          : option.transitionPenalty > 0
            ? `Transition penalty: ${option.transitionPenalty}.`
            : null,
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
        followUp: option.staffAligned
          ? 'The current staff can teach this quickly.'
          : option.transitionPenalty > 0
            ? `Transition penalty: ${option.transitionPenalty}.`
            : null,
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
      followUp: goal.recommended ? goal.reason : `Difficulty: ${goal.difficulty}.`,
    });
  }, [applySetupChoice, decisions.seasonGoals, phaseData, agmProfile]);

  const handleSelectCultureMandate = useCallback(async (mandate: CultureMandate) => {
    await applySetupChoice({ cultureMandate: mandate });
    if (!agmProfile) return;
    setGoalReaction({
      sentiment: mandate === 'player_led' ? 'like_it' : mandate === 'accountability' ? 'love_it' : 'concerned',
      reaction: mandate === 'player_led'
        ? 'If the room has real leaders, this can make the opener feel older and calmer fast.'
        : mandate === 'accountability'
          ? 'Good. Standards travel faster than speeches.'
          : 'That will help the young guys, but it might cost you some stability right away.',
      followUp: 'The first month will tell you whether the room bought the mandate or just heard it.',
    });
  }, [applySetupChoice, agmProfile]);

  const activeReaction = setupState.currentPhase === 'set_scheme'
    ? schemeReaction
    : setupState.currentPhase === 'set_goals'
      ? goalReaction
      : null;
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
  const advanceHint = useMemo(() => {
    if (isLaunchingSeason) return 'Loading Week 1.';
    if (isTransitioning) return 'Moving to the next room.';
    if (canAdvance) {
      if (showColdOpen) return 'Briefing ready.';
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
    ? (reducedMotion || coldOpenBeatIndex >= coldOpenLastBeatIndex ? narrativePack.coldOpen.entryCta : 'Continue Briefing')
    : isLastPhase
      ? 'START WEEK 1'
      : 'Next';
  const showCompanionPrimaryAction = showColdOpen && companionPrimaryActionActive;
  const companionPrimaryAction = useMemo(() => {
    if (!showCompanionPrimaryAction) return null;
    return (
      <PixelButton
        {...primaryActionProps}
        accent="gold"
        onClick={() => { void handleNext(); }}
        disabled={primaryActionDisabled}
        style={{ width: '100%' }}
      >
        {primaryActionLabel}
      </PixelButton>
    );
  }, [
    handleNext,
    primaryActionDisabled,
    primaryActionLabel,
    primaryActionProps,
    showCompanionPrimaryAction,
  ]);

  useEffect(() => {
    onCompanionActionChange?.(companionPrimaryAction);
    return () => {
      onCompanionActionChange?.(null);
    };
  }, [companionPrimaryAction, onCompanionActionChange]);

  return (
    <div
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

      <div style={{ flex: 1, overflow: 'hidden', padding: 'clamp(12px, 1.5vw, 20px)' }}>
        {showColdOpen ? (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <SetupColdOpen
              coldOpen={coldOpen}
              beatIndex={coldOpenBeatIndex}
              reducedMotion={reducedMotion}
              onSkip={handleSkipColdOpen}
            />
          </div>
        ) : setupState.currentPhase === 'choose_agm' ? (
          <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              onHire={async (profileId) => applySetupChoice({ agmProfileId: profileId })}
            />
            <DayOneBetLedger entries={betLedgerEntries} />
          </div>
        ) : showFastLaneIntel || !showStage || !agmProfile ? (
          <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ForecastBoard forecast={forecastBoard} />
            <DayOneBetLedger entries={betLedgerEntries} />
            <PixelPanel title="Fast Lane Diagnosis" accent="cyan">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>{teamName.toUpperCase()}</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                  {narrativePack.intelBriefing.fastLaneDiagnosis}
                </div>
              </div>
            </PixelPanel>
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
          </div>
        ) : (
          <AGMStage
            agm={agmProfile}
            state={stageState}
            headline={stageHeadline}
            subhead={stageSubhead}
            reducedMotion={reducedMotion}
          >
            <div style={{ marginBottom: '2px' }}>
              <div style={{ ...pixelSm, color: 'var(--mfd-gold)', fontSize: '10px', marginBottom: '4px' }}>
                {currentMeta.label.toUpperCase()}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{currentMeta.subtitle}</div>
            </div>

            {showStageContextPanels ? <ForecastBoard forecast={forecastBoard} /> : null}
            {showStageContextPanels ? <DayOneBetLedger entries={betLedgerEntries} /> : null}

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
          </AGMStage>
        )}
      </div>

      <div
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
