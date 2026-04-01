import { useState, useMemo, useCallback } from 'react';
import {
  MfdPanel, MfdTable, MfdBadge, MfdKpiGrid, MfdKpiCard,
  MfdDialog, MfdConsequenceRibbon, MfdRingProgress,
} from '@mfd/design-system/components';
import {
  DollarSign, TrendingUp, TrendingDown,
  Scissors, RefreshCw, Tag, Calendar,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { Player } from '@mfd/engine';
import { calcCapHit, calcDeadMoney, getSalaryCap } from '@mfd/engine';
import {
  useGameStore, selectRoster, selectUserTeam, selectUserTeamId, selectYear,
} from '../../app/store/game-store';

// ── Derived row type for table ─────────────────────────────

interface ContractRow {
  id: string;
  name: string;
  pos: string;
  ovr: number;
  age: number;
  capHit: number;
  deadCap: number;
  years: number;
  guaranteed: number;
  totalValue: number;
  restructured: boolean;
  player: Player;
}

function toContractRows(roster: Player[]): ContractRow[] {
  return roster
    .filter((p) => p.contract)
    .map((p) => {
      const c = p.contract!;
      return {
        id: p.id,
        name: p.name,
        pos: p.pos,
        ovr: p.ovr,
        age: p.age,
        capHit: Math.round(calcCapHit(c) * 10) / 10,
        deadCap: Math.round(calcDeadMoney(c) * 10) / 10,
        years: c.years,
        guaranteed: Math.round(c.guaranteed * 10) / 10,
        totalValue: Math.round(c.totalValue * 10) / 10,
        restructured: c.restructured,
        player: p,
      };
    })
    .sort((a, b) => b.capHit - a.capHit);
}

// ── Columns ────────────────────────────────────────────────

const columns: ColumnDef<ContractRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span style={{ fontWeight: 500 }}>{row.original.name}</span>,
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
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)', fontWeight: 600 }}>{getValue() as number}</span>
    ),
    size: 50,
  },
  {
    accessorKey: 'capHit',
    header: 'Cap Hit',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>${getValue() as number}M</span>
    ),
    size: 80,
  },
  {
    accessorKey: 'deadCap',
    header: 'Dead Cap',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)', color: 'var(--mfd-red)' }}>
        ${getValue() as number}M
      </span>
    ),
    size: 80,
  },
  {
    accessorKey: 'years',
    header: 'Years',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-mono)' }}>{getValue() as number}yr</span>
    ),
    size: 60,
  },
  {
    id: 'value',
    header: 'Value',
    cell: ({ row }) => {
      const r = row.original;
      // Simple value assessment: capHit vs OVR
      const ratio = r.capHit / Math.max(r.ovr - 50, 1);
      const label = ratio < 0.3 ? 'Fair' : ratio < 0.5 ? 'Watch' : 'Overpay';
      const variant = label === 'Fair' ? 'success' : label === 'Watch' ? 'warning' : 'danger';
      return <MfdBadge variant={variant}>{label}</MfdBadge>;
    },
    size: 70,
  },
  {
    accessorKey: 'restructured',
    header: 'Status',
    cell: ({ getValue }) => (
      getValue() ? <MfdBadge variant="info">Restructured</MfdBadge> : null
    ),
    size: 90,
  },
];

// ── Component ──────────────────────────────────────────────

export function ContractsCap() {
  const roster = useGameStore(selectRoster);
  const team = useGameStore(selectUserTeam);
  const teamId = useGameStore(selectUserTeamId);
  const year = useGameStore(selectYear);
  const { restructure, backload, cutPlayer } = useGameStore((s) => s.actions);

  const [selectedContract, setSelectedContract] = useState<ContractRow | null>(null);

  const contractRows = useMemo(() => toContractRows(roster), [roster]);

  const salaryCap = getSalaryCap(year);
  const capUsed = team ? Math.round(team.capUsed * 10) / 10 : 0;
  const capSpace = team ? Math.round(team.capSpace * 10) / 10 : 0;
  const deadCap = team ? Math.round(team.deadCap * 10) / 10 : 0;
  const capPct = salaryCap > 0 ? Math.round((capUsed / salaryCap) * 100) : 0;

  const handleRestructure = useCallback(() => {
    if (!teamId || !selectedContract) return;
    restructure(teamId, selectedContract.id);
    setSelectedContract(null);
  }, [teamId, selectedContract, restructure]);

  const handleBackload = useCallback(() => {
    if (!teamId || !selectedContract) return;
    backload(teamId, selectedContract.id);
    setSelectedContract(null);
  }, [teamId, selectedContract, backload]);

  const handleCut = useCallback(() => {
    if (!teamId || !selectedContract) return;
    cutPlayer(teamId, selectedContract.id);
    setSelectedContract(null);
  }, [teamId, selectedContract, cutPlayer]);

  // Simple 3-year projections
  const projections = useMemo(() => {
    return [1, 2, 3].map((offset) => {
      const projYear = year + offset;
      const projCap = getSalaryCap(projYear);
      // Rough estimate: committed = contracts with years remaining > offset
      const committed = contractRows
        .filter((r) => r.years > offset)
        .reduce((s, r) => s + r.capHit, 0);
      return {
        year: projYear,
        committed: Math.round(committed * 10) / 10,
        space: Math.round((projCap - committed) * 10) / 10,
      };
    });
  }, [contractRows, year]);

  // Positional cap breakdown
  const posBreakdown = useMemo(() => {
    const byPos: Record<string, number> = {};
    for (const r of contractRows) {
      byPos[r.pos] = (byPos[r.pos] ?? 0) + r.capHit;
    }
    return Object.entries(byPos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pos, total]) => ({ pos, total, pct: salaryCap > 0 ? (total / salaryCap) * 100 : 0 }));
  }, [contractRows, salaryCap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem',
          fontWeight: 700, color: 'var(--mfd-text)', margin: 0,
        }}>Contracts & Salary Cap</h1>
        <p style={{
          fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)', margin: '4px 0 0',
        }}>
          Cap: ${salaryCap}M // Used: ${capUsed}M // Space: ${capSpace}M
        </p>
      </div>

      {/* Cap KPIs */}
      <MfdKpiGrid columns={4}>
        <MfdKpiCard label="Salary Cap" value={`$${salaryCap}M`} icon={<DollarSign size={14} />} trend="flat" />
        <MfdKpiCard
          label="Cap Used" value={`$${capUsed}M`} icon={<TrendingUp size={14} />}
          trend="up" trendLabel={`${capPct}% used`}
          variant={capPct > 90 ? 'danger' : 'default'}
        />
        <MfdKpiCard label="Dead Cap" value={`$${deadCap}M`} icon={<TrendingDown size={14} />} trend="down" variant="danger" />
        <MfdKpiCard label="Cap Space" value={`$${capSpace}M`} icon={<DollarSign size={14} />} trend="up" variant="success" />
      </MfdKpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {/* Cap Visualization Ring */}
        <MfdPanel title="Cap Breakdown" icon={<DollarSign size={14} />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-xl)' }}>
            <MfdRingProgress
              value={capPct}
              size={100}
              strokeWidth={8}
              color={capPct > 90 ? 'var(--mfd-red)' : 'var(--mfd-cyan)'}
              label={`${capPct}%`}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
              {posBreakdown.map((pb) => (
                <div key={pb.pos} style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)' }}>
                  <MfdBadge variant="default">{pb.pos}</MfdBadge>
                  <div style={{
                    flex: 1, height: 6, background: 'var(--mfd-bg-3)',
                    borderRadius: 3, overflow: 'hidden', minWidth: 60,
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: 'var(--mfd-cyan)',
                      width: `${Math.min(100, pb.pct * 3)}%`,
                    }} />
                  </div>
                  <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.625rem', color: 'var(--mfd-text-dim)' }}>
                    ${Math.round(pb.total)}M
                  </span>
                </div>
              ))}
            </div>
          </div>
        </MfdPanel>

        {/* 3-Year Projections */}
        <MfdPanel title="Cap Projections" icon={<Calendar size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
            {projections.map((proj) => (
              <div key={proj.year} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: 'var(--mfd-sp-xs) 0',
                borderBottom: '1px solid var(--mfd-border)',
              }}>
                <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.8125rem' }}>
                  {proj.year}
                </span>
                <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)' }}>
                  <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
                    ${proj.committed}M committed
                  </span>
                  <MfdBadge variant="success">${proj.space}M free</MfdBadge>
                </div>
              </div>
            ))}
          </div>
        </MfdPanel>
      </div>

      {/* Contracts Table */}
      <MfdTable
        data={contractRows}
        columns={columns}
        density="compact"
        onRowClick={(row) => setSelectedContract(row)}
      />

      {/* Contract Detail Dialog */}
      <MfdDialog
        open={!!selectedContract}
        onOpenChange={(open) => { if (!open) setSelectedContract(null); }}
        title={selectedContract ? `${selectedContract.name} — Contract` : 'Contract Details'}
      >
        {selectedContract && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
            <MfdKpiGrid columns={3}>
              <MfdKpiCard label="Cap Hit" value={`$${selectedContract.capHit}M`} icon={<DollarSign size={14} />} trend="flat" />
              <MfdKpiCard label="Dead Cap" value={`$${selectedContract.deadCap}M`} icon={<TrendingDown size={14} />} trend="flat" variant="danger" />
              <MfdKpiCard label="Years Left" value={selectedContract.years} icon={<Calendar size={14} />} trend="flat" />
            </MfdKpiGrid>

            <MfdPanel title="Actions" icon={<RefreshCw size={14} />}>
              <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)', flexWrap: 'wrap' }}>
                <ActionBtn label="Restructure" icon={<RefreshCw size={12} />} onClick={handleRestructure} />
                <ActionBtn label="Cut" icon={<Scissors size={12} />} onClick={handleCut} variant="danger" />
                <ActionBtn label="Add Void Years" icon={<Calendar size={12} />} onClick={handleBackload} />
              </div>
              <div style={{ marginTop: 'var(--mfd-sp-sm)' }}>
                <MfdConsequenceRibbon
                  consequences={[
                    { id: 'c1', label: 'Cap Savings', delta: `+$${Math.round(selectedContract.capHit * 0.3 * 10) / 10}M/yr`, direction: 'positive' as const },
                    { id: 'c2', label: 'Dead Cap', delta: `+$${selectedContract.deadCap}M`, direction: 'negative' as const },
                    { id: 'c3', label: 'Guaranteed', delta: `$${selectedContract.guaranteed}M`, direction: 'warning' as const },
                  ]}
                />
              </div>
            </MfdPanel>
          </div>
        )}
      </MfdDialog>
    </div>
  );
}

function ActionBtn({ label, icon, onClick, variant }: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'danger';
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', fontSize: '0.75rem',
        fontFamily: 'var(--mfd-font-sans)', fontWeight: 500,
        color: variant === 'danger' ? 'var(--mfd-red)' : 'var(--mfd-text)',
        background: 'var(--mfd-bg-2)',
        border: `1px solid ${variant === 'danger' ? 'var(--mfd-red)' : 'var(--mfd-border)'}`,
        borderRadius: 'var(--mfd-rad-md)',
        cursor: 'pointer',
      }}
    >
      {icon} {label}
    </button>
  );
}
