import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  PixelBadge,
  PixelButton,
  PixelConsequenceList,
  PixelMetricCard,
  PixelModal,
  PixelPanel,
  PixelScreenHeader,
  PixelSelect,
  PixelTable,
} from '@mfd/design-system/components';
import { buildCapScenario, simulateMultipleMoves } from '@mfd/engine';
import type { CapMove } from '@mfd/engine';
import {
  selectUserTeam,
  useCapCandidates,
  useCapHealth,
  useGameStore,
  useMultiYearProjection,
} from '../../app/store/game-store';
import { buildDecisionImpactExplanation, decisionImpactToConsequenceItems } from '../companion/decisionImpact';

const screenStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
} as const;

const moveTypeOptions = [
  { value: 'restructure', label: 'Restructure' },
  { value: 'backload', label: 'Backload' },
  { value: 'cut', label: 'Cut' },
  { value: 'post_june_1_cut', label: 'Post-June-1 Cut' },
  { value: 'extend', label: 'Extend' },
];

const sortOptions = [
  { value: 'capHit', label: 'Cap Hit' },
  { value: 'savings', label: 'Cut Savings' },
  { value: 'recommendation', label: 'Recommendation' },
];

function gradeAccent(grade: string): 'green' | 'gold' | 'red' {
  if (grade === 'A' || grade === 'B') return 'green';
  if (grade === 'C') return 'gold';
  return 'red';
}

function recommendationAccent(recommendation: string): 'green' | 'gold' | 'red' | 'cyan' | 'default' {
  if (recommendation === 'restructure' || recommendation === 'backload') return 'cyan';
  if (recommendation === 'cut' || recommendation === 'trade') return 'red';
  if (recommendation === 'hold') return 'default';
  return 'gold';
}

export default function CapLaboratory() {
  const game = useGameStore((state) => state.game);
  const userTeam = useGameStore(selectUserTeam);
  const capHealth = useCapHealth();
  const candidates = useCapCandidates();
  const baseProjection = useMultiYearProjection();
  const executeCapMoves = useGameStore((state) => state.actions.executeCapMoves);
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('capHit');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [moveType, setMoveType] = useState<CapMove['type']>('restructure');
  const [voidYears, setVoidYears] = useState('1');
  const [extensionYears, setExtensionYears] = useState('2');
  const [extensionSalary, setExtensionSalary] = useState('12');
  const [sandbox, setSandbox] = useState<CapMove[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return candidates
      .filter((candidate) => positionFilter === 'ALL' || candidate.pos === positionFilter)
      .filter((candidate) => normalizedSearch.length === 0 || candidate.playerName.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => {
        if (sortBy === 'savings') return b.savingsIfCut - a.savingsIfCut || b.capHit - a.capHit;
        if (sortBy === 'recommendation') return a.recommendation.localeCompare(b.recommendation) || b.capHit - a.capHit;
        return b.capHit - a.capHit;
      });
  }, [candidates, positionFilter, search, sortBy]);

  const selectedCandidate = filteredCandidates.find((candidate) => candidate.playerId === selectedPlayerId)
    ?? candidates.find((candidate) => candidate.playerId === selectedPlayerId)
    ?? filteredCandidates[0]
    ?? null;

  const preview = useMemo(() => {
    if (!game || !userTeam || sandbox.length === 0) return null;
    return simulateMultipleMoves(buildCapScenario(userTeam, game), sandbox);
  }, [game, sandbox, userTeam]);

  const projectionYears = preview?.scenario.projections ?? baseProjection.years;
  const netCapChange = preview ? preview.capSpaceAfter - preview.capSpaceBefore : 0;
  const deadCapPct = preview
    ? Math.round(((preview.scenario.currentDeadCap ?? userTeam?.deadCap ?? 0) / Math.max(1, capHealth.capUsed + capHealth.capSpace)) * 100)
    : capHealth.deadCapPct;
  const capImpact = useMemo(
    () => buildDecisionImpactExplanation({
      surface: 'cap',
      label: 'Cap sandbox',
      capDelta: netCapChange,
      futureCapDelta: -deadCapPct,
      difficulty: 'standard',
    }),
    [deadCapPct, netCapChange],
  );

  const candidateColumns = useMemo<ColumnDef<(typeof candidates)[number], unknown>[]>(() => [
    {
      accessorKey: 'playerName',
      header: 'Player',
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span>{row.original.playerName}</span>
          <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>{row.original.pos}</span>
        </div>
      ),
    },
    { accessorKey: 'capHit', header: 'Cap Hit', cell: ({ getValue }) => `$${getValue() as number}M` },
    { accessorKey: 'deadIfCut', header: 'Dead', cell: ({ getValue }) => `$${getValue() as number}M` },
    { accessorKey: 'savingsIfCut', header: 'Cut Save', cell: ({ getValue }) => `$${getValue() as number}M` },
    { accessorKey: 'restructureSavings', header: 'Restruct', cell: ({ getValue }) => `$${getValue() as number}M` },
    {
      accessorKey: 'recommendation',
      header: 'Plan',
      cell: ({ row }) => <PixelBadge variant={recommendationAccent(row.original.recommendation)}>{row.original.recommendation}</PixelBadge>,
    },
  ], []);

  const projectionColumns = useMemo<ColumnDef<(typeof projectionYears)[number], unknown>[]>(() => [
    { accessorKey: 'year', header: 'Year' },
    { accessorKey: 'capTotal', header: 'Cap Total', cell: ({ getValue }) => `$${getValue() as number}M` },
    { accessorKey: 'committed', header: 'Committed', cell: ({ getValue }) => `$${getValue() as number}M` },
    { accessorKey: 'deadCap', header: 'Dead Cap', cell: ({ getValue }) => `$${getValue() as number}M` },
    { accessorKey: 'available', header: 'Available', cell: ({ getValue }) => `$${getValue() as number}M` },
  ], [projectionYears]);

  const addMove = () => {
    if (!selectedCandidate) return;

    const move: CapMove = moveType === 'backload'
      ? { type: 'backload', playerId: selectedCandidate.playerId, params: { voidYears: Number(voidYears) } }
      : moveType === 'extend'
        ? {
          type: 'extend',
          playerId: selectedCandidate.playerId,
          params: { years: Number(extensionYears), avgSalary: Number(extensionSalary) },
        }
        : { type: moveType, playerId: selectedCandidate.playerId };

    setSandbox((current) => [...current, move]);
  };

  return (
    <div style={screenStyle}>
      <PixelScreenHeader
        title="Cap Laboratory"
        subtitle="Plan restructures, cuts, and extensions in a sandbox before committing them to the live dynasty."
        badges={<PixelBadge variant={gradeAccent(capHealth.grade)}>{capHealth.grade} Cap Health</PixelBadge>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <PixelMetricCard label="Cap Grade" value={capHealth.grade} accent={gradeAccent(capHealth.grade)} detail="Overall cap-health score" />
        <PixelMetricCard label="Cap Space" value={`$${capHealth.capSpace}M`} accent="green" detail="Current room under the cap" />
        <PixelMetricCard label="Dead Cap %" value={`${capHealth.deadCapPct}%`} accent={capHealth.deadCapPct > 15 ? 'red' : 'gold'} detail="Dead money share" />
        <PixelMetricCard label="Flex Score" value={capHealth.flexibilityScore} accent="cyan" detail={`Top-heavy score ${capHealth.topHeavyScore}`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)', gap: '12px' }}>
        <PixelPanel title="Cap Candidates" accent="cyan">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search players"
              style={{
                minHeight: '34px',
                minWidth: '180px',
                padding: '8px 10px',
                border: '3px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
                color: 'var(--mfd-text)',
                fontFamily: 'var(--mfd-font-mono)',
                fontSize: '12px',
              }}
            />
            <PixelSelect
              value={positionFilter}
              onChange={(event) => setPositionFilter(event.target.value)}
              options={[
                { value: 'ALL', label: 'All Positions' },
                { value: 'QB', label: 'QB' },
                { value: 'RB', label: 'RB' },
                { value: 'WR', label: 'WR' },
                { value: 'TE', label: 'TE' },
                { value: 'OL', label: 'OL' },
                { value: 'DL', label: 'DL' },
                { value: 'LB', label: 'LB' },
                { value: 'CB', label: 'CB' },
                { value: 'S', label: 'S' },
                { value: 'K', label: 'K' },
                { value: 'P', label: 'P' },
              ]}
              accent="cyan"
            />
            <PixelSelect value={sortBy} onChange={(event) => setSortBy(event.target.value)} options={sortOptions} accent="cyan" />
          </div>

          <PixelTable
            data={filteredCandidates}
            columns={candidateColumns}
            accent="cyan"
            onRowClick={(row) => setSelectedPlayerId(row.playerId)}
            emptyMessage="No cap candidates match this filter."
          />
        </PixelPanel>

        <PixelPanel title="Sandbox" accent="gold">
          <div data-spotlight-target="chip.route.cap-laboratory.beat-1" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedCandidate ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '24px', color: 'var(--mfd-text)' }}>
                      {selectedCandidate.playerName}
                    </span>
                    <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                      {selectedCandidate.pos} · Cap hit ${selectedCandidate.capHit}M
                    </span>
                  </div>
                  <PixelBadge variant={recommendationAccent(selectedCandidate.recommendation)}>{selectedCandidate.recommendation}</PixelBadge>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelSelect value={moveType} onChange={(event) => setMoveType(event.target.value as CapMove['type'])} options={moveTypeOptions} accent="gold" />
                  {moveType === 'backload' ? (
                    <PixelSelect
                      value={voidYears}
                      onChange={(event) => setVoidYears(event.target.value)}
                      options={[
                        { value: '1', label: '1 Void Year' },
                        { value: '2', label: '2 Void Years' },
                        { value: '3', label: '3 Void Years' },
                      ]}
                      accent="gold"
                    />
                  ) : null}
                  {moveType === 'extend' ? (
                    <>
                      <PixelSelect
                        value={extensionYears}
                        onChange={(event) => setExtensionYears(event.target.value)}
                        options={[
                          { value: '1', label: '1 Year' },
                          { value: '2', label: '2 Years' },
                          { value: '3', label: '3 Years' },
                          { value: '4', label: '4 Years' },
                          { value: '5', label: '5 Years' },
                        ]}
                        accent="gold"
                      />
                      <input
                        value={extensionSalary}
                        onChange={(event) => setExtensionSalary(event.target.value)}
                        aria-label="Extension salary"
                        style={{
                          minHeight: '34px',
                          width: '120px',
                          padding: '8px 10px',
                          border: '3px solid var(--mfd-gold)',
                          background: 'rgba(255, 215, 0, 0.08)',
                          color: 'var(--mfd-gold)',
                          fontFamily: 'var(--mfd-font-mono)',
                          fontSize: '12px',
                        }}
                      />
                    </>
                  ) : null}
                  <PixelButton accent="gold" onClick={addMove}>Add Move</PixelButton>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedCandidate.deadIfCut / Math.max(1, selectedCandidate.capHit) > 0.75 ? <PixelBadge variant="red">Dead Cap Risk</PixelBadge> : null}
                  {(moveType === 'backload' && (game?.players[selectedCandidate.playerId]?.contract?.voidYears ?? 0) >= 3) ? <PixelBadge variant="red">Void Year Limit</PixelBadge> : null}
                </div>
              </>
            ) : (
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                Select a player from the cap candidate board to start building a scenario.
              </div>
            )}

            <PixelPanel title="Queued Moves" accent="green" padding="sm">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sandbox.length > 0 ? sandbox.map((move, index) => {
                  const playerName = candidates.find((candidate) => candidate.playerId === move.playerId)?.playerName ?? move.playerId;
                  return (
                    <div key={`${move.playerId}-${move.type}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>{playerName}</span>
                        <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                          {move.type.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <PixelButton accent="red" onClick={() => setSandbox((current) => current.filter((_, moveIndex) => moveIndex !== index))}>
                        Remove
                      </PixelButton>
                    </div>
                  );
                }) : (
                  <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
                    No moves queued yet.
                  </div>
                )}
              </div>
            </PixelPanel>

            <PixelConsequenceList
              items={[
                { id: 'cap-change', label: 'Net cap change', delta: `${netCapChange >= 0 ? '+' : ''}$${netCapChange.toFixed(1)}M`, accent: netCapChange >= 0 ? 'green' : 'red' },
                { id: 'move-count', label: 'Queued moves', delta: `${sandbox.length}`, accent: 'cyan' },
                { id: 'dead-cap', label: 'Dead cap pressure', delta: `${deadCapPct}%`, accent: deadCapPct > 15 ? 'red' : 'gold' },
              ]}
            />

            <PixelPanel title="Cap Impact" accent={capImpact.severity === 'high' ? 'red' : 'gold'} padding="sm">
              <PixelConsequenceList items={decisionImpactToConsequenceItems(capImpact)} />
            </PixelPanel>

            {preview?.warnings?.length ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {preview.warnings.map((warning) => <PixelBadge key={warning} variant="red">{warning}</PixelBadge>)}
              </div>
            ) : null}

            <PixelButton accent="green" disabled={sandbox.length === 0} onClick={() => setConfirmOpen(true)}>
              Apply Sandbox
            </PixelButton>
          </div>
        </PixelPanel>
      </div>

      <div data-spotlight-target="chip.route.cap-laboratory.beat-2">
        <PixelPanel title="Multi-Year Projection" accent="green">
          <PixelTable data={projectionYears} columns={projectionColumns} accent="green" emptyMessage="Projection unavailable." />
        </PixelPanel>
      </div>

      <PixelModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Apply Sandbox"
        description="Commit these cap moves to the live dynasty state."
        accent="gold"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)' }}>
            Current cap space: ${capHealth.capSpace}M. After moves: ${preview?.capSpaceAfter ?? capHealth.capSpace}M.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelButton accent="gold" onClick={() => setConfirmOpen(false)}>Cancel</PixelButton>
            <PixelButton
              accent="green"
              onClick={() => {
                void executeCapMoves(sandbox);
                setSandbox([]);
                setConfirmOpen(false);
              }}
            >
              Confirm
            </PixelButton>
          </div>
        </div>
      </PixelModal>
    </div>
  );
}
