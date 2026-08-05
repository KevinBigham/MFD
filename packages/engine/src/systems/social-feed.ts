import type {
  BrokenRecord,
  BroadcastOutput,
  GameResult,
  GameState,
  MilestoneReached,
  Player,
  RecordChase,
  SocialPost,
  SocialTrigger,
  Team,
} from '../types';
import type { PrngFn } from '../rng';
import { playerDisplayName } from '../utils';

const ANALYSTS = ['Sarah Chen, MFSN', 'Marcus Vega, MFSN', 'Jordan Price, MFSN'] as const;
const REPORTERS = ['Noah Lane, MFSN', 'Avery Brooks, MFSN', 'Taylor Quinn, MFSN'] as const;

function pickWithRng<T>(items: readonly T[], rng: PrngFn): T {
  return items[Math.floor(rng() * items.length)]!;
}

function randInt(rng: PrngFn, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function makeId(prefix: string, timestamp: number, rng: PrngFn): string {
  return `${prefix}-${timestamp}-${Math.floor(rng() * 1_000_000).toString(36)}`;
}

function likesFor(excitement: number, rng: PrngFn, floor = 120): number {
  return Math.round(floor + excitement * 1200 + randInt(rng, 0, 180));
}

function teamLabel(team: Team | undefined): string {
  return team ? `${team.city} ${team.name}` : 'League team';
}

function playerMap(players: Player[]): Record<string, Player> {
  return players.reduce<Record<string, Player>>((map, player) => {
    map[player.id] = player;
    return map;
  }, {});
}

function primaryHighlightName(highlight: BroadcastOutput['highlights'][number] | undefined, players: Record<string, Player>): string {
  if (!highlight) return 'Somebody';
  const first = highlight.playerIds[0];
  return first ? players[first]?.name ?? first : 'Somebody';
}

function buildPost(
  partial: Omit<SocialPost, 'id'>,
  timestamp: number,
  prefix: string,
  rng: PrngFn,
): SocialPost {
  return {
    id: makeId(prefix, timestamp, rng),
    ...partial,
  };
}

function postSentimentForTrigger(trigger: SocialTrigger): SocialPost['sentiment'] {
  if (trigger === 'big_play' || trigger === 'achievement' || trigger === 'upset' || trigger === 'record') return 'hype';
  if (trigger === 'trade') return 'neutral';
  if (trigger === 'injury') return 'negative';
  return 'positive';
}

export function createGovernancePost(
  content: string,
  week: number,
  rng: PrngFn,
  options?: {
    sentiment?: SocialPost['sentiment'];
    authorName?: string;
    source?: SocialPost['source'];
  },
): SocialPost {
  return buildPost({
    source: options?.source ?? 'reporter',
    authorName: options?.authorName ?? pickWithRng(REPORTERS, rng),
    authorPlayerId: undefined,
    content,
    trigger: 'governance',
    sentiment: options?.sentiment ?? 'neutral',
    likes: likesFor(0.52, rng, 160),
    timestamp: week,
    replyTo: undefined,
  }, week, 'governance', rng);
}

export function createLaborPost(
  content: string,
  week: number,
  rng: PrngFn,
  options?: {
    sentiment?: SocialPost['sentiment'];
    authorName?: string;
    source?: SocialPost['source'];
  },
): SocialPost {
  return buildPost({
    source: options?.source ?? 'reporter',
    authorName: options?.authorName ?? pickWithRng(REPORTERS, rng),
    authorPlayerId: undefined,
    content,
    trigger: 'labor',
    sentiment: options?.sentiment ?? 'neutral',
    likes: likesFor(0.5, rng, 150),
    timestamp: week,
    replyTo: undefined,
  }, week, 'labor', rng);
}

export function generatePlayerReaction(
  player: Player,
  trigger: SocialTrigger,
  context: string,
  rng: PrngFn,
): SocialPost {
  let content: string;
  if (player.traits.includes('showtime')) {
    content = `The lights were hot and I stayed hotter. ${context}`;
  } else if (player.traits.includes('captain') || player.personality.workEthic >= 8) {
    content = `That is what the work is for. Team first, earned together. ${context}`;
  } else if (player.personality.greed >= 8) {
    content = `Respect the value. This game is business too. ${context}`;
  } else if (player.personality.ambition >= 8) {
    content = `Not satisfied. We are chasing bigger goals than one headline. ${context}`;
  } else {
    content = pickWithRng([
      `Appreciate the noise, but there is more ball ahead. ${context}`,
      `Fun moment, but the next one matters even more. ${context}`,
      `We will enjoy it tonight and get back to work tomorrow. ${context}`,
    ], rng);
  }

  return buildPost({
    source: 'player',
    authorName: playerDisplayName(player),
    authorPlayerId: player.id,
    content,
    trigger,
    sentiment: postSentimentForTrigger(trigger),
    likes: likesFor(0.6, rng, 180),
    timestamp: 0,
    replyTo: undefined,
  }, 0, `player-${player.id}`, rng);
}

export function generateGameDayPosts(
  broadcast: BroadcastOutput,
  gameResult: GameResult,
  teams: Record<string, Team>,
  players: Player[],
  week: number,
  rng: PrngFn,
): SocialPost[] {
  const mappedPlayers = playerMap(players);
  const home = teams[gameResult.homeTeamId];
  const away = teams[gameResult.awayTeamId];
  const winner = gameResult.homeScore >= gameResult.awayScore ? home : away;
  const loser = winner?.id === home?.id ? away : home;
  const topHighlight = broadcast.highlights[0];
  const secondHighlight = broadcast.highlights[1];
  const starName = primaryHighlightName(topHighlight, mappedPlayers);
  const secondName = primaryHighlightName(secondHighlight, mappedPlayers);

  const analystLead = buildPost({
    source: 'analyst',
    authorName: pickWithRng(ANALYSTS, rng),
    authorPlayerId: undefined,
    content: `Hot take: ${starName} just owned the biggest moment in ${teamLabel(home)} vs ${teamLabel(away)}.`,
    trigger: topHighlight?.isClutch ? 'big_play' : 'weekly',
    sentiment: topHighlight?.excitement && topHighlight.excitement >= 0.8 ? 'hype' : 'positive',
    likes: likesFor(topHighlight?.excitement ?? 0.55, rng, 220),
    timestamp: week,
    replyTo: undefined,
  }, week, 'gameday-analyst', rng);

  const reporterLead = buildPost({
    source: 'reporter',
    authorName: pickWithRng(REPORTERS, rng),
    authorPlayerId: undefined,
    content: `${teamLabel(winner)} closes out ${teamLabel(loser)} ${gameResult.homeScore}-${gameResult.awayScore}. ${broadcast.finalNarrative}`,
    trigger: 'weekly',
    sentiment: 'neutral',
    likes: likesFor(0.48, rng, 140),
    timestamp: week,
    replyTo: undefined,
  }, week, 'gameday-reporter', rng);

  const fanHype = buildPost({
    source: 'fan',
    authorName: `${winner?.abbr ?? 'TEAM'}Faithful_${randInt(rng, 10, 99)}`,
    authorPlayerId: undefined,
    content: winner ? `${winner.name} fans are ready to believe this group can beat anyone.` : 'That one had the timeline buzzing.',
    trigger: 'weekly',
    sentiment: 'hype',
    likes: likesFor(0.42, rng, 90),
    timestamp: week,
    replyTo: analystLead.id,
  }, week, 'gameday-fan', rng);

  const fanReply = buildPost({
    source: 'fan',
    authorName: `${loser?.abbr ?? 'TEAM'}Debate_${randInt(rng, 10, 99)}`,
    authorPlayerId: undefined,
    content: loser ? `${loser.name} fans are tired of watching this same movie.` : 'That one is going to sting.',
    trigger: 'weekly',
    sentiment: winner?.id === home?.id ? 'negative' : 'sarcastic',
    likes: likesFor(0.31, rng, 70),
    timestamp: week,
    replyTo: analystLead.id,
  }, week, 'gameday-fan-reply', rng);

  const posts: SocialPost[] = [analystLead, reporterLead, fanHype, fanReply];

  const playerId = topHighlight?.playerIds.find((id) => mappedPlayers[id]);
  if (playerId) {
    const reaction = generatePlayerReaction(
      mappedPlayers[playerId]!,
      topHighlight?.type === 'touchdown' ? 'achievement' : 'big_play',
      topHighlight?.commentary ?? broadcast.finalNarrative,
      rng,
    );
    posts.push({
      ...reaction,
      id: makeId(`gameday-player-${playerId}`, week, rng),
      timestamp: week,
      likes: likesFor(topHighlight?.excitement ?? 0.7, rng, 240),
      replyTo: reporterLead.id,
    });
  }

  if (secondHighlight) {
    posts.push(buildPost({
      source: 'analyst',
      authorName: pickWithRng(ANALYSTS, rng),
      authorPlayerId: undefined,
      content: `${secondName} deserves credit too. That swing changed the feel of the fourth quarter.`,
      trigger: 'big_play',
      sentiment: secondHighlight.type === 'turnover' ? 'hype' : 'positive',
      likes: likesFor(secondHighlight.excitement, rng, 180),
      timestamp: week,
      replyTo: analystLead.id,
    }, week, 'gameday-follow', rng));
  }

  return posts.slice(0, 10);
}

export function generateTransactionPosts(
  type: 'trade' | 'signing' | 'cut' | 'draft_pick',
  details: { playerNames: string[]; teamNames: string[]; context?: string },
  rng: PrngFn,
): SocialPost[] {
  const playerText = details.playerNames.join(', ');
  const teamText = details.teamNames.join(' / ');
  const timestamp = 0;

  if (type === 'trade') {
    const reporter = buildPost({
      source: 'reporter',
      authorName: pickWithRng(REPORTERS, rng),
      authorPlayerId: undefined,
      content: `Breaking: ${teamText} just shook up the board with a trade involving ${playerText}. ${details.context ?? ''}`.trim(),
      trigger: 'trade',
      sentiment: 'neutral',
      likes: likesFor(0.82, rng, 260),
      timestamp,
      replyTo: undefined,
    }, timestamp, 'trade-reporter', rng);
    const analyst = buildPost({
      source: 'analyst',
      authorName: pickWithRng(ANALYSTS, rng),
      authorPlayerId: undefined,
      content: `Trade grade: ${teamText} just made the kind of move that gets argued about for a week.`,
      trigger: 'trade',
      sentiment: 'hype',
      likes: likesFor(0.66, rng, 180),
      timestamp,
      replyTo: reporter.id,
    }, timestamp, 'trade-analyst', rng);
    const fan = buildPost({
      source: 'fan',
      authorName: `TradeTracker_${randInt(rng, 10, 99)}`,
      authorPlayerId: undefined,
      content: `${playerText} in that deal? ${teamText} just lit up the feed.`,
      trigger: 'trade',
      sentiment: 'hype',
      likes: likesFor(0.58, rng, 120),
      timestamp,
      replyTo: reporter.id,
    }, timestamp, 'trade-fan', rng);
    return [reporter, analyst, fan];
  }

  if (type === 'signing') {
    const team = details.teamNames[0] ?? 'A team';
    const player = details.playerNames[0] ?? 'A player';
    const official = buildPost({
      source: 'team',
      authorName: `${team} PR`,
      authorPlayerId: undefined,
      content: `Official: ${team} welcomes ${player}.`,
      trigger: 'signing',
      sentiment: 'positive',
      likes: likesFor(0.55, rng, 160),
      timestamp,
      replyTo: undefined,
    }, timestamp, 'signing-team', rng);
    const analyst = buildPost({
      source: 'analyst',
      authorName: pickWithRng(ANALYSTS, rng),
      authorPlayerId: undefined,
      content: `${team} lands ${player}, and the room looks better immediately.`,
      trigger: 'signing',
      sentiment: 'positive',
      likes: likesFor(0.63, rng, 170),
      timestamp,
      replyTo: official.id,
    }, timestamp, 'signing-analyst', rng);
    return [official, analyst];
  }

  return [buildPost({
    source: 'reporter',
    authorName: pickWithRng(REPORTERS, rng),
    authorPlayerId: undefined,
    content: `${teamText} makes a ${type.replaceAll('_', ' ')} move around ${playerText}.`,
    trigger: type === 'draft_pick' ? 'draft_pick' : 'weekly',
    sentiment: 'neutral',
    likes: likesFor(0.38, rng, 100),
    timestamp,
    replyTo: undefined,
  }, timestamp, `${type}-reporter`, rng)];
}

export function createRecordBreakingPost(
  record: BrokenRecord,
  week: number,
  rng: PrngFn,
): SocialPost {
  return buildPost({
    source: 'reporter',
    authorName: pickWithRng(REPORTERS, rng),
    authorPlayerId: undefined,
    content: `${record.playerName} just broke the ${record.category === 'singleSeason' ? 'single-season' : 'single-game'} ${record.stat} record. ${record.newValue} passes ${record.previousHolder}'s ${record.previousValue}.`,
    trigger: 'record',
    sentiment: 'hype',
    likes: likesFor(0.88, rng, 280),
    timestamp: week,
    replyTo: undefined,
  }, week, 'record-post', rng);
}

export function createMilestonePost(
  milestone: MilestoneReached,
  week: number,
  rng: PrngFn,
): SocialPost {
  return buildPost({
    source: 'reporter',
    authorName: pickWithRng(REPORTERS, rng),
    authorPlayerId: undefined,
    content: `${milestone.playerName} reaches ${milestone.milestoneLabel}. ${milestone.value} career ${milestone.stat} and counting.`,
    trigger: 'milestone',
    sentiment: 'positive',
    likes: likesFor(0.64, rng, 190),
    timestamp: week,
    replyTo: undefined,
  }, week, 'milestone-post', rng);
}

export function createRecordChasePost(
  chase: RecordChase,
  week: number,
  rng: PrngFn,
): SocialPost {
  return buildPost({
    source: 'analyst',
    authorName: pickWithRng(ANALYSTS, rng),
    authorPlayerId: undefined,
    content: `${chase.playerName} is on pace for ${chase.projected} ${chase.stat} this season. The record is ${chase.recordValue}. ${chase.weeksRemaining} games to go.`,
    trigger: 'record',
    sentiment: 'hype',
    likes: likesFor(0.56, rng, 160),
    timestamp: week,
    replyTo: undefined,
  }, week, 'record-chase', rng);
}

export function createCapMovePost(
  team: Team,
  playerName: string,
  moveType: string,
  savings: number,
  week: number,
  rng: PrngFn,
): SocialPost {
  return buildPost({
    source: 'analyst',
    authorName: pickWithRng(ANALYSTS, rng),
    authorPlayerId: undefined,
    content: `${team.city} ${team.name} freed up $${roundMillion(savings)}M in cap space with a ${moveType.replaceAll('_', ' ')} of ${playerName}.`,
    trigger: 'trade',
    sentiment: 'neutral',
    likes: likesFor(0.45, rng, 150),
    timestamp: week,
    replyTo: undefined,
  }, week, 'cap-move', rng);
}

function roundMillion(value: number): string {
  return round(value).toFixed(1);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function generateWeeklyBuzz(gameState: GameState, week: number, rng: PrngFn): SocialPost[] {
  const teams = Object.values(gameState.teams).sort((left, right) =>
    right.wins - left.wins ||
    right.seasonStats.pointDifferential - left.seasonStats.pointDifferential ||
    left.id.localeCompare(right.id));
  const surging = teams[0];
  const wobbling = teams[teams.length - 1];
  const milestonePlayer = Object.values(gameState.players)
    .filter((player) => player.teamId)
    .sort((left, right) =>
      ((right.stats.passYds + right.stats.rushYds + right.stats.recYds) - (left.stats.passYds + left.stats.rushYds + left.stats.recYds)) ||
      left.id.localeCompare(right.id))[0];

  const boldPrediction = buildPost({
    source: 'analyst',
    authorName: pickWithRng(ANALYSTS, rng),
    authorPlayerId: undefined,
    content: `Bold prediction: ${teamLabel(surging)} keeps rolling and grabs the next marquee window.`,
    trigger: 'weekly',
    sentiment: 'hype',
    likes: likesFor(0.5, rng, 180),
    timestamp: week,
    replyTo: undefined,
  }, week, 'weekly-bold', rng);

  const powerDebate = buildPost({
    source: 'analyst',
    authorName: pickWithRng(ANALYSTS, rng),
    authorPlayerId: undefined,
    content: `${teamLabel(surging)} looks like the hottest team in the league right now.`,
    trigger: 'weekly',
    sentiment: 'positive',
    likes: likesFor(0.42, rng, 130),
    timestamp: week,
    replyTo: undefined,
  }, week, 'weekly-power', rng);

  const fanPulse = buildPost({
    source: 'fan',
    authorName: `${wobbling?.abbr ?? 'TEAM'}Pulse_${randInt(rng, 10, 99)}`,
    authorPlayerId: undefined,
    content: wobbling ? `${wobbling.name} fans are asking hard questions after another rough stretch.` : 'The bottom of the league is getting noisy.',
    trigger: 'weekly',
    sentiment: 'sarcastic',
    likes: likesFor(0.27, rng, 90),
    timestamp: week,
    replyTo: undefined,
  }, week, 'weekly-fan', rng);

  const milestone = buildPost({
    source: 'reporter',
    authorName: pickWithRng(REPORTERS, rng),
    authorPlayerId: undefined,
    content: milestonePlayer
      ? `${milestonePlayer.name} is quietly building a milestone pace season.`
      : 'A few league milestones are starting to come into view.',
    trigger: 'milestone',
    sentiment: 'neutral',
    likes: likesFor(0.33, rng, 110),
    timestamp: week,
    replyTo: undefined,
  }, week, 'weekly-milestone', rng);

  return [boldPrediction, powerDebate, fanPulse, milestone];
}

export function appendToSocialFeed(feed: SocialPost[], newPosts: SocialPost[]): SocialPost[] {
  return [...feed, ...newPosts].slice(-100);
}
