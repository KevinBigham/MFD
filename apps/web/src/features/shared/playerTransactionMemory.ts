import type { TransactionLogEntry } from '@mfd/engine';

export interface PlayerTransactionMemoryRow {
  id: string;
  typeLabel: string;
  yearWeek: string;
  detail: string;
  accent: 'cyan' | 'gold' | 'green' | 'red' | 'default';
}

type TeamLabelLookup = Record<string, { city: string; name: string }> | null;

function formatTransactionType(type: string): string {
  const labels: Record<string, string> = {
    CUT: 'Released',
    DRAFT: 'Drafted',
    LOSE_FA: 'Lost In FA',
    SIGN_FA: 'Signed',
    TRADE: 'Trade',
    WAIVER_CLAIM: 'Waiver Claim',
  };
  if (labels[type]) return labels[type];
  return type
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

function transactionAccent(type: string): PlayerTransactionMemoryRow['accent'] {
  if (type === 'CUT' || type === 'LOSE_FA') return 'red';
  if (type === 'TRADE') return 'gold';
  if (type === 'SIGN_FA' || type === 'WAIVER_CLAIM') return 'green';
  if (type === 'DRAFT') return 'cyan';
  return 'default';
}

function teamLabel(teamId: string | undefined, teamsById: TeamLabelLookup): string | null {
  if (!teamId) return null;
  if (teamId === 'fa' || teamId === 'free-agency' || teamId === 'free_agents') return 'Free Agency';
  const team = teamsById?.[teamId];
  return team ? `${team.city} ${team.name}` : teamId;
}

export function buildPlayerTransactionMemoryRows(
  transactionLog: TransactionLogEntry[],
  playerId: string,
  teamsById: TeamLabelLookup,
): PlayerTransactionMemoryRow[] {
  return transactionLog
    .filter((entry) => entry.playerId === playerId)
    .slice(0, 5)
    .map((entry, index) => {
      const fromTeam = teamLabel(entry.fromTeamId, teamsById);
      const toTeam = teamLabel(entry.toTeamId, teamsById);
      const path = fromTeam && toTeam
        ? `${fromTeam} -> ${toTeam}`
        : fromTeam
          ? `From ${fromTeam}`
          : toTeam
            ? `To ${toTeam}`
            : 'User-team transaction log';
      return {
        id: `${entry.type}-${entry.year}-${entry.week}-${entry.playerId ?? 'no-player'}-${index}`,
        typeLabel: formatTransactionType(entry.type),
        yearWeek: `${entry.year} W${entry.week}`,
        detail: entry.notes ? `${path} // ${entry.notes}` : path,
        accent: transactionAccent(entry.type),
      };
    });
}
