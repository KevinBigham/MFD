/**
 * Store → `TodayInput`. The only impure edge of the Today stack.
 *
 * Everything it does is compose selectors that already exist. No new game rule
 * lives here: the record comes from the team, the opponent comes from the
 * current matchup, the tasks come from the ledger, and the recommendations come
 * from the engine's own AGM system.
 */

import { getAGMWeeklyRecommendations } from '@mfd/engine';
import {
  selectCurrentMatchup,
  selectPhase,
  selectUserTeam,
  selectWeek,
  selectYear,
  type GameStoreState,
} from '../../app/store/selectors';
import { agmTask, buildTaskLedger } from '../tasks/task-ledger';
import { selectTaskLedgerInput } from '../tasks/task-ledger-input';
import { phaseHasGames } from './phase-vocabulary';
import type { TodayInput, TodayOpponentInput, TodayTeam } from './today-presenter';

/** The AGM's own weekly limit, matching what the legacy board asks for. */
const AGM_LIMIT = 3;

function teamView(team: { city?: string; name: string; wins: number; losses: number; ties: number } | null): TodayTeam | null {
  if (!team) return null;
  return {
    name: team.city ? `${team.city} ${team.name}` : team.name,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
  };
}

/**
 * Reads `state.game` only, so a component can subscribe to the game alone and
 * derive this — which is what keeps `/today` from re-rendering on every
 * unrelated store notification.
 */
export type TodaySource = Pick<GameStoreState, 'game'>;

export function selectTodayInput(source: TodaySource): TodayInput {
  const state = source as GameStoreState;
  const game = state.game;
  const team = selectUserTeam(state);

  if (!game || !team) {
    return {
      season: selectYear(state),
      week: selectWeek(state),
      phase: selectPhase(state),
      team: null,
      opponent: null,
      tasks: [],
      recommendations: [],
    };
  }

  // Gated on the phase, not just on the lookup: the schedule still holds last
  // season's weeks during the offseason, so an ungated lookup names an
  // opponent for a game nobody is about to play.
  const matchup = phaseHasGames(game.phase) ? selectCurrentMatchup(state) : null;
  let opponent: TodayOpponentInput | null = null;
  if (matchup) {
    const isHome = matchup.homeTeamId === team.id;
    const other = game.teams[isHome ? matchup.awayTeamId : matchup.homeTeamId];
    const view = teamView(other ?? null);
    if (view) opponent = { ...view, isHome };
  }

  return {
    season: game.year,
    week: game.week,
    phase: game.phase,
    team: teamView(team),
    opponent,
    tasks: buildTaskLedger(selectTaskLedgerInput(state)),
    recommendations: getAGMWeeklyRecommendations(game, AGM_LIMIT).map(agmTask),
  };
}
