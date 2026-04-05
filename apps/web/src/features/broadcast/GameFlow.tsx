/**
 * Game Flow Dashboard — quarter momentum, win probability,
 * scoring runs, drive efficiency, and turning points.
 */

import { useMemo } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
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
import { PixelScreenHeader, autoGrid, mono, monoSm, pixel, screenStackStyle } from '../shared/pixelUi';

// ── Helpers ──────────────────────────────────────────────────

function winProbColor(prob: number): string {
  if (prob > 60) return 'var(--mfd-green)';
  if (prob < 40) return 'var(--mfd-red)';
  return 'var(--mfd-gold)';
}

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

// ── Sub-sections ─────────────────────────────────────────────

function WinProbabilityChart({ points }: { points: WinProbPoint[] }) {
  let currentQuarter = 0;

  return (
    <PixelPanel title="Win Probability" accent="cyan">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <Activity size={14} color="var(--mfd-cyan)" />
        <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          Home win probability by drive
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
        {points.map((point, i) => {
          const showQuarterLabel = point.quarter !== currentQuarter;
          if (showQuarterLabel) currentQuarter = point.quarter;

          return (
            <div key={i}>
              {showQuarterLabel && (
                <div style={{ ...pixel, color: 'var(--mfd-text-dim)', marginTop: i > 0 ? '6px' : '0', marginBottom: '2px' }}>
                  Q{point.quarter}
                </div>
              )}
              <div
                style={{ display: 'flex', height: '16px', marginBottom: '2px', background: 'var(--mfd-bg-alt, #111)' }}
                title={`Home ${point.homeWinProb.toFixed(0)}% | ${point.scoreHome}-${point.scoreAway}`}
              >
                <div style={{
                  width: `${point.homeWinProb}%`,
                  background: winProbColor(point.homeWinProb),
                  transition: 'width 0.2s',
                }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ ...monoSm, color: 'var(--mfd-red)' }}>Away</span>
        <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>50%</span>
        <span style={{ ...monoSm, color: 'var(--mfd-green)' }}>Home</span>
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
  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader title="Game Flow" subtitle={`${awayName} at ${homeName}`} />
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

  if (!latestBroadcast) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Game Flow" subtitle="No game data available." />
        <PixelPanel title="Awaiting Data" accent="default">
          <div style={monoSm}>Advance to game day to generate game flow analysis.</div>
        </PixelPanel>
      </div>
    );
  }

  const { broadcast, gameResult, homeTeam, awayTeam } = latestBroadcast;

  const analysis = useMemo(
    () => analyzeGameFlow(broadcast, gameResult.homeTeamId, gameResult.awayTeamId),
    [broadcast, gameResult.homeTeamId, gameResult.awayTeamId],
  );

  return (
    <GameFlowView
      analysis={analysis}
      homeName={homeTeam.name}
      awayName={awayTeam.name}
    />
  );
}
