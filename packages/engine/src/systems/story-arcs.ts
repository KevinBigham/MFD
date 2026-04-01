import type {
  GameState,
  Player,
  StoryArc,
  Team,
  WeeklySummary,
} from '../types';

export interface StoryArcContext {
  team: Team;
  opponent: Team | null;
  summary: WeeklySummary | null;
}

function findArc(arcs: StoryArc[], template: StoryArc['template']): StoryArc | null {
  return arcs.find((arc) => arc.template === template) ?? null;
}

function createArc(
  game: GameState,
  template: StoryArc['template'],
  team: Team,
  title: string,
  summary: string,
  data: Record<string, unknown>,
  existing: StoryArc | null,
  extras?: Partial<Pick<StoryArc, 'playerId' | 'teamId' | 'expiresAfterWeek'>>,
): StoryArc {
  return {
    id: existing?.id ?? `${template}-${team.id}-${game.year}-${game.week}`,
    template,
    playerId: extras?.playerId ?? existing?.playerId ?? null,
    teamId: extras?.teamId ?? existing?.teamId ?? team.id,
    stage: existing ? existing.stage + 1 : 1,
    title,
    summary,
    startedYear: existing?.startedYear ?? game.year,
    startedWeek: existing?.startedWeek ?? game.week,
    updatedYear: game.year,
    updatedWeek: game.week,
    expiresAfterWeek: extras?.expiresAfterWeek ?? existing?.expiresAfterWeek ?? null,
    data,
  };
}

function getBreakoutCandidate(team: Team, summary: WeeklySummary | null): Player | null {
  const mvp = summary?.mvpPlayerId ? team.roster.find((player) => player.id === summary.mvpPlayerId) ?? null : null;
  if (mvp && mvp.age <= 25 && mvp.pot - mvp.ovr >= 5) return mvp;
  return team.roster
    .filter((player) => player.age <= 25 && player.pot - player.ovr >= 6)
    .sort((a, b) => (b.pot - b.ovr) - (a.pot - a.ovr))[0] ?? null;
}

function nextMeetingWeek(game: GameState, teamId: string, opponentId: string): number | null {
  const found = game.schedule
    .flatMap((week) => week.games.map((gameEntry) => ({ week: week.week, gameEntry })))
    .find((entry) =>
      entry.week > game.week &&
      ((entry.gameEntry.homeTeamId === teamId && entry.gameEntry.awayTeamId === opponentId) ||
        (entry.gameEntry.homeTeamId === opponentId && entry.gameEntry.awayTeamId === teamId)));
  return found?.week ?? null;
}

export function advanceStoryArcs(game: GameState, context: StoryArcContext): StoryArc[] {
  const { team, opponent, summary } = context;
  const existing = game.narrativeState.activeArcs.filter((arc) =>
    arc.expiresAfterWeek === null || arc.expiresAfterWeek >= game.week);
  const next: StoryArc[] = [];
  const injuredStarters = team.roster.filter((player) => player.isStarter && player.injury);

  if (team.streak >= 3) {
    next.push(createArc(
      game,
      'win_streak',
      team,
      'Win streak',
      `${team.streak}-game surge has the room playing faster and with more confidence.`,
      { streak: team.streak },
      findArc(existing, 'win_streak'),
    ));
  }

  if (team.ownerMood < 40 || team.ownerPatience80 < 35) {
    next.push(createArc(
      game,
      'hot_seat',
      team,
      'Hot seat',
      `Owner approval ${team.ownerMood} and patience ${team.ownerPatience80} put every weekly result under a microscope.`,
      { ownerMood: team.ownerMood, ownerPatience80: team.ownerPatience80 },
      findArc(existing, 'hot_seat'),
    ));
  }

  const breakout = getBreakoutCandidate(team, summary);
  if (breakout) {
    next.push(createArc(
      game,
      'breakout_player',
      team,
      `${breakout.name} is heating up`,
      `${breakout.name} is young, still climbing toward ${breakout.pot} potential, and demanding a larger slice of the spotlight.`,
      { playerName: breakout.name, potentialGap: breakout.pot - breakout.ovr },
      findArc(existing, 'breakout_player'),
      { playerId: breakout.id, expiresAfterWeek: game.week + 4 },
    ));
  }

  if (injuredStarters.length >= 2) {
    next.push(createArc(
      game,
      'injury_crisis',
      team,
      'Injury crisis',
      `${injuredStarters.length} starters are on the report. Depth and triage now shape the next month.`,
      { injuredStarters: injuredStarters.map((player) => player.id) },
      findArc(existing, 'injury_crisis'),
      { expiresAfterWeek: game.week + 2 },
    ));
  }

  const revenge = findArc(existing, 'revenge_game');
  const targetOpponentId = String(revenge?.data['targetOpponentId'] ?? opponent?.id ?? '');
  const revengeResolved = summary?.result === 'win' && opponent?.id === targetOpponentId;
  if (
    !revengeResolved &&
    opponent &&
    summary?.result === 'loss' &&
    ((team.rivals[opponent.id]?.heat ?? 0) >= 5 || summary.phase === 'playoffs')
  ) {
    next.push(createArc(
      game,
      'revenge_game',
      team,
      `Circle ${opponent.city} ${opponent.name}`,
      `The last meeting left a scar. The roster will be waiting for the rematch.`,
      { targetOpponentId: opponent.id, targetOpponentName: `${opponent.city} ${opponent.name}` },
      revenge,
      { expiresAfterWeek: nextMeetingWeek(game, team.id, opponent.id) ?? game.week + 6 },
    ));
  } else if (revenge && !revengeResolved && revenge.expiresAfterWeek !== null && revenge.expiresAfterWeek >= game.week) {
    next.push({
      ...revenge,
      updatedYear: game.year,
      updatedWeek: game.week,
      stage: revenge.stage,
    });
  }

  return next.sort((a, b) => a.template.localeCompare(b.template));
}
