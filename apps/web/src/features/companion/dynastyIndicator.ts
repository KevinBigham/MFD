export interface DynastyIndicator {
  seasonYear: number;
  coachName: string;
}

const MAX_COACH_NAME_CHARS = 16;

export function truncateCoachName(coachName: string): string {
  const trimmed = coachName.trim() || 'Coach';
  if (trimmed.length <= MAX_COACH_NAME_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_COACH_NAME_CHARS)}…`;
}

export function formatDynastyIndicatorLabel(seasonYear: number, coachName: string): string {
  return `Year ${seasonYear} — ${truncateCoachName(coachName)}`;
}
