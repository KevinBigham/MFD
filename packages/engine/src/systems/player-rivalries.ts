import type { PrngFn } from '../rng';
import type {
  GameResult,
  PlayerRivalry,
  PlayerRivalryEvent,
  SocialPost,
  Team,
} from '../types';
import { cl } from '../utils';

function rivalryId(a: string, b: string, year: number, week: number): string {
  return `pr-${year}-${week}-${[a, b].sort().join('-')}`;
}

function matchupKey(offensePlayerId: string, defensePlayerId: string): string {
  return `${offensePlayerId}:${defensePlayerId}`;
}

function rivalryTier(intensity: number): PlayerRivalry['tier'] {
  if (intensity > 80) return 'nemesis';
  if (intensity > 50) return 'heated';
  return 'budding';
}

function existingIndex(rivalries: PlayerRivalry[], playerAId: string, playerBId: string): number {
  return rivalries.findIndex((rivalry) =>
    (rivalry.playerAId === playerAId && rivalry.playerBId === playerBId)
    || (rivalry.playerAId === playerBId && rivalry.playerBId === playerAId),
  );
}

function insertRivalry(rivalries: PlayerRivalry[], rivalry: PlayerRivalry): PlayerRivalry[] {
  const next = [...rivalries, rivalry];
  if (next.length <= 10) return next;
  next.sort((a, b) => a.intensity - b.intensity || a.seasonStarted - b.seasonStarted || a.id.localeCompare(b.id));
  next.shift();
  return next;
}

function buildHistoryEvent(result: GameResult, description: string, intensityDelta: number): PlayerRivalryEvent {
  return {
    year: result.year,
    week: result.week,
    description,
    intensityDelta,
  };
}

export function detectNewRivalries(
  gameResult: GameResult,
  homeTeam: Team,
  awayTeam: Team,
  existingRivalries: PlayerRivalry[],
  _rng: PrngFn,
): PlayerRivalry[] {
  let rivalries = [...existingRivalries];
  const counts = new Map<string, { type: 'interception' | 'sack' | 'fumble'; count: number }>();

  for (const event of gameResult.playerMatchupEvents) {
    const key = `${event.type}:${matchupKey(event.offensePlayerId, event.defensePlayerId)}`;
    const current = counts.get(key);
    counts.set(key, { type: event.type, count: (current?.count ?? 0) + 1 });
  }

  for (const [key, payload] of counts.entries()) {
    const [type, offensePlayerId, defensePlayerId] = key.split(':');
    const threshold = payload.type === 'interception' ? 2 : payload.type === 'sack' ? 3 : 1;
    if (type !== payload.type || !offensePlayerId || !defensePlayerId || payload.count < threshold) continue;
    if (existingIndex(rivalries, offensePlayerId, defensePlayerId) >= 0) continue;

    const playerA = homeTeam.roster.find((player) => player.id === offensePlayerId)
      ?? awayTeam.roster.find((player) => player.id === offensePlayerId);
    const playerB = homeTeam.roster.find((player) => player.id === defensePlayerId)
      ?? awayTeam.roster.find((player) => player.id === defensePlayerId);
    if (!playerA || !playerB) continue;

    const description = payload.type === 'interception'
      ? `${playerB.lastName} picked off ${playerA.lastName} ${payload.count} times`
      : payload.type === 'sack'
        ? `${playerB.lastName} dragged down ${playerA.lastName} ${payload.count} times`
        : `${playerB.lastName} ripped the ball away from ${playerA.lastName}`;

    rivalries = insertRivalry(rivalries, {
      id: rivalryId(playerA.id, playerB.id, gameResult.year, gameResult.week),
      playerAId: playerA.id,
      playerBId: playerB.id,
      playerAName: playerA.name,
      playerBName: playerB.name,
      teamAId: playerA.teamId ?? homeTeam.id,
      teamBId: playerB.teamId ?? awayTeam.id,
      intensity: 30,
      tier: 'budding',
      origin: `Week ${gameResult.week}, ${gameResult.year}: ${description}`,
      history: [buildHistoryEvent(gameResult, description, 30)],
      seasonStarted: gameResult.year,
    });
  }

  return rivalries;
}

export function updateRivalryFromGame(rivalry: PlayerRivalry, gameResult: GameResult): PlayerRivalry {
  const pairEvents = gameResult.playerMatchupEvents.filter((event) =>
    (event.offensePlayerId === rivalry.playerAId && event.defensePlayerId === rivalry.playerBId)
    || (event.offensePlayerId === rivalry.playerBId && event.defensePlayerId === rivalry.playerAId),
  );
  if (pairEvents.length === 0) return rivalry;

  const latest = pairEvents[pairEvents.length - 1]!;
  const playerBWon = latest.defensePlayerId === rivalry.playerBId;
  const winnerName = playerBWon ? rivalry.playerBName : rivalry.playerAName;
  const loserName = playerBWon ? rivalry.playerAName : rivalry.playerBName;
  const delta = cl(5 + pairEvents.length * 4, 5, 15);
  const intensity = cl(rivalry.intensity + delta, 0, 100);

  return {
    ...rivalry,
    intensity,
    tier: rivalryTier(intensity),
    history: [
      ...rivalry.history,
      buildHistoryEvent(gameResult, `${winnerName} got the better of ${loserName} again`, delta),
    ],
  };
}

export function getRivalryGameBonus(rivalry: PlayerRivalry, playerId: string): number {
  if (playerId !== rivalry.playerAId && playerId !== rivalry.playerBId) return 0;
  return rivalry.tier === 'nemesis' ? 3 : rivalry.tier === 'heated' ? 2 : 1;
}

export function generateRivalryTrashTalk(rivalry: PlayerRivalry, rng: PrngFn): string | null {
  if (rng() >= 0.3) return null;
  const templates = [
    `${rivalry.playerBName} told reporters: "${rivalry.playerAName.split(' ')[1] ?? rivalry.playerAName} can throw it all day. I will be waiting."`,
    `${rivalry.playerAName} said this matchup has been circled for weeks.`,
    `${rivalry.playerBName} called the rematch personal.`,
  ];
  return templates[Math.floor(rng() * templates.length)] ?? null;
}

export function createRivalryTrashTalkPost(
  rivalry: PlayerRivalry,
  week: number,
  rng: PrngFn,
): SocialPost | null {
  const content = generateRivalryTrashTalk(rivalry, rng);
  if (!content) return null;
  return {
    id: `social-rivalry-${rivalry.id}-${week}`,
    source: 'reporter',
    authorName: 'MFSN Insider',
    content,
    trigger: 'rivalry',
    sentiment: 'hype',
    likes: 180 + Math.floor(rng() * 220),
    timestamp: week,
  };
}

export function decayRivalries(rivalries: PlayerRivalry[], currentYear: number): PlayerRivalry[] {
  return rivalries
    .map((rivalry) => {
      const lastYear = rivalry.history.at(-1)?.year ?? rivalry.seasonStarted;
      const yearsElapsed = Math.max(0, currentYear - lastYear);
      const intensity = cl(rivalry.intensity - yearsElapsed * 5, 0, 100);
      return {
        ...rivalry,
        intensity,
        tier: rivalryTier(intensity),
      };
    })
    .filter((rivalry) => rivalry.intensity >= 10);
}

export function getActiveRivalries(rivalries: PlayerRivalry[], playerId: string): PlayerRivalry[] {
  return rivalries.filter((rivalry) => rivalry.playerAId === playerId || rivalry.playerBId === playerId);
}
