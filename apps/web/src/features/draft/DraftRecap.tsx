import { useMemo, useState } from 'react';
import { PixelBadge, PixelPanel, PixelPlayerLink, PixelSelect, PixelTable } from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import type { DraftRecap as DraftRecapRecord } from '@mfd/engine';
import {
  selectDraftRecaps, selectTeams, selectUserTeam, useGameStore,
} from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, monoSm, screenStackStyle } from '../shared/pixelUi';
import { DraftPickRevealCard } from './DraftPickReveal';

type DraftRecapFollowThroughAccent = 'cyan' | 'gold' | 'green' | 'red' | 'default';

interface DraftRecapFollowThroughPlayer {
  name?: string;
  pos?: string;
  age?: number;
  ovr?: number;
  yearsExp?: number;
  teamId?: string | null;
}

interface DraftRecapFollowThroughTeam {
  city?: string;
  name?: string;
}

interface DraftRecapFollowThroughRow {
  id: string;
  label: string;
  playerId: string;
  playerName: string;
  position: string;
  draftOvr: number;
  currentOvr: number | null;
  delta: number | null;
  currentTeam: string;
  detail: string;
  accent: DraftRecapFollowThroughAccent;
}

interface DraftRecapFollowThrough {
  year: number;
  rows: DraftRecapFollowThroughRow[];
}

const pickColumns: ColumnDef<DraftRecapRecord['picks'][number]>[] = [
  { accessorKey: 'round', header: 'Round' },
  { accessorKey: 'pick', header: 'Pick' },
  {
    accessorKey: 'playerName',
    header: 'Player',
    cell: ({ row }) => <DraftRecapPlayerLink pick={row.original} />,
  },
  { accessorKey: 'position', header: 'Pos' },
  { accessorKey: 'ovr', header: 'OVR' },
  { accessorKey: 'projectedPick', header: 'Projected' },
  { accessorKey: 'valueDelta', header: 'Value' },
  { accessorKey: 'verdict', header: 'Verdict', cell: ({ getValue }) => <PixelBadge variant={String(getValue()) === 'steal' ? 'green' : String(getValue()) === 'reach' ? 'red' : 'default'}>{String(getValue()).toUpperCase()}</PixelBadge> },
];

function DraftRecapPlayerLink({ pick }: { pick: DraftRecapRecord['picks'][number] }) {
  return (
    <PixelPlayerLink
      playerId={pick.playerId}
      name={pick.playerName}
      ovr={pick.ovr}
      title={`Open ${pick.playerName} draft recap profile`}
    />
  );
}

function followThroughAccent(delta: number | null): DraftRecapFollowThroughAccent {
  if (delta === null) return 'default';
  if (delta >= 5) return 'green';
  if (delta <= -5) return 'red';
  return 'gold';
}

function teamLabel(
  player: DraftRecapFollowThroughPlayer | undefined,
  teams: Record<string, DraftRecapFollowThroughTeam> | null,
): string {
  if (!player) return 'No live player row';
  if (!player.teamId) return 'Free agent / unsigned';
  const team = teams?.[player.teamId];
  return team ? `${team.city ?? ''} ${team.name ?? ''}`.trim() || player.teamId : player.teamId;
}

function deltaLabel(delta: number | null): string {
  if (delta === null) return 'current OVR unavailable';
  if (delta === 0) return 'even since draft night';
  return `${delta > 0 ? '+' : ''}${delta} OVR since draft night`;
}

export function buildDraftRecapFollowThrough({
  recap,
  playersById,
  teams,
}: {
  recap: DraftRecapRecord | null;
  playersById: Record<string, DraftRecapFollowThroughPlayer>;
  teams: Record<string, DraftRecapFollowThroughTeam> | null;
}): DraftRecapFollowThrough | null {
  if (!recap) return null;

  const rows: DraftRecapFollowThroughRow[] = [];
  const seen = new Set<string>();
  const addRow = (label: string, pick: DraftRecapRecord['picks'][number] | undefined) => {
    if (!pick || seen.has(pick.playerId)) return;
    seen.add(pick.playerId);
    const player = playersById[pick.playerId];
    const currentOvr = Number.isFinite(player?.ovr) ? player!.ovr! : null;
    const delta = currentOvr === null ? null : currentOvr - pick.ovr;
    const currentTeam = teamLabel(player, teams);
    rows.push({
      id: `${label.toLowerCase().replace(/\s+/g, '-')}-${pick.playerId}`,
      label,
      playerId: pick.playerId,
      playerName: player?.name ?? pick.playerName,
      position: player?.pos ?? pick.position,
      draftOvr: pick.ovr,
      currentOvr,
      delta,
      currentTeam,
      detail: player
        ? `${currentTeam} // ${player.pos ?? pick.position} // Age ${player.age ?? 'unknown'} // ${player.yearsExp ?? 0} years exp // ${deltaLabel(delta)}.`
        : `Saved ${pick.position} pick from Round ${pick.round}, pick ${pick.pick}. Current game.players has no live row, so this route does not infer a retirement, release, or history event.`,
      accent: followThroughAccent(delta),
    });
  };

  const topPick = [...recap.picks].sort((a, b) => a.pick - b.pick || a.playerId.localeCompare(b.playerId))[0];
  addRow('Top pick', topPick);
  addRow('Best value', recap.bestValue);
  addRow('Reach watch', recap.biggestReach);
  addRow('Steal follow-up', recap.steals[0]);

  return rows.length > 0 ? { year: recap.year, rows } : null;
}

function DraftRecapSourcesPanel({
  recapCount,
  activeYear,
}: {
  recapCount: number;
  activeYear: number | null;
}) {
  return (
    <PixelPanel title="Draft Recap Sources" accent="cyan">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
        {[
          {
            id: 'archive',
            label: 'Saved archive',
            status: `${recapCount} class${recapCount === 1 ? '' : 'es'}`,
            detail: 'Source: selectDraftRecaps filters saved game.draftRecaps to the user team and sorts the archived classes newest first.',
            accent: 'cyan' as const,
          },
          {
            id: 'active-year',
            label: 'Year picker',
            status: activeYear ? String(activeYear) : 'empty',
            detail: 'The selected year is route-local React state. Changing it only swaps which saved recap is displayed.',
            accent: activeYear ? 'gold' as const : 'default' as const,
          },
          {
            id: 'writer',
            label: 'Writer path',
            status: 'post-draft',
            detail: 'Recaps are generated upstream by finalizePostDraft during week advance after the draft closes; this route does not generate or repair recap rows.',
            accent: 'gold' as const,
          },
          {
            id: 'presentation',
            label: 'Presentation',
            status: 'display only',
            detail: 'DraftPickRevealCard, class grades, best value, reaches, steals, league highlights, player profile links, and pick verdicts all read the selected saved recap.',
            accent: 'green' as const,
          },
        ].map((row) => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minHeight: '112px',
              padding: '10px',
              border: '1px solid #1f1f1f',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...monoSm, color: '#fff' }}>{row.label}</span>
              <PixelBadge variant={row.accent}>{row.status}</PixelBadge>
            </div>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</span>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

export function DraftRecap() {
  const team = useGameStore(selectUserTeam);
  const recaps = useGameStore(selectDraftRecaps);
  const teams = useGameStore(selectTeams);
  const playersById = useGameStore((state) => state.game?.players ?? {});
  const [selectedYear, setSelectedYear] = useState(recaps[0]?.year ?? 0);

  const activeRecap = useMemo(
    () => recaps.find((entry) => entry.year === selectedYear) ?? recaps[0] ?? null,
    [recaps, selectedYear],
  );
  const followThrough = useMemo(
    () => buildDraftRecapFollowThrough({ recap: activeRecap, playersById, teams }),
    [activeRecap, playersById, teams],
  );

  if (!activeRecap) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Draft Recap" subtitle="No draft recap is archived yet." />
        <DraftRecapSourcesPanel recapCount={recaps.length} activeYear={null} />
      </div>
    );
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Draft Recap"
        subtitle={`${team ? `${team.city} ${team.name}` : 'Franchise'} // class review and league board context`}
        badges={(
          <>
            <PixelBadge variant="gold">Class Grade {activeRecap.classGrade}</PixelBadge>
            <PixelSelect
              value={String(activeRecap.year)}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              options={recaps.map((entry) => ({ value: String(entry.year), label: String(entry.year) }))}
              accent="cyan"
            />
          </>
        )}
      />

      <DraftRecapSourcesPanel recapCount={recaps.length} activeYear={activeRecap.year} />

      <div style={autoGrid(240)}>
        <DraftPickRevealCard
          title="Reveal Card"
          overall={activeRecap.bestValue.pick}
          round={activeRecap.bestValue.round}
          pick={activeRecap.bestValue.pick}
          playerName={activeRecap.bestValue.playerName}
          position={activeRecap.bestValue.position}
          college="Scouting Archive"
          teamAbbrev={team?.icon ?? team?.abbr ?? 'mfd'}
          reaction={activeRecap.bestValue.verdict === 'steal'
            ? 'Value held. The room loved the board.'
            : activeRecap.bestValue.verdict === 'reach'
              ? 'Traits over consensus. The room stood on the conviction.'
              : 'Clean value and a fast card turn-in.'}
        />

        <PixelPanel title="Class Grade" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '40px', color: 'var(--mfd-gold)', lineHeight: 1 }}>
              {activeRecap.classGrade}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Best value: <DraftRecapPlayerLink pick={activeRecap.bestValue} />
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="Highlights" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
              Best Value // <DraftRecapPlayerLink pick={activeRecap.bestValue} />
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
              Biggest Reach // <DraftRecapPlayerLink pick={activeRecap.biggestReach} />
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
              Steals // {activeRecap.steals.length > 0
                ? activeRecap.steals.map((entry, index) => (
                  <span key={entry.playerId}>
                    {index > 0 ? ' | ' : ''}
                    <DraftRecapPlayerLink pick={entry} />
                  </span>
                ))
                : 'None'}
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="League Highlights" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeRecap.leagueHighlights.map((entry) => (
              <div key={entry.playerId} style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                #{entry.pick} <DraftRecapPlayerLink pick={entry} /> // {entry.position}
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>

      {followThrough ? (
        <PixelPanel title="Class Follow-Through" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">{followThrough.year} class</PixelBadge>
              <PixelBadge variant="cyan">game.players</PixelBadge>
              <PixelBadge variant="cyan">selectTeams</PixelBadge>
              <PixelBadge variant="default">Read-only</PixelBadge>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '10px' }}>
              {followThrough.rows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    minHeight: '142px',
                    padding: '10px',
                    border: '1px solid #1f1f1f',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ ...monoSm, color: '#fff' }}>{row.label}</span>
                    <PixelBadge variant={row.accent}>{row.currentOvr === null ? 'Not live' : `${row.currentOvr} OVR`}</PixelBadge>
                  </div>
                  <PixelPlayerLink playerId={row.playerId} name={row.playerName} ovr={row.currentOvr ?? row.draftOvr} title={`Open ${row.playerName} class follow-through profile`} />
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                    Draft {row.draftOvr} OVR // {row.position} // {row.currentTeam}
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5, flex: 1 }}>{row.detail}</div>
                </div>
              ))}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
              Source: saved recap picks plus current game.players and team map. This panel does not change recaps, player ratings,
              roster status, contracts, depth charts, profile history, autosave, or game outcomes.
            </div>
          </div>
        </PixelPanel>
      ) : null}

      <PixelPanel title="Pick By Pick" accent="cyan">
        <PixelTable
          responsive="cards"
          data={activeRecap.picks}
          columns={pickColumns}
          accent="cyan"
          emptyMessage="No draft picks found"
        />
      </PixelPanel>
    </div>
  );
}
