import { mulberry32, uid } from '../rng';
import type { AgentProfile, ContractOffer, GameState, Player, ReSignDecision, Team } from '../types';
import { recordNewsItem } from './league-news';

const FIRST_NAMES = ['Parker', 'Jordan', 'Avery', 'Mason', 'Quinn', 'Rowan', 'Harper', 'Logan', 'Casey', 'Blake', 'Skyler', 'Riley'];
const LAST_NAMES = ['Stone', 'Carter', 'Lane', 'Bishop', 'Price', 'Reed', 'Hale', 'Brooks', 'Quade', 'Bennett', 'Pike', 'Dawson'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function offerScore(offer: ContractOffer): number {
  return offer.salary * 10 + offer.guaranteed * 1.5 + offer.signingBonus + offer.years * 2;
}

function ratioToDemand(offer: ContractOffer, demand: ContractOffer): number {
  return offerScore(offer) / Math.max(offerScore(demand), 1);
}

function playerById(team: Team, playerId: string): Player | null {
  return team.roster.find((player) => player.id === playerId) ?? null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function styleBias(style: AgentProfile['style']): number {
  if (style === 'hardball') return 1.15;
  if (style === 'collaborative') return 0.95;
  if (style === 'media_savvy') return 1.05;
  return 1;
}

function styleForPlayer(player: Player): AgentProfile['style'] {
  if (player.personality.greed >= 8) return 'hardball';
  if (player.personality.loyalty >= 8) return 'collaborative';
  if (player.personality.pressure >= 8 || player.traits.includes('media_darling')) return 'media_savvy';
  return 'old_school';
}

function findDecision(game: GameState, playerId: string): ReSignDecision | null {
  return game.offseasonState?.reSignDecisions[playerId] ?? null;
}

function createAgentSeededRng(game: GameState): () => number {
  const playerCount = Object.keys(game.players).length;
  const seed = (game.seed ^ (game.year * 7919) ^ (playerCount * 3571) ^ 0x41a63d5) >>> 0;
  return mulberry32(seed);
}

export function generateAgentPool(rng: () => number, count = 8 + Math.floor(rng() * 5)): AgentProfile[] {
  return Array.from({ length: count }, (_, index) => {
    const styleRoll = rng();
    const style: AgentProfile['style'] = styleRoll < 0.25
      ? 'hardball'
      : styleRoll < 0.5
        ? 'collaborative'
        : styleRoll < 0.75
          ? 'media_savvy'
          : 'old_school';
    const demandMultiplier = style === 'hardball'
      ? round1(1.15 + rng() * 0.15)
      : style === 'collaborative'
        ? round1(0.9 + rng() * 0.08)
        : style === 'media_savvy'
          ? round1(1.02 + rng() * 0.1)
          : round1(0.98 + rng() * 0.08);
    const patienceModifier = style === 'collaborative' ? -1 : 1;

    return {
      id: `agent-${index + 1}`,
      name: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[(index * 3) % LAST_NAMES.length]}`,
      style,
      demandMultiplier,
      patienceModifier,
      clients: [],
    };
  });
}

function pickAgent(game: GameState, player: Player): AgentProfile {
  const preferredStyle = styleForPlayer(player);
  const matching = game.agents.filter((agent) => agent.style === preferredStyle);
  const pool = matching.length > 0 ? matching : game.agents;
  return [...pool].sort((a, b) => a.clients.length - b.clients.length || a.id.localeCompare(b.id))[0]!;
}

export function ensureAgentsInitialized(game: GameState, rng?: () => number): AgentProfile[] {
  game.agents ??= [];
  if (game.agents.length === 0) {
    game.agents = generateAgentPool(rng ?? createAgentSeededRng(game));
  }

  for (const player of Object.values(game.players).sort((a, b) => a.id.localeCompare(b.id))) {
    if (player.agentId) continue;
    const agent = pickAgent(game, player);
    player.agentId = agent.id;
    if (!agent.clients.includes(player.id)) {
      agent.clients.push(player.id);
      agent.clients.sort();
    }
  }

  for (const team of Object.values(game.teams)) {
    for (const player of team.roster) {
      if (!player.agentId) {
        player.agentId = game.players[player.id]?.agentId ?? null;
      }
    }
  }

  return game.agents;
}

export function getPlayerAgent(game: GameState, playerId: string): AgentProfile | null {
  const player = game.players[playerId];
  if (!player?.agentId) return null;
  return game.agents.find((agent) => agent.id === player.agentId) ?? null;
}

export function getAgentPatienceWeeks(agent: AgentProfile): number {
  const base = agent.style === 'collaborative' ? 1 : 2;
  return clamp(base + agent.patienceModifier, 0, 4);
}

export function agentDemand(
  player: Player,
  agent: AgentProfile,
  market: { baseOffer: ContractOffer; topFiveAtPosition: boolean },
): ContractOffer {
  const multiplier = styleBias(agent.style) * agent.demandMultiplier * (market.topFiveAtPosition ? 1.1 : 1);
  return {
    years: market.baseOffer.years,
    salary: round1(market.baseOffer.salary * multiplier),
    signingBonus: round1(market.baseOffer.signingBonus * multiplier),
    guaranteed: round1(market.baseOffer.guaranteed * multiplier),
  };
}

export function negotiateOffer(
  game: GameState,
  teamId: string,
  playerId: string,
  offer: ContractOffer,
): ReSignDecision {
  const decision = findDecision(game, playerId);
  if (!decision) {
    throw new Error(`Missing re-sign decision for ${playerId}`);
  }

  const player = playerById(game.teams[teamId]!, playerId) ?? game.players[playerId];
  const agent = getPlayerAgent(game, playerId);
  decision.lastOffer = offer;

  const ratio = ratioToDemand(offer, decision.agentDemand);
  if (ratio >= 0.9) {
    decision.status = 'accepted';
    decision.counterOffer = null;
    decision.agentResponse = `${agent?.name ?? 'Agent'} says the deal is close enough to sign.`;
    return decision;
  }

  if (ratio >= 0.8) {
    decision.status = 'countered';
    decision.counterOffer = {
      years: decision.agentDemand.years,
      salary: round1((offer.salary + decision.agentDemand.salary) / 2),
      signingBonus: round1((offer.signingBonus + decision.agentDemand.signingBonus) / 2),
      guaranteed: round1((offer.guaranteed + decision.agentDemand.guaranteed) / 2),
    };
    decision.agentResponse = `${agent?.name ?? 'Agent'} counters for a middle ground on ${player?.name ?? 'the player'}.`;
    return decision;
  }

  decision.status = 'declined';
  decision.counterOffer = null;
  decision.agentResponse = `${agent?.name ?? 'Agent'} rejects the offer as too far from market value.`;
  return decision;
}

export function holdoutCheck(game: GameState, teamId: string, playerId: string): boolean {
  const team = game.teams[teamId];
  if (!team) return false;
  const player = playerById(team, playerId);
  const decision = findDecision(game, playerId);
  if (!player || !decision || player.contract !== null) return false;

  const ratio = decision.lastOffer ? ratioToDemand(decision.lastOffer, decision.agentDemand) : 0;
  if (ratio >= 0.9) return false;

  if (decision.patienceWeeksRemaining > 0) {
    decision.patienceWeeksRemaining -= 1;
    return false;
  }

  player.holdout = true;
  player.isStarter = false;
  player.morale = Math.max(0, player.morale - 20);
  decision.agentResponse = `${player.name} is now holding out while ${getPlayerAgent(game, playerId)?.name ?? 'his agent'} waits for movement.`;
  recordNewsItem(game, {
    id: `holdout-${player.id}-${game.year}-${game.week}`,
    year: game.year,
    week: game.week,
    type: 'milestone',
    headline: `${player.name} starts a contract holdout`,
    body: `${player.name} stayed away from team activities as contract talks stalled.`,
    teamIds: [teamId],
    playerIds: [player.id],
    importance: 'major',
  });
  return true;
}

export function agentMediaLeak(game: GameState, rng: () => number, playerId: string): boolean {
  const player = game.players[playerId];
  const agent = getPlayerAgent(game, playerId);
  if (!player?.holdout || !agent || rng() > 0.15) return false;

  const headline = `${agent.name} leaks pressure around ${player.name}`;
  game.offFieldEvents.push({
    id: `agent-leak-${uid()}`,
    type: 'agent_media_leak',
    category: 'media',
    week: game.week,
    year: game.year,
    playerIds: [player.id],
    teamId: player.teamId ?? '',
    headline,
    description: `${agent.name} pushed the contract fight into the media cycle while ${player.name} remains away from the club.`,
    effects: [],
  });
  recordNewsItem(game, {
    id: `agent-leak-news-${player.id}-${game.year}-${game.week}`,
    year: game.year,
    week: game.week,
    type: 'milestone',
    headline,
    body: `${agent.name} publicly escalated the contract standoff for ${player.name}.`,
    teamIds: player.teamId ? [player.teamId] : [],
    playerIds: [player.id],
    importance: 'major',
  });
  return true;
}

export function processCarryoverHoldouts(game: GameState, teamId: string, rng: () => number): void {
  const team = game.teams[teamId];
  if (!team) return;

  for (const player of [...team.roster]) {
    if (player.teamId !== team.id || player.contract !== null || !player.agentId) continue;
    const agent = getPlayerAgent(game, player.id);
    if (!agent) continue;

    const patience = Number(player.careerStats.holdoutPatienceWeeksRemaining ?? -1);
    if (!player.holdout && patience > 0) {
      player.careerStats.holdoutPatienceWeeksRemaining = patience - 1;
      continue;
    }

    if (!player.holdout && patience === 0) {
      player.holdout = true;
      player.isStarter = false;
      player.morale = Math.max(0, player.morale - 20);
      player.careerStats.holdoutPatienceWeeksRemaining = -1;
      player.careerStats.holdoutWalkWeeksRemaining = Math.max(1, getAgentPatienceWeeks(agent));
      recordNewsItem(game, {
        id: `holdout-${player.id}-${game.year}-${game.week}`,
        year: game.year,
        week: game.week,
        type: 'milestone',
        headline: `${player.name} escalates into a holdout`,
        body: `${player.name} stayed away from the club as ${agent.name} kept contract pressure on the front office.`,
        teamIds: [team.id],
        playerIds: [player.id],
        importance: 'major',
      });
      continue;
    }

    if (!player.holdout) continue;
    agentMediaLeak(game, rng, player.id);
    const walkWeeksRemaining = Number(player.careerStats.holdoutWalkWeeksRemaining ?? 0);
    if (walkWeeksRemaining > 0) {
      player.careerStats.holdoutWalkWeeksRemaining = walkWeeksRemaining - 1;
      continue;
    }

    player.holdout = false;
    player.teamId = null;
    team.roster = team.roster.filter((candidate) => candidate.id !== player.id);
    if (!game.freeAgents.includes(player.id)) {
      game.freeAgents.push(player.id);
    }
    recordNewsItem(game, {
      id: `walk-${player.id}-${game.year}-${game.week}`,
      year: game.year,
      week: game.week,
      type: 'signing',
      headline: `${player.name} is headed to free agency`,
      body: `${agent.name} ended the standoff and sent ${player.name} to the open market.`,
      teamIds: [team.id],
      playerIds: [player.id],
      importance: 'major',
    });
  }
}
