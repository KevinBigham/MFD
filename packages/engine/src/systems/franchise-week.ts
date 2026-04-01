import { DIFF_SETTINGS } from '../config/difficulty';
import { RNG, reseedSeason, reseedWeek, setSeed } from '../rng';
import { avg, cl } from '../utils';
import { advanceDraft, ensureDraftClass, finalizePostDraft } from './draft';
import { generateHooks } from './hooks-engine';
import { advanceFreeAgency, advanceOffseason, initializeOffseasonState } from './offseason';
import { updateOwnerApproval } from './owner';
import { tickPatience } from './owner-extended';
import { advancePlayoffBracket, seedPlayoffBracket } from './playoff-bracket';
import { generateTradeOffers } from './trade-market';
import { applyGameToSeasonStats, ensureSeasonStats, tickInjuries } from './season-stats';
import { buildWeeklySummary } from './weekly-summary';
import type {
  Consequence,
  EngineOutput,
  GameEvent,
  GameResult,
  GameState,
  Player,
  Team,
  TeamGameStats,
  WeeklyInjurySummary,
} from '../types';

function getPrimary(team: Team, positions: Player['pos'][]): Player | null {
  return [...team.roster]
    .filter((player) => positions.includes(player.pos) && !player.injury)
    .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || b.ovr - a.ovr)[0] ?? null;
}

function makeTeamGameStats(team: Team, opponent: Team, score: number): TeamGameStats {
  const qb = getPrimary(team, ['QB'])?.ovr ?? 70;
  const rush = avg(team.roster.filter((player) => player.pos === 'RB').map((player) => player.ovr)) || 68;
  const passRate = cl(0.48 + (qb - rush) / 200, 0.4, 0.66);
  const totalYards = cl(Math.round(235 + score * 12 + avg(team.roster.map((player) => player.ovr)) + (RNG.play() - 0.5) * 70), 180, 520);
  const awareness = avg(team.roster.map((player) => player.ratings.awareness ?? player.ovr));
  const frontSeven = avg(team.roster.filter((player) => player.pos === 'DL' || player.pos === 'LB').map((player) => player.ovr));
  const line = avg(opponent.roster.filter((player) => player.pos === 'OL').map((player) => player.ovr));
  const thirdDownAttempts = cl(Math.round(9 + score / 4 + RNG.play() * 4), 8, 18);

  return {
    totalYards,
    passingYards: Math.round(totalYards * passRate),
    rushingYards: totalYards - Math.round(totalYards * passRate),
    turnovers: cl(Math.round((100 - awareness) / 28 + RNG.play() * 2), 0, 4),
    sacks: cl(Math.round((frontSeven - line) / 18 + RNG.play() * 2), 0, 6),
    thirdDownConversions: cl(Math.round(thirdDownAttempts * (0.34 + score / 100)), 1, thirdDownAttempts),
    thirdDownAttempts,
    timeOfPossession: cl(Math.round(28 + (score - 21) / 2 + (RNG.play() - 0.5) * 8), 22, 38),
  };
}

function applyResult(home: Team, away: Team, homeStats: TeamGameStats, awayStats: TeamGameStats, homeScore: number, awayScore: number): void {
  applyGameToSeasonStats(home, homeStats, awayStats, homeScore, awayScore);
  applyGameToSeasonStats(away, awayStats, homeStats, awayScore, homeScore);

  if (homeScore > awayScore) {
    home.wins += 1;
    away.losses += 1;
    home.streak = home.streak >= 0 ? home.streak + 1 : 1;
    away.streak = away.streak <= 0 ? away.streak - 1 : -1;
    return;
  }

  away.wins += 1;
  home.losses += 1;
  away.streak = away.streak >= 0 ? away.streak + 1 : 1;
  home.streak = home.streak <= 0 ? home.streak - 1 : -1;
}

function distributeStats(team: Team, opponentStats: TeamGameStats, ownStats: TeamGameStats): string | null {
  const qb = getPrimary(team, ['QB']);
  const rb = getPrimary(team, ['RB']);
  const receivers = [...team.roster]
    .filter((player) => (player.pos === 'WR' || player.pos === 'TE') && !player.injury)
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 3);
  const defenders = [...team.roster]
    .filter((player) => player.pos === 'DL' || player.pos === 'LB' || player.pos === 'CB' || player.pos === 'S')
    .sort((a, b) => b.ovr - a.ovr);

  if (qb) qb.stats.passYds += ownStats.passingYards;
  if (rb) rb.stats.rushYds += Math.round(ownStats.rushingYards * 0.58);
  if (receivers[0]) receivers[0].stats.recYds += Math.round(ownStats.passingYards * 0.42);
  if (receivers[1]) receivers[1].stats.recYds += Math.round(ownStats.passingYards * 0.31);
  if (receivers[2]) receivers[2].stats.recYds += Math.round(ownStats.passingYards * 0.19);
  if (defenders[0]) defenders[0].stats.sacks += Math.round(ownStats.sacks * 0.5);
  if (defenders[1]) defenders[1].stats.sacks += Math.round(ownStats.sacks * 0.3);
  if (defenders[2]) defenders[2].stats.defINT += Math.max(0, opponentStats.turnovers - 1);

  return qb?.id ?? rb?.id ?? receivers[0]?.id ?? null;
}

function maybeInjure(team: Team, injMod: number): WeeklyInjurySummary[] {
  const injuries: WeeklyInjurySummary[] = [];
  const healthy = team.roster.filter((player) => player.isStarter && !player.injury && player.pos !== 'K' && player.pos !== 'P');
  if (healthy.length === 0 || RNG.injury() >= 0.08 * injMod) return injuries;

  const player = healthy[Math.floor(RNG.injury() * healthy.length)]!;
  const roll = [
    { severity: 'questionable', gamesOut: 1 },
    { severity: 'doubtful', gamesOut: 2 },
    { severity: 'out', gamesOut: 4 },
    { severity: 'ir', gamesOut: 8 },
  ][Math.floor(RNG.injury() * 4)]!;
  const type = ['hamstring', 'ankle', 'shoulder', 'knee'][Math.floor(RNG.injury() * 4)]!;

  player.injury = { type, severity: roll.severity as WeeklyInjurySummary['severity'], gamesOut: roll.gamesOut };
  injuries.push({
    playerId: player.id,
    playerName: player.name,
    severity: roll.severity as WeeklyInjurySummary['severity'],
    gamesOut: roll.gamesOut,
    type,
  });

  return injuries;
}

function simulateGame(home: Team, away: Team, year: number, week: number, difficulty: GameState['difficulty']): { result: GameResult; injuries: Record<string, WeeklyInjurySummary[]> } {
  const homeStrength = avg(home.roster.filter((player) => player.isStarter).map((player) => player.ovr)) + 1.5;
  const awayStrength = avg(away.roster.filter((player) => player.isStarter).map((player) => player.ovr));
  const delta = homeStrength - awayStrength;
  let homeScore = cl(Math.round(22 + delta * 0.45 + (RNG.play() - 0.5) * 14), 9, 42);
  let awayScore = cl(Math.round(20 - delta * 0.35 + (RNG.play() - 0.5) * 14), 6, 38);
  let overtime = false;

  if (homeScore === awayScore) {
    overtime = true;
    if (RNG.play() >= 0.5) homeScore += 3 + Math.floor(RNG.play() * 4);
    else awayScore += 3 + Math.floor(RNG.play() * 4);
  }

  const homeStats = makeTeamGameStats(home, away, homeScore);
  const awayStats = makeTeamGameStats(away, home, awayScore);
  applyResult(home, away, homeStats, awayStats, homeScore, awayScore);
  const homeMvp = distributeStats(home, awayStats, homeStats);
  const awayMvp = distributeStats(away, homeStats, awayStats);
  const diff = DIFF_SETTINGS[difficulty];

  return {
    result: {
      id: `game-${year}-${week}-${home.id}-${away.id}`,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore,
      awayScore,
      week,
      year,
      overtime,
      mvpPlayerId: homeScore > awayScore ? homeMvp : awayMvp,
      stats: { [home.id]: homeStats, [away.id]: awayStats },
    },
    injuries: {
      [home.id]: maybeInjure(home, diff.injMod),
      [away.id]: maybeInjure(away, diff.injMod),
    },
  };
}

function updateOwner(team: Team, game: GameState): number {
  const before = team.owner.approval;
  updateOwnerApproval(team.owner, team, { year: game.year, week: game.week, phase: game.phase });
  team.ownerMood = team.owner.approval;
  team.ownerPatience80 = tickPatience(
    team.ownerPatience80,
    team.owner.archetypeId,
    team.streak > 0 ? 'win' : 'loss',
    { isPlayoff: game.phase === 'playoffs', streak: team.streak },
  ).patience;
  return team.owner.approval - before;
}

function makeEvent(game: GameState, type: string, description: string, data: Record<string, unknown>): GameEvent {
  return {
    id: `${type}-${game.year}-${game.week}-${game.eventLog.length}`,
    type,
    timestamp: game.year * 1000 + game.week * 10 + game.eventLog.length,
    description,
    data,
  };
}

function syncPlayers(game: GameState): void {
  for (const team of Object.values(game.teams)) {
    ensureSeasonStats(team);
    for (const player of team.roster) game.players[player.id] = player;
  }
}

function refreshNarrative(game: GameState): void {
  const userTeam = Object.values(game.teams).find((team) => team.isUser);
  if (!userTeam) return;

  const sched = game.schedule.flatMap((week) => week.games.map((entry) => ({
    home: entry.homeTeamId,
    away: entry.awayTeamId,
    week: week.week,
    played: entry.result !== null,
  })));
  const hooks = generateHooks({ my: userTeam, myId: userTeam.id, teams: Object.values(game.teams), season: { year: game.year, week: game.week, phase: game.phase }, sched });
  game.narrativeState.hooks = hooks.map((hook, index) => ({
    id: `hook-${game.year}-${game.week}-${index}`,
    type: hook.cat,
    description: hook.text,
    resolved: false,
    deadline: game.week + 2,
  }));
  if (game.narrativeState.hooks.length === 0) {
    game.narrativeState.hooks = [{
      id: `hook-${game.year}-${game.week}-fallback`,
      type: 'streak',
      description: `${userTeam.city} ${userTeam.name} sit at ${userTeam.wins}-${userTeam.losses}. Keep momentum into the next week.`,
      resolved: false,
      deadline: game.week + 2,
    }];
  }
}

function cloneGame(game: GameState): GameState {
  return JSON.parse(JSON.stringify(game)) as GameState;
}

function findUserTeam(game: GameState): Team | null {
  return Object.values(game.teams).find((team: Team) => team.isUser) ?? null;
}

export function advanceFranchiseWeek(game: GameState): EngineOutput {
  const nextState = cloneGame(game);
  const events: GameEvent[] = [];
  const userTeam = findUserTeam(nextState);
  const previousRecord = userTeam ? `${userTeam.wins}-${userTeam.losses}${userTeam.ties ? `-${userTeam.ties}` : ''}` : '0-0';
  let ownerDelta = 0;
  let userResult: GameResult | null = null;
  let userOpponent: Team | null = null;
  let userInjuries: WeeklyInjurySummary[] = [];
  let label: string | undefined;

  setSeed(game.seed);
  reseedSeason(game.year);
  reseedWeek(game.year, game.week);

  if (nextState.phase === 'preseason') {
    nextState.phase = 'regular_season';
    return { nextState, events, consequences: [] };
  }
  if (nextState.phase === 'offseason') {
    advanceOffseason(nextState);
    syncPlayers(nextState);
    refreshNarrative(nextState);
    return { nextState, events, consequences: [] };
  }
  if (nextState.phase === 'free_agency') {
    advanceFreeAgency(nextState);
    syncPlayers(nextState);
    refreshNarrative(nextState);
    return { nextState, events, consequences: [] };
  }
  if (nextState.phase === 'draft') {
    advanceDraft(nextState);
    syncPlayers(nextState);
    refreshNarrative(nextState);
    return { nextState, events, consequences: [] };
  }
  if (nextState.phase === 'post_draft') {
    finalizePostDraft(nextState);
    syncPlayers(nextState);
    refreshNarrative(nextState);
    return { nextState, events, consequences: [] };
  }

  if (nextState.phase === 'regular_season') {
    const currentWeek = nextState.schedule.find((entry) => entry.week === nextState.week);
    for (const matchup of currentWeek?.games ?? []) {
      const home = nextState.teams[matchup.homeTeamId]!;
      const away = nextState.teams[matchup.awayTeamId]!;
      tickInjuries(home);
      tickInjuries(away);

      const outcome = simulateGame(home, away, nextState.year, nextState.week, nextState.difficulty);
      matchup.result = outcome.result;
      ownerDelta += updateOwner(home, nextState);
      ownerDelta += updateOwner(away, nextState);
      const event = makeEvent(nextState, 'weekly_result', `${home.name} ${outcome.result.homeScore}, ${away.name} ${outcome.result.awayScore}`, { gameId: outcome.result.id });
      events.push(event);
      nextState.eventLog.push(event);

      if (userTeam && (home.id === userTeam.id || away.id === userTeam.id)) {
        userResult = outcome.result;
        userOpponent = home.id === userTeam.id ? away : home;
        userInjuries = outcome.injuries[userTeam.id] ?? [];
      }
    }

    if (userTeam && userResult) {
      const summary = buildWeeklySummary({
        team: nextState.teams[userTeam.id]!,
        opponent: userOpponent,
        result: userResult,
        year: nextState.year,
        week: nextState.week,
        phase: 'regular_season',
        ownerDelta,
        injuries: userInjuries,
        notes: userInjuries.length > 0 ? [`${userInjuries.length} new injury`] : ['No major injuries'],
      });
      nextState.weekSummaries.push(summary);
      nextState.narrativeState.recentHeadlines = [summary.headline, ...nextState.narrativeState.recentHeadlines].slice(0, 8);
    }

    if (nextState.week >= 18) {
      nextState.phase = 'playoffs';
      nextState.week = 19;
      nextState.playoffBracket = seedPlayoffBracket(nextState);
    } else {
      nextState.week += 1;
    }
  } else if (nextState.phase === 'playoffs') {
    nextState.playoffBracket = nextState.playoffBracket ?? seedPlayoffBracket(nextState);
    nextState.playoffBracket = advancePlayoffBracket(nextState.playoffBracket, nextState.week, (homeTeamId, awayTeamId) => {
      const home = nextState.teams[homeTeamId]!;
      const away = nextState.teams[awayTeamId]!;
      tickInjuries(home);
      tickInjuries(away);

      const outcome = simulateGame(home, away, nextState.year, nextState.week, nextState.difficulty);
      ownerDelta += updateOwner(home, nextState);
      ownerDelta += updateOwner(away, nextState);

      if (userTeam && (home.id === userTeam.id || away.id === userTeam.id)) {
        userResult = outcome.result;
        userOpponent = home.id === userTeam.id ? away : home;
        userInjuries = outcome.injuries[userTeam.id] ?? [];
        label = `Playoffs: ${nextState.week === 19 ? 'Wild Card' : nextState.week === 20 ? 'Divisional' : nextState.week === 21 ? 'Conference Final' : 'Championship'}`;
      }

      const event = makeEvent(nextState, 'playoff_result', `${home.name} ${outcome.result.homeScore}, ${away.name} ${outcome.result.awayScore}`, { gameId: outcome.result.id });
      events.push(event);
      nextState.eventLog.push(event);
      return outcome.result;
    });

    if (userTeam && userResult) {
      const summary = buildWeeklySummary({
        team: nextState.teams[userTeam.id]!,
        opponent: userOpponent,
        result: userResult,
        year: nextState.year,
        week: nextState.week,
        phase: 'playoffs',
        ownerDelta,
        injuries: userInjuries,
        notes: userInjuries.length > 0 ? [`${userInjuries.length} playoff injury`] : ['Playoff week complete'],
        label,
      });
      nextState.weekSummaries.push(summary);
      nextState.narrativeState.recentHeadlines = [summary.headline, ...nextState.narrativeState.recentHeadlines].slice(0, 8);
    }

    if (nextState.playoffBracket.championTeamId) {
      nextState.phase = 'offseason';
      nextState.year += 1;
      nextState.week = 1;
      ensureDraftClass(nextState);
      nextState.offseasonState = initializeOffseasonState(nextState);
      nextState.offseasonState.tradeOffers = generateTradeOffers(nextState);
    } else {
      nextState.week += 1;
    }
  }

  syncPlayers(nextState);
  refreshNarrative(nextState);

  return {
    nextState,
    events,
    consequences: [
      { label: 'Record', before: previousRecord, after: userTeam ? `${nextState.teams[userTeam.id]!.wins}-${nextState.teams[userTeam.id]!.losses}${nextState.teams[userTeam.id]!.ties ? `-${nextState.teams[userTeam.id]!.ties}` : ''}` : previousRecord, delta: 0, severity: 'neutral' },
      { label: 'Owner Approval', before: 0, after: ownerDelta, delta: ownerDelta, severity: ownerDelta >= 0 ? 'positive' : 'negative' },
    ] satisfies Consequence[],
  };
}
