export interface PendingDecisionCounts {
  tradeOffers: number;
  expiringContracts: number;
  emptyDepthSlots: number;
  unspentPicks: number;
  openStaffSlots: number;
  total: number;
}

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
  };

  return {
    ...counts,
    total: counts.tradeOffers
      + counts.expiringContracts
      + counts.emptyDepthSlots
      + counts.unspentPicks
      + counts.openStaffSlots,
  };
}
