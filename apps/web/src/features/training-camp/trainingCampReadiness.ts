import type { GameState, TeamOpsImpactReceipt } from '@mfd/engine';

export interface TrainingCampReadinessForecast {
  status: 'camp_recorded' | 'ready_to_resolve' | 'upcoming' | 'past_unrecorded' | 'unavailable';
  label: string;
  accent: 'default' | 'gold' | 'cyan' | 'green' | 'red';
  timing: string;
  commitPath: string;
  savedReceipt: string;
  carryover: string;
  source: string;
}

function campReceiptLabel(result: NonNullable<GameState['trainingCampResults']>[number] | null): string {
  if (!result) return 'No saved report';
  return `${result.standouts.length} up / ${result.injuries.length} hurt / ${result.battles.length} battles`;
}

function teamOpsCarryoverLabel(receipt: TeamOpsImpactReceipt | null): string {
  if (!receipt) return 'No team ops receipt';
  const training = receipt.summaryItems.find((item) => item.id === 'training');
  const injury = receipt.summaryItems.find((item) => item.id === 'injury_prevention');
  if (training && injury) return `${training.value} training // ${injury.value}`;
  return receipt.summaryItems.length > 0 ? `${receipt.summaryItems.length} ops inputs` : 'No active modifiers';
}

export function buildTrainingCampReadinessForecast(
  game: GameState | null | undefined,
  teamId: string | null | undefined,
  receipt: TeamOpsImpactReceipt | null,
): TrainingCampReadinessForecast {
  if (!game || !teamId) {
    return {
      status: 'unavailable',
      label: 'No team selected',
      accent: 'default',
      timing: 'Load a dynasty team',
      commitPath: 'Unavailable',
      savedReceipt: 'No saved report',
      carryover: teamOpsCarryoverLabel(receipt),
      source: 'Source: route selectors did not return a loaded game and user team.',
    };
  }

  const result = game.trainingCampResults?.find((camp) => camp.teamId === teamId) ?? null;
  const savedReceipt = campReceiptLabel(result);
  const carryover = teamOpsCarryoverLabel(receipt);

  if (result) {
    return {
      status: 'camp_recorded',
      label: 'Camp recorded',
      accent: 'green',
      timing: `Saved ${game.year} camp report is available`,
      commitPath: 'Saved Report',
      savedReceipt,
      carryover,
      source: 'Source: saved game.trainingCampResults for the user team; this route does not rerun camp.',
    };
  }

  if (game.phase === 'training_camp') {
    return {
      status: 'ready_to_resolve',
      label: 'Ready to resolve',
      accent: 'gold',
      timing: 'Advance week commits camp and opens preseason',
      commitPath: 'Advance Week',
      savedReceipt,
      carryover,
      source: 'Source: game.phase is training_camp; advanceFranchiseWeek is the only path that writes camp results.',
    };
  }

  if (game.phase === 'offseason' || game.phase === 'free_agency' || game.phase === 'draft' || game.phase === 'post_draft') {
    return {
      status: 'upcoming',
      label: 'Camp upcoming',
      accent: 'cyan',
      timing: `Current phase: ${game.phase.replace('_', ' ')}`,
      commitPath: 'Draft Flow',
      savedReceipt,
      carryover,
      source: 'Source: saved phase and team ops receipt; no camp results exist yet.',
    };
  }

  return {
    status: 'past_unrecorded',
    label: 'No camp report',
    accent: 'default',
    timing: `Current phase: ${game.phase.replace('_', ' ')}`,
    commitPath: 'None Pending',
    savedReceipt,
    carryover,
    source: 'Source: saved phase has moved outside training camp and no user-team camp report is stored.',
  };
}
