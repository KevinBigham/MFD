import type { RivalryRelationship, RivalryScoreInput } from './types';

const BASE_INTENSITY: Record<RivalryRelationship, number> = {
  division: 20,
  conference: 10,
  interconference: 5,
};

export function intensityScore(input: RivalryScoreInput): number {
  let score = BASE_INTENSITY[input.relationship];

  if (input.lastMeetingSeason !== null) {
    const seasonGap = input.currentSeason - input.lastMeetingSeason;
    if (seasonGap <= 2) score += 15;
    else if (seasonGap <= 4) score += 8;
  }

  score += Math.max(0, input.closeGamesInLastFive) * 5;
  if (input.hasPlayoffHistory) score += 10;
  if (input.activeStreakLength >= 3) score += 8;

  return Math.max(0, Math.min(100, score));
}
