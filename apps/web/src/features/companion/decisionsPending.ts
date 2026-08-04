export interface PendingDecisionCounts {
  tradeOffers: number;
  expiringContracts: number;
  emptyDepthSlots: number;
  unspentPicks: number;
  openStaffSlots: number;
  /** D4: injured user players needing a status/backup decision. */
  injuries: number;
  total: number;
}

/**
 * I3: the canonical category list. `countPendingDecisions` computes exactly
 * these keys, and the dock badge/beat copy table (`PENDING_DECISION_COPY` in
 * ChipDock.tsx) must cover exactly the same set — a guard test pins the sync
 * so adding a category is a deliberate, tested change.
 */
export const PENDING_DECISION_CATEGORY_KEYS = [
  'tradeOffers',
  'expiringContracts',
  'emptyDepthSlots',
  'unspentPicks',
  'openStaffSlots',
  'injuries',
] as const satisfies readonly (keyof Omit<PendingDecisionCounts, 'total'>)[];

export type PendingDecisionCategoryKey = (typeof PENDING_DECISION_CATEGORY_KEYS)[number];

/**
 * F6: which decision category a coaching route "owns". Ask Chip leads the
 * pending-decisions beat with the category for the screen the player is
 * standing on (on Trades, trade counts come first). Keys are route-coaching
 * `RouteKey`s; routes without an entry keep the canonical category order.
 */
export const ROUTE_DECISION_CATEGORY: Readonly<Record<string, PendingDecisionCategoryKey>> = {
  'trade-center': 'tradeOffers',
  'trade-market-radar': 'tradeOffers',
  'trade-deadline': 'tradeOffers',
  'cap-laboratory': 'expiringContracts',
  'front-office': 'expiringContracts',
  'depth-chart': 'emptyDepthSlots',
  roster: 'emptyDepthSlots',
  'draft-board': 'unspentPicks',
  staff: 'openStaffSlots',
};

type LooseRecord = Record<string, unknown>;

const DEPTH_SLOT_POSITIONS: readonly (readonly string[])[] = [
  ['QB'],
  ['RB'],
  ['WR'],
  ['TE'],
  ['OL'],
  ['DL'],
  ['LB'],
  ['CB'],
  ['S'],
] as const;

function asRecord(value: unknown): LooseRecord | null {
  return value && typeof value === 'object' ? value as LooseRecord : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function userTeamFromGame(game: LooseRecord | null): LooseRecord | null {
  const teams = asRecord(game?.teams);
  if (!teams) return null;
  return Object.values(teams).map(asRecord).find((team) => team?.isUser === true) ?? null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function countTradeOffers(game: LooseRecord | null, teamId: string | null): number {
  if (!teamId) return 0;
  const offseasonState = asRecord(game?.offseasonState);
  return asArray(offseasonState?.tradeOffers).filter((offerValue) => {
    const offer = asRecord(offerValue);
    return offer?.status === 'pending'
      && (offer.toTeamId === teamId || offer.fromTeamId === teamId);
  }).length;
}

function acceptedExtensionPlayerIds(game: LooseRecord | null, teamId: string | null): Set<string> {
  if (!teamId) return new Set();
  return new Set(asArray(game?.contractExtensions)
    .map(asRecord)
    .filter((entry) => entry?.teamId === teamId && entry.status === 'accepted')
    .map((entry) => stringValue(entry?.playerId))
    .filter((playerId): playerId is string => playerId !== null));
}

function countExpiringContracts(game: LooseRecord | null, team: LooseRecord | null, teamId: string | null): number {
  const renewedPlayerIds = acceptedExtensionPlayerIds(game, teamId);
  return asArray(team?.roster).filter((playerValue) => {
    const player = asRecord(playerValue);
    const playerId = stringValue(player?.id);
    const contract = asRecord(player?.contract);
    const years = contract?.years;
    return playerId !== null
      && !renewedPlayerIds.has(playerId)
      && typeof years === 'number'
      && years <= 1;
  }).length;
}

function countEmptyDepthSlots(team: LooseRecord | null): number {
  if (!team) return 0;
  const roster = asArray(team?.roster).map(asRecord).filter((player): player is LooseRecord => player !== null);
  if (roster.length === 0) return 0;
  return DEPTH_SLOT_POSITIONS.filter((positions) =>
    !roster.some((player) => player.isStarter === true && positions.includes(stringValue(player.pos) ?? '')),
  ).length;
}

function countUnspentPicks(game: LooseRecord | null, teamId: string | null): number {
  if (!teamId) return 0;
  const offseasonState = asRecord(game?.offseasonState);
  const draftOrder = asArray(offseasonState?.draftOrder);
  const currentDraftPickIndex = typeof offseasonState?.currentDraftPickIndex === 'number'
    ? offseasonState.currentDraftPickIndex
    : 0;
  const completedDraftPickIds = new Set(asArray(offseasonState?.completedDraftPickIds).filter(
    (id): id is string => typeof id === 'string',
  ));

  return draftOrder.slice(currentDraftPickIndex).filter((entryValue) => {
    const entry = asRecord(entryValue);
    const entryId = stringValue(entry?.id);
    return entry?.teamId === teamId && (entryId === null || !completedDraftPickIds.has(entryId));
  }).length;
}

function countOpenStaffSlots(team: LooseRecord | null): number {
  if (!team) return 0;
  const staff = asRecord(team?.staff);
  return (['hc', 'oc', 'dc'] as const).filter((role) => staff?.[role] == null).length;
}

/**
 * D4: injured players on the user roster, counted from the canonical
 * `game.players` record — the same source F8's Where Am I injury count uses,
 * so the dock badge and the summary never disagree.
 */
function countInjuredUserPlayers(game: LooseRecord | null, teamId: string | null): number {
  if (!teamId) return 0;
  return Object.values(asRecord(game?.players) ?? {}).filter((playerValue) => {
    const player = asRecord(playerValue);
    return player?.teamId === teamId && Boolean(player?.injury);
  }).length;
}

export function countPendingDecisions(state: unknown): PendingDecisionCounts {
  const root = asRecord(state);
  const game = asRecord(root?.game);
  const team = userTeamFromGame(game);
  const teamId = stringValue(team?.id);

  const counts = {
    tradeOffers: countTradeOffers(game, teamId),
    expiringContracts: countExpiringContracts(game, team, teamId),
    emptyDepthSlots: countEmptyDepthSlots(team),
    unspentPicks: countUnspentPicks(game, teamId),
    openStaffSlots: countOpenStaffSlots(team),
    injuries: countInjuredUserPlayers(game, teamId),
  };

  return {
    ...counts,
    total: counts.tradeOffers
      + counts.expiringContracts
      + counts.emptyDepthSlots
      + counts.unspentPicks
      + counts.openStaffSlots
      + counts.injuries,
  };
}
