import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PixelBadge,
  PixelButton,
  PixelModal,
  PixelPanel,
  PixelProgressBar,
  PixelSelect,
  PixelSwitch,
  PixelTable,
} from '@mfd/design-system/components';
import type { ColumnDef } from '@tanstack/react-table';
import type { ExtensionOffer, Player } from '@mfd/engine';
import {
  calcCapHit,
  calcDeadMoney,
  generateExtensionOffer,
  getSalaryCap,
  postJune1Cut,
} from '@mfd/engine';
import {
  selectCapProjection,
  selectIncentiveSummary,
  selectRoster,
  selectUserTeam,
  selectUserTeamId,
  selectYear,
  useGameStore,
} from '../../app/store/game-store';
import { useUiStore } from '../../app/store/ui-store';
import {
  PixelConsequenceList,
  PixelMetricCard,
  PixelScreenHeader,
  PlayerNameLink,
  autoGrid,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';

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
  holdout: boolean;
  agentName: string;
  agentStyle: string;
  player: Player;
}

function toContractRows(
  roster: Player[],
  agents: Array<{ id: string; name: string; style: string }>,
): ContractRow[] {
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
  return roster
    .filter((player) => player.contract || player.holdout)
    .map((player) => {
      const contract = player.contract;
      const agent = player.agentId ? agentsById.get(player.agentId) : null;
      return {
        id: player.id,
        name: player.name,
        pos: player.pos,
        ovr: player.ovr,
        age: player.age,
        capHit: contract ? Math.round(calcCapHit(contract) * 10) / 10 : 0,
        deadCap: contract ? Math.round(calcDeadMoney(contract) * 10) / 10 : 0,
        years: contract?.years ?? 0,
        guaranteed: contract ? Math.round(contract.guaranteed * 10) / 10 : 0,
        totalValue: contract ? Math.round(contract.totalValue * 10) / 10 : 0,
        restructured: contract?.restructured ?? false,
        holdout: player.holdout,
        agentName: agent?.name ?? 'Unassigned',
        agentStyle: agent?.style.replaceAll('_', ' ') ?? 'n/a',
        player,
      };
    })
    .sort((a, b) => b.capHit - a.capHit);
}

const columns: ColumnDef<ContractRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <PlayerNameLink playerId={row.original.id} name={row.original.name} ovr={row.original.ovr} style={{ fontWeight: 500 }} />,
  },
  {
    accessorKey: 'pos',
    header: 'Pos',
    cell: ({ getValue }) => <PixelBadge variant="default">{getValue() as string}</PixelBadge>,
    size: 60,
  },
  {
    accessorKey: 'ovr',
    header: 'OVR',
    cell: ({ getValue }) => (
      <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', lineHeight: 1, color: 'var(--mfd-text)' }}>{getValue() as number}</span>
    ),
    size: 50,
  },
  {
    accessorKey: 'capHit',
    header: 'Cap Hit',
    cell: ({ getValue }) => <span style={{ fontFamily: 'var(--mfd-font-mono)', color: 'var(--mfd-text)' }}>${getValue() as number}M</span>,
    size: 84,
  },
  {
    accessorKey: 'deadCap',
    header: 'Dead Cap',
    cell: ({ getValue }) => <span style={{ fontFamily: 'var(--mfd-font-mono)', color: 'var(--mfd-red)' }}>${getValue() as number}M</span>,
    size: 84,
  },
  {
    accessorKey: 'years',
    header: 'Years',
    cell: ({ getValue }) => <span style={{ fontFamily: 'var(--mfd-font-mono)', color: 'var(--mfd-text)' }}>{getValue() as number}yr</span>,
    size: 60,
  },
  {
    accessorKey: 'agentName',
    header: 'Agent',
    cell: ({ row }) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ color: 'var(--mfd-text)' }}>{row.original.agentName}</span>
        <PixelBadge variant="cyan">{row.original.agentStyle}</PixelBadge>
      </div>
    ),
    size: 136,
  },
  {
    id: 'value',
    header: 'Value',
    cell: ({ row }) => {
      const ratio = row.original.capHit / Math.max(row.original.ovr - 50, 1);
      const label = ratio < 0.3 ? 'Fair' : ratio < 0.5 ? 'Watch' : 'Overpay';
      const variant = label === 'Fair' ? 'green' : label === 'Watch' ? 'gold' : 'red';
      return <PixelBadge variant={variant}>{label}</PixelBadge>;
    },
    size: 74,
  },
  {
    accessorKey: 'restructured',
    header: 'Status',
    cell: ({ row, getValue }) => (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {row.original.holdout ? <PixelBadge variant="red">Holdout</PixelBadge> : null}
        {getValue() ? <PixelBadge variant="cyan">Restructured</PixelBadge> : null}
      </div>
    ),
    size: 132,
  },
];

function buildExtensionPreview(baseOffer: ExtensionOffer, years: number, preset: 'team' | 'fair' | 'aggressive'): ExtensionOffer {
  const salaryMultiplier = preset === 'team' ? 0.94 : preset === 'aggressive' ? 1.08 : 1;
  const guaranteeMultiplier = preset === 'team' ? 0.9 : preset === 'aggressive' ? 1.08 : 1;
  const signingMultiplier = preset === 'team' ? 0.92 : preset === 'aggressive' ? 1.06 : 1;
  const newAvgSalary = Math.round(baseOffer.newAvgSalary * salaryMultiplier * 10) / 10;
  const guaranteedAmount = Math.round(baseOffer.guaranteedAmount * guaranteeMultiplier * 10) / 10;
  const signingBonus = Math.round(baseOffer.signingBonus * signingMultiplier * 10) / 10;
  const proratedBonus = Math.round((signingBonus / Math.max(1, years)) * 10) / 10;

  return {
    ...baseOffer,
    newYears: years,
    newAvgSalary,
    guaranteedAmount,
    signingBonus,
    capHitByYear: Array.from({ length: years }, (_, index) =>
      Math.round((newAvgSalary * (1 + index * 0.04) + proratedBonus) * 10) / 10),
  };
}

export function ContractsCap() {
  const game = useGameStore((state) => state.game);
  const roster = useGameStore(selectRoster);
  const agents = useGameStore((state) => state.game?.agents ?? []);
  const team = useGameStore(selectUserTeam);
  const teamId = useGameStore(selectUserTeamId);
  const year = useGameStore(selectYear);
  const projections = useGameStore(selectCapProjection);
  const incentiveSummary = useGameStore(selectIncentiveSummary);
  const { restructure, backload, cutPlayer, submitExtensionOffer } = useGameStore((state) => state.actions);
  const focusedPlayerId = useUiStore((state) => state.focusedPlayerId);
  const focusedPlayerScreen = useUiStore((state) => state.focusedPlayerScreen);
  const clearFocusedPlayerContext = useUiStore((state) => state.clearFocusedPlayerContext);

  const [selectedContract, setSelectedContract] = useState<ContractRow | null>(null);
  const [postJune1, setPostJune1] = useState(false);
  const [extensionYears, setExtensionYears] = useState('base');
  const [extensionPreset, setExtensionPreset] = useState<'team' | 'fair' | 'aggressive'>('fair');
  const [extensionFeedback, setExtensionFeedback] = useState<{ accepted: boolean; reasoning: string } | null>(null);

  const contractRows = useMemo(() => toContractRows(roster, agents), [agents, roster]);
  const salaryCap = getSalaryCap(year);
  const capUsed = team ? Math.round(team.capUsed * 10) / 10 : 0;
  const capSpace = team ? Math.round(team.capSpace * 10) / 10 : 0;
  const deadCap = team ? Math.round(team.deadCap * 10) / 10 : 0;
  const capPct = salaryCap > 0 ? Math.round((capUsed / salaryCap) * 100) : 0;

  useEffect(() => {
    if (!focusedPlayerId || focusedPlayerScreen !== 'contracts') return;
    const nextSelection = contractRows.find((row) => row.id === focusedPlayerId) ?? null;
    if (nextSelection) {
      setSelectedContract(nextSelection);
    }
    clearFocusedPlayerContext();
  }, [clearFocusedPlayerContext, contractRows, focusedPlayerId, focusedPlayerScreen]);

  useEffect(() => {
    setPostJune1(false);
    setExtensionYears('base');
    setExtensionPreset('fair');
    setExtensionFeedback(null);
  }, [selectedContract?.id]);

  const handleRestructure = useCallback(() => {
    if (!teamId || !selectedContract) return;
    restructure(teamId, selectedContract.id);
    setSelectedContract(null);
  }, [restructure, selectedContract, teamId]);

  const handleBackload = useCallback(() => {
    if (!teamId || !selectedContract) return;
    backload(teamId, selectedContract.id);
    setSelectedContract(null);
  }, [backload, selectedContract, teamId]);

  const handleCut = useCallback(() => {
    if (!teamId || !selectedContract) return;
    void cutPlayer(teamId, selectedContract.id, { postJune1 });
    setSelectedContract(null);
  }, [cutPlayer, postJune1, selectedContract, teamId]);

  const baseExtensionOffer = useMemo(() => {
    if (!game || !team || !selectedContract) return null;
    return generateExtensionOffer(selectedContract.player, team, game);
  }, [game, selectedContract, team]);

  const extensionOffer = useMemo(() => {
    if (!baseExtensionOffer) return null;
    const years = extensionYears === 'base' ? baseExtensionOffer.newYears : Number(extensionYears);
    return buildExtensionPreview(baseExtensionOffer, years, extensionPreset);
  }, [baseExtensionOffer, extensionPreset, extensionYears]);

  const cutImpact = useMemo(() => {
    if (!selectedContract?.player.contract || !team) return null;
    if (!postJune1) {
      return {
        capSavings: Math.round((selectedContract.capHit - selectedContract.deadCap) * 10) / 10,
        deadCap: selectedContract.deadCap,
        acceleratedCap: 0,
      };
    }
    return postJune1Cut(structuredClone(selectedContract.player), structuredClone(team), year);
  }, [postJune1, selectedContract, team, year]);

  const posBreakdown = useMemo(() => {
    const byPos: Record<string, number> = {};
    for (const row of contractRows) {
      byPos[row.pos] = (byPos[row.pos] ?? 0) + row.capHit;
    }
    return Object.entries(byPos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pos, total]) => ({ pos, total, pct: salaryCap > 0 ? (total / salaryCap) * 100 : 0 }));
  }, [contractRows, salaryCap]);

  const handleExtensionSubmit = useCallback(async () => {
    if (!selectedContract || !extensionOffer) return;
    const evaluation = await submitExtensionOffer(selectedContract.id, extensionOffer);
    if (!evaluation) return;
    setExtensionFeedback({
      accepted: evaluation.playerAccepts,
      reasoning: evaluation.reasoning,
    });
    if (evaluation.playerAccepts) {
      setSelectedContract(null);
    }
  }, [extensionOffer, selectedContract, submitExtensionOffer]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Contracts & Salary Cap"
        subtitle={`Cap $${salaryCap}M // Used $${capUsed}M // Space $${capSpace}M`}
        badges={(
          <>
            <PixelBadge variant={capSpace >= 0 ? 'green' : 'red'}>${capSpace}M</PixelBadge>
            <PixelBadge variant="gold">{capPct}% used</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Salary Cap" value={`$${salaryCap}M`} accent="cyan" detail="League cap ceiling" />
        <PixelMetricCard label="Cap Used" value={`$${capUsed}M`} accent={capPct > 90 ? 'red' : 'gold'} detail={`${capPct}% committed`} />
        <PixelMetricCard label="Dead Cap" value={`$${deadCap}M`} accent={deadCap > 20 ? 'red' : 'gold'} detail="Current year sunk cost" />
        <PixelMetricCard label="Cap Space" value={`$${capSpace}M`} accent={capSpace >= 0 ? 'green' : 'red'} detail={capSpace >= 0 ? 'Flexible' : 'Over the limit'} />
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Cap Breakdown" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PixelProgressBar value={capPct} accent={capPct > 90 ? 'red' : 'cyan'} label="Cap Usage" valueLabel={`${capPct}%`} />
            {posBreakdown.map((entry) => (
              <div key={entry.pos} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <PixelBadge variant="default">{entry.pos}</PixelBadge>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>${Math.round(entry.total)}M</span>
                </div>
                <PixelProgressBar value={entry.pct} accent="gold" label="Share" valueLabel={`${Math.round(entry.pct)}%`} />
              </div>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel title="Cap Projections" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {projections.map((projection) => (
              <div key={projection.year} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--mfd-border)' }}>
                <div>
                  <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '20px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                    {projection.year}
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '4px' }}>
                    ${projection.committedCap}M committed // ${projection.deadCap}M dead
                  </div>
                </div>
                <PixelBadge variant={projection.freeSpace >= 0 ? 'green' : 'red'}>${projection.freeSpace}M free</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Incentive Summary" accent="cyan">
        <div style={autoGrid(220)}>
          <PixelMetricCard label="Active Incentives" value={incentiveSummary.total} accent="cyan" detail="Contract clauses in play" />
          <PixelMetricCard label="Likely To Earn" value={incentiveSummary.likely} accent="green" detail="On current pace" />
          <PixelMetricCard label="Not Likely" value={incentiveSummary.unlikely} accent="gold" detail="Needs a late push" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
          {incentiveSummary.entries.slice(0, 6).map((entry) => (
            <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <PlayerNameLink playerId={entry.playerId} name={entry.playerName} style={{ ...monoSm }} />
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{entry.label} // ${entry.bonus}M</span>
              </div>
              <PixelBadge variant={entry.likely ? 'green' : 'gold'}>{entry.progress}%</PixelBadge>
            </div>
          ))}
        </div>
      </PixelPanel>

      <PixelTable
        data={contractRows}
        columns={columns}
        density="compact"
        accent="gold"
        onRowClick={(row) => setSelectedContract(row)}
      />

      <PixelModal
        open={!!selectedContract}
        onOpenChange={(open) => { if (!open) setSelectedContract(null); }}
        title={selectedContract ? `${selectedContract.name} Contract` : 'Contract Details'}
        description={selectedContract ? `${selectedContract.pos} // ${selectedContract.ovr} OVR` : undefined}
        accent="red"
      >
        {selectedContract ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={autoGrid(180)}>
              <PixelMetricCard label="Cap Hit" value={`$${selectedContract.capHit}M`} accent="gold" />
              <PixelMetricCard label="Dead Cap" value={`$${selectedContract.deadCap}M`} accent="red" />
              <PixelMetricCard label="Years Left" value={selectedContract.years} accent="cyan" />
              <PixelMetricCard label="Agent" value={selectedContract.agentName} accent="gold" detail={selectedContract.agentStyle} />
            </div>

            <PixelPanel title="Actions" accent="red">
              {extensionFeedback ? (
                <div style={{ padding: '10px', border: `2px solid ${extensionFeedback.accepted ? 'var(--mfd-green)' : 'var(--mfd-gold)'}`, background: 'var(--mfd-bg-2)', ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5, marginBottom: '12px' }}>
                  {extensionFeedback.reasoning}
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelButton accent="cyan" onClick={handleRestructure}>Restructure</PixelButton>
                <PixelButton accent="gold" onClick={handleBackload}>Add Void Years</PixelButton>
                <PixelButton accent="red" onClick={handleCut}>{postJune1 ? 'Cut Post-June 1' : 'Cut Player'}</PixelButton>
              </div>
              <div style={{ marginTop: '12px' }}>
                <PixelSwitch
                  checked={postJune1}
                  onChange={setPostJune1}
                  accent="gold"
                  label="Post-June 1"
                  description="Spread remaining bonus acceleration across two years."
                />
              </div>
              <div style={{ marginTop: '12px' }}>
                <PixelConsequenceList
                  items={[
                    { id: 'c1', label: 'Cap Savings', delta: `+$${cutImpact?.capSavings ?? 0}M`, accent: 'green' },
                    { id: 'c2', label: 'Dead Cap', delta: `+$${cutImpact?.deadCap ?? selectedContract.deadCap}M`, accent: 'red' },
                    { id: 'c3', label: 'Future Accel', delta: `+$${cutImpact?.acceleratedCap ?? 0}M`, accent: 'gold' },
                  ]}
                />
              </div>
            </PixelPanel>

            {extensionOffer ? (
              <PixelPanel title="Extension Preview" accent="green">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelSelect
                      aria-label="Extension years"
                      value={extensionYears}
                      onChange={(event) => setExtensionYears(event.target.value)}
                      options={[
                        { value: 'base', label: `Base (${baseExtensionOffer?.newYears ?? '--'}Y)` },
                        { value: '2', label: '2 Years' },
                        { value: '3', label: '3 Years' },
                        { value: '4', label: '4 Years' },
                      ]}
                      accent="green"
                    />
                    <PixelSelect
                      aria-label="Extension preset"
                      value={extensionPreset}
                      onChange={(event) => setExtensionPreset(event.target.value as 'team' | 'fair' | 'aggressive')}
                      options={[
                        { value: 'team', label: 'Team Friendly' },
                        { value: 'fair', label: 'Fair Market' },
                        { value: 'aggressive', label: 'Aggressive' },
                      ]}
                      accent="cyan"
                    />
                  </div>
                  <div style={autoGrid(160)}>
                    <PixelMetricCard label="Avg Salary" value={`$${extensionOffer.newAvgSalary}M`} accent="green" />
                    <PixelMetricCard label="Guaranteed" value={`$${extensionOffer.guaranteedAmount}M`} accent="gold" />
                    <PixelMetricCard label="Signing Bonus" value={`$${extensionOffer.signingBonus}M`} accent="cyan" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {extensionOffer.capHitByYear.map((capHitByYear, index) => (
                      <div key={`extension-${index + 1}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                        <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Year {index + 1}</span>
                        <PixelBadge variant="green">${capHitByYear}M</PixelBadge>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <PixelButton accent="green" onClick={() => { void handleExtensionSubmit(); }}>Submit Extension</PixelButton>
                  </div>
                </div>
              </PixelPanel>
            ) : null}
          </div>
        ) : null}
      </PixelModal>
    </div>
  );
}
