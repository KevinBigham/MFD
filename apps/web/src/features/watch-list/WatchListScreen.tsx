import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { DraftProspect, GameState, Player, PlayerArchiveEntry } from '@mfd/engine';
import { useGameStore } from '../../app/store/game-store';
import {
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';
import {
  WATCH_LIST_STORAGE_KEY,
  getWatchList,
  removeFromWatchList,
  subscribeWatchList,
  type WatchListPrefs,
} from './watchListPrefs';

type WatchListGroup = 'own' | 'fa' | 'prospect' | 'former';
type SourceAccent = 'default' | 'gold' | 'cyan' | 'green';

export interface WatchListRow {
  id: string;
  name: string;
  pos: string;
  ovr: string;
  teamLabel: string;
  statusLabel: string;
  group: WatchListGroup;
  updatedAt: string;
}

interface WatchListSourceRow {
  id: string;
  label: string;
  badge: string;
  accent: SourceAccent;
  detail: string;
}

const GROUP_ORDER: Array<{ id: WatchListGroup; title: string; accent: 'gold' | 'cyan' | 'green' | 'default' }> = [
  { id: 'own', title: 'Own Roster', accent: 'gold' },
  { id: 'fa', title: 'Free Agents', accent: 'cyan' },
  { id: 'prospect', title: 'Prospects', accent: 'green' },
  { id: 'former', title: 'Retired / Former', accent: 'default' },
];

function teamName(game: GameState, teamId: string | null): string {
  if (!teamId) return 'Free Agent';
  const team = game.teams[teamId];
  return team ? `${team.city} ${team.name}` : teamId;
}

function currentPlayerName(player: Player): string {
  return player.name || `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || player.id;
}

function playerRow(game: GameState, player: Player, updatedAt: string): WatchListRow {
  const userTeamId = Object.values(game.teams).find((team) => team.isUser)?.id ?? null;
  if (player.teamId === userTeamId) {
    return {
      id: player.id,
      name: currentPlayerName(player),
      pos: player.pos ?? '--',
      ovr: `${player.ovr ?? '--'}`,
      teamLabel: teamName(game, player.teamId),
      statusLabel: 'own roster',
      group: 'own',
      updatedAt,
    };
  }

  if (!player.teamId || game.freeAgents.includes(player.id)) {
    return {
      id: player.id,
      name: currentPlayerName(player),
      pos: player.pos ?? '--',
      ovr: `${player.ovr ?? '--'}`,
      teamLabel: 'Free Agent',
      statusLabel: 'free agent',
      group: 'fa',
      updatedAt,
    };
  }

  return {
    id: player.id,
    name: currentPlayerName(player),
    pos: player.pos ?? '--',
    ovr: `${player.ovr ?? '--'}`,
    teamLabel: teamName(game, player.teamId),
    statusLabel: `former ${teamName(game, player.teamId)}`,
    group: 'former',
    updatedAt,
  };
}

function prospectRow(prospect: DraftProspect, updatedAt: string): WatchListRow {
  return {
    id: prospect.id,
    name: `${prospect.firstName} ${prospect.lastName}`,
    pos: prospect.pos,
    ovr: `${Math.round(prospect.scoutGrade)}`,
    teamLabel: prospect.college,
    statusLabel: `prospect // round ${prospect.projectedRound}`,
    group: 'prospect',
    updatedAt,
  };
}

function archivedRow(game: GameState, entry: PlayerArchiveEntry, updatedAt: string): WatchListRow {
  const lastTeamId = entry.teamHistory.at(-1)?.teamId ?? null;
  return {
    id: entry.playerId,
    name: entry.name,
    pos: entry.positions[0] ?? 'FA',
    ovr: `${entry.peakOvr}`,
    teamLabel: teamName(game, lastTeamId),
    statusLabel: entry.retirementYear ? `retired ${entry.retirementYear}` : `former ${teamName(game, lastTeamId)}`,
    group: 'former',
    updatedAt,
  };
}

function missingRow(playerId: string, updatedAt: string): WatchListRow {
  return {
    id: playerId,
    name: playerId,
    pos: '--',
    ovr: '--',
    teamLabel: 'Unknown',
    statusLabel: 'missing player record',
    group: 'former',
    updatedAt,
  };
}

export function buildWatchListRows(game: GameState | null, prefs: WatchListPrefs): WatchListRow[] {
  if (!game) return [];
  return prefs.playerIds.map((playerId) => {
    const player = game.players[playerId];
    if (player) return playerRow(game, player, prefs.updatedAt);

    const prospect = game.draftClass.find((entry) => entry.id === playerId) ?? null;
    if (prospect) return prospectRow(prospect, prefs.updatedAt);

    const archived = game.playerArchive.find((entry) => entry.playerId === playerId) ?? null;
    if (archived) return archivedRow(game, archived, prefs.updatedAt);

    return missingRow(playerId, prefs.updatedAt);
  });
}

export function buildWatchListSourceRows(prefs: WatchListPrefs, rows: WatchListRow[]): WatchListSourceRow[] {
  return [
    {
      id: 'browser-sidecar',
      label: 'Browser sidecar',
      badge: `${prefs.playerIds.length} pins`,
      accent: 'gold',
      detail: `watchListPrefs reads localStorage key ${WATCH_LIST_STORAGE_KEY}. This board is browser-local and outside GameState cartridges.`,
    },
    {
      id: 'row-resolution',
      label: 'Row resolution',
      badge: `${rows.length} rows`,
      accent: 'cyan',
      detail: 'buildWatchListRows resolves pinned ids against game.players, free agents, draftClass, playerArchive, then a recoverable missing-player row. Rendering does not auto-prune stale ids.',
    },
    {
      id: 'saved-watchlists',
      label: 'Saved watchlists',
      badge: 'separate',
      accent: 'green',
      detail: 'Global pins are separate from saved offseasonState.scoutingWatchlist and faTargetBoard.watchlist. WatchListPinButton toggles only the browser-local global board.',
    },
    {
      id: 'updated-at',
      label: 'Update stamp',
      badge: prefs.updatedAt ? 'board stamp' : 'not synced',
      accent: 'default',
      detail: 'updatedAt is one board-level timestamp from the add/remove helpers, not a per-player pin timeline or deterministic simulation input.',
    },
    {
      id: 'render-boundary',
      label: 'Just viewing',
      badge: 'display only',
      accent: 'default',
      detail: 'Opening Watch List does not change the saved game, move players, change saved scouting or FA watchlists, alter draft/free-agent boards, or write player/archive records.',
    },
  ];
}

export function removeWatchListRow(playerId: string, setPrefs: (prefs: WatchListPrefs) => void): void {
  setPrefs(removeFromWatchList(playerId));
}

export function WatchListScreen() {
  const game = useGameStore((state) => state.game);
  const [prefs, setPrefs] = useState(() => getWatchList());

  useEffect(() => {
    const refresh = () => setPrefs(getWatchList());
    refresh();
    return subscribeWatchList(refresh);
  }, []);

  const rows = useMemo(() => buildWatchListRows(game, prefs), [game, prefs]);
  const sourceRows = useMemo(() => buildWatchListSourceRows(prefs, rows), [prefs, rows]);
  const groups = GROUP_ORDER.map((group) => ({
    ...group,
    rows: rows.filter((row) => row.group === group.id),
  }));

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Watch List"
        subtitle="Pinned roster players, free agents, prospects, and former targets."
        badges={(
          <>
            <PixelBadge variant="gold">{prefs.playerIds.length} pinned</PixelBadge>
            <PixelBadge variant="cyan">{prefs.updatedAt || 'not synced'}</PixelBadge>
          </>
        )}
      />

      <PixelPanel title="Watch List Sources" accent="cyan">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
          {sourceRows.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                border: '2px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ ...monoSm, color: '#fff' }}>{row.label}</span>
                <PixelBadge variant={row.accent}>{row.badge}</PixelBadge>
              </div>
              <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                {row.detail}
              </span>
            </div>
          ))}
        </div>
      </PixelPanel>

      {rows.length === 0 ? (
        <PixelPanel title="Empty Watch List" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No players pinned yet. Use the star controls on roster, scouting, or free-agency screens to build this board.
          </div>
        </PixelPanel>
      ) : (
        <div style={autoGrid(320)}>
          {groups.map((group) => (
            <PixelPanel key={group.id} title={`${group.title} (${group.rows.length})`} accent={group.accent}>
              {group.rows.length === 0 ? (
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No pinned players in this group.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {group.rows.map((row) => (
                    <div
                      key={row.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                        alignItems: 'flex-start',
                        padding: '10px',
                        border: '3px solid var(--mfd-border)',
                        background: 'var(--mfd-bg-3)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                          {row.name.toUpperCase()}
                        </div>
                        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                          {row.pos} // OVR {row.ovr} // {row.teamLabel}
                        </div>
                        <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', lineHeight: 1.6 }}>
                          {row.statusLabel} // updated {row.updatedAt || 'not synced'}
                        </div>
                      </div>
                      <PixelButton accent="gold" onClick={() => removeWatchListRow(row.id, setPrefs)}>
                        <Star size={14} fill="currentColor" aria-hidden="true" /> Remove
                      </PixelButton>
                    </div>
                  ))}
                </div>
              )}
            </PixelPanel>
          ))}
        </div>
      )}
    </div>
  );
}
