export interface AutosaveToastStep {
  showToast: boolean;
  nextPreviousWeek: number;
}

export function resolveAutosaveToastStep(previousWeek: number, currentWeek: number): AutosaveToastStep {
  return {
    showToast: previousWeek !== 0 && currentWeek !== previousWeek,
    nextPreviousWeek: currentWeek,
  };
}
