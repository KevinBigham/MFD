import type { ChipRoutePose } from '../route-coaching/routeBeatRegistry';

export interface WhereAmIState {
  week: number;
  seasonWeeks: number;
  wins: number;
  losses: number;
  divisionRank: number;
  pendingTotal: number;
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

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
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
  };
}

export function createWhereAmIBeat(state: WhereAmIState): WhereAmIBeat {
  const pendingSentence = state.pendingTotal > 0
    ? ` Must Do: choose or defer ${state.pendingTotal} decision${state.pendingTotal === 1 ? '' : 's'} before Advance Week. Where: Inbox, Action Center, or highlighted screen badges. Consequence: offers, promises, votes, cap, lineup, and morale expire or lock at Advance Week.`
    : ' Must Do: none right now. Recommended: open Monday Briefing. Where: Action Center, then any legal team screen: roster, depth, cap, market, staff, scouting, medical, or Game Plan. Consequence: Advance Week locks saved lineups, cap, morale, and matchup calls.';
  return {
    id: 'chip.dock.summary',
    pose: 'thinking',
    text: `Week ${state.week}/${state.seasonWeeks}, ${state.wins}-${state.losses}, Division ${state.divisionRank}.${pendingSentence}`,
  };
}
