/**
 * Game Flow Dashboard — quarter momentum, win probability,
 * scoring runs, drive efficiency, and turning points.
 */

import { useMemo } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { PixelBadge, PixelEkg, PixelPanel } from '@mfd/design-system/components';
import { analyzeGameFlow } from '@mfd/engine';
import type {
  GameFlowAnalysis,
  QuarterMomentum,
  DriveEfficiencyReport,
  ScoringRun,
  WinProbPoint,
  TurningPoint,
} from '@mfd/engine';
import { selectLatestBroadcast, useGameStore } from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, display, mono, monoSm, pixel, screenStackStyle } from '../shared/pixelUi';

// ── Helpers ──────────────────────────────────────────────────

function dominantAccent(dominant: 'home' | 'away' | 'even'): 'green' | 'red' | 'default' {
  if (dominant === 'home') return 'green';
  if (dominant === 'away') return 'red';
  return 'default';
}

function dominantLabel(dominant: 'home' | 'away' | 'even', homeName: string, awayName: string): string {
  if (dominant === 'home') return homeName;
  if (dominant === 'away') return awayName;
  return 'EVEN';
}

function classifyWinProbEvent(current: WinProbPoint, previous: WinProbPoint | null): string | undefined {
  if (!previous) return undefined;
  const delta = current.homeWinProb - previous.homeWinProb;
  if (Math.abs(delta) >= 18) return delta > 0 ? 'touchdown' : 'turnover';
  if (Math.abs(delta) >= 10) return 'big_play';
  return undefined;
}

type GameFlowSourceAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';

interface GameFlowSourceRow {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: GameFlowSourceAccent;
}

export function buildGameFlowSourceRows({
  hasBroadcast,
  quarterCount,
  driveCount,
  scoringRunCount,
  winProbPointCount,
  hasTurningPoint,
}: {
  hasBroadcast: boolean;
  quarterCount: number;
  driveCount: number;
  scoringRunCount: number;
  winProbPointCount: number;
  hasTurningPoint: boolean;
}): GameFlowSourceRow[] {
  return [
    {
      id: 'latest-broadcast',
      label: 'Latest broadcast',
      value: hasBroadcast ? `${quarterCount} quarters` : 'No broadcast',
      detail: 'The connected /game-flow route reads selectLatestBroadcast, so it follows the newest user-team result rather than transient selected-game broadcast context.',
      accent: hasBroadcast ? 'green' : 'default',
    },
    {
      id: 'analysis-helper',
      label: 'Analysis helper',
      value: 'analyzeGameFlow',
      detail: 'analyzeGameFlow is pure over BroadcastOutput quarters plus the saved result team ids. It has no random reroll, no IO, and no save write.',
      accent: hasBroadcast ? 'cyan' : 'default',
    },
    {
      id: 'win-probability-input',
      label: 'Win probability input',
      value: `${winProbPointCount} points`,
      detail: 'PixelEkg renders analysis.winProbability points and locally classified event markers. The route does not own win-probability semantics.',
      accent: winProbPointCount > 0 ? 'gold' : 'default',
    },
    {
      id: 'momentum-efficiency',
      label: 'Momentum + efficiency',
      value: `${driveCount} drives`,
      detail: 'Quarter momentum, drive efficiency, scoring runs, and the turning point are derived display reads from the analysis output.',
      accent: driveCount > 0 || scoringRunCount > 0 ? 'cyan' : 'default',
    },
    {
      id: 'render-boundary',
      label: 'Just viewing',
      value: hasTurningPoint ? 'Turning point' : 'No swing',
      detail: 'Opening the route does not append game-day packages, change broadcasts, rebuild saved results, click Advance Week, or change schedules.',
      accent: 'red',
    },
  ];
}

function GameFlowSources({ rows }: { rows: GameFlowSourceRow[] }) {
  return (
    <PixelPanel title="Game Flow Sources" accent="cyan">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '10px',
              border: '2px solid var(--mfd-border)',
              background: 'var(--mfd-bg-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ ...display, fontSize: '16px', color: 'var(--mfd-text)', lineHeight: 1 }}>{row.label.toUpperCase()}</div>
              <PixelBadge variant={row.accent}>{row.value.toUpperCase()}</PixelBadge>
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>{row.detail}</div>
          </div>
        ))}
      </div>
    </PixelPanel>
  );
}

// ── Sub-sections ─────────────────────────────────────────────

function WinProbabilityChart({ points }: { points: WinProbPoint[] }) {
  const ekgPoints = points.map((point, index) => ({
    time: point.driveIndex,
    wp: point.homeWinProb,
    event: classifyWinProbEvent(point, points[index - 1] ?? null),
  }));

  return (
    <PixelPanel title="Win Probability" accent="cyan">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <Activity size={14} color="var(--mfd-cyan)" />
        <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          Home win probability heartbeat
        </span>
      </div>
      <PixelEkg points={ekgPoints} style={{ minHeight: '240px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ ...monoSm, color: 'var(--mfd-red)' }}>Away</span>
        <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>50%</span>
        <span style={{ ...monoSm, color: 'var(--mfd-green)' }}>Home</span>
      </div>
      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '8px' }}>
        Long-press to screenshot on mobile.
      </div>
    </PixelPanel>
  );
}

function QuarterMomentumCards({
  quarters,
  homeName,
  awayName,
}: {
  quarters: QuarterMomentum[];
  homeName: string;
  awayName: string;
}) {
  return (
    <div style={autoGrid(200)}>
      {quarters.map((qm) => (
        <PixelPanel key={qm.quarter} title={`Quarter ${qm.quarter}`} accent={dominantAccent(qm.dominantTeam)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <PixelBadge variant={dominantAccent(qm.dominantTeam)}>
                {dominantLabel(qm.dominantTeam, homeName, awayName).toUpperCase()}
              </PixelBadge>
              {qm.bigPlays > 0 && (
                <PixelBadge variant="gold">{qm.bigPlays} BIG PLAY{qm.bigPlays > 1 ? 'S' : ''}</PixelBadge>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ ...pixel, color: 'var(--mfd-text-dim)' }}>{homeName.toUpperCase()}</span>
                <span style={{ ...mono, color: 'var(--mfd-text)' }}>{qm.homePoints} PTS</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{qm.homeYards} YDS</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                <span style={{ ...pixel, color: 'var(--mfd-text-dim)' }}>{awayName.toUpperCase()}</span>
                <span style={{ ...mono, color: 'var(--mfd-text)' }}>{qm.awayPoints} PTS</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{qm.awayYards} YDS</span>
              </div>
            </div>
          </div>
        </PixelPanel>
      ))}
    </div>
  );
}

function ScoringRunsSection({ runs }: { runs: ScoringRun[] }) {
  return (
    <PixelPanel title="Scoring Runs" accent="gold">
      {runs.length === 0 ? (
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          No significant scoring runs detected.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {runs.map((run, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 0',
              borderBottom: '1px solid var(--mfd-border, #1a1a1a)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{run.description}</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  {run.drives} scoring drive{run.drives > 1 ? 's' : ''} // Q{run.startQuarter}
                  {run.endQuarter !== run.startQuarter ? `-Q${run.endQuarter}` : ''}
                </span>
              </div>
              <PixelBadge variant={run.teamSide === 'home' ? 'green' : 'red'}>
                {run.points}-0
              </PixelBadge>
            </div>
          ))}
        </div>
      )}
    </PixelPanel>
  );
}

function EfficiencyCard({ label, efficiency }: { label: string; efficiency: DriveEfficiencyReport }) {
  const rateDisplay = `${(efficiency.scoringRate * 100).toFixed(0)}%`;
  return (
    <PixelPanel title={label} accent="cyan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Total Drives</span>
          <span style={{ ...mono, color: 'var(--mfd-text)' }}>{efficiency.totalDrives}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Scoring Drives</span>
          <span style={{ ...mono, color: 'var(--mfd-text)' }}>{efficiency.scoringDrives}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Scoring Rate</span>
          <PixelBadge variant={efficiency.scoringRate >= 0.35 ? 'green' : efficiency.scoringRate >= 0.2 ? 'gold' : 'red'}>
            {rateDisplay}
          </PixelBadge>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Avg YDS/Drive</span>
          <span style={{ ...mono, color: 'var(--mfd-text)' }}>{efficiency.avgYardsPerDrive.toFixed(1)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Three-and-Outs</span>
          <PixelBadge variant={efficiency.threeAndOuts >= 3 ? 'red' : 'default'}>
            {efficiency.threeAndOuts}
          </PixelBadge>
        </div>
      </div>
    </PixelPanel>
  );
}

function DriveEfficiencySection({
  home,
  away,
  homeName,
  awayName,
}: {
  home: DriveEfficiencyReport;
  away: DriveEfficiencyReport;
  homeName: string;
  awayName: string;
}) {
  return (
    <div style={autoGrid(250)}>
      <EfficiencyCard label={`${homeName} Efficiency`} efficiency={home} />
      <EfficiencyCard label={`${awayName} Efficiency`} efficiency={away} />
    </div>
  );
}

function TurningPointSection({ turningPoint }: { turningPoint: TurningPoint | null }) {
  return (
    <PixelPanel title="Turning Point" accent={turningPoint ? 'gold' : 'default'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TrendingUp size={14} color={turningPoint ? 'var(--mfd-gold)' : 'var(--mfd-text-dim)'} />
        {turningPoint ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ ...mono, color: 'var(--mfd-text)' }}>{turningPoint.description}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <PixelBadge variant="default">Q{turningPoint.quarter}</PixelBadge>
              <PixelBadge variant="gold">{turningPoint.winProbSwing.toFixed(1)}% SWING</PixelBadge>
            </div>
          </div>
        ) : (
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            No clear turning point — evenly matched game.
          </span>
        )}
      </div>
    </PixelPanel>
  );
}

// ── Exported Components ──────────────────────────────────────

export function GameFlowView({
  analysis,
  homeName,
  awayName,
}: {
  analysis: GameFlowAnalysis;
  homeName: string;
  awayName: string;
}) {
  const sourceRows = buildGameFlowSourceRows({
    hasBroadcast: true,
    quarterCount: analysis.quarterMomentum.length,
    driveCount: analysis.driveEfficiency.home.totalDrives + analysis.driveEfficiency.away.totalDrives,
    scoringRunCount: analysis.scoringRuns.length,
    winProbPointCount: analysis.winProbability.length,
    hasTurningPoint: Boolean(analysis.turningPoint),
  });

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader title="Game Flow" subtitle={`${awayName} at ${homeName}`} />
      <GameFlowSources rows={sourceRows} />
      <WinProbabilityChart points={analysis.winProbability} />
      <QuarterMomentumCards quarters={analysis.quarterMomentum} homeName={homeName} awayName={awayName} />
      <ScoringRunsSection runs={analysis.scoringRuns} />
      <DriveEfficiencySection
        home={analysis.driveEfficiency.home}
        away={analysis.driveEfficiency.away}
        homeName={homeName}
        awayName={awayName}
      />
      <TurningPointSection turningPoint={analysis.turningPoint} />
    </div>
  );
}

export function GameFlow() {
  const latestBroadcast = useGameStore(selectLatestBroadcast);
  const analysis = useMemo(
    () => (latestBroadcast
      ? analyzeGameFlow(
        latestBroadcast.broadcast,
        latestBroadcast.gameResult.homeTeamId,
        latestBroadcast.gameResult.awayTeamId,
      )
      : null),
    [latestBroadcast],
  );

  if (!latestBroadcast) {
    const sourceRows = buildGameFlowSourceRows({
      hasBroadcast: false,
      quarterCount: 0,
      driveCount: 0,
      scoringRunCount: 0,
      winProbPointCount: 0,
      hasTurningPoint: false,
    });

    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Game Flow" subtitle="No game data available." />
        <PixelPanel title="Awaiting Data" accent="default">
          <div style={monoSm}>Advance to game day to generate game flow analysis.</div>
        </PixelPanel>
        <GameFlowSources rows={sourceRows} />
      </div>
    );
  }

  if (analysis === null) return null;

  const { homeTeam, awayTeam } = latestBroadcast;

  return (
    <GameFlowView
      analysis={analysis}
      homeName={homeTeam.name}
      awayName={awayTeam.name}
    />
  );
}
