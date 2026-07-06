import type { NewsItem, WeeklySummary } from '@mfd/engine';

export const SESSION_RECAP_STORAGE_KEY = 'mfd.sessionRecap.lastSeen.v1';
export const SESSION_RECAP_STALE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RECAP_BEATS = 3;
const RECENT_WEEK_WINDOW = 4;

export type RecapBeatKind = 'LEFT_OFF' | 'JUST_HAPPENED' | 'THIS_WEEK';

export interface RecapBeat {
  id: string;
  kind: RecapBeatKind;
  label: string;
  text: string;
  sourceRefs: string[];
}

export interface SessionRecap {
  beats: RecapBeat[];
  stakesLine: string;
  sourceRefs: string[];
}

export interface SessionRecapOpponent {
  week: number;
  opponentTeamId?: string | null;
  opponentName: string;
  home?: boolean;
  bye?: boolean;
  primetime?: boolean;
}

export interface SessionRecapPendingItem {
  id: string;
  label: string;
  detail?: string | null;
  sourceRef: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface SessionRecapInput {
  year: number;
  week: number;
  phase: string;
  teamName?: string | null;
  teamRecord?: string | null;
  weekSummaries?: readonly WeeklySummary[];
  leagueNews?: readonly NewsItem[];
  standingsPosition?: string | null;
  nextOpponent?: SessionRecapOpponent | null;
  pendingItems?: readonly SessionRecapPendingItem[];
}

export interface SessionRecapLastSeen {
  dynastyId: string;
  timestamp: number;
}

export interface SessionRecapVisibilityOptions {
  dynastyId: string;
  storage?: Storage | null;
  nowMs?: number;
  staleDays?: number;
}

const shownThisSession = new Set<string>();

function resolveStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

export function sessionRecapStorageKey(dynastyId: string): string {
  return `${SESSION_RECAP_STORAGE_KEY}:${dynastyId}`;
}

function parseLastSeen(raw: string | null, dynastyId: string): SessionRecapLastSeen | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionRecapLastSeen>;
    if (parsed.dynastyId !== dynastyId) return null;
    if (typeof parsed.timestamp !== 'number' || !Number.isFinite(parsed.timestamp)) return null;
    return { dynastyId, timestamp: parsed.timestamp };
  } catch {
    return null;
  }
}

export function readSessionRecapLastSeen(
  dynastyId: string,
  storage: Storage | null = resolveStorage(),
): SessionRecapLastSeen | null {
  if (!storage || !dynastyId) return null;
  return parseLastSeen(storage.getItem(sessionRecapStorageKey(dynastyId)), dynastyId);
}

export function clearSessionRecapSessionMemory(): void {
  shownThisSession.clear();
}

export function dismissSessionRecapForSession(dynastyId: string): void {
  if (dynastyId) shownThisSession.add(dynastyId);
}

export function shouldShowSessionRecap({
  dynastyId,
  storage = resolveStorage(),
  nowMs = Date.now(),
  staleDays = SESSION_RECAP_STALE_DAYS,
}: SessionRecapVisibilityOptions): boolean {
  if (!dynastyId) return false;
  if (shownThisSession.has(dynastyId)) return false;

  const lastSeen = readSessionRecapLastSeen(dynastyId, storage);
  if (!lastSeen) return true;

  const staleMs = Math.max(0, staleDays) * DAY_MS;
  return nowMs - lastSeen.timestamp >= staleMs;
}

export function markSessionRecapDisplayed(
  dynastyId: string,
  storage: Storage | null = resolveStorage(),
  nowMs = Date.now(),
): SessionRecapLastSeen | null {
  if (!dynastyId) return null;
  shownThisSession.add(dynastyId);
  const payload: SessionRecapLastSeen = { dynastyId, timestamp: nowMs };
  storage?.setItem(sessionRecapStorageKey(dynastyId), JSON.stringify(payload));
  return payload;
}

function clip(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function resultPhrase(summary: WeeklySummary): string {
  if (summary.result === 'tie') return 'tie';
  if (summary.result === 'pending') return 'pending result';

  const margin = (summary.teamScore ?? 0) - (summary.opponentScore ?? 0);
  if (summary.result === 'win') return margin >= 14 ? 'strong win' : 'win';
  return margin <= -14 ? 'heavy loss' : 'loss';
}

function completedSummaries(input: SessionRecapInput): WeeklySummary[] {
  return [...(input.weekSummaries ?? [])]
    .filter((summary) => summary.result !== 'pending')
    .sort((left, right) =>
      right.year - left.year
      || right.week - left.week
      || right.id.localeCompare(left.id),
    )
    .slice(0, RECENT_WEEK_WINDOW);
}

function streakText(summariesNewestFirst: readonly WeeklySummary[]): string {
  const latest = summariesNewestFirst[0];
  if (!latest || latest.result === 'pending' || latest.result === 'tie') return '';

  let streak = 0;
  for (const summary of summariesNewestFirst) {
    if (summary.result !== latest.result) break;
    streak += 1;
  }
  if (streak < 2) return '';
  return ` ${streak}-game ${latest.result === 'win' ? 'win' : 'loss'} streak.`;
}

function leftOffBeat(input: SessionRecapInput, summariesNewestFirst: readonly WeeklySummary[]): RecapBeat | null {
  const latest = summariesNewestFirst[0];
  if (!latest) return null;

  const record = latest.record || input.teamRecord || 'record pending';
  return {
    id: `session-recap:left-off:${latest.id}`,
    kind: 'LEFT_OFF',
    label: 'Where you left off',
    text: clip(`You left off at ${record} after a ${resultPhrase(latest)}: ${latest.headline}.${streakText(summariesNewestFirst)}`, 180),
    sourceRefs: [`weekSummary:${latest.id}`, `Week ${latest.week} ${latest.year}`],
  };
}

function newsImportanceRank(item: NewsItem): number {
  if (item.importance === 'breaking') return 0;
  if (item.importance === 'major') return 1;
  return 2;
}

function recentNews(input: SessionRecapInput): NewsItem[] {
  const minWeek = Math.max(1, input.week - RECENT_WEEK_WINDOW);
  return [...(input.leagueNews ?? [])]
    .filter((item) => item.year === input.year && item.week <= input.week && item.week >= minWeek)
    .sort((left, right) =>
      newsImportanceRank(left) - newsImportanceRank(right)
      || right.week - left.week
      || left.id.localeCompare(right.id),
    );
}

function justHappenedBeat(input: SessionRecapInput, summariesNewestFirst: readonly WeeklySummary[]): RecapBeat | null {
  const topNews = recentNews(input)[0];
  if (topNews) {
    return {
      id: `session-recap:just-happened:news:${topNews.id}`,
      kind: 'JUST_HAPPENED',
      label: 'What just happened',
      text: clip(`${topNews.headline}: ${topNews.body}`, 180),
      sourceRefs: [`leagueNews:${topNews.id}`, `Week ${topNews.week} ${topNews.year}`],
    };
  }

  const latest = summariesNewestFirst[0];
  const note = latest?.notes.find((entry) => entry.trim().length > 0);
  if (!latest || !note) return null;

  return {
    id: `session-recap:just-happened:summary-note:${latest.id}`,
    kind: 'JUST_HAPPENED',
    label: 'What just happened',
    text: clip(note, 180),
    sourceRefs: [`weekSummary:${latest.id}`, `Week ${latest.week} ${latest.year}`],
  };
}

function phaseLabel(phase: string): string {
  return phase.replaceAll('_', ' ');
}

function pendingItems(input: SessionRecapInput): SessionRecapPendingItem[] {
  const priorityRank = { high: 0, medium: 1, low: 2 } as const;
  return [...(input.pendingItems ?? [])]
    .filter((item) => item.priority !== 'low')
    .sort((left, right) =>
      priorityRank[left.priority ?? 'medium'] - priorityRank[right.priority ?? 'medium']
      || left.id.localeCompare(right.id),
    );
}

function stakesBeat(input: SessionRecapInput): RecapBeat {
  const pending = pendingItems(input)[0];
  if (pending) {
    return {
      id: `session-recap:this-week:pending:${pending.id}`,
      kind: 'THIS_WEEK',
      label: "What's at stake",
      text: clip(`This week starts with ${pending.label}. ${pending.detail ?? 'Open Action Center before Advance Week locks it.'}`, 180),
      sourceRefs: [pending.sourceRef],
    };
  }

  const next = input.nextOpponent;
  if (next && !next.bye && next.opponentName.trim().length > 0) {
    const venue = next.home ? 'home' : 'away';
    const tv = next.primetime ? ' in primetime' : '';
    const standings = input.standingsPosition ? ` ${input.standingsPosition}.` : '';
    return {
      id: `session-recap:this-week:opponent:${input.year}:${next.week}:${next.opponentTeamId ?? next.opponentName}`,
      kind: 'THIS_WEEK',
      label: "What's at stake",
      text: clip(`Week ${next.week}: ${venue} vs ${next.opponentName}${tv}.${standings || ' Open Game Plan before Advance Week locks.'}`, 180),
      sourceRefs: [`schedule:${input.year}:${next.week}:${next.opponentTeamId ?? next.opponentName}`],
    };
  }

  return {
    id: `session-recap:this-week:phase:${input.phase}:${input.year}:${input.week}`,
    kind: 'THIS_WEEK',
    label: "What's at stake",
    text: `The ${phaseLabel(input.phase)} phase is active. Open Action Center before Advance Week locks this checkpoint.`,
    sourceRefs: [`phase:${input.phase}:${input.year}:${input.week}`],
  };
}

function buildStakesLine(input: SessionRecapInput): string {
  const pending = pendingItems(input);
  if (pending.length > 0) {
    return `${pending.length} unresolved priority ${pending.length === 1 ? 'item needs' : 'items need'} a choose-or-defer decision before Advance Week.`;
  }

  const next = input.nextOpponent;
  if (next && !next.bye && next.opponentName.trim().length > 0) {
    return `${next.opponentName} is next${input.standingsPosition ? ` with ${input.standingsPosition}` : ''}.`;
  }

  return `${phaseLabel(input.phase)} is the current checkpoint.`;
}

export function buildSessionRecap(input: SessionRecapInput): SessionRecap | null {
  if (!Number.isInteger(input.year) || !Number.isInteger(input.week)) return null;

  const summaries = completedSummaries(input);
  const beats = [
    leftOffBeat(input, summaries),
    justHappenedBeat(input, summaries),
  ].filter((beat): beat is RecapBeat => Boolean(beat));

  if (beats.length === 0) return null;

  beats.push(stakesBeat(input));
  const cappedBeats = beats.slice(0, MAX_RECAP_BEATS);
  const sourceRefs = [...new Set(cappedBeats.flatMap((beat) => beat.sourceRefs))];

  return {
    beats: cappedBeats,
    stakesLine: buildStakesLine(input),
    sourceRefs,
  };
}
