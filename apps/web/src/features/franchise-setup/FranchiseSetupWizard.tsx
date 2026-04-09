/**
 * FranchiseSetupWizard — The First 10 Minutes.
 *
 * Full-screen guided franchise onboarding that walks users through 8 phases
 * with an Assistant GM character providing data-driven commentary.
 */
import { useMemo, useState, useCallback } from 'react';
import { MfdStepper, PixelButton } from '@mfd/design-system/components';
import {
  assignAssistantGM,
  getAGMGreeting,
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
  agmOnCoachingReview,
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
import { IntelBriefingPhase } from './phases/IntelBriefingPhase';
import { MeetRosterPhase } from './phases/MeetRosterPhase';
import { CoachingReviewPhase } from './phases/CoachingReviewPhase';
import { SetSchemePhase } from './phases/SetSchemePhase';
import { DepthChartPhase } from './phases/DepthChartPhase';
import { CapStrategyPhase } from './phases/CapStrategyPhase';
import { SetGoalsPhase } from './phases/SetGoalsPhase';
import { BlueprintPhase } from './phases/BlueprintPhase';

const PHASE_META: Array<{ id: SetupPhase; label: string; subtitle: string }> = [
  { id: 'intel_briefing', label: 'Intel Briefing', subtitle: 'Understand what you are inheriting' },
  { id: 'meet_roster', label: 'Meet Your Roster', subtitle: 'Stars, question marks, and depth' },
  { id: 'coaching_review', label: 'Coaching Staff', subtitle: 'Your staff shapes everything' },
  { id: 'set_scheme', label: 'Set Your Scheme', subtitle: 'Choose your offensive and defensive identity' },
  { id: 'depth_chart', label: 'Depth Chart', subtitle: 'Review your starting lineup' },
  { id: 'cap_strategy', label: 'Cap Strategy', subtitle: 'Your financial picture' },
  { id: 'set_goals', label: 'Season Goals', subtitle: 'Define success for this year' },
  { id: 'blueprint', label: 'Franchise Blueprint', subtitle: 'Your plan is ready' },
];

export function FranchiseSetupWizard() {
  const game = useGameStore((s) => s.game!);
  const setupState = useGameStore(selectSetupState)!;
  const phaseIndex = useGameStore(selectSetupPhaseIndex);
  const { advanceSetup, goBackSetup, applySetupChoice, completeSetup } = useGameStore((s) => s.actions);

  const userTeam = useMemo(() => Object.values(game.teams).find((t) => t.isUser)!, [game.teams]);
  const teamId = userTeam.id;
  const teamName = `${userTeam.city} ${userTeam.name}`;

  // AGM profile (deterministic from seed)
  const agmProfile = useMemo(() => assignAssistantGM(game, teamId, game.seed), [game, teamId]);
  const agmGreeting = useMemo(() => getAGMGreeting(agmProfile, teamName), [agmProfile, teamName]);

  // Phase data (recomputed when phase changes)
  const phaseData = useMemo(() => {
    const decisions = setupState.decisions;
    switch (setupState.currentPhase) {
      case 'intel_briefing': return generateIntelBriefing(game, teamId);
      case 'meet_roster': return generateRosterOverview(game, teamId);
      case 'coaching_review': return generateCoachingReview(game, teamId);
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
    if (!phaseData) return null;
    switch (setupState.currentPhase) {
      case 'intel_briefing': return agmOnIntelBriefing(phaseData as ReturnType<typeof generateIntelBriefing>, agmProfile);
      case 'meet_roster': return agmOnRosterOverview(phaseData as ReturnType<typeof generateRosterOverview>, agmProfile);
      case 'coaching_review': return agmOnCoachingReview(phaseData as ReturnType<typeof generateCoachingReview>, agmProfile);
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

  const decisions = setupState.decisions;
  const currentMeta = PHASE_META[phaseIndex] ?? PHASE_META[0]!;
  const canAdvance = isPhaseComplete(setupState, setupState.currentPhase);
  const isLastPhase = setupState.currentPhase === 'blueprint';

  const handleNext = useCallback(async () => {
    // For read-only phases, acknowledge before advancing
    if (!decisions.acknowledged.includes(setupState.currentPhase)) {
      await applySetupChoice({ acknowledged: [...decisions.acknowledged, setupState.currentPhase] });
    }
    if (isLastPhase) {
      await completeSetup();
    } else {
      await advanceSetup();
      setSchemeReaction(null);
      setGoalReaction(null);
    }
  }, [setupState.currentPhase, decisions.acknowledged, isLastPhase, applySetupChoice, advanceSetup, completeSetup]);

  const handleBack = useCallback(async () => {
    await goBackSetup();
    setSchemeReaction(null);
    setGoalReaction(null);
  }, [goBackSetup]);

  // Scheme selection handlers
  const handleSelectOffense = useCallback(async (schemeId: string) => {
    await applySetupChoice({ offenseScheme: schemeId });
    if (decisions.defenseScheme && phaseData) {
      setSchemeReaction(agmReactsToSchemeChoice(schemeId, decisions.defenseScheme, phaseData as ReturnType<typeof generateSchemeContext>, agmProfile));
    }
  }, [applySetupChoice, decisions.defenseScheme, phaseData, agmProfile]);

  const handleSelectDefense = useCallback(async (schemeId: string) => {
    await applySetupChoice({ defenseScheme: schemeId });
    if (decisions.offenseScheme && phaseData) {
      setSchemeReaction(agmReactsToSchemeChoice(decisions.offenseScheme, schemeId, phaseData as ReturnType<typeof generateSchemeContext>, agmProfile));
    }
  }, [applySetupChoice, decisions.offenseScheme, phaseData, agmProfile]);

  // Goal selection handler
  const handleToggleGoal = useCallback(async (goalId: string) => {
    const current = [...decisions.seasonGoals];
    const idx = current.indexOf(goalId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else if (current.length < 3) {
      current.push(goalId);
    }
    await applySetupChoice({ seasonGoals: current });
    if (current.length === 3 && phaseData) {
      setGoalReaction(agmReactsToGoalChoice(current, phaseData as ReturnType<typeof generateGoalContext>, agmProfile));
    } else {
      setGoalReaction(null);
    }
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
        background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '20px',
      }}>
        <div style={{ ...pixelSm, color: 'var(--mfd-gold)', whiteSpace: 'nowrap' }}>
          MFD FRANCHISE SETUP
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
        <AGMPanel
          agm={agmProfile}
          dialogue={agmDialogue}
          reaction={activeReaction}
          greeting={phaseIndex === 0 ? agmGreeting : null}
        />

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Phase title */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ ...pixelSm, color: 'var(--mfd-gold)', fontSize: '10px', marginBottom: '4px' }}>
              {currentMeta.label.toUpperCase()}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{currentMeta.subtitle}</div>
          </div>

          {/* Phase content */}
          <div key={setupState.currentPhase} style={{ animation: 'mfd-fadein 0.3s ease-out' }}>
            {setupState.currentPhase === 'intel_briefing' && phaseData && <IntelBriefingPhase data={phaseData as ReturnType<typeof generateIntelBriefing>} />}
            {setupState.currentPhase === 'meet_roster' && phaseData && <MeetRosterPhase data={phaseData as ReturnType<typeof generateRosterOverview>} />}
            {setupState.currentPhase === 'coaching_review' && phaseData && <CoachingReviewPhase data={phaseData as ReturnType<typeof generateCoachingReview>} />}
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
        background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <PixelButton
          accent="default"
          onClick={() => { void handleBack(); }}
          disabled={phaseIndex === 0}
        >
          Back
        </PixelButton>
        <div style={{ ...monoSm, color: 'var(--mfd-text-faint)' }}>
          {teamName}
        </div>
        <PixelButton
          accent={isLastPhase ? 'green' : 'gold'}
          onClick={() => { void handleNext(); }}
          disabled={!canAdvance && !isLastPhase}
        >
          {isLastPhase ? 'Begin Season' : 'Next'}
        </PixelButton>
      </div>

      <style>{`
        @keyframes mfd-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
