import type { ChipRoutePose } from '../route-coaching/routeBeatRegistry';
import { getSelectedAGM } from '@mfd/engine';
import { fnv1a } from './hash';
import { CHIP_SIGN_OFFS } from './sidelineFlavor';

export interface WhereAmIState {
  week: number;
  seasonWeeks: number;
  wins: number;
  losses: number;
  divisionRank: number;
  pendingTotal: number;
  /** B10: dynasty year number (1-based), derived from saved franchise history. */
  dynastyYear?: number;
  opponentName?: string;
  streak?: string;
  injuryCount?: number;
  capTight?: boolean;
  /** G5: one-line AGM callback ("AGM Marcus Webb (analytical) holds the cap
   * desk."), derived from the saved front-office hire. */
  agmReference?: string;
}

export interface WhereAmIBeat {
  id: 'chip.dock.summary';
  pose: ChipRoutePose;
  text: string;
}

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord | null {
  return value && typeof value === 'object' ? value as LooseRecord : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function seasonWeeks(game: LooseRecord | null): number {
  const schedule = Array.isArray(game?.schedule) ? game.schedule : null;
  return schedule && schedule.length > 0 ? schedule.length : 18;
}

function userTeamFromGame(game: LooseRecord | null): LooseRecord | null {
  const teams = asRecord(game?.teams);
  if (!teams) return null;
  return Object.values(teams).map(asRecord).find((team) => team?.isUser === true) ?? null;
}

function divisionRank(game: LooseRecord | null, userTeam: LooseRecord | null): number {
  const teams = asRecord(game?.teams);
  if (!teams || !userTeam) return 1;
  const conference = userTeam.conference;
  const division = userTeam.division;
  const userTeamId = userTeam.id;

  const divisionTeams = Object.values(teams)
    .map(asRecord)
    .filter((team): team is LooseRecord =>
      team !== null
      && team.conference === conference
      && team.division === division,
    )
    .sort((a, b) =>
      numberValue(b.wins, 0) - numberValue(a.wins, 0)
      || numberValue(a.losses, 0) - numberValue(b.losses, 0)
      || String(a.id ?? '').localeCompare(String(b.id ?? '')),
    );

  const rank = divisionTeams.findIndex((team) => team.id === userTeamId);
  return rank >= 0 ? rank + 1 : 1;
}

function teamDisplayName(team: LooseRecord | null): string | null {
  if (!team) return null;
  const city = stringValue(team.city);
  const name = stringValue(team.name);
  const combined = [city, name].filter(Boolean).join(' ').trim();
  return combined.length > 0 ? combined : null;
}

function nextOpponentName(game: LooseRecord | null, userTeam: LooseRecord | null): string | undefined {
  const teams = asRecord(game?.teams);
  const userTeamId = stringValue(userTeam?.id);
  const currentWeek = numberValue(game?.week, 0);
  if (!teams || !userTeamId || currentWeek <= 0) return undefined;

  const weekEntry = asArray(game?.schedule)
    .map(asRecord)
    .find((entry) => numberValue(entry?.week, -1) === currentWeek);
  const matchup = asArray(weekEntry?.games)
    .map(asRecord)
    .find((match) => match?.homeTeamId === userTeamId || match?.awayTeamId === userTeamId);
  if (!matchup) return undefined;

  const opponentId = matchup.homeTeamId === userTeamId
    ? stringValue(matchup.awayTeamId)
    : stringValue(matchup.homeTeamId);
  if (!opponentId) return undefined;
  return teamDisplayName(asRecord(teams[opponentId])) ?? undefined;
}

const MAX_WHERE_AM_I_TEXT_LENGTH = 240;
const CAP_TIGHT_THRESHOLD_MILLIONS = 5;

function userInjuryCount(game: LooseRecord | null, userTeam: LooseRecord | null): number | undefined {
  const userTeamId = stringValue(userTeam?.id);
  const rawPlayers = game?.players;
  const players = Array.isArray(rawPlayers)
    ? rawPlayers
    : Object.values(asRecord(rawPlayers) ?? {});
  if (!userTeamId || players.length === 0) return undefined;
  return players
    .map(asRecord)
    .filter((player) => player !== null && player.teamId === userTeamId && Boolean(player.injury))
    .length;
}

function capTight(userTeam: LooseRecord | null): boolean | undefined {
  const capSpace = userTeam?.capSpace;
  if (typeof capSpace !== 'number' || !Number.isFinite(capSpace)) return undefined;
  return capSpace < CAP_TIGHT_THRESHOLD_MILLIONS;
}

function recentStreak(game: LooseRecord | null): string | undefined {
  const summaries = asArray(game?.weekSummaries).map(asRecord);
  let streakResult: string | null = null;
  let count = 0;
  for (let index = summaries.length - 1; index >= 0; index -= 1) {
    const result = summaries[index]?.result;
    if (result !== 'win' && result !== 'loss') break;
    if (streakResult === null) {
      streakResult = result;
      count = 1;
      continue;
    }
    if (result !== streakResult) break;
    count += 1;
  }
  if (!streakResult || count <= 0) return undefined;
  return `${streakResult === 'win' ? 'W' : 'L'}${count}`;
}

/**
 * B10: 1-based dynasty year, anchored on the user's earliest saved franchise
 * history entry. Year 1 when no history exists yet; undefined when the game
 * year itself is unknown so no callback line is invented.
 */
function dynastyYearNumber(game: LooseRecord | null, userTeam: LooseRecord | null): number | undefined {
  const currentYear = numberValue(game?.year, 0);
  if (currentYear <= 0) return undefined;
  const userTeamId = stringValue(userTeam?.id);
  const historyYears = asArray(game?.franchiseHistory)
    .map(asRecord)
    .filter((entry) => entry !== null && (!userTeamId || entry.teamId === userTeamId))
    .map((entry) => numberValue(entry?.year, 0))
    .filter((year) => year > 0);
  if (historyYears.length === 0) return 1;
  return Math.max(1, currentYear - Math.min(...historyYears) + 1);
}

function poseForState(state: WhereAmIState): ChipRoutePose {
  if (state.streak?.startsWith('W') && Number(state.streak.slice(1)) >= 2) return 'proud';
  if (state.streak?.startsWith('L') && Number(state.streak.slice(1)) >= 2) return 'skeptical';
  return 'thinking';
}

const AGM_PERSONALITY_LABELS: Record<string, string> = {
  analytical: 'analytical',
  fiery: 'fiery',
  old_school: 'old-school',
  player_whisperer: 'player-whisperer',
};

const AGM_EXPERTISE_LABELS: Record<string, string> = {
  offense: 'offense',
  defense: 'defense',
  personnel: 'personnel',
  cap_management: 'cap',
};

/**
 * G5: the AGM you hired at setup, referenced long after. The hire persists on
 * the save (`frontOffice.agmProfileId`); the profile lookup is engine-owned
 * static content, so this is a pure read with loose-state guards.
 */
function agmReferenceLine(game: LooseRecord | null): string | undefined {
  const profileId = stringValue(asRecord(game?.frontOffice)?.agmProfileId);
  if (!profileId) return undefined;
  const profile = getSelectedAGM(profileId);
  if (!profile) return undefined;
  const personality = AGM_PERSONALITY_LABELS[profile.personality] ?? profile.personality;
  const expertise = AGM_EXPERTISE_LABELS[profile.expertise] ?? profile.expertise;
  return `AGM ${profile.name} (${personality}) holds the ${expertise} desk.`;
}

export function resolveWhereAmIState(state: unknown, pendingTotal: number): WhereAmIState {
  const root = asRecord(state);
  const game = asRecord(root?.game);
  const userTeam = userTeamFromGame(game);

  return {
    week: numberValue(game?.week, 0),
    seasonWeeks: seasonWeeks(game),
    wins: numberValue(userTeam?.wins, 0),
    losses: numberValue(userTeam?.losses, 0),
    divisionRank: divisionRank(game, userTeam),
    pendingTotal: Math.max(0, Math.trunc(numberValue(pendingTotal, 0))),
    dynastyYear: dynastyYearNumber(game, userTeam),
    opponentName: nextOpponentName(game, userTeam),
    streak: recentStreak(game),
    injuryCount: userInjuryCount(game, userTeam),
    capTight: capTight(userTeam),
    agmReference: agmReferenceLine(game),
  };
}

function appendExtrasWithinBudget(text: string, extras: string[]): string {
  return extras.reduce(
    (current, extra) => (current.length + extra.length <= MAX_WHERE_AM_I_TEXT_LENGTH ? current + extra : current),
    text,
  );
}

function seasonArcPhrase(state: WhereAmIState): string {
  if (state.seasonWeeks <= 0 || state.week <= 0) return '';
  const ratio = state.week / state.seasonWeeks;
  if (ratio <= 0.25) return ' Early days.';
  if (ratio >= 0.78) return ' Stretch run.';
  if (ratio >= 0.4 && ratio <= 0.6) return ' Midway point.';
  return '';
}

/** Deterministic weekly sign-off rotation so Ask Chip does not read identical week to week. */
function whereAmISignOff(state: WhereAmIState): string {
  const index = fnv1a(`chip.whereami.signoff|${state.seasonWeeks}|${state.week}`) % CHIP_SIGN_OFFS.length;
  return ` ${CHIP_SIGN_OFFS[index]!}`;
}

function createEnrichedWhereAmIBeat(state: WhereAmIState): WhereAmIBeat {
  const form = state.streak ? ` (${state.streak})` : '';
  const next = state.opponentName ? ` Next: ${state.opponentName}.` : '';
  const pendingSentence = state.pendingTotal > 0
    ? ` Must Do: choose or defer ${state.pendingTotal} decision${state.pendingTotal === 1 ? '' : 's'} before Advance Week in Inbox, Action Center, or screen badges; they expire or lock.`
    : ' Must Do: none right now. Recommended: open Monday Briefing; Advance Week locks saved lineups, cap, morale, and matchup calls.';
  const extras = [
    // B10: year-over-year callback leads the extras so the budget keeps it.
    typeof state.dynastyYear === 'number' && state.dynastyYear >= 2 ? ` Year ${state.dynastyYear} of the climb.` : '',
    // G5: the AGM hire you made at setup, remembered.
    state.agmReference ? ` ${state.agmReference}` : '',
    seasonArcPhrase(state),
    typeof state.injuryCount === 'number' && state.injuryCount > 0 ? ` Injuries: ${state.injuryCount} (Roster).` : '',
    state.capTight ? ' Cap tight.' : '',
    whereAmISignOff(state),
  ].filter((extra) => extra.length > 0);
  return {
    id: 'chip.dock.summary',
    pose: poseForState(state),
    text: appendExtrasWithinBudget(
      `Week ${state.week}/${state.seasonWeeks}, ${state.wins}-${state.losses}${form}, Division ${state.divisionRank}.${next}${pendingSentence}`,
      extras,
    ),
  };
}

export function createWhereAmIBeat(state: WhereAmIState): WhereAmIBeat {
  if (state.opponentName || state.streak || (state.injuryCount ?? 0) > 0 || state.capTight || state.agmReference) {
    return createEnrichedWhereAmIBeat(state);
  }
  const pendingSentence = state.pendingTotal > 0
    ? ` Must Do: choose or defer ${state.pendingTotal} decision${state.pendingTotal === 1 ? '' : 's'} before Advance Week. Where: Inbox, Action Center, or highlighted screen badges. Consequence: offers, promises, votes, cap, lineup, and morale expire or lock at Advance Week.`
    : ' Must Do: none right now. Recommended: open Monday Briefing. Where: Action Center, then any legal team screen: roster, depth, cap, market, staff, scouting, medical, or Game Plan. Consequence: Advance Week locks saved lineups, cap, morale, and matchup calls.';
  return {
    id: 'chip.dock.summary',
    pose: 'thinking',
    text: `Week ${state.week}/${state.seasonWeeks}, ${state.wins}-${state.losses}, Division ${state.divisionRank}.${pendingSentence}`,
  };
}
