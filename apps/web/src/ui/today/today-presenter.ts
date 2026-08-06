/**
 * The Today view model.
 *
 * Pure and JSX-free on purpose. The audit's Today acceptance criteria are
 * numeric — first viewport contents, ≤2.5 phone viewports, one primary action —
 * and none of them can be tested against a component in this monorepo, which
 * has no jsdom. Putting every decision about *what appears and in what order*
 * in a function that returns data makes the whole contract assertable.
 *
 * It answers one question in one place: given the week, the opponent, and the
 * merged task ledger, what does the manager do next?
 */

import {
  ALL_CLEAR_KEYS,
  OPTIONAL_TASKS,
  mergeTaskLedger,
  type MergedTask,
  type UiTask,
} from '../tasks/task-ledger';
import { phaseHasGames, phaseVocabulary } from './phase-vocabulary';

export interface TodayTeam {
  name: string;
  wins: number;
  losses: number;
  ties: number;
}

export interface TodayOpponentInput extends TodayTeam {
  isHome: boolean;
}

export interface TodayInput {
  season: number;
  week: number;
  phase: string;
  team: TodayTeam | null;
  opponent: TodayOpponentInput | null;
  /** State-derived tasks, from `buildTaskLedger`. */
  tasks: readonly UiTask[];
  /** AGM advice, already mapped through `agmTask`. */
  recommendations: readonly UiTask[];
}

export interface TodayContext {
  /** "Regular Season" — the phase, in the new shell's voice. */
  phase: string;
  /** "Week 14", or the phase name again when the phase has no meaningful week. */
  week: string;
  season: string;
  /** "Lakeview Ridgebacks · 9–4", or just the team when it has no record yet. */
  team: string;
  /** What this phase is for. The one line of orientation above the tasks. */
  purpose: string;
}

export interface TodayOpponent {
  /** "vs Harbor Cutters", "at Harbor Cutters", or the reason there is no game. */
  headline: string;
  detail: string;
}

export type ReadinessState = 'blocked' | 'attention' | 'ready';

export interface TodayReadiness {
  state: ReadinessState;
  /** "2 blockers", "Ready to advance". */
  headline: string;
  /** Why, in one sentence. Never a bare count repeated. Belongs in content. */
  detail: string;
  /** One line for the sticky dock, which has 152px of budget to share. */
  summary: string;
  action: { label: string; route: string };
}

export interface TodaySection {
  tasks: readonly MergedTask[];
  /** Tasks past `visible` that a disclosure reveals. Never dropped. */
  hidden: readonly MergedTask[];
}

export interface TodayViewModel {
  context: TodayContext;
  opponent: TodayOpponent;
  /** The single task the screen leads with. Null only when nothing is pending. */
  primary: MergedTask | null;
  mustDo: TodaySection;
  recommended: TodaySection;
  optional: TodaySection;
  readiness: TodayReadiness;
  /**
   * Every row the three lanes render, in lane order.
   *
   * Navigation badges are counted from this rather than from the ledger the
   * presenter was handed, so a badge cannot count a job the screen does not
   * hold. The two synthetic all-clear rows are already gone, which is what
   * stops "Ready to advance" from also reading as one open job in the Today
   * tab.
   *
   * "Hold", not "show". The recommended lane renders three rows and puts the
   * rest behind a disclosure, so a hub with nine recommended jobs badges 9
   * while three are in view. That is the intended reading — the badge counts
   * open work, and a summary the player has not opened has closed none of it —
   * but it is not the same claim as "the rows on screen", and the difference is
   * worth naming rather than discovering.
   */
  ledger: readonly MergedTask[];
}

/**
 * How many rows each lane shows before it needs a "show the rest" control.
 *
 * These are the LAY-04 budget expressed as counts. The WP-00 baseline measured
 * the legacy Briefing at 14.15 phone viewports; the ceiling here is 2.5, and a
 * 56 px task row plus its reason costs roughly a tenth of a 844 px viewport, so
 * the lanes have to be bounded by construction rather than by hoping.
 *
 * Must Do is unbounded on purpose. A blocker the screen hides behind a
 * disclosure is a blocker the player will not resolve.
 */
export const RECOMMENDED_VISIBLE = 3;
export const OPTIONAL_VISIBLE = 0;

function record(team: TodayTeam): string {
  const base = `${team.wins}–${team.losses}`;
  return team.ties > 0 ? `${base}–${team.ties}` : base;
}

function hasPlayedGames(team: TodayTeam): boolean {
  return team.wins + team.losses + team.ties > 0;
}

function buildContext(input: TodayInput): TodayContext {
  const vocabulary = phaseVocabulary(input.phase);
  const team = input.team;
  return {
    phase: vocabulary.title,
    week: phaseHasGames(input.phase) ? `Week ${input.week}` : vocabulary.title,
    season: String(input.season),
    team: team ? (hasPlayedGames(team) ? `${team.name} · ${record(team)}` : team.name) : 'No team selected',
    purpose: vocabulary.tip,
  };
}

/**
 * The opponent block explains itself when there is no game, rather than
 * disappearing. A missing region reads as a bug; a sentence reads as an answer.
 */
function buildOpponent(input: TodayInput): TodayOpponent {
  const opponent = input.opponent;
  if (!opponent) {
    const vocabulary = phaseVocabulary(input.phase);
    return {
      headline: phaseHasGames(input.phase) ? 'No game scheduled this week' : `No game during ${vocabulary.title}`,
      detail: vocabulary.tip || 'The weekly matchup returns when the schedule resumes.',
    };
  }
  return {
    headline: `${opponent.isHome ? 'vs' : 'at'} ${opponent.name}`,
    detail: hasPlayedGames(opponent)
      ? `${record(opponent)} · ${opponent.isHome ? 'home' : 'away'}`
      : `${opponent.isHome ? 'Home' : 'Away'} · no record yet`,
  };
}

function split(tasks: readonly MergedTask[], visible: number): TodaySection {
  return { tasks: tasks.slice(0, visible), hidden: tasks.slice(visible) };
}

const ADVANCE_ROUTE = '/week-advance';

function buildReadiness(mustDo: readonly MergedTask[], recommended: readonly MergedTask[]): TodayReadiness {
  const blockers = mustDo.filter((task) => task.blocksAdvance);

  if (blockers.length > 0) {
    const first = blockers[0]!;
    return {
      state: 'blocked',
      headline: `${blockers.length} blocker${blockers.length > 1 ? 's' : ''}`,
      detail: first.consequence,
      /* The dock's own verb, not a sentence. The measured cost of putting the
       * full consequence on the dock was a 193px control cluster at 320px —
       * against a 152px budget for all fixed chrome. The consequence is one
       * scroll position away, in the readiness line. */
      action: { label: first.destination.actionLabel, route: first.destination.route },
      /* One line, and it names the blocker rather than counting it. */
      summary: `${blockers.length} blocker${blockers.length > 1 ? 's' : ''}: ${first.title}`,
    };
  }

  if (recommended.length > 0) {
    return {
      state: 'attention',
      headline: 'Ready to advance',
      detail: `Advance Week is available. ${recommended.length} recommended ${recommended.length > 1 ? 'moves are' : 'move is'} still open.`,
      summary: `${recommended.length} recommended ${recommended.length > 1 ? 'moves' : 'move'} still open`,
      action: { label: 'Advance Week', route: ADVANCE_ROUTE },
    };
  }

  return {
    state: 'ready',
    headline: 'Ready to advance',
    detail: 'Nothing is waiting on you. Advance Week when you are ready.',
    summary: 'Nothing is waiting on you.',
    action: { label: 'Advance Week', route: ADVANCE_ROUTE },
  };
}

/**
 * The primary task is the one the readiness dock's button resolves.
 *
 * It is a blocker if there is one, then the loudest recommendation, and
 * otherwise nothing — a screen that manufactures a "next action" when the week
 * is genuinely clear teaches the player to ignore it.
 */
function choosePrimary(mustDo: readonly MergedTask[], recommended: readonly MergedTask[]): MergedTask | null {
  return mustDo.find((task) => task.blocksAdvance) ?? recommended[0] ?? null;
}

export function presentToday(input: TodayInput): TodayViewModel {
  const merged = mergeTaskLedger([...input.tasks, ...input.recommendations, ...OPTIONAL_TASKS]);

  /**
   * The two synthetic all-clear rows, identified by key rather than by route.
   *
   * Keying this off `destination.route === '/week-advance'` deleted any task
   * that happened to point there — and `agmTask` sends a recommendation with
   * no `targetRoute` exactly there. An urgent AGM recommendation without a
   * route vanished from all three lanes *and* from every `merged` payload,
   * while readiness reported "Nothing is waiting on you." All six of today's
   * engine recommendations set a route, so it was latent; `targetRoute` is
   * optional in the engine type, so it would not have stayed that way.
   */
  const isAllClear = (task: MergedTask): boolean => ALL_CLEAR_KEYS.has(task.dedupeKey);

  const mustDo = merged.filter((task) => task.category === 'must' && !isAllClear(task));
  const recommended = merged.filter((task) => task.category === 'recommended' && !isAllClear(task));
  const optional = merged.filter((task) => task.category === 'optional');

  return {
    context: buildContext(input),
    opponent: buildOpponent(input),
    primary: choosePrimary(mustDo, recommended),
    mustDo: { tasks: mustDo, hidden: [] },
    recommended: split(recommended, RECOMMENDED_VISIBLE),
    optional: split(optional, OPTIONAL_VISIBLE),
    readiness: buildReadiness(mustDo, recommended),
    ledger: [...mustDo, ...recommended, ...optional],
  };
}
