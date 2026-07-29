import { cl } from '../utils';
import type { GameState, Player, SpecialTeamsGameSummary, SpecialTeamsState, Team } from '../types';

type RandomFn = () => number;

export interface ReturnOutcome {
  yards: number;
  touchdown: boolean;
  fumble: boolean;
}

export interface SimulatedSpecialTeamsSide extends SpecialTeamsGameSummary {
  touchbackRate: number;
}

export interface SimulatedSpecialTeamsResult {
  home: SimulatedSpecialTeamsSide;
  away: SimulatedSpecialTeamsSide;
}

export interface SpecialTeamsSelectionOptions {
  isPlayerAvailable?: (player: Player) => boolean;
}

function isSelectable(player: Player, options: SpecialTeamsSelectionOptions): boolean {
  return options.isPlayerAvailable?.(player) ?? true;
}

function eligibleReturners(team: Team, options: SpecialTeamsSelectionOptions): Player[] {
  return team.roster
    .filter((player) =>
      isSelectable(player, options)
      && (player.pos === 'RB' || player.pos === 'WR')
      && (player.ratings.speed ?? player.ovr) > 75)
    .sort((a, b) =>
      (b.ratings.speed ?? b.ovr) - (a.ratings.speed ?? a.ovr) ||
      b.ovr - a.ovr ||
      a.id.localeCompare(b.id));
}

function coverageUnit(team: Team, options: SpecialTeamsSelectionOptions = {}): Player[] {
  return team.roster
    .filter((player) => isSelectable(player, options) && ['DL', 'LB', 'CB', 'S'].includes(player.pos))
    .sort((a, b) =>
      b.ovr - a.ovr ||
      a.id.localeCompare(b.id))
    .slice(0, 6);
}

function isInjuryAvailable(player: Player): boolean {
  return !player.injury
    || (
      player.injury.gamesOut <= 0
      && player.injury.severity !== 'out'
      && player.injury.severity !== 'ir'
    );
}

function awarenessScore(player: Player): number {
  return (player.ratings.awareness ?? player.ovr) + player.ovr * 0.35;
}

function selectLongSnapper(team: Team, options: SpecialTeamsSelectionOptions): Player | null {
  return team.roster
    .filter((player) => isSelectable(player, options) && (player.pos === 'OL' || player.pos === 'TE'))
    .sort((a, b) =>
      awarenessScore(b) - awarenessScore(a) ||
      a.id.localeCompare(b.id))[0] ?? null;
}

function resolvePlayer(team: Team, playerId: string | null): Player | null {
  if (!playerId) return null;
  return team.roster.find((player) => player.id === playerId) ?? null;
}

function resolveAvailablePlayer(team: Team, playerId: string | null): Player | null {
  const player = resolvePlayer(team, playerId);
  return player && isInjuryAvailable(player) ? player : null;
}

function averageCoverage(team: Team, unitIds: string[]): number {
  const unit = unitIds
    .map((playerId) => resolvePlayer(team, playerId))
    .filter((player): player is Player => player !== null && isInjuryAvailable(player));
  const players = unit.length > 0
    ? unit
    : coverageUnit(team, { isPlayerAvailable: isInjuryAvailable });
  if (players.length === 0) return 70;
  return players.reduce((total, player) => total + player.ovr, 0) / players.length;
}

function summarizeReturn(returner: Player | null, label: string, outcome: ReturnOutcome): string | null {
  if (!returner) return null;
  if (outcome.touchdown) return `${returner.name} broke a ${label} all the way back for six.`;
  if (outcome.fumble) return `${returner.name} coughed up a ${label} after ${outcome.yards} yards.`;
  if (outcome.yards >= 35) return `${returner.name} ripped off a ${outcome.yards}-yard ${label}.`;
  return null;
}

function kickerTouchbackRate(team: Team): number {
  const kicker = team.roster.find((player) => player.pos === 'K');
  return cl(((kicker?.ovr ?? 72) - 55) / 45, 0.25, 0.9);
}

function punterNetAverage(team: Team): number {
  const punter = team.roster.find((player) => player.pos === 'P');
  return cl(35 + ((punter?.ovr ?? 70) - 60) * 0.25, 34, 49);
}

function summarizeSide(team: Team, returnerId: string | null, puntReturnerId: string | null, opponentCoverage: number, random: RandomFn): SimulatedSpecialTeamsSide {
  const kickReturner = resolveAvailablePlayer(team, returnerId);
  const puntReturner = resolveAvailablePlayer(team, puntReturnerId);
  const kickReturn = calculateReturnYards(kickReturner, opponentCoverage, random);
  const puntReturn = calculateReturnYards(puntReturner, opponentCoverage + 3, random);
  const touchbackRate = kickerTouchbackRate(team);
  const touchbacks = Math.round(touchbackRate * 5);
  const highlights = [
    summarizeReturn(kickReturner, 'kick return', kickReturn),
    summarizeReturn(puntReturner, 'punt return', puntReturn),
  ].filter((entry): entry is string => Boolean(entry));

  return {
    kickReturnYards: kickReturn.yards,
    puntReturnYards: puntReturn.yards,
    returnTouchdowns: Number(kickReturn.touchdown) + Number(puntReturn.touchdown),
    returnFumbles: Number(kickReturn.fumble) + Number(puntReturn.fumble),
    touchbacks,
    netPuntAverage: punterNetAverage(team),
    touchbackRate,
    highlights,
  };
}

export function createDefaultSpecialTeamsState(): SpecialTeamsState {
  return {
    kickReturner: null,
    puntReturner: null,
    longSnapper: null,
    kickCoverageUnit: [],
    puntCoverageUnit: [],
  };
}

export function buildSpecialTeamsState(
  team: Team,
  options: SpecialTeamsSelectionOptions = {},
): SpecialTeamsState {
  const speedsters = eligibleReturners(team, options);
  const longSnapper = selectLongSnapper(team, options);
  const kickCoverage = coverageUnit(team, options).map((player) => player.id);

  return {
    kickReturner: speedsters[0]?.id ?? null,
    puntReturner: speedsters[0]?.id ?? speedsters[1]?.id ?? null,
    longSnapper: longSnapper?.id ?? null,
    kickCoverageUnit: kickCoverage,
    puntCoverageUnit: [...kickCoverage],
  };
}

export function assignKickReturner(game: GameState, teamId: string, playerId: string): SpecialTeamsState {
  const team = game.teams[teamId];
  if (!team) throw new Error(`Unknown team: ${teamId}`);
  team.specialTeams ??= buildSpecialTeamsState(team);
  team.specialTeams.kickReturner = playerId;
  return team.specialTeams;
}

export function assignPuntReturner(game: GameState, teamId: string, playerId: string): SpecialTeamsState {
  const team = game.teams[teamId];
  if (!team) throw new Error(`Unknown team: ${teamId}`);
  team.specialTeams ??= buildSpecialTeamsState(team);
  team.specialTeams.puntReturner = playerId;
  return team.specialTeams;
}

export function autoAssignSpecialTeams(game: GameState, teamId: string): SpecialTeamsState {
  const team = game.teams[teamId];
  if (!team) throw new Error(`Unknown team: ${teamId}`);
  team.specialTeams = buildSpecialTeamsState(team);
  return team.specialTeams;
}

export function calculateReturnYards(
  returner: Player | null,
  coverageOvr: number,
  random: RandomFn,
): ReturnOutcome {
  const speed = returner ? (returner.ratings.speed ?? returner.ovr) : 70;
  const returnOvr = returner?.ovr ?? 70;
  const burst = (speed - coverageOvr) * 0.45 + (returnOvr - 75) * 0.25;
  const yards = Math.max(0, Math.round(20 + burst + (random() - 0.5) * 10));
  const touchdownChance = returner && returnOvr >= 85 ? 0.05 : 0.01;
  const security = returner ? (returner.ratings.ballSecurity ?? returner.ratings.awareness ?? 70) : 70;
  const fumbleChance = cl(0.02 + (60 - security) * 0.001, 0.005, 0.08);
  const touchdown = random() < touchdownChance;
  const fumble = !touchdown && random() < fumbleChance;

  return {
    yards: touchdown ? Math.max(65, yards + 35) : yards,
    touchdown,
    fumble,
  };
}

export function simulateSpecialTeams(homeTeam: Team, awayTeam: Team, random: RandomFn): SimulatedSpecialTeamsResult {
  homeTeam.specialTeams ??= buildSpecialTeamsState(homeTeam);
  awayTeam.specialTeams ??= buildSpecialTeamsState(awayTeam);

  const homeCoverage = averageCoverage(homeTeam, homeTeam.specialTeams.kickCoverageUnit);
  const awayCoverage = averageCoverage(awayTeam, awayTeam.specialTeams.kickCoverageUnit);

  return {
    home: summarizeSide(homeTeam, homeTeam.specialTeams.kickReturner, homeTeam.specialTeams.puntReturner, awayCoverage, random),
    away: summarizeSide(awayTeam, awayTeam.specialTeams.kickReturner, awayTeam.specialTeams.puntReturner, homeCoverage, random),
  };
}
