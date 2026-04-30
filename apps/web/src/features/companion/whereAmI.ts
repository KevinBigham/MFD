import type { ChipRoutePose } from '../route-coaching/routeBeatRegistry';

export interface WhereAmIState {
  week: number;
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
    wins: numberValue(userTeam?.wins, 0),
    losses: numberValue(userTeam?.losses, 0),
    divisionRank: divisionRank(game, userTeam),
    pendingTotal: Math.max(0, Math.trunc(numberValue(pendingTotal, 0))),
  };
}

export function createWhereAmIBeat(state: WhereAmIState): WhereAmIBeat {
  const pendingSuffix = state.pendingTotal > 0 ? ` — ${state.pendingTotal} decisions waiting` : '';
  return {
    id: 'chip.dock.summary',
    pose: 'thinking',
    text: `Week ${state.week} / 17 — Record ${state.wins}-${state.losses} — Division ${state.divisionRank}${pendingSuffix}`,
  };
}
