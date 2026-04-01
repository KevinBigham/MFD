import { useState, useMemo } from 'react';
import {
  MfdPanel, MfdTable, MfdBadge, MfdKpiGrid, MfdKpiCard,
  MfdDialog, MfdConsequenceRibbon,
} from '@mfd/design-system/components';
import {
  Users, Search, Filter, ChevronRight,
  TrendingUp, Shield, DollarSign, Zap,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

// Mock roster data — replaced with engine data when wired
const MOCK_ROSTER = Array.from({ length: 53 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i + 1}`,
  pos: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'][i % 10]!,
  age: 22 + (i % 14),
  ovr: 60 + (i % 30),
  pot: 65 + (i % 25),
  salary: Math.round((1 + (i % 20)) * 10) / 10,
  contract: `${1 + (i % 5)}yr`,
  fit: ['A', 'B', 'C', 'D'][i % 4]!,
  role: i < 22 ? 'Starter' : 'Backup',
  morale: 40 + (i % 50),
  chemistry: 50 + (i % 40),
  dev: ['Normal', 'Star', 'Superstar', 'X-Factor'][i % 4]!,
}));

type RosterPlayer = typeof MOCK_ROSTER[number];

const columns: ColumnDef<RosterPlayer, unknown>[] = [
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
    accessorKey: 'salary',
    header: 'Cap Hit',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>${getValue() as number}M</span>
    ),
    size: 70,
  },
  {
    accessorKey: 'contract',
    header: 'Contract',
    size: 70,
  },
  {
    accessorKey: 'fit',
    header: 'Fit',
    cell: ({ getValue }) => {
      const v = getValue() as string;
      const variant = v === 'A' ? 'success' : v === 'B' ? 'info' : v === 'C' ? 'warning' : 'danger';
      return <MfdBadge variant={variant}>{v}</MfdBadge>;
    },
    size: 40,
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ getValue }) => {
      const v = getValue() as string;
      return <MfdBadge variant={v === 'Starter' ? 'gold' : 'default'}>{v}</MfdBadge>;
    },
    size: 70,
  },
  {
    accessorKey: 'dev',
    header: 'Dev',
    cell: ({ getValue }) => {
      const v = getValue() as string;
      const variant = v === 'X-Factor' ? 'purple' : v === 'Superstar' ? 'gold' : v === 'Star' ? 'info' : 'default';
      return <MfdBadge variant={variant}>{v}</MfdBadge>;
    },
    size: 80,
  },
];

export function RosterManagement() {
  const [selectedPlayer, setSelectedPlayer] = useState<RosterPlayer | null>(null);
  const [posFilter, setPosFilter] = useState<string>('ALL');

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];

  const filtered = useMemo(() => {
    if (posFilter === 'ALL') return MOCK_ROSTER;
    return MOCK_ROSTER.filter((p) => p.pos === posFilter);
  }, [posFilter]);

  const avgOvr = Math.round(MOCK_ROSTER.reduce((s, p) => s + p.ovr, 0) / MOCK_ROSTER.length);
  const starters = MOCK_ROSTER.filter((p) => p.role === 'Starter').length;
  const avgAge = Math.round(MOCK_ROSTER.reduce((s, p) => s + p.age, 0) / MOCK_ROSTER.length * 10) / 10;

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
            {MOCK_ROSTER.length} players // 53-man roster
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <MfdKpiGrid columns={4}>
        <MfdKpiCard label="Roster Size" value={`${MOCK_ROSTER.length}/53`} icon={<Users size={14} />} trend="flat" />
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
            </div>

            <MfdPanel title="Contract" icon={<DollarSign size={14} />}>
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.8125rem' }}>
                <div>Cap Hit: ${selectedPlayer.salary}M</div>
                <div>Duration: {selectedPlayer.contract}</div>
                <div>Scheme Fit: {selectedPlayer.fit}</div>
              </div>
            </MfdPanel>

            <MfdPanel title="Vitals" icon={<TrendingUp size={14} />}>
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.8125rem' }}>
                <div>Morale: {selectedPlayer.morale}</div>
                <div>Chemistry: {selectedPlayer.chemistry}</div>
                <div>Development: {selectedPlayer.dev}</div>
              </div>
            </MfdPanel>

            {/* Action Tray with Delta Preview */}
            <MfdPanel title="Actions" icon={<Zap size={14} />}>
              <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)', flexWrap: 'wrap' }}>
                {['Restructure', 'Cut', 'Trade Block', 'Extend'].map((action) => (
                  <button
                    key={action}
                    style={{
                      padding: '6px 12px', fontSize: '0.75rem',
                      fontFamily: 'var(--mfd-font-sans)', fontWeight: 500,
                      color: 'var(--mfd-text)',
                      background: 'var(--mfd-bg-2)',
                      border: '1px solid var(--mfd-border)',
                      borderRadius: 'var(--mfd-rad-md)',
                      cursor: 'pointer',
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
              <MfdConsequenceRibbon
                consequences={[
                  { id: 'c1', label: 'Cap Space', delta: '+$2.1M', direction: 'positive' as const },
                  { id: 'c2', label: 'Dead Money', delta: '+$1.5M', direction: 'negative' as const },
                ]}
              />
            </MfdPanel>
          </div>
        )}
      </MfdDialog>
    </div>
  );
}
