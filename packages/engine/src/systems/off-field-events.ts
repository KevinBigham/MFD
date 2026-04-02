import { RNG, uid } from '../rng';
import type {
  GameEvent,
  GameState,
  OffFieldEvent,
  Player,
  Team,
  TimedEffect,
  TimedEffectStat,
} from '../types';

function stampFor(year: number, week: number): number {
  return year * 100 + week;
}

export function ensureLivingWorldState(game: GameState): void {
  game.offFieldEvents ??= [];
  game.recentPressConferences ??= [];
  game.coachingHistory ??= [];
  game.leagueRivalries ??= [];
  game.activeEffects ??= [];
}

function pushLivingWorldEvent(game: GameState, type: string, description: string, data: Record<string, unknown>): GameEvent {
  const event: GameEvent = {
    id: `${type}-${game.year}-${game.week}-${game.eventLog.length}`,
    type,
    timestamp: stampFor(game.year, game.week) * 10 + game.eventLog.length,
    description,
    data,
  };
  game.eventLog.push(event);
  return event;
}

function addHeadline(game: GameState, headline: string): void {
  game.narrativeState.recentHeadlines = [headline, ...game.narrativeState.recentHeadlines].slice(0, 8);
}

function makeEffect(params: {
  game: GameState;
  sourceId: string;
  sourceType: TimedEffect['sourceType'];
  teamId: string;
  targetType: TimedEffect['targetType'];
  targetId: string | null;
  stat: TimedEffectStat;
  delta: number;
  weeks: number;
  appliesToGame: boolean;
  summary: string;
}): TimedEffect {
  const startStamp = stampFor(params.game.year, params.game.week);
  return {
    id: uid(),
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    teamId: params.teamId,
    targetType: params.targetType,
    targetId: params.targetId,
    stat: params.stat,
    delta: params.delta,
    appliesToGame: params.appliesToGame,
    startStamp,
    endStamp: startStamp + Math.max(0, params.weeks - 1),
    summary: params.summary,
  };
}

function teamRecordBias(team: Team): 'positive' | 'negative' | 'neutral' {
  if (team.wins - team.losses >= 3) return 'positive';
  if (team.losses - team.wins >= 2) return 'negative';
  return 'neutral';
}

function expiringStar(team: Team): Player | null {
  return team.roster.find((player) => (player.contract?.years ?? 0) <= 1 && player.ovr > 82) ?? null;
}

function starPlayer(team: Team): Player | null {
  return [...team.roster]
    .filter((player) => player.ovr > 85)
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))[0] ?? null;
}

function leaderPlayer(team: Team): Player | null {
  return team.roster.find((player) => player.traits.includes('captain') || player.traits.includes('vocal_leader')) ?? null;
}

function rookieCandidate(team: Team): Player | null {
  return [...team.roster]
    .filter((player) => player.age <= 25)
    .sort((a, b) => a.age - b.age || a.id.localeCompare(b.id))[0] ?? null;
}

function breakoutCandidate(team: Team): Player | null {
  return [...team.roster]
    .filter((player) => player.age <= 25 && !player.injury)
    .sort((a, b) => (b.pot - b.ovr) - (a.pot - a.ovr) || a.id.localeCompare(b.id))[0] ?? null;
}

function injuredPlayer(team: Team): Player | null {
  return team.roster.find((player) => player.injury && player.injury.gamesOut > 0) ?? null;
}

function samePositionBattle(team: Team): [Player, Player] | null {
  const starters = team.roster.filter((player) => player.isStarter);
  for (let index = 0; index < starters.length; index++) {
    for (let compare = index + 1; compare < starters.length; compare++) {
      const first = starters[index]!;
      const second = starters[compare]!;
      if (first.pos === second.pos && Math.abs(first.ovr - second.ovr) <= 3) {
        return first.ovr <= second.ovr ? [first, second] : [second, first];
      }
    }
  }
  return null;
}

function milestonePlayer(team: Team): Player | null {
  return team.roster.find((player) => {
    const gamesPlayed = player.careerStats.gp ?? 0;
    return gamesPlayed >= 100 || player.stats.passYds >= 10000 || player.stats.rushYds >= 5000 || player.stats.recYds >= 5000;
  }) ?? null;
}

function buildCandidateEvents(game: GameState, team: Team): OffFieldEvent[] {
  const candidates: OffFieldEvent[] = [];
  const positivity = teamRecordBias(team);

  const leader = leaderPlayer(team);
  if (leader) {
    const id = `offfield-${uid()}`;
    candidates.push({
      id,
      type: 'captain_speech',
      category: 'locker_room',
      week: game.week,
      year: game.year,
      playerIds: [leader.id],
      teamId: team.id,
      headline: `${leader.name} steadies the room`,
      description: `${leader.name} delivered a captain's speech after practice and the locker room responded.`,
      effects: [
        makeEffect({
          game,
          sourceId: id,
          sourceType: 'off_field_event',
          teamId: team.id,
          targetType: 'team',
          targetId: null,
          stat: 'chemistry',
          delta: 2,
          weeks: 3,
          appliesToGame: false,
          summary: 'Captain speech has team chemistry humming.',
        }),
      ],
    });
  }

  const battle = samePositionBattle(team);
  if (battle) {
    const loser = battle[0];
    const winner = battle[1];
    const id = `offfield-${uid()}`;
    candidates.push({
      id,
      type: 'position_group_beef',
      category: 'locker_room',
      week: game.week,
      year: game.year,
      playerIds: [loser.id, winner.id],
      teamId: team.id,
      headline: `${loser.pos} room tension spills out`,
      description: `${loser.name} and ${winner.name} clashed in meetings over reps and roles.`,
      effects: [
        makeEffect({
          game,
          sourceId: id,
          sourceType: 'off_field_event',
          teamId: team.id,
          targetType: 'player',
          targetId: loser.id,
          stat: 'morale',
          delta: -1,
          weeks: 2,
          appliesToGame: false,
          summary: `${loser.name} is carrying extra locker room tension.`,
        }),
      ],
    });
  }

  const expiring = expiringStar(team);
  if (expiring) {
    const id = `offfield-${uid()}`;
    candidates.push({
      id,
      type: 'contract_grumbling',
      category: 'locker_room',
      week: game.week,
      year: game.year,
      playerIds: [expiring.id],
      teamId: team.id,
      headline: `${expiring.name} lets frustration leak`,
      description: `${expiring.name} aired contract frustration and the room felt it.`,
      effects: [
        makeEffect({
          game,
          sourceId: id,
          sourceType: 'off_field_event',
          teamId: team.id,
          targetType: 'team',
          targetId: null,
          stat: 'chemistry',
          delta: -2,
          weeks: 1,
          appliesToGame: false,
          summary: 'Contract noise has the room a little edgy.',
        }),
      ],
    });
  }

  const star = starPlayer(team);
  if (star) {
    const positiveInterview = RNG.ai() >= (positivity === 'negative' ? 0.65 : 0.45);
    const id = `offfield-${uid()}`;
    candidates.push({
      id,
      type: 'player_interview',
      category: 'media',
      week: game.week,
      year: game.year,
      playerIds: [star.id],
      teamId: team.id,
      headline: positiveInterview ? `${star.name} owns the spotlight` : `${star.name} stirs the week`,
      description: positiveInterview
        ? `${star.name} leaned into the moment in a national interview and the confidence was contagious.`
        : `${star.name} spoke boldly and the outside noise got louder.`,
      effects: [
        positiveInterview
          ? makeEffect({
            game,
            sourceId: id,
            sourceType: 'off_field_event',
            teamId: team.id,
            targetType: 'player',
            targetId: star.id,
            stat: 'ovr',
            delta: 1,
            weeks: 2,
            appliesToGame: true,
            summary: `${star.name} is playing with visible swagger.`,
          })
          : makeEffect({
            game,
            sourceId: id,
            sourceType: 'off_field_event',
            teamId: team.id,
            targetType: 'team',
            targetId: null,
            stat: 'chemistry',
            delta: -1,
            weeks: 1,
            appliesToGame: false,
            summary: 'The media cycle has become a distraction.',
          }),
      ],
    });
  }

  const injured = injuredPlayer(team);
  if (injured) {
    const id = `offfield-${uid()}`;
    candidates.push({
      id,
      type: 'injury_setback',
      category: 'personal',
      week: game.week,
      year: game.year,
      playerIds: [injured.id],
      teamId: team.id,
      headline: `${injured.name} hits a setback`,
      description: `${injured.name}'s recovery timetable slipped by another week.`,
      effects: [],
    });
  }

  const breakout = breakoutCandidate(team);
  if (breakout) {
    const id = `offfield-${uid()}`;
    candidates.push({
      id,
      type: 'breakout_practice',
      category: 'personal',
      week: game.week,
      year: game.year,
      playerIds: [breakout.id],
      teamId: team.id,
      headline: `${breakout.name} flashes in practice`,
      description: `${breakout.name} owned the practice tape and the staff took notice.`,
      effects: [
        makeEffect({
          game,
          sourceId: id,
          sourceType: 'off_field_event',
          teamId: team.id,
          targetType: 'player',
          targetId: breakout.id,
          stat: 'ovr',
          delta: 1,
          weeks: 1,
          appliesToGame: true,
          summary: `${breakout.name} has a practice glow heading into kickoff.`,
        }),
      ],
    });
  }

  const milestone = milestonePlayer(team);
  if (milestone) {
    const id = `offfield-${uid()}`;
    candidates.push({
      id,
      type: 'milestone',
      category: 'personal',
      week: game.week,
      year: game.year,
      playerIds: [milestone.id],
      teamId: team.id,
      headline: `${milestone.name} hits a milestone`,
      description: `${milestone.name} crossed a career milestone and the room made sure the moment landed.`,
      effects: [
        makeEffect({
          game,
          sourceId: id,
          sourceType: 'off_field_event',
          teamId: team.id,
          targetType: 'player',
          targetId: milestone.id,
          stat: 'morale',
          delta: 1,
          weeks: 1,
          appliesToGame: false,
          summary: `${milestone.name} is riding the high of a milestone week.`,
        }),
      ],
    });
  }

  return candidates;
}

function pickEventCount(): number {
  return RNG.ai() < 0.5 ? 1 : 2;
}

export function expireTimedEffects(game: GameState): TimedEffect[] {
  ensureLivingWorldState(game);
  const currentStamp = stampFor(game.year, game.week);
  const expired = game.activeEffects.filter((effect) => effect.endStamp < currentStamp);
  if (expired.length === 0) return [];
  game.activeEffects = game.activeEffects.filter((effect) => effect.endStamp >= currentStamp);
  return expired;
}

export function clearSeasonLivingWorldState(game: GameState): void {
  ensureLivingWorldState(game);
  game.offFieldEvents = [];
  game.recentPressConferences = [];
  game.activeEffects = [];
}

export function getTimedEffectDelta(game: GameState, teamId: string, stat: TimedEffectStat, targetId?: string | null): number {
  ensureLivingWorldState(game);
  const currentStamp = stampFor(game.year, game.week);
  return game.activeEffects
    .filter((effect) => effect.teamId === teamId)
    .filter((effect) => effect.stat === stat)
    .filter((effect) => effect.startStamp <= currentStamp && effect.endStamp >= currentStamp)
    .filter((effect) => (targetId ? effect.targetId === targetId : effect.targetType === 'team'))
    .reduce((total, effect) => total + effect.delta, 0);
}

export function getGameEffectBonuses(game: GameState, teamId: string): {
  teamOvrBonus: number;
  playerOvrBonuses: Record<string, number>;
  summaries: string[];
} {
  ensureLivingWorldState(game);
  const currentStamp = stampFor(game.year, game.week);
  const active = game.activeEffects.filter((effect) =>
    effect.teamId === teamId &&
    effect.appliesToGame &&
    effect.startStamp <= currentStamp &&
    effect.endStamp >= currentStamp);

  const playerOvrBonuses: Record<string, number> = {};
  let teamOvrBonus = 0;

  for (const effect of active) {
    if (effect.stat !== 'ovr') continue;
    if (effect.targetType === 'team') {
      teamOvrBonus += effect.delta;
      continue;
    }
    if (effect.targetId) {
      playerOvrBonuses[effect.targetId] = (playerOvrBonuses[effect.targetId] ?? 0) + effect.delta;
    }
  }

  return {
    teamOvrBonus,
    playerOvrBonuses,
    summaries: active.map((effect) => effect.summary),
  };
}

export function generateWeeklyOffFieldEvents(game: GameState, team: Team): OffFieldEvent[] {
  ensureLivingWorldState(game);
  if (game.phase !== 'regular_season') return [];

  const candidates = buildCandidateEvents(game, team);
  if (candidates.length === 0) return [];

  const selected: OffFieldEvent[] = [];
  const pool = [...candidates];
  const eventCount = Math.min(pool.length, pickEventCount());

  while (selected.length < eventCount && pool.length > 0) {
    const index = Math.floor(RNG.ai() * pool.length);
    const [event] = pool.splice(index, 1);
    if (!event) continue;
    if (event.type === 'injury_setback' && event.playerIds[0]) {
      const player = team.roster.find((candidate) => candidate.id === event.playerIds[0]);
      if (player?.injury) {
        player.injury.gamesOut += 1;
      }
    }
    selected.push(event);
    game.offFieldEvents.push(event);
    game.activeEffects.push(...event.effects);
    pushLivingWorldEvent(game, 'off_field_event', event.headline, { offFieldEventId: event.id, teamId: team.id });
    addHeadline(game, event.headline);
  }

  return selected;
}
