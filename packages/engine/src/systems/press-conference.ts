import { RNG, uid } from '../rng';
import type {
  GameState,
  PressConference,
  PressConferenceTone,
  ReporterQuestion,
  Team,
  TimedEffect,
} from '../types';
import { ensureLivingWorldState } from './off-field-events';
import { logicalEventTimestamp, withEventDate } from './event-log-retention';
import { getRivalryGameContext } from './rivalries';

function stampFor(year: number, week: number): number {
  return year * 100 + week;
}

function createEffect(params: {
  game: GameState;
  sourceId: string;
  teamId: string;
  stat: TimedEffect['stat'];
  delta: number;
  weeks: number;
  summary: string;
  appliesToGame?: boolean;
}): TimedEffect {
  const startStamp = stampFor(params.game.year, params.game.week);
  return {
    id: uid(),
    sourceType: 'press_conference',
    sourceId: params.sourceId,
    teamId: params.teamId,
    targetType: 'team',
    targetId: null,
    stat: params.stat,
    delta: params.delta,
    appliesToGame: params.appliesToGame ?? false,
    startStamp,
    endStamp: startStamp + Math.max(0, params.weeks - 1),
    summary: params.summary,
  };
}

function buildQuestions(result: 'win' | 'loss' | 'tie' | 'pending', topic: string, team: Team, opponent: Team | null): ReporterQuestion[] {
  const opponentName = opponent ? `${opponent.city} ${opponent.name}` : 'the week ahead';
  const prompts = result === 'win'
    ? [
      `What let ${team.city} stay on the front foot against ${opponentName}?`,
      'How do you stop the room from getting comfortable after a statement win?',
    ]
    : result === 'loss'
      ? [
        `What has to change before the next meeting with ${opponentName}?`,
        'Where did the game script drift away from your control?',
      ]
      : [
        `How do you frame ${topic} for the room right now?`,
      ];

  return prompts.map((prompt, index) => ({
    id: `${uid()}-${index}`,
    prompt,
    topic,
    response: index === 0
      ? 'Execution has to stay tighter snap to snap, and that starts with our preparation.'
      : 'We are staying direct with the group and pushing the details that actually move games.',
  }));
}

function baseTone(result: 'win' | 'loss' | 'tie' | 'pending', rivalryIntensity: number): PressConferenceTone {
  if (rivalryIntensity >= 60) return 'fired_up';
  if (result === 'win') return 'confident';
  if (result === 'loss') return 'somber';
  return 'deflecting';
}

export function recordPressConference(game: GameState, conference: PressConference): void {
  ensureLivingWorldState(game);
  game.recentPressConferences = [conference, ...game.recentPressConferences].slice(0, 5);
  if (conference.effects.length > 0) {
    game.activeEffects.push(...conference.effects);
  }
  game.narrativeState.recentHeadlines = [conference.headline, ...game.narrativeState.recentHeadlines].slice(0, 8);
  game.eventLog.push({
    id: `${conference.type}-${conference.id}`,
    type: 'press_conference',
    timestamp: logicalEventTimestamp(conference.year, conference.week, game.eventLog.length),
    description: conference.headline,
    data: withEventDate({ pressConferenceId: conference.id, teamId: conference.teamId }, conference.year, conference.week),
  });
}

export function createPostGamePressConference(params: {
  game: GameState;
  team: Team;
  opponent: Team | null;
  result: 'win' | 'loss' | 'tie' | 'pending';
  topic: string;
  rivalryIntensity?: number;
  ownerDelta?: number;
}): PressConference {
  const tone = baseTone(params.result, params.rivalryIntensity ?? 0);
  const id = `press-${uid()}`;
  const effects: TimedEffect[] = [];

  if (tone === 'fired_up') {
    effects.push(createEffect({
      game: params.game,
      sourceId: id,
      teamId: params.team.id,
      stat: 'morale',
      delta: 1,
      weeks: 1,
      summary: 'The room took real energy from the podium.',
    }));
  } else if (tone === 'somber') {
    effects.push(createEffect({
      game: params.game,
      sourceId: id,
      teamId: params.team.id,
      stat: 'morale',
      delta: -1,
      weeks: 1,
      summary: 'The postgame tone left the room heavy.',
    }));
  }

  return {
    id,
    type: 'postgame',
    year: params.game.year,
    week: params.game.week,
    teamId: params.team.id,
    speaker: params.team.staff.hc?.name ?? 'Head Coach',
    speakerRole: 'HC',
    topic: params.topic,
    tone,
    headline: `${params.team.city} takes the podium after ${params.topic}.`,
    opener: params.result === 'win'
      ? 'We stayed aggressive without losing our shape.'
      : params.result === 'loss'
        ? 'The tape is going to demand harder answers than the scoreboard.'
        : 'We are going to keep the messaging tight and the adjustments sharper.',
    quotes: [
      params.result === 'win'
        ? 'We earned the right to talk with confidence because the work matched it.'
        : 'We are not going to hide from the margin we left on the table.',
      (params.rivalryIntensity ?? 0) >= 60
        ? 'You could feel the edge in every phase of the game.'
        : 'The room knows exactly which details carried the day.',
    ],
    reporterQuestions: buildQuestions(params.result, params.topic, params.team, params.opponent),
    effects,
  };
}

export function maybeCreateMidweekPressConference(game: GameState, team: Team): PressConference | null {
  const weekSchedule = game.schedule.find((entry) => entry.week === game.week);
  const nextGame = weekSchedule?.games.find((entry) => entry.homeTeamId === team.id || entry.awayTeamId === team.id) ?? null;
  if (!nextGame) return null;

  const opponentId = nextGame.homeTeamId === team.id ? nextGame.awayTeamId : nextGame.homeTeamId;
  const opponent = game.teams[opponentId] ?? null;
  const rivalry = getRivalryGameContext(game, team.id, opponentId);
  if (!rivalry) return null;

  const id = `press-${uid()}`;
  const tone: PressConferenceTone = rivalry.intensity >= 70 ? 'fired_up' : 'confident';

  return {
    id,
    type: 'midweek',
    year: game.year,
    week: game.week,
    teamId: team.id,
    speaker: team.staff.hc?.name ?? 'Head Coach',
    speakerRole: 'HC',
    topic: `${rivalry.tier} rivalry week`,
    tone,
    headline: `${team.city} turns the spotlight toward rivalry week.`,
    opener: 'We know what this matchup means inside the building and outside of it.',
    quotes: [
      rivalry.headline,
      tone === 'fired_up'
        ? 'The room has the right amount of edge right now.'
        : 'We are keeping the focus on execution, not the noise.',
    ],
    reporterQuestions: buildQuestions('pending', 'rivalry week', team, opponent),
    effects: tone === 'fired_up'
      ? [createEffect({
        game,
        sourceId: id,
        teamId: team.id,
        stat: 'morale',
        delta: 1,
        weeks: 1,
        summary: 'The rivalry-week podium lit up the room.',
      })]
      : [],
  };
}

export function createTransactionalPressConference(params: {
  game: GameState;
  teamId: string;
  type: 'post_trade' | 'post_draft' | 'coaching_change';
  topic: string;
  speaker: string;
}): PressConference {
  return {
    id: `press-${uid()}`,
    type: params.type,
    year: params.game.year,
    week: params.game.week,
    teamId: params.teamId,
    speaker: params.speaker,
    speakerRole: params.type === 'coaching_change' ? 'GM' : 'HC',
    topic: params.topic,
    tone: 'confident',
    headline: params.topic,
    opener: 'The move was made with a clear plan and the room understands why.',
    quotes: ['We made the move because it fits the identity we are building.'],
    reporterQuestions: [],
    effects: [],
  };
}
