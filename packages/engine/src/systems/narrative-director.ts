import type { PrngFn } from '../rng';
import type { GameState, NarrativeBeat, NarrativeIntensity, TradeOfferAsset } from '../types';
import { playerDisplayName } from '../utils';
import { calcPickValue, calcPlayerValue } from './trade-value';

const STAR_INJURY_OVR = 86;
const BLOCKBUSTER_TRADE_VALUE = 1800;

type BreakingNewsSource = 'MFSN INSIDER' | 'MFSN BREAKING' | 'LEAGUE OFFICE' | 'INJURY REPORT';

export interface BreakingNewsEvent {
  headline: string;
  detail: string;
  source: BreakingNewsSource;
  priority: 'high' | 'critical';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function beatTarget(beat: NarrativeBeat): number {
  if (beat.type === 'positive') return 50 + beat.intensity * 0.25;
  if (beat.type === 'negative') return 50 - beat.intensity * 0.25;
  return 50;
}

export function createDefaultNarrativeIntensity(): NarrativeIntensity {
  return {
    current: 50,
    recentBeats: [],
    cooldownWeeks: 0,
  };
}

export function calculateIntensity(recentBeats: NarrativeBeat[]): number {
  if (recentBeats.length === 0) return 50;
  const ordered = [...recentBeats].slice(-8);
  let weightedTotal = 0;
  let weightSum = 0;

  for (let index = 0; index < ordered.length; index += 1) {
    const distanceFromLatest = ordered.length - index - 1;
    const weight = Math.pow(0.72, distanceFromLatest);
    weightedTotal += beatTarget(ordered[index]!) * weight;
    weightSum += weight;
  }

  return clamp(Math.round((weightedTotal / Math.max(weightSum, 1)) * 100) / 100, 0, 100);
}

export function recordBeat(game: GameState, beat: NarrativeBeat): NarrativeIntensity {
  game.narrativeIntensity ??= createDefaultNarrativeIntensity();
  const intensity = game.narrativeIntensity;
  intensity.recentBeats = [...intensity.recentBeats, beat].slice(-8);
  intensity.current = calculateIntensity(intensity.recentBeats);
  intensity.cooldownWeeks = intensity.current > 70 ? 2 : intensity.current > 40 ? 1 : 0;
  return intensity;
}

export function shouldGenerateEvent(
  game: GameState,
  eventType: string,
  eventIntensity: number,
  rng: () => number,
  options?: { polarity?: NarrativeBeat['type']; mandatory?: boolean },
): boolean {
  game.narrativeIntensity ??= createDefaultNarrativeIntensity();
  if (options?.mandatory || eventType === 'breaking_news' || eventType === 'injury') {
    return true;
  }

  const polarity = options?.polarity ?? 'neutral';
  const current = game.narrativeIntensity.current;
  if (polarity === 'negative') {
    const suppressChance = current > 90 ? 0.6 : current > 70 ? 0.3 : 0;
    if (rng() < suppressChance) return false;
  }

  if (polarity === 'positive' && current < 20 && (eventIntensity >= 20 || rng() < 0.2)) {
    return true;
  }

  return true;
}

export function getCooldownStatus(game: GameState): 'hot' | 'warm' | 'cool' {
  game.narrativeIntensity ??= createDefaultNarrativeIntensity();
  if (game.narrativeIntensity.current > 70) return 'hot';
  if (game.narrativeIntensity.current >= 40) return 'warm';
  return 'cool';
}

function chooseVariant<T>(rng: PrngFn, variants: readonly T[]): T {
  return variants[Math.floor(rng() * variants.length)] ?? variants[0]!;
}

function teamLabel(game: GameState, teamId: string): string {
  const team = game.teams[teamId];
  return team ? `${team.city} ${team.name}` : teamId;
}

function parsePickId(pickId: string): { round: number; pick: number } | null {
  const parts = pickId.split('-');
  if (parts.length < 5) return null;
  const round = Number(parts[parts.length - 3]);
  const pick = Number(parts[parts.length - 2]);
  if (!Number.isFinite(round) || !Number.isFinite(pick)) return null;
  return { round, pick };
}

function assetValue(game: GameState, asset: TradeOfferAsset, acquiringTeamId: string): number {
  if (asset.type === 'player' && asset.playerId) {
    const player = game.players[asset.playerId];
    const acquiringTeam = game.teams[acquiringTeamId];
    if (!player || !acquiringTeam) return 0;
    return calcPlayerValue(game, player, acquiringTeam);
  }

  if (asset.type === 'conditional_pick' && asset.conditionalPickId) {
    const conditionalPick = game.conditionalPicks.find((entry) => entry.id === asset.conditionalPickId);
    if (!conditionalPick) return 0;
    return calcPickValue(conditionalPick.resolvedPick ?? conditionalPick.basePick);
  }

  if (!asset.pickId) return 0;
  const parsed = parsePickId(asset.pickId);
  if (!parsed) return 0;
  return calcPickValue(parsed);
}

function sumAssetValues(game: GameState, assets: TradeOfferAsset[], acquiringTeamId: string): number {
  return assets.reduce((total, asset) => total + assetValue(game, asset, acquiringTeamId), 0);
}

function buildCoachingFireNews(game: GameState, rng: PrngFn): BreakingNewsEvent[] {
  return game.leagueNews
    .filter((item) => item.type === 'coaching' && item.year === game.year && item.week === game.week)
    .filter((item) => /fired|parts with|moves on from/i.test(`${item.headline} ${item.body}`))
    .map((item) => ({
      headline: chooseVariant(rng, [
        'COACHING SHOCKWAVE HITS THE LEAGUE',
        'SIDELINE SHAKEUP JUST DROPPED',
      ]),
      detail: `${item.headline} ${item.body}`,
      source: 'MFSN BREAKING' as const,
      priority: 'critical' as const,
    }));
}

function buildTradeNews(game: GameState, rng: PrngFn): BreakingNewsEvent[] {
  const events: BreakingNewsEvent[] = [];
  const acceptedProposals = game.activeProposals.filter((proposal) => proposal.status === 'accepted');
  const acceptedOffers = game.offseasonState?.tradeOffers.filter((offer) => offer.status === 'accepted') ?? [];

  for (const proposal of acceptedProposals) {
    const totalValue = (
      sumAssetValues(game, proposal.offering, proposal.toTeamId) +
      sumAssetValues(game, proposal.requesting, proposal.fromTeamId)
    );
    if (totalValue < BLOCKBUSTER_TRADE_VALUE) continue;
    events.push({
      headline: chooseVariant(rng, [
        'BLOCKBUSTER DEAL ROCKS THE LEAGUE',
        'MEGA TRADE SENDS SHOCKWAVES',
      ]),
      detail: `${teamLabel(game, proposal.fromTeamId)} and ${teamLabel(game, proposal.toTeamId)} completed a deal worth roughly ${Math.round(totalValue)} trade-value points.`,
      source: 'MFSN INSIDER',
      priority: 'high',
    });
  }

  for (const offer of acceptedOffers) {
    const totalValue = (
      sumAssetValues(game, offer.send, offer.fromTeamId) +
      sumAssetValues(game, offer.receive, offer.toTeamId)
    );
    if (totalValue < BLOCKBUSTER_TRADE_VALUE) continue;
    events.push({
      headline: chooseVariant(rng, [
        'BLOCKBUSTER DEAL ROCKS THE LEAGUE',
        'MEGA TRADE SENDS SHOCKWAVES',
      ]),
      detail: `${teamLabel(game, offer.fromTeamId)} and ${teamLabel(game, offer.toTeamId)} pushed through a marquee move: ${offer.summary}`,
      source: 'MFSN INSIDER',
      priority: 'high',
    });
  }

  return events;
}

function buildStarInjuryNews(game: GameState, rng: PrngFn): BreakingNewsEvent[] {
  return Object.values(game.players)
    .filter((player) => player.ovr >= STAR_INJURY_OVR && player.injury?.severityTier === 'season_ending')
    .map((player) => ({
      headline: chooseVariant(rng, [
        `${playerDisplayName(player).toUpperCase()} LOST FOR THE YEAR`,
        `SEASON OVER FOR ${playerDisplayName(player).toUpperCase()}`,
      ]),
      detail: `${playerDisplayName(player)} is dealing with a ${player.injury?.type} injury and has been ruled out for the rest of the season.`,
      source: 'INJURY REPORT' as const,
      priority: 'high' as const,
    }));
}

function buildRecordNews(game: GameState, rng: PrngFn): BreakingNewsEvent[] {
  const records = game.recentBrokenRecords
    .filter((record) => record.year === game.year && record.week === game.week)
    .map((record) => ({
      headline: chooseVariant(rng, [
        'RECORD BOOK REWRITTEN',
        'HISTORY JUST CHANGED',
      ]),
      detail: `${record.playerName} broke the ${record.stat} ${record.category} mark. ${record.narrative}`,
      source: 'LEAGUE OFFICE' as const,
      priority: 'high' as const,
    }));
  const milestones = game.recentMilestones
    .filter((milestone) => milestone.year === game.year && milestone.week === game.week)
    .map((milestone) => ({
      headline: chooseVariant(rng, [
        'MILESTONE ALERT',
        'ANOTHER CAREER MARK FALLS',
      ]),
      detail: `${milestone.playerName} reached ${milestone.milestoneLabel} ${milestone.stat}. ${milestone.narrative}`,
      source: 'LEAGUE OFFICE' as const,
      priority: 'high' as const,
    }));

  return [...records, ...milestones];
}

function buildPlayoffEliminationNews(game: GameState, rng: PrngFn): BreakingNewsEvent[] {
  const userTeam = Object.values(game.teams).find((team) => team.isUser) ?? null;
  if (!userTeam || !game.playoffBracket) return [];

  const elimination = game.playoffBracket.matchups.find((matchup) =>
    matchup.result
    && matchup.result.year === game.year
    && matchup.result.week === game.week
    && [matchup.homeTeamId, matchup.awayTeamId].includes(userTeam.id)
    && matchup.winnerTeamId !== null
    && matchup.winnerTeamId !== userTeam.id);
  if (!elimination?.result) return [];

  const opponentId = elimination.homeTeamId === userTeam.id ? elimination.awayTeamId : elimination.homeTeamId;
  return [{
    headline: chooseVariant(rng, [
      `${userTeam.city.toUpperCase()} IS OUT`,
      'PLAYOFF RUN ENDS TONIGHT',
    ]),
    detail: `${teamLabel(game, userTeam.id)} was eliminated by ${teamLabel(game, opponentId)} after a ${elimination.result.homeScore}-${elimination.result.awayScore} final.`,
    source: 'MFSN BREAKING',
    priority: 'critical',
  }];
}

function buildSuperBowlMatchupNews(game: GameState, rng: PrngFn): BreakingNewsEvent[] {
  const matchup = game.playoffBracket?.matchups.find((entry) =>
    entry.round === 'super_bowl' && entry.result === null && entry.week === game.week + 1);
  if (!matchup) return [];

  return [{
    headline: chooseVariant(rng, [
      'SUPER BOWL MATCHUP IS SET',
      'THE CHAMPIONSHIP STAGE IS READY',
    ]),
    detail: `${teamLabel(game, matchup.homeTeamId)} will face ${teamLabel(game, matchup.awayTeamId)} with the title on the line.`,
    source: 'MFSN BREAKING',
    priority: 'high',
  }];
}

export function generateBreakingNews(game: GameState, rng: PrngFn): BreakingNewsEvent[] {
  return [
    ...buildCoachingFireNews(game, rng),
    ...buildTradeNews(game, rng),
    ...buildStarInjuryNews(game, rng),
    ...buildRecordNews(game, rng),
    ...buildPlayoffEliminationNews(game, rng),
    ...buildSuperBowlMatchupNews(game, rng),
  ];
}
