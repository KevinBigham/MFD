import type { GameDayPackage, GameResult, PlayoffMomentum } from '@mfd/engine';

export type PlayoffLoreRound = 'wild_card' | 'divisional' | 'conference' | 'super_bowl';
export type PlayoffLoreOutcome = 'win' | 'loss';

export interface PlayoffLoreHeroBlock {
  label: string;
  value: string;
}

export interface PlayoffLoreCard {
  gameId: string;
  seasonYear: number;
  week: number;
  round: PlayoffLoreRound;
  outcome: PlayoffLoreOutcome;
  headline: string;
  finalScore: string;
  opponentTeamId: string;
  loreHook: string;
  heroBlocks: PlayoffLoreHeroBlock[];
  tags: string[];
  namedGameName?: string;
}

interface BuildPlayoffLoreCardArgs {
  packageData: GameDayPackage | null;
  result: GameResult | null;
  userTeamId: string | null;
  momentumTag: PlayoffMomentum['narrativeTag'] | null;
}

function roundFromWeek(week: number): PlayoffLoreRound | null {
  if (week === 19) return 'wild_card';
  if (week === 20) return 'divisional';
  if (week === 21) return 'conference';
  if (week === 22) return 'super_bowl';
  return null;
}

function titleCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part[0] ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

function outcomeFromPackage(
  packageData: GameDayPackage,
  result: GameResult,
  userTeamId: string,
): PlayoffLoreOutcome | null {
  if (packageData.result === 'win' || packageData.result === 'loss') {
    return packageData.result;
  }
  const userScore = result.homeTeamId === userTeamId ? result.homeScore : result.awayScore;
  const opponentScore = result.homeTeamId === userTeamId ? result.awayScore : result.homeScore;
  if (userScore === opponentScore) return null;
  return userScore > opponentScore ? 'win' : 'loss';
}

function fallbackScore(result: GameResult, userTeamId: string): string {
  const userScore = result.homeTeamId === userTeamId ? result.homeScore : result.awayScore;
  const opponentScore = result.homeTeamId === userTeamId ? result.awayScore : result.homeScore;
  return `${userScore}-${opponentScore}`;
}

function buildTags(
  packageData: GameDayPackage,
  result: GameResult,
  momentumTag: PlayoffMomentum['narrativeTag'] | null,
): string[] {
  const tags: string[] = [];
  const push = (value: string | null | undefined) => {
    if (!value || tags.includes(value)) return;
    tags.push(value);
  };

  push(momentumTag ? titleCase(momentumTag) : null);
  push(packageData.namedGame || result.namedGame ? 'Named Game' : null);
  push(packageData.rivalry ? 'Rivalry' : null);
  push(packageData.recordsMoments.length > 0 ? 'Record Broken' : null);
  push(packageData.milestoneMoments.length > 0 ? 'Milestone' : null);
  push(result.overtime ? 'Overtime' : null);

  if (packageData.callYourShotResult?.outcome) {
    push(`Call Shot ${titleCase(packageData.callYourShotResult.outcome)}`);
  }

  return tags;
}

function buildHeroBlocks(
  packageData: GameDayPackage,
  momentumTag: PlayoffMomentum['narrativeTag'] | null,
): PlayoffLoreHeroBlock[] {
  const firstPerformer = packageData.topPerformers[0]
    ? `${packageData.topPerformers[0].label} // ${packageData.topPerformers[0].statLine}`
    : packageData.headline;
  const swingMoment = packageData.turningPoints[0]
    ? `${packageData.turningPoints[0].label} // ${packageData.turningPoints[0].detail}`
    : packageData.autopsy.leverage;
  const arcLine = packageData.namedGame?.reason
    ?? packageData.autopsy.nextFocus[0]
    ?? packageData.stakes[0]?.detail
    ?? packageData.activeEffectSummaries[0]
    ?? (momentumTag ? `${titleCase(momentumTag)} script stayed active.` : packageData.autopsy.diagnosis);

  return [
    { label: 'Spotlight', value: firstPerformer },
    { label: 'Swing', value: swingMoment },
    { label: 'Arc', value: arcLine },
  ];
}

function compareCardsNewestFirst(left: PlayoffLoreCard, right: PlayoffLoreCard): number {
  return right.seasonYear - left.seasonYear
    || right.week - left.week
    || left.gameId.localeCompare(right.gameId);
}

export function mergePlayoffLoreCards(
  existing: PlayoffLoreCard[],
  incoming: PlayoffLoreCard | PlayoffLoreCard[],
): PlayoffLoreCard[] {
  const staged = Array.isArray(incoming) ? incoming : [incoming];
  const merged = new Map<string, PlayoffLoreCard>();

  for (const card of existing) {
    merged.set(card.gameId, card);
  }
  for (const card of staged) {
    if (merged.has(card.gameId)) continue;
    merged.set(card.gameId, card);
  }

  return [...merged.values()].sort(compareCardsNewestFirst);
}

export function buildPlayoffLoreCard({
  packageData,
  result,
  userTeamId,
  momentumTag,
}: BuildPlayoffLoreCardArgs): PlayoffLoreCard | null {
  if (!packageData || !result || !userTeamId) return null;
  if (packageData.phase !== 'playoffs') return null;
  if (packageData.teamId !== userTeamId) return null;
  if (result.homeTeamId !== userTeamId && result.awayTeamId !== userTeamId) return null;

  const round = roundFromWeek(packageData.week);
  if (!round) return null;

  const outcome = outcomeFromPackage(packageData, result, userTeamId);
  if (!outcome) return null;

  const opponentTeamId = packageData.opponentTeamId
    ?? (result.homeTeamId === userTeamId ? result.awayTeamId : result.homeTeamId);
  if (!opponentTeamId) return null;

  return {
    gameId: result.id,
    seasonYear: result.year,
    week: result.week,
    round,
    outcome,
    headline: packageData.headline,
    finalScore: packageData.finalScore || fallbackScore(result, userTeamId),
    opponentTeamId,
    loreHook: packageData.namedGame?.reason
      ?? result.namedGame?.reason
      ?? packageData.autopsy.leverage
      ?? packageData.autopsy.diagnosis
      ?? packageData.stakes[0]?.detail
      ?? packageData.headline,
    heroBlocks: buildHeroBlocks(packageData, momentumTag),
    tags: buildTags(packageData, result, momentumTag),
    namedGameName: packageData.namedGame?.name ?? result.namedGame?.name,
  };
}
