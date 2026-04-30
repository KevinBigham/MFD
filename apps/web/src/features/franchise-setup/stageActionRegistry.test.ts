import { describe, expect, it, vi } from 'vitest';
import {
  STAGE_ACTION_REGISTRATIONS,
  buildPrimaryActionProps,
  createStageAdvanceNotifier,
  getPrimaryActionDisabledReason,
  getStageActionRegistration,
  resolveWizardStageId,
} from './stageActionRegistry';

describe('stageActionRegistry', () => {
  it('registers every setup spotlight target in a stable order', () => {
    expect(STAGE_ACTION_REGISTRATIONS.map((entry) => [entry.stageId, entry.targetId])).toEqual([
      ['cold-open', 'wizard.cold-open.continue'],
      ['agm-hire', 'wizard.agm-hire.confirm'],
      ['intel-briefing', 'wizard.intel-briefing.confirm'],
      ['roster-overview', 'wizard.roster.confirm'],
      ['coach-hire', 'wizard.coach-hire.confirm'],
      ['scout-hire', 'wizard.scout-hire.confirm'],
      ['scheme', 'wizard.scheme.confirm'],
      ['depth-chart', 'wizard.depth-chart.confirm'],
      ['cap-strategy', 'wizard.cap-strategy.confirm'],
      ['goals', 'wizard.goals.confirm'],
      ['culture', 'wizard.culture.confirm'],
      ['blueprint', 'wizard.blueprint.mic-check'],
      ['week-one', 'wizard.week-one.start'],
      ['dashboard', 'wizard.dashboard.handoff'],
    ]);
  });

  it('resolves the active wizard stage from phase state', () => {
    expect(resolveWizardStageId({ showColdOpen: true, currentPhase: 'choose_agm' })).toBe('cold-open');
    expect(resolveWizardStageId({ showColdOpen: false, currentPhase: 'choose_agm' })).toBe('agm-hire');
    expect(resolveWizardStageId({ showColdOpen: false, currentPhase: 'depth_chart' })).toBe('depth-chart');
    expect(resolveWizardStageId({ showColdOpen: false, currentPhase: 'set_goals', seasonGoalCount: 2 })).toBe('goals');
    expect(resolveWizardStageId({
      showColdOpen: false,
      currentPhase: 'set_goals',
      seasonGoalCount: 3,
      cultureMandateSelected: false,
    })).toBe('culture');
    expect(resolveWizardStageId({
      showColdOpen: false,
      currentPhase: 'set_goals',
      seasonGoalCount: 3,
      cultureMandateSelected: true,
    })).toBe('culture');
    expect(resolveWizardStageId({ showColdOpen: false, currentPhase: 'blueprint', isLaunchingSeason: true })).toBe('week-one');
  });

  it('fires the stage advance callback only after the stage changes', () => {
    const onStageAdvance = vi.fn();
    const notify = createStageAdvanceNotifier(onStageAdvance);

    notify('cold-open');
    notify('cold-open');
    notify('agm-hire');
    notify('agm-hire');
    notify('depth-chart');

    expect(onStageAdvance).toHaveBeenCalledTimes(2);
    expect(onStageAdvance).toHaveBeenNthCalledWith(1, 'agm-hire');
    expect(onStageAdvance).toHaveBeenNthCalledWith(2, 'depth-chart');
  });

  it('builds gold-pulse primary button props with the target id', () => {
    const props = buildPrimaryActionProps(getStageActionRegistration('agm-hire'), null);

    expect(props.className).toContain('mfd-setup-primary-action--spotlight');
    expect(props['data-spotlight-target']).toBe('wizard.agm-hire.confirm');
    expect(props['data-mfd-primary-action-disabled-reason']).toBeUndefined();
  });

  it('surfaces disabled primary-action reasons inline', () => {
    const reason = getPrimaryActionDisabledReason(false, 'Decision needed: hire your Assistant GM.');
    const props = buildPrimaryActionProps(getStageActionRegistration('agm-hire'), reason);

    expect(reason).toBe('Decision needed: hire your Assistant GM.');
    expect(props['aria-describedby']).toBe('mfd-setup-advance-reason');
    expect(props['data-mfd-primary-action-disabled-reason']).toBe(reason);
    expect(props['data-spotlight-target']).toBeUndefined();
  });
});
