import type { GameDayPackage, WeeklySummary } from '../types';

export type PostWeekMomentTone = 'positive' | 'negative' | 'neutral' | 'warning';

export interface PostWeekMomentItem {
  id: string;
  label: string;
  detail: string;
  tone: PostWeekMomentTone;
}

export interface PostWeekMoment {
  id: string;
  year: number;
  week: number;
  result: WeeklySummary['result'];
  headline: string;
  scoreLine: string | null;
  record: string | null;
  whyItHappened: PostWeekMomentItem[];
  whatChanged: PostWeekMomentItem[];
  whatNow: PostWeekMomentItem[];
  source: 'summary' | 'game-day-package';
}

function resultTone(result: WeeklySummary['result']): PostWeekMomentTone {
  if (result === 'win') return 'positive';
  if (result === 'loss') return 'negative';
  if (result === 'tie') return 'warning';
  return 'neutral';
}

function impactTone(impact: GameDayPackage['turningPoints'][number]['impact']): PostWeekMomentTone {
  if (impact === 'positive') return 'positive';
  if (impact === 'negative') return 'negative';
  return 'neutral';
}

function ownerTone(delta: number): PostWeekMomentTone {
  if (delta > 0) return 'positive';
  if (delta < 0) return 'negative';
  return 'neutral';
}

function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

function pushUnique(
  items: PostWeekMomentItem[],
  item: PostWeekMomentItem | null,
): void {
  if (!item) return;
  if (items.some((existing) => existing.label === item.label && existing.detail === item.detail)) return;
  items.push(item);
}

function scoreLine(summary: WeeklySummary | null, packageData: GameDayPackage | null): string | null {
  if (packageData?.finalScore) return packageData.finalScore;
  if (summary && summary.teamScore !== null && summary.opponentScore !== null) {
    return `${summary.teamScore}-${summary.opponentScore}`;
  }
  return null;
}

function buildWhyItHappened(
  summary: WeeklySummary | null,
  packageData: GameDayPackage | null,
): PostWeekMomentItem[] {
  const items: PostWeekMomentItem[] = [];
  if (packageData?.autopsy.diagnosis) {
    pushUnique(items, {
      id: 'diagnosis',
      label: 'Tape Diagnosis',
      detail: packageData.autopsy.diagnosis,
      tone: resultTone(packageData.result),
    });
  }
  if (packageData?.autopsy.leverage) {
    pushUnique(items, {
      id: 'leverage',
      label: 'Decision Point',
      detail: packageData.autopsy.leverage,
      tone: resultTone(packageData.result),
    });
  }
  const stake = packageData?.stakes[0];
  if (stake) {
    pushUnique(items, {
      id: 'stakes',
      label: 'Game Stakes',
      detail: `${stake.label}: ${stake.detail}`,
      tone: 'warning',
    });
  }
  if (packageData?.rivalry) {
    pushUnique(items, {
      id: 'rivalry',
      label: 'Rivalry Heat',
      detail: packageData.rivalry.headline,
      tone: 'warning',
    });
  }
  for (const point of packageData?.turningPoints.slice(0, 2) ?? []) {
    pushUnique(items, {
      id: `turning-point-${items.length}`,
      label: point.label,
      detail: point.detail,
      tone: impactTone(point.impact),
    });
  }
  if (packageData?.matchupHighlight) {
    pushUnique(items, {
      id: 'matchup-highlight',
      label: packageData.matchupHighlight.label,
      detail: packageData.matchupHighlight.detail,
      tone: packageData.matchupHighlight.advantage >= 0 ? 'positive' : 'negative',
    });
  }
  for (const note of summary?.notes.slice(0, 2) ?? []) {
    pushUnique(items, {
      id: `summary-note-${items.length}`,
      label: 'Week Note',
      detail: note,
      tone: 'neutral',
    });
  }

  return items.slice(0, 5);
}

function buildWhatChanged(
  summary: WeeklySummary | null,
  packageData: GameDayPackage | null,
): PostWeekMomentItem[] {
  const result = packageData?.result ?? summary?.result ?? 'pending';
  const items: PostWeekMomentItem[] = [];

  if (summary?.record) {
    pushUnique(items, {
      id: 'record',
      label: 'Record',
      detail: `${summary.record} after this ${summary.phase.replace(/_/g, ' ')} result.`,
      tone: resultTone(result),
    });
  }
  if (summary && summary.ownerDelta !== 0) {
    pushUnique(items, {
      id: 'owner-delta',
      label: 'Owner Pulse',
      detail: `Owner confidence moved ${formatDelta(summary.ownerDelta)} this week.`,
      tone: ownerTone(summary.ownerDelta),
    });
  }
  const injuryCount = summary?.injuries.length ?? packageData?.injuryNotes.length ?? 0;
  if (injuryCount > 0) {
    pushUnique(items, {
      id: 'injuries',
      label: 'Health Board',
      detail: `${injuryCount} injury ${injuryCount === 1 ? 'note' : 'notes'} now affect the next depth-chart decision.`,
      tone: 'warning',
    });
  }
  if (packageData?.recordsMoments.length) {
    const record = packageData.recordsMoments[0]!;
    pushUnique(items, {
      id: 'records',
      label: 'Record Book',
      detail: record.narrative,
      tone: 'positive',
    });
  }
  if (packageData?.milestoneMoments.length) {
    const milestone = packageData.milestoneMoments[0]!;
    pushUnique(items, {
      id: 'milestones',
      label: 'Milestone',
      detail: milestone.narrative,
      tone: 'positive',
    });
  }
  const specialTeamsHighlight = packageData?.specialTeamsHighlights?.[0];
  if (specialTeamsHighlight) {
    pushUnique(items, {
      id: 'special-teams',
      label: 'Special Teams',
      detail: specialTeamsHighlight,
      tone: 'positive',
    });
  }
  if (packageData?.activeEffectSummaries.length) {
    pushUnique(items, {
      id: 'carryover',
      label: 'Carryover Effect',
      detail: packageData.activeEffectSummaries[0]!,
      tone: 'warning',
    });
  }
  if (packageData?.weather) {
    pushUnique(items, {
      id: 'weather',
      label: 'Conditions',
      detail: `${packageData.weather.toUpperCase()} conditions are now attached to the game recap.`,
      tone: packageData.weather === 'clear' || packageData.weather === 'dome' ? 'neutral' : 'warning',
    });
  }

  return items.slice(0, 7);
}

function buildWhatNow(
  summary: WeeklySummary | null,
  packageData: GameDayPackage | null,
): PostWeekMomentItem[] {
  const result = packageData?.result ?? summary?.result ?? 'pending';
  const items: PostWeekMomentItem[] = [];

  for (const focus of packageData?.autopsy.nextFocus.slice(0, 3) ?? []) {
    pushUnique(items, {
      id: `next-focus-${items.length}`,
      label: 'Next Focus',
      detail: focus,
      tone: 'neutral',
    });
  }
  for (const recommendation of packageData?.carryForwardRecommendations?.slice(0, 2) ?? []) {
    pushUnique(items, {
      id: `carry-forward-${items.length}`,
      label: 'Carry Forward',
      detail: recommendation,
      tone: 'positive',
    });
  }
  if (packageData?.pressConference) {
    pushUnique(items, {
      id: 'podium',
      label: 'Podium Follow-Up',
      detail: `${packageData.pressConference.theme}: ${packageData.pressConference.opener}`,
      tone: packageData.pressConference.tone === 'somber' ? 'warning' : 'neutral',
    });
  }
  const coachingNote = packageData?.coachingNotes?.[0];
  if (coachingNote) {
    pushUnique(items, {
      id: 'coaching-note',
      label: 'Coaching Note',
      detail: coachingNote,
      tone: 'neutral',
    });
  }
  if (packageData?.prepGrade) {
    pushUnique(items, {
      id: 'film-room',
      label: 'Film Room',
      detail: `Prep graded ${packageData.prepGrade}; open coaching notes before Advance Week or the same missed call repeats.`,
      tone: packageData.prepGrade === 'A' || packageData.prepGrade === 'B' ? 'positive' : 'warning',
    });
  }
  const injuryCount = summary?.injuries.length ?? packageData?.injuryNotes.length ?? 0;
  if (injuryCount > 0) {
    pushUnique(items, {
      id: 'depth-chart',
      label: 'Depth Chart',
      detail: 'Set first backups before Advance Week; injured starters put an unassigned player on the field.',
      tone: 'warning',
    });
  }
  if (items.length === 0) {
    pushUnique(items, {
      id: 'default-next',
      label: result === 'win' ? 'Keep Pressure On' : result === 'loss' ? 'Stabilize The Week' : 'Break The Tie',
      detail: result === 'win'
        ? 'Open Film Room to see what worked, then keep the same plan when roster health still supports it.'
        : result === 'loss'
          ? 'Use Recap and Film Room to name one correction before changing roster or Game Plan.'
          : 'Open Recap and Game Plan before Advance Week; a tie usually means one matchup or depth issue still needs a decision.',
      tone: resultTone(result),
    });
  }

  return items.slice(0, 7);
}

export function buildPostWeekMoment(
  summary: WeeklySummary | null,
  packageData: GameDayPackage | null,
): PostWeekMoment | null {
  if (!summary && !packageData) return null;

  const year = summary?.year ?? packageData!.year;
  const week = summary?.week ?? packageData!.week;
  const result = packageData?.result ?? summary?.result ?? 'pending';
  const headline = packageData?.headline ?? summary?.headline ?? `Week ${week} complete`;

  return {
    id: `post-week-${year}-${week}-${summary?.teamId ?? packageData?.teamId ?? 'team'}`,
    year,
    week,
    result,
    headline,
    scoreLine: scoreLine(summary, packageData),
    record: summary?.record ?? null,
    whyItHappened: buildWhyItHappened(summary, packageData),
    whatChanged: buildWhatChanged(summary, packageData),
    whatNow: buildWhatNow(summary, packageData),
    source: packageData ? 'game-day-package' : 'summary',
  };
}
