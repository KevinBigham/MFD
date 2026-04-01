import { useState, useMemo, useCallback } from 'react';
import {
  MfdPanel, MfdTable, MfdBadge, MfdKpiGrid, MfdKpiCard,
  MfdDialog, MfdConsequenceRibbon,
} from '@mfd/design-system/components';
import {
  Users, Search, Filter, ChevronRight,
  TrendingUp, Shield, DollarSign, Zap,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { Player } from '@mfd/engine';
import { calcCapHit, calcSchemeFit } from '@mfd/engine';
import {
  useGameStore, selectRoster, selectUserTeam, selectUserTeamId,
} from '../../app/store/game-store';

// ── Table columns ──────────────────────────────────────────

const columns: ColumnDef<Player, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span style={{ fontWeight: 500, color: 'var(--mfd-text)' }}>
        {row.original.name}
      </span>
    ),
  },
  {
    accessorKey: 'pos',
    header: 'Pos',
    cell: ({ getValue }) => <MfdBadge variant="default">{getValue() as string}</MfdBadge>,
    size: 60,
  },
  {
    accessorKey: 'ovr',
    header: 'OVR',
    cell: ({ getValue }) => {
      const v = getValue() as number;
      const color = v >= 85 ? 'var(--mfd-green)' : v >= 70 ? 'var(--mfd-text)' : 'var(--mfd-text-dim)';
      return <span style={{ fontFamily: 'var(--mfd-font-mono)', fontWeight: 600, color }}>{v}</span>;
    },
    size: 50,
  },
  {
    accessorKey: 'pot',
    header: 'POT',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)', color: 'var(--mfd-cyan)' }}>{getValue() as number}</span>
    ),
    size: 50,
  },
  {
    accessorKey: 'age',
    header: 'Age',
    size: 40,
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>{getValue() as number}</span>
    ),
  },
  {
    id: 'capHit',
    header: 'Cap Hit',
    cell: ({ row }) => {
      const c = row.original.contract;
      const hit = c ? Math.round(calcCapHit(c) * 10) / 10 : 0;
      return <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>${hit}M</span>;
    },
    size: 70,
  },
  {
    id: 'contract',
    header: 'Contract',
    cell: ({ row }) => {
      const c = row.original.contract;
      return <span>{c ? `${c.years}yr` : 'FA'}</span>;
    },
    size: 70,
  },
  {
    id: 'fit',
    header: 'Fit',
    cell: ({ row }) => {
      const p = row.original;
      const score = p.systemFit;
      const tier = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
      const variant = tier === 'A' ? 'success' : tier === 'B' ? 'info' : tier === 'C' ? 'warning' : 'danger';
      return <MfdBadge variant={variant}>{tier}</MfdBadge>;
    },
    size: 40,
  },
  {
    id: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const v = row.original.isStarter ? 'Starter' : 'Backup';
      return <MfdBadge variant={row.original.isStarter ? 'gold' : 'default'}>{v}</MfdBadge>;
    },
    size: 70,
  },
  {
    accessorKey: 'devTrait',
    header: 'Dev',
    cell: ({ getValue }) => {
      const v = getValue() as string;
      const variant = v === 'x-factor' ? 'purple' : v === 'superstar' ? 'gold' : v === 'star' ? 'info' : 'default';
      const label = v === 'x-factor' ? 'X-Factor' : v === 'superstar' ? 'Superstar' : v === 'star' ? 'Star' : 'Normal';
      return <MfdBadge variant={variant}>{label}</MfdBadge>;
    },
    size: 80,
  },
];

// ── Component ──────────────────────────────────────────────

export function RosterManagement() {
  const roster = useGameStore(selectRoster);
  const teamId = useGameStore(selectUserTeamId);
  const team = useGameStore(selectUserTeam);
  const { cutPlayer, toggleTradeBlock, restructure } = useGameStore((s) => s.actions);

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [posFilter, setPosFilter] = useState<string>('ALL');

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];

  const filtered = useMemo(() => {
    if (posFilter === 'ALL') return roster;
    return roster.filter((p) => p.pos === posFilter);
  }, [roster, posFilter]);

  const avgOvr = roster.length > 0
    ? Math.round(roster.reduce((s, p) => s + p.ovr, 0) / roster.length)
    : 0;
  const starters = roster.filter((p) => p.isStarter).length;
  const avgAge = roster.length > 0
    ? Math.round(roster.reduce((s, p) => s + p.age, 0) / roster.length * 10) / 10
    : 0;

  const handleCut = useCallback((player: Player) => {
    if (!teamId) return;
    cutPlayer(teamId, player.id);
    setSelectedPlayer(null);
  }, [teamId, cutPlayer]);

  const handleTradeBlock = useCallback((player: Player) => {
    if (!teamId) return;
    toggleTradeBlock(teamId, player.id);
  }, [teamId, toggleTradeBlock]);

  const handleRestructure = useCallback((player: Player) => {
    if (!teamId) return;
    restructure(teamId, player.id);
  }, [teamId, restructure]);

  // Compute consequences for selected player
  const consequences = useMemo(() => {
    if (!selectedPlayer?.contract || !team) return [];
    const capHit = calcCapHit(selectedPlayer.contract);
    return [
      { id: 'c1', label: 'Cap Hit', delta: `$${Math.round(capHit * 10) / 10}M`, direction: 'negative' as const },
      { id: 'c2', label: 'Cap Space', delta: `$${Math.round(team.capSpace * 10) / 10}M`, direction: 'positive' as const },
    ];
  }, [selectedPlayer, team]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem',
            fontWeight: 700, color: 'var(--mfd-text)', margin: 0,
          }}>Roster Management</h1>
          <p style={{
            fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
            color: 'var(--mfd-text-dim)', margin: '4px 0 0',
          }}>
            {roster.length} players // 53-man roster
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <MfdKpiGrid columns={4}>
        <MfdKpiCard label="Roster Size" value={`${roster.length}/53`} icon={<Users size={14} />} trend="flat" />
        <MfdKpiCard label="Avg OVR" value={avgOvr} icon={<Shield size={14} />} trend="up" variant="success" />
        <MfdKpiCard label="Starters" value={starters} icon={<Zap size={14} />} trend="flat" />
        <MfdKpiCard label="Avg Age" value={avgAge} icon={<TrendingUp size={14} />} trend="flat" />
      </MfdKpiGrid>

      {/* Position Filter */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {positions.map((pos) => (
          <button
            key={pos}
            onClick={() => setPosFilter(pos)}
            style={{
              padding: '4px 10px', fontSize: '0.6875rem',
              fontFamily: 'var(--mfd-font-mono)',
              color: posFilter === pos ? 'var(--mfd-bg)' : 'var(--mfd-text-dim)',
              background: posFilter === pos ? 'var(--mfd-gold)' : 'var(--mfd-bg-2)',
              border: '1px solid var(--mfd-border)',
              borderRadius: 'var(--mfd-rad-md)',
              cursor: 'pointer',
              transition: 'all var(--mfd-motion-fast)',
            }}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Roster Table */}
      <MfdTable
        data={filtered}
        columns={columns}
        density="compact"
        onRowClick={(row) => setSelectedPlayer(row)}
      />

      {/* Player Details Dialog */}
      <MfdDialog
        open={!!selectedPlayer}
        onOpenChange={(open) => { if (!open) setSelectedPlayer(null); }}
        title={selectedPlayer?.name ?? 'Player Details'}
      >
        {selectedPlayer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
            <div style={{ display: 'flex', gap: 'var(--mfd-sp-md)', flexWrap: 'wrap' }}>
              <MfdBadge variant="gold">{selectedPlayer.pos}</MfdBadge>
              <MfdBadge variant="info">OVR {selectedPlayer.ovr}</MfdBadge>
              <MfdBadge variant="default">Age {selectedPlayer.age}</MfdBadge>
              <MfdBadge variant="success">POT {selectedPlayer.pot}</MfdBadge>
              {selectedPlayer.tradeBlock && <MfdBadge variant="danger">Trade Block</MfdBadge>}
            </div>

            <MfdPanel title="Contract" icon={<DollarSign size={14} />}>
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.8125rem' }}>
                {selectedPlayer.contract ? (
                  <>
                    <div>Cap Hit: ${Math.round(calcCapHit(selectedPlayer.contract) * 10) / 10}M</div>
                    <div>Duration: {selectedPlayer.contract.years}yr</div>
                    <div>Total Value: ${Math.round(selectedPlayer.contract.totalValue * 10) / 10}M</div>
                    <div>Guaranteed: ${Math.round(selectedPlayer.contract.guaranteed * 10) / 10}M</div>
                  </>
                ) : (
                  <div>No contract</div>
                )}
              </div>
            </MfdPanel>

            <MfdPanel title="Vitals" icon={<TrendingUp size={14} />}>
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.8125rem' }}>
                <div>Morale: {selectedPlayer.morale}</div>
                <div>Chemistry: {selectedPlayer.chemistry}</div>
                <div>System Fit: {selectedPlayer.systemFit}</div>
                <div>Dev: {selectedPlayer.devTrait}</div>
                <div>Experience: {selectedPlayer.yearsExp} years</div>
              </div>
            </MfdPanel>

            {/* Action Tray with Delta Preview */}
            <MfdPanel title="Actions" icon={<Zap size={14} />}>
              <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)', flexWrap: 'wrap' }}>
                <ActionButton label="Restructure" onClick={() => handleRestructure(selectedPlayer)} />
                <ActionButton label="Cut" onClick={() => handleCut(selectedPlayer)} variant="danger" />
                <ActionButton
                  label={selectedPlayer.tradeBlock ? 'Remove from Block' : 'Trade Block'}
                  onClick={() => handleTradeBlock(selectedPlayer)}
                />
              </div>
              <MfdConsequenceRibbon consequences={consequences} />
            </MfdPanel>
          </div>
        )}
      </MfdDialog>
    </div>
  );
}

function ActionButton({ label, onClick, variant }: {
  label: string;
  onClick: () => void;
  variant?: 'danger';
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px', fontSize: '0.75rem',
        fontFamily: 'var(--mfd-font-sans)', fontWeight: 500,
        color: variant === 'danger' ? 'var(--mfd-red)' : 'var(--mfd-text)',
        background: 'var(--mfd-bg-2)',
        border: `1px solid ${variant === 'danger' ? 'var(--mfd-red)' : 'var(--mfd-border)'}`,
        borderRadius: 'var(--mfd-rad-md)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
