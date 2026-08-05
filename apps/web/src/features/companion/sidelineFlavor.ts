import { fnv1a } from './hash';
import { WEEKLY_DIALOGUE_VARIANTS, type WeeklyDialogueVariant } from './dialogue/weekly';

export const SIDELINE_NOTE_LABEL = 'Sideline note';
export const MAX_SIDELINE_NOTE_CHARS = 120;

/**
 * Curated Chip flavor pools. Voice rules (guard tests enforce these):
 * - plain coach-speak: warm, direct, football-native
 * - no banned shorthand (vibe, feels, story, momentum, check, review, verify,
 *   confirm, read, compare, worth, use, only-after phrasing)
 * - every line stands alone under MAX_SIDELINE_NOTE_CHARS
 * - index 0 is the canonical line used when no dynasty seed is available
 */
const SIDELINE_NOTE_POOLS: Record<WeeklyDialogueVariant, readonly string[]> = {
  cleanWin: [
    'That win belongs on the tape shelf. Same prep, same patience, same edge next week.',
    'Loved the discipline out there. Keep the routine that earned it.',
    'Scoreboard says strong, tape says earned. Stay greedy about the details.',
    'Wins like this come from boring Mondays. Keep them boring.',
    'The locker room earned a loud night. Tomorrow we protect the next one.',
    'No victory laps past Tuesday. This standard is the plan now.',
  ],
  uglyWin: [
    'A win with homework attached. Circle the drive that almost flipped it.',
    "I'll take the points and the lesson. That margin was one snap thin.",
    'Escaped with it. The tape shows who we owe for that.',
    'Celebrate short, study long. Close wins teach the loudest.',
    'That was a coin-width from a loss. Name the fix while it is fresh.',
    'Bank the win, bill the mistakes. Both are ours.',
  ],
  loss: [
    'Losses sting less when they name something. Let this one name the fix.',
    'One game, not a verdict. Pick the repair and move with purpose.',
    'The film will be honest with us. Be honest back.',
    'Tough Sunday. The answer is one position, one call, not a rebuild.',
    'I have seen seasons turn on weeks like this. It starts with one named fix.',
    'Hold the locker room together first. Blame fixes nothing by kickoff.',
  ],
  blowoutLoss: [
    'That one hurts, and it should. One fix at a time from here.',
    'No speeches after a loss like that. Just the first repair, then the next.',
    'Burn the pride, keep the lesson. Next week still counts full.',
    'Rough day at the office. We answer with preparation, not panic.',
    'Everyone saw the score. We see the fix list. Start at the top.',
    'This is where steady coaches earn the job. Small, honest repairs.',
  ],
  threeLossStreak: [
    'Three straight hurts, and the room knows it. One owned fix starts the climb.',
    'Streaks end with boring discipline, not speeches. Pick one repair.',
    "I still like this roster's spine. Prove it with one corrected mistake.",
    'The standings are loud right now. Our answer is one clean week.',
    'Nobody is coming to save the season. Good. We like it that way.',
    'This is the week a team either splinters or tightens. Tighten.',
  ],
  midseason: [
    'Middle of the grind. The table starts telling the truth from here.',
    'Every week from here writes on the playoff picture. Write carefully.',
    'This is the quiet stretch where smart teams get loud later.',
    'Half the answers we need are already on this roster. Find the rest.',
    'Stay ahead of the injuries and the standings stay friendly.',
    'Good teams treat Week 8 like Week 1. Great ones treat it like Week 17.',
  ],
  preseason: [
    'Camp legs are almost done. Week 1 asks real questions now.',
    'The opener is closer than it looks. Depth charts win August games.',
    'New season smell. Same rule as always: roles before kickoff.',
    'Every starter job settled now is a quiet Sunday later.',
    'Preseason lies kindly. The standings do not.',
    'Fresh year, fresh tape. Set the jobs before the lights come on.',
  ],
  playoffs: [
    'Win and stay. That clarity is a gift, so prepare like it.',
    'January football. The smallest missed assignment ends a season.',
    'The margin for error just left the building. Discipline is the plan.',
    'One week at a time is a cliche because it works.',
    'Everything since camp bought this week. Spend it well.',
    'The other team is good. So are we. Details decide it now.',
  ],
  championship: [
    'A title changes the building forever. Enjoy it, then defend it.',
    'Champions get about a week to smile. The roster clock is already running.',
    'Banner up. Now the league circles us on the calendar.',
    'That parade was earned. The repeat starts with quiet offseason choices.',
    'History is written. The sequel is negotiable.',
    'Soak it in, coach. Then we protect what we built.',
  ],
  darkMoment: [
    'That was the kind of loss that tests a building. Hold it steady.',
    'No hiding from that tape. Face it, fix one thing, breathe.',
    'Rock bottom has good lighting. Every repair is visible from here.',
    'The room needs a steady voice this week. Yours first, then mine.',
    'Bad weeks pass. What we fix in them stays.',
    'This one leaves a mark. Let it mark the turnaround instead.',
  ],
};

/**
 * Stern closers for high-pressure difficulties (hard / all-pro / legend):
 * same facts, less sugar. Budget-guarded like the standard sign-offs.
 */
const STERN_SIGN_OFFS = [
  'No excuses at this level.',
  'The standard does not bend.',
  'Details decide it at this level.',
] as const;

/**
 * Locker-room mood tier (A5). When the derived average morale of the user
 * roster or the owner patience drops to the thresholds below, the seeded
 * suffix names the room instead of the usual sign-off — same deterministic
 * rules, more honest read of the building.
 */
export const LOW_LOCKER_ROOM_MORALE_MAX = 45;
export const LOW_OWNER_PATIENCE_MAX = 30;

const LOW_MORALE_SUFFIXES = [
  'The room is hurting; steady it.',
  'Protect the room first.',
  'Heads are down; lift the room.',
] as const;

const LOW_OWNER_PATIENCE_SUFFIXES = [
  'Upstairs patience is thin.',
  'The owner wants answers.',
  'Patience upstairs runs short.',
] as const;

export interface SidelineNoteInput {
  outcome: WeeklyDialogueVariant;
  currentWeek: number;
  dynastySeed?: number;
  opponentName?: string;
  difficulty?: string;
  seasonArc?: 'early' | 'mid' | 'late';
  averageMorale?: number;
  ownerPatience?: number;
  /**
   * B5: the line Chip served last time (from the memory sidecar). When the
   * deterministic pick lands on this exact line and the pool has alternates,
   * the selection rotates one slot forward instead of repeating across
   * sessions. Deterministic given the input; the unseeded canonical path
   * ignores it byte-for-byte.
   */
  avoidLine?: string;
}

/**
 * Coarse season arc from the week number (18-week regular season): the same
 * outcome reads differently in September vs December because the arc salts
 * the deterministic pool selection.
 */
export function seasonArcForWeek(currentWeek: number): 'early' | 'mid' | 'late' {
  const week = Math.max(0, Math.trunc(currentWeek));
  if (week <= 4) return 'early';
  if (week >= 15) return 'late';
  return 'mid';
}

/**
 * Chip's signature sign-offs, rotated deterministically for seeded dynasties.
 * Appended to a sideline note only when the combined line stays inside
 * MAX_SIDELINE_NOTE_CHARS, so the budget contract never breaks.
 */
export const CHIP_SIGN_OFFS = ['Headsets on.', "That's the tape.", 'We move.'] as const;

/**
 * Rare delight lines. Deterministic 1-in-EASTER_EGG_ONE_IN_N weeks swap the
 * outcome pool for one of these. They are outcome-agnostic on purpose: they
 * replace the situational note, so they must stand alone in any week.
 */
export const EASTER_EGG_ONE_IN_N = 12;
export const SIDELINE_EASTER_EGG_POOL: readonly string[] = [
  'A wise coach once told me the tape never lies. He still owes me twenty bucks.',
  'Fun fact: I have never lost a film session. Undefeated since camp.',
  'Hydrate, coach. Even clipboards need water. That is science, probably.',
  'My pregame ritual is alphabetical. Do not ask about the mascot years.',
];

function isVariant(value: string): value is WeeklyDialogueVariant {
  return WEEKLY_DIALOGUE_VARIANTS.includes(value as WeeklyDialogueVariant);
}

export function sidelineNotePool(outcome: WeeklyDialogueVariant): readonly string[] {
  return SIDELINE_NOTE_POOLS[isVariant(outcome) ? outcome : 'midseason'];
}

/**
 * Deterministic flavor selection. Unseeded callers always receive the canonical
 * first line (keeps existing copy contracts stable); seeded callers rotate
 * through the pool by dynasty seed + week, so the same week always replays the
 * same note and different weeks rotate. Seeded selection adds three rules:
 * - anti-repeat: the served line never repeats two consecutive weeks when the
 *   pool has more than one line (the selection walk shifts by one instead)
 * - sign-off: one of Chip's signature closers appends when the budget allows
 * - easter egg: a deterministic 1-in-N week draws from the delight pool instead
 */
function servedPoolIndex(outcome: WeeklyDialogueVariant, seed: number, week: number, poolLength: number, seasonArc: string): number {
  let served = fnv1a(`chip.sideline|${seasonArc}|${outcome}|${seed}|0`) % poolLength;
  for (let current = 1; current <= week; current += 1) {
    let index = fnv1a(`chip.sideline|${seasonArc}|${outcome}|${seed}|${current}`) % poolLength;
    if (poolLength > 1 && index === served) index = (index + 1) % poolLength;
    served = index;
  }
  return served;
}

function isHighPressureDifficulty(difficulty: string | undefined): boolean {
  const normalized = difficulty?.toLowerCase();
  return normalized === 'hard'
    || normalized === 'allpro'
    || normalized === 'all-pro'
    || normalized === 'legend';
}

/**
 * Seeded suffix selection, in priority order: stern closers on high-pressure
 * difficulty, locker-room mood when morale or owner patience runs low, an
 * opponent callout on a salted coin flip, otherwise a signature sign-off. The
 * chosen suffix is applied only when the combined note stays inside the
 * character budget; otherwise the plain line serves.
 */
function selectNoteSuffix(input: SidelineNoteInput, seed: number, week: number): string {
  if (isHighPressureDifficulty(input.difficulty)) {
    return STERN_SIGN_OFFS[fnv1a(`chip.stern|${seed}|${week}`) % STERN_SIGN_OFFS.length]!;
  }
  const morale = input.averageMorale;
  if (morale !== undefined && Number.isFinite(morale) && morale < LOW_LOCKER_ROOM_MORALE_MAX) {
    return LOW_MORALE_SUFFIXES[fnv1a(`chip.mood.morale|${seed}|${week}`) % LOW_MORALE_SUFFIXES.length]!;
  }
  const patience = input.ownerPatience;
  if (patience !== undefined && Number.isFinite(patience) && patience <= LOW_OWNER_PATIENCE_MAX) {
    return LOW_OWNER_PATIENCE_SUFFIXES[fnv1a(`chip.mood.owner|${seed}|${week}`) % LOW_OWNER_PATIENCE_SUFFIXES.length]!;
  }
  const opponent = input.opponentName?.trim();
  if (opponent && fnv1a(`chip.opponent|${seed}|${week}`) % 2 === 0) {
    return `Eyes on ${opponent}.`;
  }
  return CHIP_SIGN_OFFS[fnv1a(`chip.signoff|${seed}|${week}`) % CHIP_SIGN_OFFS.length]!;
}

export function selectSidelineNote(input: SidelineNoteInput): string {
  const pool = sidelineNotePool(input.outcome);
  if (!Number.isFinite(input.dynastySeed)) return pool[0]!;
  const seed = Math.trunc(Number(input.dynastySeed));
  const week = Math.max(0, Math.trunc(input.currentWeek));
  const seasonArc = input.seasonArc ?? 'any';

  let line: string;
  if (fnv1a(`chip.sideline.egg|${seasonArc}|${seed}|${week}`) % EASTER_EGG_ONE_IN_N === 0) {
    const eggIndex = fnv1a(`chip.sideline.egg.pick|${seasonArc}|${seed}|${week}`) % SIDELINE_EASTER_EGG_POOL.length;
    line = SIDELINE_EASTER_EGG_POOL[eggIndex]!;
  } else {
    const servedIndex = servedPoolIndex(input.outcome, seed, week, pool.length, seasonArc);
    line = pool[servedIndex]!;
    // B5 durable anti-repeat: rotate one slot when memory says this exact
    // line went out last time and the pool has an alternate. Memory stores
    // the served note (pool line plus optional sign-off suffix), so match
    // the raw line or the `<line> <suffix>` recorded form.
    if (
      input.avoidLine
      && pool.length > 1
      && (line === input.avoidLine || input.avoidLine.startsWith(`${line} `))
    ) {
      line = pool[(servedIndex + 1) % pool.length]!;
    }
  }

  const signed = `${line} ${selectNoteSuffix(input, seed, week)}`;
  return signed.length <= MAX_SIDELINE_NOTE_CHARS ? signed : line;
}

export function selectSidelineNoteDetail(input: SidelineNoteInput): string {
  return `${SIDELINE_NOTE_LABEL}: ${selectSidelineNote(input)}`;
}
