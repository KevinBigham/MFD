/**
 * FranchiseSetupWizard — The First 10 Minutes.
 *
 * Full-screen guided franchise onboarding that walks users through 8 phases
 * with an Assistant GM character providing data-driven commentary.
 */
import { useMemo, useState, useCallback } from 'react';
import { MfdStepper, PixelButton } from '@mfd/design-system/components';
import {
  getAGMGreeting,
  getBlueprintClosingMonologue,
  getGoalReaction,
  getSelectedAGM,
  getSchemeReaction,
  getTeachingTips,
  PHASE_META,
  generateIntelBriefing,
  generateRosterOverview,
  generateCoachingReview,
  generateSchemeContext,
  generateDepthChartContext,
  generateCapBriefing,
  generateGoalContext,
  generateBlueprint,
  isPhaseComplete,
  agmOnIntelBriefing,
  agmOnRosterOverview,
  agmOnHireCoach,
  agmOnHireScout,
  agmOnSchemeSelection,
  agmOnDepthChart,
  agmOnCapStrategy,
  agmOnGoalSelection,
  agmOnBlueprint,
  agmReactsToSchemeChoice,
  agmReactsToGoalChoice,
} from '@mfd/engine';
import type { AGMReaction, SetupPhase } from '@mfd/engine';
import {
  useGameStore,
  selectSetupState,
  selectSetupPhaseIndex,
} from '../../app/store/game-store';
import { pixelSm, monoSm } from '../shared/pixelUi';
import { AGMPanel } from './AGMPanel';
import { ChooseAGMPhase } from './ChooseAGMPhase';
import { HireCoachPhase } from './HireCoachPhase';
import { HireScoutPhase } from './HireScoutPhase';
import { PhaseTransitionOverlay } from './PhaseTransitionOverlay';
import { IntelBriefingPhase } from './phases/IntelBriefingPhase';
import { MeetRosterPhase } from './phases/MeetRosterPhase';
import { SetSchemePhase } from './phases/SetSchemePhase';
import { DepthChartPhase } from './phases/DepthChartPhase';
import { CapStrategyPhase } from './phases/CapStrategyPhase';
import { SetGoalsPhase } from './phases/SetGoalsPhase';
import { BlueprintPhase } from './phases/BlueprintPhase';
import { buildTransitionOverlayData, deriveGoalReactionSentiment, deriveSchemeReactionSentiment, getNextSetupPhase, getTeachingTipTopicForPhase } from './setupPolish';

export function FranchiseSetupWizard() {
  const game = useGameStore((s) => s.game!);
  const setupState = useGameStore(selectSetupState)!;
  const phaseIndex = useGameStore(selectSetupPhaseIndex);
  const { advanceSetup, goBackSetup, applySetupChoice, completeSetup } = useGameStore((s) => s.actions);

  const userTeam = useMemo(() => Object.values(game.teams).find((t) => t.isUser)!, [game.teams]);
  const teamId = userTeam.id;
  const teamName = `${userTeam.city} ${userTeam.name}`;
  const decisions = setupState.decisions;

  const agmProfile = useMemo(
    () => (decisions.agmProfileId ? getSelectedAGM(decisions.agmProfileId) : null),
    [decisions.agmProfileId],
  );
  const agmGreeting = useMemo(
    () => (agmProfile ? getAGMGreeting(agmProfile, teamName) : null),
    [agmProfile, teamName],
  );

  // Phase data (recomputed when phase changes)
  const phaseData = useMemo(() => {
    switch (setupState.currentPhase) {
      case 'choose_agm': return null;
      case 'intel_briefing': return generateIntelBriefing(game, teamId);
      case 'meet_roster': return generateRosterOverview(game, teamId);
      case 'hire_coach': return generateCoachingReview(game, teamId);
      case 'hire_scout': return generateIntelBriefing(game, teamId);
      case 'set_scheme': return generateSchemeContext(game, teamId);
      case 'depth_chart': return generateDepthChartContext(game, teamId, decisions.offenseScheme && decisions.defenseScheme ? { off: decisions.offenseScheme, def: decisions.defenseScheme } : undefined);
      case 'cap_strategy': return generateCapBriefing(game, teamId);
      case 'set_goals': return generateGoalContext(game, teamId);
      case 'blueprint': return generateBlueprint(game, teamId, decisions);
      default: return null;
    }
  }, [setupState.currentPhase, setupState.decisions, game, teamId]);

  // AGM dialogue for current phase
  const agmDialogue = useMemo(() => {
    if (!phaseData || !agmProfile) return null;
    switch (setupState.currentPhase) {
      case 'intel_briefing': return agmOnIntelBriefing(phaseData as ReturnType<typeof generateIntelBriefing>, agmProfile);
      case 'meet_roster': return agmOnRosterOverview(phaseData as ReturnType<typeof generateRosterOverview>, agmProfile);
      case 'hire_coach': return agmOnHireCoach(phaseData as ReturnType<typeof generateCoachingReview>, agmProfile);
      case 'hire_scout': return agmOnHireScout(phaseData as ReturnType<typeof generateIntelBriefing>, agmProfile);
      case 'set_scheme': return agmOnSchemeSelection(phaseData as ReturnType<typeof generateSchemeContext>, agmProfile);
      case 'depth_chart': return agmOnDepthChart(phaseData as ReturnType<typeof generateDepthChartContext>, agmProfile);
      case 'cap_strategy': return agmOnCapStrategy(phaseData as ReturnType<typeof generateCapBriefing>, agmProfile);
      case 'set_goals': return agmOnGoalSelection(phaseData as ReturnType<typeof generateGoalContext>, agmProfile);
      case 'blueprint': return agmOnBlueprint(phaseData as ReturnType<typeof generateBlueprint>, agmProfile);
      default: return null;
    }
  }, [setupState.currentPhase, phaseData, agmProfile]);

  // Reactions for interactive phases
  const [schemeReaction, setSchemeReaction] = useState<AGMReaction | null>(null);
  const [goalReaction, setGoalReaction] = useState<AGMReaction | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionOverlay, setTransitionOverlay] = useState<{ flavorText: string; loadingTip: string } | null>(null);
  const [isLaunchingSeason, setIsLaunchingSeason] = useState(false);

  const currentMeta = PHASE_META.find((phase) => phase.id === setupState.currentPhase) ?? PHASE_META[0]!;
  const READ_ONLY_PHASES = new Set<SetupPhase>(['intel_briefing', 'meet_roster', 'depth_chart', 'cap_strategy', 'blueprint']);
  const canAdvance = READ_ONLY_PHASES.has(setupState.currentPhase) || isPhaseComplete(setupState, setupState.currentPhase);
  const isLastPhase = setupState.currentPhase === 'blueprint';
  const showAgmPanel = setupState.currentPhase !== 'choose_agm' && agmProfile !== null;
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

  const handleNext = useCallback(async () => {
    if (READ_ONLY_PHASES.has(setupState.currentPhase) && !decisions.acknowledged.includes(setupState.currentPhase)) {
      await applySetupChoice({ acknowledged: [...decisions.acknowledged, setupState.currentPhase] });
    }

    if (isLastPhase) {
      setIsLaunchingSeason(true);
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
    await advanceSetup();
    setSchemeReaction(null);
    setGoalReaction(null);
    setTransitionOverlay(null);
    setIsTransitioning(false);
  }, [setupState.currentPhase, decisions.acknowledged, isLastPhase, READ_ONLY_PHASES, applySetupChoice, advanceSetup, completeSetup, agmProfile, game.seed]);

  const handleBack = useCallback(async () => {
    await goBackSetup();
    setSchemeReaction(null);
    setGoalReaction(null);
    setTransitionOverlay(null);
    setIsTransitioning(false);
  }, [goBackSetup]);

  // Scheme selection handlers
  const handleSelectOffense = useCallback(async (schemeId: string) => {
    await applySetupChoice({ offenseScheme: schemeId });
    if (decisions.defenseScheme && phaseData && agmProfile) {
      setSchemeReaction(agmReactsToSchemeChoice(schemeId, decisions.defenseScheme, phaseData as ReturnType<typeof generateSchemeContext>, agmProfile));
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
      setSchemeReaction(agmReactsToSchemeChoice(decisions.offenseScheme, schemeId, phaseData as ReturnType<typeof generateSchemeContext>, agmProfile));
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

  // Goal selection handler
  const handleToggleGoal = useCallback(async (goalId: string) => {
    const current = [...decisions.seasonGoals];
    const idx = current.indexOf(goalId);
    if (idx >= 0) {
      current.splice(idx, 1);
      setGoalReaction(null);
    } else if (current.length < 3) {
      current.push(goalId);
    }
    await applySetupChoice({ seasonGoals: current });

    if (idx >= 0 || !phaseData || !agmProfile) {
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

  // Current reaction (scheme reaction for scheme phase, goal for goals phase)
  const activeReaction = setupState.currentPhase === 'set_scheme' ? schemeReaction
    : setupState.currentPhase === 'set_goals' ? goalReaction
      : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column',
      background: 'var(--mfd-bg)', color: 'var(--mfd-text)', overflow: 'hidden',
    }}>
      {/* Header with stepper */}
      <div style={{
        padding: '12px 20px', borderBottom: '2px solid var(--mfd-border)',
        background: 'var(--mfd-bg-2)', display: 'flex', alignItems: 'center', gap: '20px',
      }}>
        <div style={{ ...pixelSm, color: 'var(--mfd-gold)', whiteSpace: 'nowrap' }}>
          YOUR FIRST DAY
        </div>
        <div style={{ flex: 1 }}>
          <MfdStepper
            steps={PHASE_META.map((p) => ({ label: p.label, description: p.subtitle }))}
            activeStep={phaseIndex}
            orientation="horizontal"
          />
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', whiteSpace: 'nowrap' }}>
          {phaseIndex + 1} / {PHASE_META.length}
        </div>
      </div>

      {/* Main content: AGM sidebar + phase content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {showAgmPanel && agmProfile ? (
          <AGMPanel
            agm={agmProfile}
            phase={setupState.currentPhase}
            dialogue={panelDialogue}
            reaction={activeReaction}
            welcomeMonologue={setupState.currentPhase === 'intel_briefing' ? agmGreeting : null}
            teachingNarration={teachingNarration}
            teachingTips={teachingTips}
            blueprintMonologue={blueprintMonologue}
          />
        ) : null}

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {setupState.currentPhase !== 'choose_agm' ? (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...pixelSm, color: 'var(--mfd-gold)', fontSize: '10px', marginBottom: '4px' }}>
                {currentMeta.label.toUpperCase()}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{currentMeta.subtitle}</div>
            </div>
          ) : null}

          {/* Phase content */}
          <div key={setupState.currentPhase} style={{ animation: 'mfd-fadein 0.3s ease-out' }}>
            {setupState.currentPhase === 'choose_agm' && (
              <ChooseAGMPhase
                committedProfileId={decisions.agmProfileId}
                onHire={async (profileId) => applySetupChoice({ agmProfileId: profileId })}
              />
            )}
            {setupState.currentPhase === 'intel_briefing' && phaseData && <IntelBriefingPhase data={phaseData as ReturnType<typeof generateIntelBriefing>} />}
            {setupState.currentPhase === 'meet_roster' && phaseData && <MeetRosterPhase data={phaseData as ReturnType<typeof generateRosterOverview>} />}
            {setupState.currentPhase === 'hire_coach' && agmProfile && (
              <HireCoachPhase
                agmId={agmProfile.id}
                selectedCoachId={decisions.headCoachId}
                onHire={async (coachId) => applySetupChoice({ headCoachId: coachId })}
              />
            )}
            {setupState.currentPhase === 'hire_scout' && agmProfile && (
              <HireScoutPhase
                agmId={agmProfile.id}
                selectedScoutId={decisions.scoutingDirectorId}
                onHire={async (scoutId) => applySetupChoice({ scoutingDirectorId: scoutId })}
              />
            )}
            {setupState.currentPhase === 'set_scheme' && phaseData && (
              <SetSchemePhase
                data={phaseData as ReturnType<typeof generateSchemeContext>}
                selectedOffense={decisions.offenseScheme}
                selectedDefense={decisions.defenseScheme}
                onSelectOffense={handleSelectOffense}
                onSelectDefense={handleSelectDefense}
              />
            )}
            {setupState.currentPhase === 'depth_chart' && phaseData && <DepthChartPhase data={phaseData as ReturnType<typeof generateDepthChartContext>} />}
            {setupState.currentPhase === 'cap_strategy' && phaseData && <CapStrategyPhase data={phaseData as ReturnType<typeof generateCapBriefing>} />}
            {setupState.currentPhase === 'set_goals' && phaseData && (
              <SetGoalsPhase
                data={phaseData as ReturnType<typeof generateGoalContext>}
                selectedGoals={decisions.seasonGoals}
                onToggleGoal={handleToggleGoal}
              />
            )}
            {setupState.currentPhase === 'blueprint' && phaseData && <BlueprintPhase data={phaseData as ReturnType<typeof generateBlueprint>} />}
          </div>
        </div>
      </div>

      {/* Footer navigation */}
      <div style={{
        padding: '12px 20px', borderTop: '2px solid var(--mfd-border)',
        background: 'var(--mfd-bg-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <PixelButton
          accent="default"
          onClick={() => { void handleBack(); }}
          disabled={phaseIndex === 0 || isTransitioning || isLaunchingSeason}
        >
          Back
        </PixelButton>
        <div style={{ ...monoSm, color: 'var(--mfd-text-faint)' }}>
          {teamName}
        </div>
        <PixelButton
          accent={isLastPhase ? 'green' : 'gold'}
          onClick={() => { void handleNext(); }}
          disabled={!canAdvance || isTransitioning || isLaunchingSeason}
        >
          {isLastPhase ? 'START WEEK 1' : 'Next'}
        </PixelButton>
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
      `}</style>
    </div>
  );
}
