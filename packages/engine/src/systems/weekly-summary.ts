import type {
  GameResult,
  SeasonPhase,
  Team,
  WeeklyInjurySummary,
  WeeklySummary,
} from '../types';

interface SummaryParams {
  team: Team;
  opponent: Team | null;
  result: GameResult | null;
  year: number;
  week: number;
  phase: SeasonPhase;
  ownerDelta: number;
  injuries: WeeklyInjurySummary[];
  notes: string[];
  label?: string;
}

export function buildWeeklySummary(params: SummaryParams): WeeklySummary {
  const {
    team, opponent, result, year, week, phase, ownerDelta, injuries, notes, label,
  } = params;
  const isHome = result ? result.homeTeamId === team.id : false;
  const teamScore = result ? (isHome ? result.homeScore : result.awayScore) : null;
  const opponentScore = result ? (isHome ? result.awayScore : result.homeScore) : null;
  const outcome = teamScore === null || opponentScore === null
    ? 'pending'
    : teamScore > opponentScore
      ? 'win'
      : teamScore < opponentScore
        ? 'loss'
        : 'tie';
  const opponentName = opponent ? `${opponent.city} ${opponent.name}` : 'Bye Week';
  const record = `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}`;
  const prefix = label ?? (phase === 'playoffs' ? 'Playoff Result' : `Week ${week}`);
  const headline = result
    ? `${prefix}: ${team.city} ${team.name} ${outcome === 'win' ? 'beat' : outcome === 'loss' ? 'fell to' : 'drew'} ${opponentName} ${teamScore}-${opponentScore}`
    : `${prefix}: ${team.city} ${team.name} await ${opponentName}`;

  return {
    id: `summary-${year}-${week}-${team.id}`,
    year,
    week,
    phase,
    teamId: team.id,
    opponentTeamId: opponent?.id ?? null,
    opponentName,
    result: outcome,
    teamScore,
    opponentScore,
    record,
    headline,
    ownerDelta,
    injuries,
    mvpPlayerId: result?.mvpPlayerId ?? null,
    notes,
  };
}
