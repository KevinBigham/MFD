import { useState } from 'react';
import {
  MfdPanel, MfdTable, MfdBadge, MfdKpiGrid, MfdKpiCard,
  MfdDialog, MfdConsequenceRibbon, MfdRingProgress,
} from '@mfd/design-system/components';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Scissors, RefreshCw, Tag, Calendar,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

// Mock contract data
const MOCK_CONTRACTS = Array.from({ length: 30 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i + 1}`,
  pos: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'][i % 10]!,
  ovr: 60 + (i % 30),
  age: 22 + (i % 14),
  capHit: Math.round((2 + (i % 20)) * 10) / 10,
  deadCap: Math.round((0.5 + (i % 8)) * 10) / 10,
  years: 1 + (i % 5),
  guaranteed: Math.round((1 + (i % 10)) * 10) / 10,
  value: ['Fair', 'Watch', 'Overpay'][i % 3]! as 'Fair' | 'Watch' | 'Overpay',
  restructured: i % 5 === 0,
}));

type ContractRow = typeof MOCK_CONTRACTS[number];

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
    accessorKey: 'value',
    header: 'Value',
    cell: ({ getValue }) => {
      const v = getValue() as string;
      const variant = v === 'Fair' ? 'success' : v === 'Watch' ? 'warning' : 'danger';
      return <MfdBadge variant={variant}>{v}</MfdBadge>;
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

const MOCK_CAP = {
  salaryCap: 255,
  capUsed: 198.4,
  deadCap: 12.3,
  capSpace: 44.3,
  capPct: 78,
};

const MOCK_PROJECTIONS = [
  { year: 2027, committed: 165, space: 103, warning: '' },
  { year: 2028, committed: 120, space: 155, warning: '' },
  { year: 2029, committed: 85, space: 195, warning: '' },
];

export function ContractsCap() {
  const [selectedContract, setSelectedContract] = useState<ContractRow | null>(null);

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
          Cap: ${MOCK_CAP.salaryCap}M // Used: ${MOCK_CAP.capUsed}M // Space: ${MOCK_CAP.capSpace}M
        </p>
      </div>

      {/* Cap KPIs */}
      <MfdKpiGrid columns={4}>
        <MfdKpiCard
          label="Salary Cap"
          value={`$${MOCK_CAP.salaryCap}M`}
          icon={<DollarSign size={14} />}
          trend="flat"
        />
        <MfdKpiCard
          label="Cap Used"
          value={`$${MOCK_CAP.capUsed}M`}
          icon={<TrendingUp size={14} />}
          trend="up"
          trendLabel={`${MOCK_CAP.capPct}% used`}
          variant={MOCK_CAP.capPct > 90 ? 'danger' : 'default'}
        />
        <MfdKpiCard
          label="Dead Cap"
          value={`$${MOCK_CAP.deadCap}M`}
          icon={<TrendingDown size={14} />}
          trend="down"
          variant="danger"
        />
        <MfdKpiCard
          label="Cap Space"
          value={`$${MOCK_CAP.capSpace}M`}
          icon={<DollarSign size={14} />}
          trend="up"
          variant="success"
        />
      </MfdKpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {/* Cap Visualization Ring */}
        <MfdPanel title="Cap Breakdown" icon={<DollarSign size={14} />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-xl)' }}>
            <MfdRingProgress
              value={MOCK_CAP.capPct}
              size={100}
              strokeWidth={8}
              color={MOCK_CAP.capPct > 90 ? 'var(--mfd-red)' : 'var(--mfd-cyan)'}
              label={`${MOCK_CAP.capPct}%`}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
              {['QB', 'WR', 'DL', 'CB', 'OL'].map((pos) => (
                <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)' }}>
                  <MfdBadge variant="default">{pos}</MfdBadge>
                  <div style={{
                    flex: 1, height: 6, background: 'var(--mfd-bg-3)',
                    borderRadius: 3, overflow: 'hidden', minWidth: 60,
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: 'var(--mfd-cyan)',
                      width: `${30 + Math.random() * 60}%`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MfdPanel>

        {/* 3-Year Projections */}
        <MfdPanel title="Cap Projections" icon={<Calendar size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
            {MOCK_PROJECTIONS.map((proj) => (
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
        data={MOCK_CONTRACTS}
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
                {[
                  { label: 'Restructure', icon: <RefreshCw size={12} /> },
                  { label: 'Cut', icon: <Scissors size={12} /> },
                  { label: 'Franchise Tag', icon: <Tag size={12} /> },
                  { label: 'Add Void Years', icon: <Calendar size={12} /> },
                ].map((action) => (
                  <button
                    key={action.label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', fontSize: '0.75rem',
                      fontFamily: 'var(--mfd-font-sans)', fontWeight: 500,
                      color: 'var(--mfd-text)',
                      background: 'var(--mfd-bg-2)',
                      border: '1px solid var(--mfd-border)',
                      borderRadius: 'var(--mfd-rad-md)',
                      cursor: 'pointer',
                    }}
                  >
                    {action.icon} {action.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 'var(--mfd-sp-sm)' }}>
                <MfdConsequenceRibbon
                  consequences={[
                    { id: 'c1', label: 'Cap Savings', delta: '+$3.2M/yr', direction: 'positive' as const },
                    { id: 'c2', label: 'Dead Cap', delta: '+$4.1M', direction: 'negative' as const },
                    { id: 'c3', label: 'Guaranteed', delta: '+$8M', direction: 'warning' as const },
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
