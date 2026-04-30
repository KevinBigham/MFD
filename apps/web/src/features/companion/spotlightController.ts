export type SpotlightWizardStageId =
  | 'cold-open'
  | 'team-select'
  | 'agm-hire'
  | 'depth-chart'
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
  { beat: 2, stageId: 'team-select', targetId: 'wizard.team-select.confirm' },
  { beat: 3, stageId: 'agm-hire', targetId: 'wizard.agm-hire.confirm' },
  { beat: 4, stageId: 'depth-chart', targetId: 'wizard.depth-chart.confirm' },
  { beat: 5, stageId: 'goals', targetId: 'wizard.goals.confirm' },
  { beat: 6, stageId: 'culture', targetId: 'wizard.culture.confirm' },
  { beat: 7, stageId: 'blueprint', targetId: 'wizard.blueprint.mic-check' },
  { beat: 8, stageId: 'week-one', targetId: 'wizard.week-one.start' },
  { beat: 9, stageId: 'dashboard', targetId: 'wizard.dashboard.handoff' },
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
  const entry = SPOTLIGHT_TARGETS_BY_BEAT.find((target) => target.beat === beat);
  if (!entry || entry.stageId !== stage) return null;
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
