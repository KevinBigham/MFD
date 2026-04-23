import { useMemo, useState } from 'react';
import {
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelSelect,
} from '@mfd/design-system/components';
import {
  evaluateRestructureEligibility,
  evaluateBackloadEligibility,
  evaluateStandardCutImpact,
  evaluatePostJune1CutImpact,
  projectContractCap,
} from '@mfd/engine';
import type { Player } from '@mfd/engine';
import {
  selectRoster,
  selectUserTeam,
  selectYear,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

// ── Helpers ────────────────────────────────────────────

function fmtMoney(value: number): string {
  if (!Number.isFinite(value)) return '$0.0M';
  return `${value >= 0 ? '' : '-'}$${Math.abs(value).toFixed(1)}M`;
}

function savingsVariant(savings: number): 'green' | 'gold' | 'red' | 'default' {
  if (savings >= 4) return 'green';
  if (savings >= 1) return 'gold';
  if (savings < 0) return 'red';
  return 'default';
}

// ── Component ──────────────────────────────────────────

export function ContractTools() {
  const userTeam = useGameStore(selectUserTeam);
  const roster = useGameStore(selectRoster);
  const currentYear = useGameStore(selectYear);
  const cutPlayer = useGameStore((s) => s.actions.cutPlayer);
  const restructure = useGameStore((s) => s.actions.restructure);
  const backload = useGameStore((s) => s.actions.backload);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [voidYears, setVoidYears] = useState('2');

  // Contract-bearing players only, sorted by cap hit desc for quick scanning.
  const contractPlayers = useMemo(
    () =>
      roster
        .filter((p): p is Player & { contract: NonNullable<Player['contract']> } => !!p.contract)
        .sort((a, b) => (b.contract.baseSalary + b.contract.prorated) - (a.contract.baseSalary + a.contract.prorated)),
    [roster],
  );

  const selectedPlayer = useMemo(
    () => contractPlayers.find((p) => p.id === selectedPlayerId) ?? contractPlayers[0] ?? null,
    [contractPlayers, selectedPlayerId],
  );

  const selectedContract = selectedPlayer?.contract ?? null;

  // Previews — pure, no mutation.
  const restructurePreview = useMemo(
    () => evaluateRestructureEligibility(selectedContract),
    [selectedContract],
  );
  const backloadPreview = useMemo(
    () => evaluateBackloadEligibility(selectedContract, Number.parseInt(voidYears, 10) || 1),
    [selectedContract, voidYears],
  );
  const cutPreview = useMemo(
    () => evaluateStandardCutImpact(selectedContract),
    [selectedContract],
  );
  const postJune1Preview = useMemo(
    () => evaluatePostJune1CutImpact(selectedContract),
    [selectedContract],
  );
  const projection = useMemo(
    () => projectContractCap(selectedContract, currentYear, 4),
    [selectedContract, currentYear],
  );

  // Team-level totals for metric cards.
  const teamTotals = useMemo(() => {
    const capUsed = userTeam?.capUsed ?? 0;
    const capSpace = userTeam?.capSpace ?? 0;
    const deadCap = userTeam?.deadCap ?? 0;
    const activeContracts = contractPlayers.length;
    const restructured = contractPlayers.filter((p) => p.contract.restructured).length;
    return {
      capUsed: Math.round(capUsed * 10) / 10,
      capSpace: Math.round(capSpace * 10) / 10,
      deadCap: Math.round(deadCap * 10) / 10,
      activeContracts,
      restructured,
    };
  }, [userTeam, contractPlayers]);

  if (!userTeam) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="CONTRACT TOOLS" subtitle="No team loaded." />
      </div>
    );
  }

  const handleRestructure = (): void => {
    if (!selectedPlayer || !restructurePreview.eligible) return;
    restructure(userTeam.id, selectedPlayer.id);
  };

  const handleBackload = (): void => {
    if (!selectedPlayer || !backloadPreview.eligible) return;
    backload(userTeam.id, selectedPlayer.id, Number.parseInt(voidYears, 10) || 1);
  };

  const handleCut = (): void => {
    if (!selectedPlayer) return;
    void cutPlayer(userTeam.id, selectedPlayer.id);
    setSelectedPlayerId('');
  };

  const handlePostJune1Cut = (): void => {
    if (!selectedPlayer) return;
    void cutPlayer(userTeam.id, selectedPlayer.id, { postJune1: true });
    setSelectedPlayerId('');
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="CONTRACT TOOLS"
        subtitle={`${userTeam.name.toUpperCase()} · ${teamTotals.activeContracts} CONTRACTS · ${teamTotals.restructured} RESTRUCTURED`}
      />

      {/* Team cap metrics */}
      <div style={autoGrid(200)}>
        <PixelMetricCard label="CAP USED" value={fmtMoney(teamTotals.capUsed)} />
        <PixelMetricCard
          label="CAP SPACE"
          value={fmtMoney(teamTotals.capSpace)}
          accent={teamTotals.capSpace < 5 ? 'red' : teamTotals.capSpace > 20 ? 'green' : 'gold'}
        />
        <PixelMetricCard label="DEAD CAP" value={fmtMoney(teamTotals.deadCap)} accent={teamTotals.deadCap > 10 ? 'red' : 'default'} />
        <PixelMetricCard label="ACTIVE DEALS" value={String(teamTotals.activeContracts)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 2fr)', gap: '12px' }}>
        {/* Left — roster picker */}
        <PixelPanel title="ROSTER">
          <div
            data-testid="contract-tools-roster"
            style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '520px', overflowY: 'auto' }}
          >
            {contractPlayers.length === 0 && (
              <p style={{ ...monoSm, color: 'var(--mfd-muted)' }}>No contracts on roster.</p>
            )}
            {contractPlayers.map((player) => {
              const hit = player.contract.baseSalary + player.contract.prorated;
              const isSelected = selectedPlayer?.id === player.id;
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setSelectedPlayerId(player.id)}
                  data-testid={`contract-tools-row-${player.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr auto',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    border: `1px solid ${isSelected ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                    backgroundColor: isSelected ? 'var(--mfd-surface-raised)' : 'transparent',
                    color: 'var(--mfd-text)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    ...pixelSm,
                  }}
                >
                  <span style={{ color: 'var(--mfd-cyan)' }}>{player.pos}</span>
                  <span>{player.name.toUpperCase()}</span>
                  <span style={monoSm}>{fmtMoney(Math.round(hit * 10) / 10)}</span>
                </button>
              );
            })}
          </div>
        </PixelPanel>

        {/* Right — selected player preview */}
        <PixelPanel title={selectedPlayer ? `${selectedPlayer.name.toUpperCase()} · ${selectedPlayer.pos}` : 'SELECT A PLAYER'}>
          {!selectedPlayer && (
            <p style={{ ...monoSm, color: 'var(--mfd-muted)' }}>Pick a player from the roster to preview contract actions.</p>
          )}

          {selectedPlayer && selectedContract && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Contract summary */}
              <div style={autoGrid(140)}>
                <PixelMetricCard label="CURRENT HIT" value={fmtMoney(selectedContract.baseSalary + selectedContract.prorated)} />
                <PixelMetricCard label="YEARS LEFT" value={String(selectedContract.years)} />
                <PixelMetricCard label="BASE" value={fmtMoney(selectedContract.baseSalary)} />
                <PixelMetricCard label="PRORATED" value={fmtMoney(selectedContract.prorated)} />
                <PixelMetricCard label="GUARANTEED" value={fmtMoney(selectedContract.guaranteed)} />
                <PixelMetricCard label="VOID YEARS" value={String(selectedContract.voidYears ?? 0)} />
              </div>

              {/* Action previews */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Restructure */}
                <div
                  data-testid="preview-restructure"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr auto',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    border: '1px solid var(--mfd-border)',
                  }}
                >
                  <span style={pixelSm}>RESTRUCTURE</span>
                  <div style={{ ...monoSm, color: 'var(--mfd-muted)' }}>
                    {restructurePreview.eligible ? (
                      <>
                        Saves <PixelBadge variant={savingsVariant(restructurePreview.savings)}>{fmtMoney(restructurePreview.savings)}</PixelBadge>{' '}
                        now ({fmtMoney(restructurePreview.projectedHit)} new hit)
                      </>
                    ) : (
                      restructurePreview.reason
                    )}
                  </div>
                  <PixelButton onClick={handleRestructure} disabled={!restructurePreview.eligible} accent="cyan">
                    APPLY
                  </PixelButton>
                </div>

                {/* Backload */}
                <div
                  data-testid="preview-backload"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr auto auto',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    border: '1px solid var(--mfd-border)',
                  }}
                >
                  <span style={pixelSm}>BACKLOAD</span>
                  <div style={{ ...monoSm, color: 'var(--mfd-muted)' }}>
                    {backloadPreview.eligible ? (
                      <>
                        Saves <PixelBadge variant={savingsVariant(backloadPreview.savings)}>{fmtMoney(backloadPreview.savings)}</PixelBadge>{' '}
                        now (+{backloadPreview.voidYearsAdded} void)
                      </>
                    ) : (
                      backloadPreview.reason
                    )}
                  </div>
                  <PixelSelect
                    value={voidYears}
                    onChange={(event) => setVoidYears(event.target.value)}
                    options={[
                      { value: '1', label: '1 VOID' },
                      { value: '2', label: '2 VOID' },
                      { value: '3', label: '3 VOID' },
                    ]}
                  />
                  <PixelButton onClick={handleBackload} disabled={!backloadPreview.eligible} accent="cyan">
                    APPLY
                  </PixelButton>
                </div>

                {/* Standard Cut */}
                <div
                  data-testid="preview-cut"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr auto',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    border: '1px solid var(--mfd-border)',
                  }}
                >
                  <span style={pixelSm}>CUT (STANDARD)</span>
                  <div style={{ ...monoSm, color: 'var(--mfd-muted)' }}>
                    Frees <PixelBadge variant={savingsVariant(cutPreview.capSavings)}>{fmtMoney(cutPreview.capSavings)}</PixelBadge>{' '}
                    · dead cap {fmtMoney(cutPreview.deadCap)}
                  </div>
                  <PixelButton onClick={handleCut} accent="red">
                    CUT
                  </PixelButton>
                </div>

                {/* Post-June 1 Cut */}
                <div
                  data-testid="preview-post-june-1"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr auto',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    border: '1px solid var(--mfd-border)',
                  }}
                >
                  <span style={pixelSm}>CUT (POST-JUNE 1)</span>
                  <div style={{ ...monoSm, color: 'var(--mfd-muted)' }}>
                    Frees <PixelBadge variant={savingsVariant(postJune1Preview.capSavings)}>{fmtMoney(postJune1Preview.capSavings)}</PixelBadge>{' '}
                    now · {fmtMoney(postJune1Preview.currentYearDead)} this yr, {fmtMoney(postJune1Preview.nextYearDead)} next yr
                  </div>
                  <PixelButton onClick={handlePostJune1Cut} accent="red">
                    CUT
                  </PixelButton>
                </div>
              </div>

              {/* Multi-year projection */}
              <div>
                <div style={{ ...pixelSm, color: 'var(--mfd-muted)', marginBottom: '6px' }}>4-YEAR CONTRACT PROJECTION</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {projection.map((entry) => (
                    <div
                      key={entry.year}
                      data-testid={`projection-${entry.year}`}
                      style={{
                        padding: '6px 8px',
                        border: `1px solid ${entry.expired ? 'var(--mfd-border)' : 'var(--mfd-cyan)'}`,
                        opacity: entry.expired ? 0.5 : 1,
                      }}
                    >
                      <div style={{ ...pixelSm, color: 'var(--mfd-muted)' }}>{entry.year}</div>
                      <div style={monoSm}>{entry.expired ? '—' : fmtMoney(entry.contractHit)}</div>
                      <div style={{ ...monoSm, color: 'var(--mfd-muted)', fontSize: '10px' }}>
                        {entry.expired ? 'EXPIRED' : `DEAD ${fmtMoney(entry.deadIfCut)}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </PixelPanel>
      </div>
    </div>
  );
}

export default ContractTools;
