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
  buildContractDecisionForecast,
} from '@mfd/engine';
import type { Player } from '@mfd/engine';
import {
  selectRoster,
  selectUserTeam,
  selectYear,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelConsequenceList,
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

function forecastAccent(severity: 'low' | 'medium' | 'high'): 'green' | 'gold' | 'red' {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'gold';
  return 'green';
}

type ContractToolSourceAccent = 'cyan' | 'gold' | 'green' | 'red';

interface ContractToolSourceRow {
  label: string;
  detail: string;
  accent: ContractToolSourceAccent;
}

type ContractToolAction = 'restructure' | 'backload' | 'standard_cut' | 'post_june_1_cut';

export interface ContractToolActionReceipt {
  id: string;
  title: string;
  actionLabel: string;
  accent: ContractToolSourceAccent;
  target: string;
  result: string;
  stateTouched: string;
  source: string;
  boundary: string;
}

function buildContractToolSourceRows(hasGameContext: boolean): ContractToolSourceRow[] {
  return [
    {
      label: 'Roster Source',
      detail: 'selectRoster supplies current user-team contract players; this list hides players without active contracts.',
      accent: 'cyan',
    },
    {
      label: 'Preview Helpers',
      detail: 'Restructure, backload, standard-cut, post-June-1, and forecast rows call pure contract-tools helpers before any button commits.',
      accent: 'gold',
    },
    {
      label: 'Rule Context',
      detail: hasGameContext
        ? 'projectContractCap and buildContractDecisionForecast receive active GameState so salary_cap_growth overrides surface in projections.'
        : 'No GameState is loaded, so projection helpers fall back to default cap math.',
      accent: hasGameContext ? 'green' : 'red',
    },
    {
      label: 'Commit Boundary',
      detail: 'Only Apply/Cut buttons call restructure, backload, or cutPlayer store actions; rendering previews does not move players or write saves.',
      accent: 'green',
    },
  ];
}

export function buildContractToolActionReceipt(args: {
  action: ContractToolAction;
  player: Player;
  teamName: string;
  currentYear: number;
  currentHit: number;
  projectedHit?: number;
  capSavings?: number;
  deadCap?: number;
  currentYearDead?: number;
  nextYearDead?: number;
  voidYears?: number;
}): ContractToolActionReceipt {
  const target = `${args.player.name} // ${args.player.pos} // ${args.teamName} // Y${args.currentYear}`;
  const savings = fmtMoney(args.capSavings ?? 0);
  const currentHit = fmtMoney(args.currentHit);

  if (args.action === 'restructure') {
    return {
      id: `restructure:${args.player.id}:${args.currentYear}`,
      title: 'Restructure Applied',
      actionLabel: 'Restructure',
      accent: 'cyan',
      target,
      result: `Preview showed ${savings} of current-year cap space from a ${currentHit} starting hit to a ${fmtMoney(args.projectedHit ?? args.currentHit)} projected hit.`,
      stateTouched: 'Selected contract base/proration/guarantee fields, team cap totals, league cap-space read model, undo snapshot, and autosave.',
      source: 'actions.restructure -> restructureContract -> syncPlayerContractReference -> syncTeamCapTotals -> refreshLeagueCapSpace -> commitGame',
      boundary: 'This confirmation does not run another restructure, change cap formulas, move players, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
    };
  }

  if (args.action === 'backload') {
    return {
      id: `backload:${args.player.id}:${args.currentYear}:${args.voidYears ?? 0}`,
      title: 'Backload Applied',
      actionLabel: `Backload +${args.voidYears ?? 0} void`,
      accent: 'gold',
      target,
      result: `Preview showed ${savings} of current-year cap space from a ${currentHit} starting hit by adding ${args.voidYears ?? 0} void year(s).`,
      stateTouched: 'Selected contract base/proration/void-year/guarantee fields, team cap totals, league cap-space read model, undo snapshot, and autosave.',
      source: 'actions.backload -> backloadContract -> syncPlayerContractReference -> syncTeamCapTotals -> refreshLeagueCapSpace -> commitGame',
      boundary: 'This confirmation does not add more void years, change cap formulas, move players, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
    };
  }

  if (args.action === 'post_june_1_cut') {
    return {
      id: `post-june-1-cut:${args.player.id}:${args.currentYear}`,
      title: 'Post-June 1 Cut Processed',
      actionLabel: 'Post-June 1 Cut',
      accent: 'red',
      target,
      result: `Preview showed ${savings} current-year cap space with ${fmtMoney(args.currentYearDead ?? 0)} dead cap this year and ${fmtMoney(args.nextYearDead ?? 0)} deferred to next year.`,
      stateTouched: 'Roster, practice squad references, GameState.players team/contract fields, waiver wire, team txLog, dead cap by year, current team cap totals, undo snapshot, and autosave.',
      source: 'actions.cutPlayer({ postJune1: true }) -> applyPostJune1CutToGame -> postJune1Cut -> commitGame',
      boundary: 'This confirmation does not cut another player, create a second waiver row, change post-June-1 math, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
    };
  }

  return {
    id: `standard-cut:${args.player.id}:${args.currentYear}`,
    title: 'Standard Cut Processed',
    actionLabel: 'Standard Cut',
    accent: 'red',
    target,
    result: `Preview showed ${savings} current-year cap space with ${fmtMoney(args.deadCap ?? 0)} dead cap before the player enters the waiver process.`,
    stateTouched: 'Roster, practice squad references, GameState.players team/contract fields, waiver wire, team txLog, current team cap totals, undo snapshot, and autosave.',
    source: 'actions.cutPlayer -> cutPlayerToWaiversEngine -> commitGame',
    boundary: 'This confirmation does not cut another player, create a second waiver row, change dead-cap math, play scheduled games, reroll saved outcomes, or save a separate confirmation log.',
  };
}

export function ContractToolActionReceiptPanel({ receipt }: { receipt: ContractToolActionReceipt }) {
  return (
    <PixelPanel title="Contract Action Receipt" accent={receipt.accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={receipt.accent}>{receipt.title}</PixelBadge>
          <PixelBadge variant="default">On-screen confirmation</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{receipt.target}</div>
        <div style={autoGrid(220)}>
          {[
            { label: receipt.actionLabel, detail: receipt.result, accent: receipt.accent },
            { label: 'Changed now', detail: receipt.stateTouched, accent: 'gold' as const },
            { label: 'Action used', detail: receipt.source, accent: 'cyan' as const },
            { label: 'Did not also', detail: receipt.boundary, accent: 'green' as const },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px',
                border: '1px solid var(--mfd-border)',
                background: 'var(--mfd-bg-elevated)',
              }}
            >
              <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </PixelPanel>
  );
}

// ── Component ──────────────────────────────────────────

export function ContractTools() {
  const game = useGameStore((s) => s.game);
  const userTeam = useGameStore(selectUserTeam);
  const roster = useGameStore(selectRoster);
  const currentYear = useGameStore(selectYear);
  const cutPlayer = useGameStore((s) => s.actions.cutPlayer);
  const restructure = useGameStore((s) => s.actions.restructure);
  const backload = useGameStore((s) => s.actions.backload);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [voidYears, setVoidYears] = useState('2');
  const [actionReceipt, setActionReceipt] = useState<ContractToolActionReceipt | null>(null);

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
    () => projectContractCap(selectedContract, currentYear, 4, game ?? null),
    [selectedContract, currentYear, game],
  );
  const decisionForecast = useMemo(
    () => buildContractDecisionForecast(selectedContract, currentYear, {
      currentCapSpace: userTeam?.capSpace ?? 0,
      voidYears: Number.parseInt(voidYears, 10) || 1,
      game: game ?? null,
    }),
    [currentYear, selectedContract, userTeam?.capSpace, voidYears, game],
  );
  const sourceRows = useMemo(
    () => buildContractToolSourceRows(Boolean(game)),
    [game],
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

  const handleRestructure = async (): Promise<void> => {
    if (!selectedPlayer || !restructurePreview.eligible) return;
    const receipt = buildContractToolActionReceipt({
      action: 'restructure',
      player: selectedPlayer,
      teamName: userTeam.name,
      currentYear,
      currentHit: restructurePreview.currentHit,
      projectedHit: restructurePreview.projectedHit,
      capSavings: restructurePreview.savings,
    });
    await restructure(userTeam.id, selectedPlayer.id);
    setActionReceipt(receipt);
  };

  const handleBackload = async (): Promise<void> => {
    if (!selectedPlayer || !backloadPreview.eligible) return;
    const requestedVoidYears = Number.parseInt(voidYears, 10) || 1;
    const receipt = buildContractToolActionReceipt({
      action: 'backload',
      player: selectedPlayer,
      teamName: userTeam.name,
      currentYear,
      currentHit: backloadPreview.currentHit,
      projectedHit: backloadPreview.projectedHit,
      capSavings: backloadPreview.savings,
      voidYears: backloadPreview.voidYearsAdded || requestedVoidYears,
    });
    await backload(userTeam.id, selectedPlayer.id, requestedVoidYears);
    setActionReceipt(receipt);
  };

  const handleCut = async (): Promise<void> => {
    if (!selectedPlayer) return;
    const receipt = buildContractToolActionReceipt({
      action: 'standard_cut',
      player: selectedPlayer,
      teamName: userTeam.name,
      currentYear,
      currentHit: cutPreview.currentHit,
      capSavings: cutPreview.capSavings,
      deadCap: cutPreview.deadCap,
    });
    await cutPlayer(userTeam.id, selectedPlayer.id);
    setSelectedPlayerId('');
    setActionReceipt(receipt);
  };

  const handlePostJune1Cut = async (): Promise<void> => {
    if (!selectedPlayer) return;
    const receipt = buildContractToolActionReceipt({
      action: 'post_june_1_cut',
      player: selectedPlayer,
      teamName: userTeam.name,
      currentYear,
      currentHit: postJune1Preview.currentHit,
      capSavings: postJune1Preview.capSavings,
      currentYearDead: postJune1Preview.currentYearDead,
      nextYearDead: postJune1Preview.nextYearDead,
    });
    await cutPlayer(userTeam.id, selectedPlayer.id, { postJune1: true });
    setSelectedPlayerId('');
    setActionReceipt(receipt);
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

      <PixelPanel title="Contract Tool Sources" accent="cyan">
        <div style={autoGrid(220)}>
          {sourceRows.map((row) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px',
                border: '1px solid var(--mfd-border)',
                background: 'var(--mfd-bg-elevated)',
              }}
            >
              <PixelBadge variant={row.accent}>{row.label}</PixelBadge>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{row.detail}</div>
            </div>
          ))}
        </div>
      </PixelPanel>

      {actionReceipt ? <ContractToolActionReceiptPanel receipt={actionReceipt} /> : null}

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

              {/* Decision forecast */}
              <PixelPanel title="DECISION FORECAST" accent={forecastAccent(decisionForecast.severity)} padding="sm">
                <div style={autoGrid(140)}>
                  <PixelMetricCard label="RECOMMENDED" value={decisionForecast.actionLabel.toUpperCase()} accent={forecastAccent(decisionForecast.severity)} />
                  <PixelMetricCard label="CAP CHANGE" value={fmtMoney(decisionForecast.capSpaceDelta)} accent={savingsVariant(decisionForecast.capSpaceDelta)} />
                  <PixelMetricCard label="DEAD NOW" value={fmtMoney(decisionForecast.currentYearDeadCapDelta)} accent={decisionForecast.currentYearDeadCapDelta > 0 ? 'red' : 'default'} />
                  <PixelMetricCard label="FUTURE DEAD" value={fmtMoney(decisionForecast.futureDeadCapDelta)} accent={decisionForecast.futureDeadCapDelta > 0 ? 'gold' : 'default'} />
                  <PixelMetricCard label="REVERSIBLE" value={decisionForecast.reversible ? 'YES' : 'NO'} accent={decisionForecast.reversible ? 'green' : 'red'} />
                </div>
                <div style={{ marginTop: '10px' }}>
                  <PixelConsequenceList
                    items={[
                      { id: 'forecast-immediate', label: 'Immediate', delta: decisionForecast.immediateImpact, accent: forecastAccent(decisionForecast.severity) },
                      { id: 'forecast-season', label: 'This season', delta: decisionForecast.thisSeasonImpact, accent: 'gold' },
                      { id: 'forecast-future', label: 'Future', delta: decisionForecast.futureImpact, accent: 'cyan' },
                      { id: 'forecast-risk', label: 'Risk', delta: decisionForecast.risk, accent: forecastAccent(decisionForecast.severity) },
                      { id: 'forecast-player', label: 'Player camp', delta: decisionForecast.playerReaction, accent: 'cyan' },
                      { id: 'forecast-media', label: 'Media', delta: decisionForecast.mediaReaction, accent: 'gold' },
                      { id: 'forecast-uncertainty', label: 'Uncertainty', delta: decisionForecast.uncertainty, accent: forecastAccent(decisionForecast.severity) },
                    ]}
                  />
                </div>
                {decisionForecast.warnings.length > 0 ? (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {decisionForecast.warnings.map((warning) => (
                      <PixelBadge key={warning} variant={decisionForecast.severity === 'high' ? 'red' : 'gold'}>{warning}</PixelBadge>
                    ))}
                  </div>
                ) : null}
              </PixelPanel>

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
