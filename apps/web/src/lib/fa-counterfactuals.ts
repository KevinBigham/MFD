import type { FranchiseHistoryEntry, FreeAgencyBid, Player, Team, TeamNeedsReport } from '@mfd/engine';
import { buildTeamWindowInput, computeTeamWindow } from './team-window';

export interface CounterfactualDriver {
  label: string;
  detail: string;
  sourceRef: string;
}

export interface BidCounterfactual {
  winnerLine: string;
  whyDrivers: CounterfactualDriver[];
  userComparisonLine: string | null;
  sourceRefs: string[];
}

export type BidCounterfactualBid = Partial<FreeAgencyBid> & {
  playerId?: string | null;
  teamId?: string | null;
  round?: number | null;
  salary?: number | null;
  signingBonus?: number | null;
  guaranteed?: number | null;
  score?: number | null;
  status?: FreeAgencyBid['status'] | null;
};

export interface BidCounterfactualInput {
  player?: Pick<Player, 'id' | 'name' | 'firstName' | 'lastName'> | null;
  playerName?: string | null;
  bids?: readonly BidCounterfactualBid[] | null;
  winnerBid?: BidCounterfactualBid | null;
  userBid?: BidCounterfactualBid | null;
  userTeamId?: string | null;
  winningTeam?: Team | null;
  currentYear?: number | null;
  teamNeeds?: TeamNeedsReport | null;
  franchiseHistory?: readonly FranchiseHistoryEntry[] | null;
}

const MAX_DRIVERS = 3;
const MIN_DRIVERS = 2;

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function money(value: number): string {
  return `$${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}M`;
}

function score(value: number | null | undefined): string | null {
  if (!finite(value)) return null;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function playerLabel(input: BidCounterfactualInput): string {
  if (input.playerName?.trim()) return input.playerName.trim();
  const player = input.player;
  if (!player) return 'the free agent';
  if (typeof player.name === 'string' && player.name.trim()) return player.name.trim();
  const full = [player.firstName, player.lastName].filter(Boolean).join(' ').trim();
  return full || player.id || 'the free agent';
}

function teamLabel(team: Team): string {
  const full = [team.city, team.name].filter(Boolean).join(' ').trim();
  return full || team.id;
}

function source(teamId: string, part: string): string {
  return `team:${teamId}:${part}`;
}

function bidSource(playerId: string, round: number): string {
  return `offseasonState.freeAgencyBids:${playerId}:round:${round}`;
}

function postureLabel(value: string | null | undefined, fallback: string): string {
  return (value?.trim() || fallback).replaceAll(' ', '_').toUpperCase();
}

function selectWinner(input: BidCounterfactualInput): BidCounterfactualBid | null {
  if (input.winnerBid?.status === 'won') return input.winnerBid;
  const won = [...(input.bids ?? [])].filter((bid) => bid.status === 'won');
  return won.sort((a, b) =>
    (b.score ?? Number.NEGATIVE_INFINITY) - (a.score ?? Number.NEGATIVE_INFINITY)
    || (b.salary ?? Number.NEGATIVE_INFINITY) - (a.salary ?? Number.NEGATIVE_INFINITY)
    || String(a.teamId ?? '').localeCompare(String(b.teamId ?? '')),
  )[0] ?? null;
}

function selectUserBid(input: BidCounterfactualInput): BidCounterfactualBid | null {
  if (input.userBid) return input.userBid;
  if (!input.userTeamId) return null;
  return [...(input.bids ?? [])]
    .filter((bid) => bid.teamId === input.userTeamId)
    .sort((a, b) => (b.round ?? -1) - (a.round ?? -1) || String(a.playerId ?? '').localeCompare(String(b.playerId ?? '')))[0] ?? null;
}

function validTeamWindowDriver(label: string, sourceRef: string | undefined): boolean {
  const normalizedLabel = label.toLowerCase();
  const normalizedSource = (sourceRef ?? '').toLowerCase();
  return !normalizedLabel.includes('sparse')
    && !normalizedLabel.includes('conservative default')
    && !normalizedSource.includes('missing')
    && !normalizedSource.includes('fallback');
}

function buildDrivers(args: {
  input: BidCounterfactualInput;
  winner: BidCounterfactualBid;
  winningTeam: Team;
  teamName: string;
  bidRef: string;
}): CounterfactualDriver[] {
  const teamWindow = computeTeamWindow(buildTeamWindowInput(args.winningTeam, {
    currentYear: args.input.currentYear,
    teamNeeds: args.input.teamNeeds ?? null,
    franchiseHistory: args.input.franchiseHistory ?? undefined,
  }));
  const drivers: CounterfactualDriver[] = [];
  const firstWindowDriver = teamWindow.drivers.find((driver, index) =>
    validTeamWindowDriver(driver.label, teamWindow.sourceRefs[index] ?? teamWindow.sourceRefs[0]));

  if (firstWindowDriver) {
    drivers.push({
      label: 'Competitive window',
      detail: `${teamWindow.phase} window (${teamWindow.confidence}): ${firstWindowDriver.detail}`,
      sourceRef: teamWindow.sourceRefs[0] ?? source(args.winningTeam.id, 'window'),
    });
  }

  if (finite(args.winningTeam.capSpace)) {
    drivers.push({
      label: 'Cap space',
      detail: `${money(args.winningTeam.capSpace)} cap space was saved on ${args.teamName}'s team sheet.`,
      sourceRef: source(args.winningTeam.id, 'cap'),
    });
  }

  if (args.winningTeam.gmStrategy || args.winningTeam.philosophy) {
    drivers.push({
      label: 'GM posture',
      detail: `${postureLabel(args.winningTeam.gmStrategy, 'NEUTRAL')} GM posture and ${postureLabel(args.winningTeam.philosophy, 'MAINTAIN')} philosophy were saved on the winning team.`,
      sourceRef: source(args.winningTeam.id, 'gmStrategy'),
    });
  }

  if (finite(args.winner.salary)) {
    const pieces = [`${money(args.winner.salary)} annual salary`];
    if (finite(args.winner.signingBonus)) pieces.push(`${money(args.winner.signingBonus)} signing bonus`);
    if (finite(args.winner.guaranteed)) pieces.push(`${money(args.winner.guaranteed)} guaranteed`);
    drivers.push({
      label: 'Winning bid',
      detail: `${pieces.join(', ')} in the saved winner row.`,
      sourceRef: args.bidRef,
    });
  }

  return drivers.slice(0, MAX_DRIVERS);
}

function buildUserComparisonLine(userBid: BidCounterfactualBid | null, winner: BidCounterfactualBid, teamName: string): string | null {
  if (!userBid) return null;
  if (!finite(userBid.salary)) return null;

  const userScore = score(userBid.score);
  const winnerScore = score(winner.score);
  const delta = finite(winner.salary) ? winner.salary - userBid.salary : null;
  const deltaLine = finite(delta) && delta !== 0
    ? ` (${money(Math.abs(delta))} ${delta > 0 ? 'less' : 'more'} per year)`
    : '';
  const scoreLine = userScore && winnerScore
    ? ` Saved bid score: you ${userScore}, ${teamName} ${winnerScore}.`
    : '';
  return `You offered ${money(userBid.salary)}${deltaLine}.${scoreLine}`;
}

export function buildBidCounterfactual(input: BidCounterfactualInput): BidCounterfactual | null {
  const winner = selectWinner(input);
  const winningTeam = input.winningTeam;
  if (!winner || !winningTeam) return null;
  if (!winner.teamId || winner.teamId !== winningTeam.id) return null;
  if (!winner.playerId || !finite(winner.round) || !finite(winner.salary)) return null;

  const userBid = selectUserBid(input);
  if (userBid?.status === 'won') return null;

  const teamName = teamLabel(winningTeam);
  const playerName = playerLabel(input);
  const bidRef = bidSource(winner.playerId, winner.round);
  const whyDrivers = buildDrivers({ input, winner, winningTeam, teamName, bidRef });
  if (whyDrivers.length < MIN_DRIVERS) return null;

  const sourceRefs = [...new Set([bidRef, ...whyDrivers.map((driver) => driver.sourceRef)])];

  return {
    winnerLine: `${teamName} won ${playerName} at ${money(winner.salary)} in Round ${winner.round}.`,
    whyDrivers,
    userComparisonLine: buildUserComparisonLine(userBid, winner, teamName),
    sourceRefs,
  };
}
