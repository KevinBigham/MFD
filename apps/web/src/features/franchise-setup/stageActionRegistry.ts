import { useEffect, useRef } from 'react';

export type WizardSetupPhase =
  | 'choose_agm'
  | 'intel_briefing'
  | 'meet_roster'
  | 'hire_coach'
  | 'hire_scout'
  | 'set_scheme'
  | 'depth_chart'
  | 'cap_strategy'
  | 'set_goals'
  | 'blueprint';

export type SetupStageActionId =
  | 'cold-open'
  | 'agm-hire'
  | 'intel-briefing'
  | 'roster-overview'
  | 'coach-hire'
  | 'scout-hire'
  | 'scheme'
  | 'depth-chart'
  | 'cap-strategy'
  | 'goals'
  | 'culture'
  | 'blueprint'
  | 'week-one'
  | 'dashboard';

export interface StageActionRegistration {
  stageId: SetupStageActionId;
  targetId: string;
}

export const STAGE_ACTION_REGISTRATIONS: StageActionRegistration[] = [
  { stageId: 'cold-open', targetId: 'wizard.cold-open.continue' },
  { stageId: 'agm-hire', targetId: 'wizard.agm-hire.confirm' },
  { stageId: 'intel-briefing', targetId: 'wizard.intel-briefing.confirm' },
  { stageId: 'roster-overview', targetId: 'wizard.roster.confirm' },
  { stageId: 'coach-hire', targetId: 'wizard.coach-hire.confirm' },
  { stageId: 'scout-hire', targetId: 'wizard.scout-hire.confirm' },
  { stageId: 'scheme', targetId: 'wizard.scheme.confirm' },
  { stageId: 'depth-chart', targetId: 'wizard.depth-chart.confirm' },
  { stageId: 'cap-strategy', targetId: 'wizard.cap-strategy.confirm' },
  { stageId: 'goals', targetId: 'wizard.goals.confirm' },
  { stageId: 'culture', targetId: 'wizard.culture.confirm' },
  { stageId: 'blueprint', targetId: 'wizard.blueprint.mic-check' },
  { stageId: 'week-one', targetId: 'wizard.week-one.start' },
  { stageId: 'dashboard', targetId: 'wizard.dashboard.handoff' },
];

const REGISTRATION_BY_STAGE = new Map(
  STAGE_ACTION_REGISTRATIONS.map((registration) => [registration.stageId, registration]),
);

const PHASE_TO_STAGE: Record<Exclude<WizardSetupPhase, 'set_goals' | 'blueprint'>, SetupStageActionId> = {
  choose_agm: 'agm-hire',
  intel_briefing: 'intel-briefing',
  meet_roster: 'roster-overview',
  hire_coach: 'coach-hire',
  hire_scout: 'scout-hire',
  set_scheme: 'scheme',
  depth_chart: 'depth-chart',
  cap_strategy: 'cap-strategy',
};

export interface ResolveWizardStageInput {
  showColdOpen: boolean;
  currentPhase: WizardSetupPhase;
  seasonGoalCount?: number;
  cultureMandateSelected?: boolean;
  isLaunchingSeason?: boolean;
}

export interface PrimaryActionProps {
  className: string;
  'data-mfd-primary-action': 'true';
  'data-spotlight-target'?: string;
  'aria-describedby'?: string;
  'data-mfd-primary-action-disabled-reason'?: string;
}

export function getStageActionRegistration(stageId: SetupStageActionId): StageActionRegistration {
  const registration = REGISTRATION_BY_STAGE.get(stageId);
  if (!registration) {
    throw new Error(`Unknown setup stage action: ${stageId}`);
  }
  return registration;
}

export function resolveWizardStageId({
  showColdOpen,
  currentPhase,
  seasonGoalCount = 0,
  cultureMandateSelected = false,
  isLaunchingSeason = false,
}: ResolveWizardStageInput): SetupStageActionId {
  if (showColdOpen) return 'cold-open';
  if (currentPhase === 'set_goals') {
    if (seasonGoalCount < 3) return 'goals';
    return 'culture';
  }
  if (currentPhase === 'blueprint') return isLaunchingSeason ? 'week-one' : 'blueprint';
  return PHASE_TO_STAGE[currentPhase];
}

export function createStageAdvanceNotifier(onStageAdvance?: (stageId: SetupStageActionId) => void) {
  let previousStageId: SetupStageActionId | null = null;

  return (stageId: SetupStageActionId) => {
    if (previousStageId !== null && previousStageId !== stageId) {
      onStageAdvance?.(stageId);
    }
    previousStageId = stageId;
  };
}

export function getPrimaryActionDisabledReason(canAdvance: boolean, advanceHint: string): string | null {
  return canAdvance ? null : advanceHint;
}

export function buildPrimaryActionProps(
  registration: StageActionRegistration,
  disabledReason: string | null,
): PrimaryActionProps {
  return {
    className: 'mfd-setup-primary-action mfd-setup-primary-action--spotlight',
    'data-mfd-primary-action': 'true',
    'data-spotlight-target': disabledReason ? undefined : registration.targetId,
    ...(disabledReason
      ? {
        'aria-describedby': 'mfd-setup-advance-reason',
        'data-mfd-primary-action-disabled-reason': disabledReason,
      }
      : {}),
  };
}

export function useStageActionRegistry(
  input: ResolveWizardStageInput,
  onStageAdvance?: (stageId: SetupStageActionId) => void,
): StageActionRegistration {
  const stageId = resolveWizardStageId(input);
  const previousStageId = useRef<SetupStageActionId>(stageId);

  useEffect(() => {
    if (previousStageId.current !== stageId) {
      onStageAdvance?.(stageId);
      previousStageId.current = stageId;
    }
  }, [onStageAdvance, stageId]);

  return getStageActionRegistration(stageId);
}
