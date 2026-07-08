export type SpotlightWizardStageId =
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

export interface SpotlightTargetEntry {
  beat: number;
  stageId: SpotlightWizardStageId;
  targetId: string;
}

export const SPOTLIGHT_TARGETS_BY_BEAT: SpotlightTargetEntry[] = [
  { beat: 1, stageId: 'cold-open', targetId: 'wizard.cold-open.continue' },
  { beat: 1, stageId: 'agm-hire', targetId: 'wizard.agm-hire.confirm' },
  { beat: 2, stageId: 'intel-briefing', targetId: 'wizard.intel-briefing.confirm' },
  { beat: 3, stageId: 'roster-overview', targetId: 'wizard.roster.confirm' },
  { beat: 4, stageId: 'coach-hire', targetId: 'wizard.coach-hire.confirm' },
  { beat: 5, stageId: 'scout-hire', targetId: 'wizard.scout-hire.confirm' },
  { beat: 6, stageId: 'scheme', targetId: 'wizard.scheme.confirm' },
  { beat: 7, stageId: 'depth-chart', targetId: 'wizard.depth-chart.confirm' },
  { beat: 8, stageId: 'cap-strategy', targetId: 'wizard.cap-strategy.confirm' },
  { beat: 9, stageId: 'goals', targetId: 'wizard.goals.confirm' },
  { beat: 9, stageId: 'culture', targetId: 'wizard.culture.confirm' },
  { beat: 10, stageId: 'blueprint', targetId: 'wizard.blueprint.mic-check' },
  { beat: 10, stageId: 'week-one', targetId: 'wizard.week-one.start' },
  { beat: 10, stageId: 'dashboard', targetId: 'wizard.dashboard.handoff' },
];

export interface SpotlightControllerOptions {
  getCurrentBeat: () => number;
  getCurrentStage: () => SpotlightWizardStageId | string | null | undefined;
  isEnabled?: () => boolean;
  isDismissed?: () => boolean;
  isSkipped?: () => boolean;
}

export interface SpotlightController {
  getTargetId: () => string | null;
}

export function resolveSpotlightTargetId(
  beat: number,
  stage: SpotlightWizardStageId | string | null | undefined,
): string | null {
  if (!stage) return null;
  const entry = SPOTLIGHT_TARGETS_BY_BEAT.find((target) => target.beat === beat && target.stageId === stage);
  if (!entry) return null;
  return entry.targetId;
}

export function createSpotlightController({
  getCurrentBeat,
  getCurrentStage,
  isEnabled = () => true,
  isDismissed = () => false,
  isSkipped = () => false,
}: SpotlightControllerOptions): SpotlightController {
  return {
    getTargetId: () => {
      if (!isEnabled() || isDismissed() || isSkipped()) {
        return null;
      }
      return resolveSpotlightTargetId(getCurrentBeat(), getCurrentStage());
    },
  };
}
