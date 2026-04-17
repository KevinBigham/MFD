import type {
  GameState,
  LeagueStoryArc,
  NewsItem,
  Player,
  StoryArc,
  StoryArcBeat,
  Team,
  WeeklySummary,
} from '../types';

export interface StoryArcContext {
  team: Team;
  opponent: Team | null;
  summary: WeeklySummary | null;
}

function findWeeklyArc(arcs: StoryArc[], template: StoryArc['template']): StoryArc | null {
  return arcs.find((arc) => arc.template === template) ?? null;
}

function createWeeklyArc(
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

export function advanceWeeklyStoryArcs(game: GameState, context: StoryArcContext): StoryArc[] {
  const { team, opponent, summary } = context;
  const existing = game.narrativeState.activeArcs.filter((arc) =>
    arc.expiresAfterWeek === null || arc.expiresAfterWeek >= game.week);
  const next: StoryArc[] = [];
  const injuredStarters = team.roster.filter((player) => player.isStarter && player.injury);

  if (team.streak >= 3) {
    next.push(createWeeklyArc(
      game,
      'win_streak',
      team,
      'Win streak',
      `${team.streak}-game surge has the room playing faster and with more confidence.`,
      { streak: team.streak },
      findWeeklyArc(existing, 'win_streak'),
    ));
  }

  if (team.ownerMood < 40 || team.ownerPatience80 < 35) {
    next.push(createWeeklyArc(
      game,
      'hot_seat',
      team,
      'Hot seat',
      `Owner approval ${team.ownerMood} and patience ${team.ownerPatience80} put every weekly result under a microscope.`,
      { ownerMood: team.ownerMood, ownerPatience80: team.ownerPatience80 },
      findWeeklyArc(existing, 'hot_seat'),
    ));
  }

  const breakout = getBreakoutCandidate(team, summary);
  if (breakout) {
    next.push(createWeeklyArc(
      game,
      'breakout_player',
      team,
      `${breakout.name} is heating up`,
      `${breakout.name} is young, still climbing toward ${breakout.pot} potential, and demanding a larger slice of the spotlight.`,
      { playerName: breakout.name, potentialGap: breakout.pot - breakout.ovr },
      findWeeklyArc(existing, 'breakout_player'),
      { playerId: breakout.id, expiresAfterWeek: game.week + 4 },
    ));
  }

  if (injuredStarters.length >= 2) {
    next.push(createWeeklyArc(
      game,
      'injury_crisis',
      team,
      'Injury crisis',
      `${injuredStarters.length} starters are on the report. Depth and triage now shape the next month.`,
      { injuredStarters: injuredStarters.map((player) => player.id) },
      findWeeklyArc(existing, 'injury_crisis'),
      { expiresAfterWeek: game.week + 2 },
    ));
  }

  const revenge = findWeeklyArc(existing, 'revenge_game');
  const targetOpponentId = String(revenge?.data['targetOpponentId'] ?? opponent?.id ?? '');
  const revengeResolved = summary?.result === 'win' && opponent?.id === targetOpponentId;
  if (
    !revengeResolved &&
    opponent &&
    summary?.result === 'loss' &&
    ((team.rivals[opponent.id]?.heat ?? 0) >= 5 || summary.phase === 'playoffs')
  ) {
    next.push(createWeeklyArc(
      game,
      'revenge_game',
      team,
      `Circle ${opponent.city} ${opponent.name}`,
      'The last meeting left a scar. The roster will be waiting for the rematch.',
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

type FranchiseHistoryEntry = GameState['franchiseHistory'][number];

function teamHistoryForSeason(game: GameState, teamId: string, currentYear: number): FranchiseHistoryEntry[] {
  return game.franchiseHistory
    .filter((entry) => entry.teamId === teamId && entry.year <= currentYear)
    .sort((a, b) => a.year - b.year);
}

function recordPct(entry: Pick<FranchiseHistoryEntry, 'wins' | 'losses' | 'ties'>): number {
  const totalGames = entry.wins + entry.losses + entry.ties;
  if (totalGames <= 0) return 0;
  return (entry.wins + entry.ties * 0.5) / totalGames;
}

function isSubFiveHundred(entry: FranchiseHistoryEntry): boolean {
  return recordPct(entry) < 0.5;
}

function isFiveHundredOrBetter(entry: FranchiseHistoryEntry): boolean {
  return recordPct(entry) >= 0.5;
}

function isPlayoffAppearance(playoffFinish: string): boolean {
  return playoffFinish !== 'missed_playoffs' && playoffFinish !== 'regular_season';
}

function isPlayoffWin(playoffFinish: string): boolean {
  return [
    'divisional_exit',
    'conference_final_exit',
    'super_bowl_runner_up',
    'champion',
  ].includes(playoffFinish);
}

function hasDeadCapOverflow(team: Team): boolean {
  return team.deadCap >= 24 || (team.deadCap >= 18 && team.capSpace < 5);
}

function beat(stage: string, year: number, note: string, narrativeText: string): StoryArcBeat {
  return { stage, year, note, narrativeText };
}

function rebuildArc(team: Team, history: FranchiseHistoryEntry[], currentYear: number): LeagueStoryArc | null {
  const latest = history.at(-1);
  if (!latest || latest.year !== currentYear || !isFiveHundredOrBetter(latest)) return null;

  const losingRun: FranchiseHistoryEntry[] = [];
  for (let index = history.length - 2; index >= 0; index -= 1) {
    const entry = history[index]!;
    if (!isSubFiveHundred(entry)) break;
    losingRun.unshift(entry);
  }

  if (losingRun.length < 3) return null;

  const stageHistory = losingRun.map((entry, index) => beat(
    index === 0 ? 'bottoming_out' : index === losingRun.length - 1 ? 'foundation' : 'asset_accumulation',
    entry.year,
    `${team.city} banked another losing year while the long-term reset took shape.`,
    `${team.city} stayed below .500 in ${entry.year}, leaning into patience instead of patchwork fixes.`,
  ));
  stageHistory.push(beat(
    'breakthrough',
    latest.year,
    `${team.city} finally pushed back to .500 or better.`,
    `${team.city} came out of the rebuild with a credible breakthrough season in ${latest.year}.`,
  ));

  return {
    id: `rebuild-${team.id}-${losingRun[0]!.year}`,
    type: 'rebuild',
    teamId: team.id,
    startYear: losingRun[0]!.year,
    endYear: latest.year,
    currentStage: 'breakthrough',
    stageHistory,
  };
}

function contenderWindowArc(team: Team, history: FranchiseHistoryEntry[], currentYear: number): LeagueStoryArc | null {
  const streak: FranchiseHistoryEntry[] = [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index]!;
    if (
      entry.year <= currentYear &&
      recordPct(entry) >= 0.625 &&
      isPlayoffAppearance(entry.playoffFinish)
    ) {
      streak.unshift(entry);
      continue;
    }
    break;
  }

  if (streak.length < 2 || streak.at(-1)?.year !== currentYear) return null;

  const stageHistory = streak.map((entry, index) => beat(
    index === 0 ? 'window_opened' : 'window_extended',
    entry.year,
    index === 0
      ? `${team.city} opened a real contention window.`
      : `${team.city} kept the contention window open.`,
    index === 0
      ? `${team.city} paired a .625-plus season with a playoff trip and announced itself as a contender.`
      : `${team.city} stacked another high-end season and extended its pressure window on the league.`,
  ));

  return {
    id: `contender_window-${team.id}-${streak[0]!.year}`,
    type: 'contender_window',
    teamId: team.id,
    startYear: streak[0]!.year,
    endYear: null,
    currentStage: stageHistory.at(-1)?.stage ?? 'window_opened',
    stageHistory,
  };
}

function dynastyRunArc(team: Team, history: FranchiseHistoryEntry[], currentYear: number): LeagueStoryArc | null {
  const streak: FranchiseHistoryEntry[] = [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index]!;
    if (entry.year <= currentYear && entry.wins >= 12) {
      streak.unshift(entry);
      continue;
    }
    break;
  }

  if (streak.length < 3 || streak.at(-1)?.year !== currentYear) return null;

  const stageHistory = streak.map((entry, index) => {
    const stage = index === 0 ? 'foundation' : index === 1 ? 'dominance_holding' : index === 2 ? 'dynasty_breakthrough' : 'dynasty_reign';
    const note = stage === 'dynasty_breakthrough'
      ? `${team.city} crossed from contender to dynasty territory.`
      : `${team.city} posted another 12-win season.`;
    const narrativeText = stage === 'dynasty_breakthrough'
      ? `${team.city} reached three straight 12-win campaigns and forced the dynasty conversation.`
      : `${team.city} kept stacking double-digit wins without giving the conference much air.`;
    return beat(stage, entry.year, note, narrativeText);
  });

  return {
    id: `dynasty_run-${team.id}-${streak[0]!.year}`,
    type: 'dynasty_run',
    teamId: team.id,
    startYear: streak[0]!.year,
    endYear: null,
    currentStage: stageHistory.at(-1)?.stage ?? 'foundation',
    stageHistory,
  };
}

function cinderellaArc(team: Team, history: FranchiseHistoryEntry[], currentYear: number): LeagueStoryArc | null {
  const latest = history.at(-1);
  if (!latest || latest.year !== currentYear) return null;
  if (!isSubFiveHundred(latest) || !isPlayoffWin(latest.playoffFinish)) return null;

  return {
    id: `cinderella-${team.id}-${currentYear}`,
    type: 'cinderella',
    teamId: team.id,
    startYear: currentYear,
    endYear: currentYear,
    currentStage: 'playoff_shock',
    stageHistory: [
      beat(
        'playoff_shock',
        currentYear,
        `${team.city} turned a losing regular season into a playoff jolt.`,
        `${team.city} stole a playoff win after finishing below .500, giving the year a cinderella edge.`,
      ),
    ],
  };
}

function collapseArc(team: Team, history: FranchiseHistoryEntry[], currentYear: number): LeagueStoryArc | null {
  const latest = history.at(-1);
  const previous = history.at(-2);
  if (!latest || !previous || latest.year !== currentYear) return null;
  if (!hasDeadCapOverflow(team)) return null;
  if (previous.wins - latest.wins < 3) return null;

  return {
    id: `collapse-${team.id}-${currentYear}`,
    type: 'collapse',
    teamId: team.id,
    startYear: currentYear,
    endYear: currentYear,
    currentStage: 'cap_overflow',
    stageHistory: [
      beat(
        'cap_overflow',
        currentYear,
        `${team.city} hit a dead-cap crunch and lost ground fast.`,
        `${team.city} wore a heavy dead-cap bill in ${currentYear} and slipped at least three wins from the prior season.`,
      ),
    ],
  };
}

function closeActiveArc(
  arc: LeagueStoryArc,
  currentYear: number,
  stage: string,
  note: string,
  narrativeText: string,
): LeagueStoryArc {
  const hasCurrentYearBeat = arc.stageHistory.some((entry) => entry.year === currentYear);
  return {
    ...arc,
    endYear: currentYear,
    currentStage: stage,
    stageHistory: hasCurrentYearBeat ? arc.stageHistory : [...arc.stageHistory, beat(stage, currentYear, note, narrativeText)],
  };
}

function buildArcNews(game: GameState, arc: LeagueStoryArc, currentYear: number): NewsItem {
  const team = game.teams[arc.teamId];
  const latestBeat = [...arc.stageHistory]
    .filter((entry) => entry.year === currentYear)
    .sort((a, b) => a.stage.localeCompare(b.stage))[0] ?? arc.stageHistory.at(-1)!;

  return {
    id: `story-arc-${arc.id}-${currentYear}`,
    year: currentYear,
    week: game.week,
    type: 'milestone',
    headline: `${team?.abbr ?? arc.teamId} ${latestBeat.note.toUpperCase()}`,
    body: latestBeat.narrativeText,
    teamIds: [arc.teamId],
    playerIds: [],
    importance: arc.type === 'dynasty_run' || arc.type === 'collapse' ? 'breaking' : 'major',
  };
}

export function advanceStoryArcs(
  state: GameState,
  currentYear: number,
): { arcs: LeagueStoryArc[]; inboxEntries: NewsItem[] } {
  const previousArcs = state.storyArcs ?? [];
  const previousById = new Map(previousArcs.map((arc) => [arc.id, arc]));
  const arcsById = new Map<string, LeagueStoryArc>();

  for (const team of Object.values(state.teams).sort((a, b) => a.id.localeCompare(b.id))) {
    const history = teamHistoryForSeason(state, team.id, currentYear);
    if (history.length === 0) continue;

    const rebuild = rebuildArc(team, history, currentYear);
    if (rebuild) arcsById.set(rebuild.id, rebuild);

    const contender = contenderWindowArc(team, history, currentYear);
    if (contender) arcsById.set(contender.id, contender);

    const dynasty = dynastyRunArc(team, history, currentYear);
    if (dynasty) arcsById.set(dynasty.id, dynasty);

    const cinderella = cinderellaArc(team, history, currentYear);
    if (cinderella) arcsById.set(cinderella.id, cinderella);

    const collapse = collapseArc(team, history, currentYear);
    if (collapse) {
      arcsById.set(collapse.id, collapse);

      const priorContender = previousArcs.find((arc) => arc.teamId === team.id && arc.type === 'contender_window' && arc.endYear === null);
      if (priorContender && !arcsById.has(priorContender.id)) {
        arcsById.set(
          priorContender.id,
          closeActiveArc(
            priorContender,
            currentYear,
            'window_narrowed',
            `${team.city} saw its contention window tighten under cap stress.`,
            `${team.city} took a dead-cap hit and watched its contention window shrink in ${currentYear}.`,
          ),
        );
      }

      const priorDynasty = previousArcs.find((arc) => arc.teamId === team.id && arc.type === 'dynasty_run' && arc.endYear === null);
      if (priorDynasty && !arcsById.has(priorDynasty.id)) {
        arcsById.set(
          priorDynasty.id,
          closeActiveArc(
            priorDynasty,
            currentYear,
            'dynasty_cracked',
            `${team.city}'s dynasty posture cracked under the cap bill.`,
            `${team.city} still carries the resume, but the current cap overflow broke the clean dynasty line.`,
          ),
        );
      }
    }
  }

  const arcs = [...arcsById.values()].sort((left, right) =>
    left.startYear - right.startYear ||
    left.teamId.localeCompare(right.teamId) ||
    left.type.localeCompare(right.type));

  const inboxEntries = arcs
    .filter((arc) => arc.stageHistory.some((entry) => entry.year === currentYear))
    .filter((arc) => !previousById.get(arc.id)?.stageHistory.some((entry) => entry.year === currentYear))
    .map((arc) => buildArcNews(state, arc, currentYear))
    .sort((a, b) => a.id.localeCompare(b.id));

  return { arcs, inboxEntries };
}
