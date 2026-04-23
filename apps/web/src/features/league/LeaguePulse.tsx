/**
 * League Pulse — single-screen, at-a-glance view of the league's
 * rivalry temperature + power-ranking movement. Complements
 * RivalryHeatMap (which is user-team-centric) by surveying the
 * whole league.
 */
import { useMemo } from 'react';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { buildLeaguePulse } from '@mfd/engine';
import type { LeaguePulseRankMover, LeaguePulseRivalryEntry, LeaguePulseTier } from '@mfd/engine';
import {
  selectLeagueRivalries,
  selectPowerRankings,
  selectTeams,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelScreenHeader,
  autoGrid,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

// ── Helpers ────────────────────────────────────────────

const TIER_VARIANT: Record<LeaguePulseTier, 'red' | 'gold' | 'cyan' | 'default'> = {
  blood_feud: 'red',
  heated: 'gold',
  budding: 'cyan',
  quiet: 'default',
};

const TIER_LABEL: Record<LeaguePulseTier, string> = {
  blood_feud: 'BLOOD FEUD',
  heated: 'HEATED',
  budding: 'BUDDING',
  quiet: 'QUIET',
};

function intensityBarColor(tier: LeaguePulseTier): string {
  if (tier === 'blood_feud') return 'var(--mfd-red)';
  if (tier === 'heated') return 'var(--mfd-gold)';
  if (tier === 'budding') return 'var(--mfd-cyan)';
  return 'var(--mfd-muted)';
}

// ── Sub-components ─────────────────────────────────────

function SummaryCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--mfd-border)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div style={{ ...pixelSm, color: 'var(--mfd-muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '24px', color: accent }}>
        {value}
      </div>
    </div>
  );
}

function RivalryRow({ entry }: { entry: LeaguePulseRivalryEntry }) {
  const widthPct = Math.max(0, Math.min(100, entry.intensity));
  return (
    <div
      data-testid={`rivalry-row-${entry.id}`}
      style={{
        border: '1px solid var(--mfd-border)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'var(--mfd-surface-raised)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '20px', color: 'var(--mfd-text)' }}>
            {entry.teamAName.toUpperCase()} <span style={{ color: 'var(--mfd-muted)' }}>vs</span> {entry.teamBName.toUpperCase()}
          </span>
          {entry.isDivision && <PixelBadge variant="cyan">DIVISION</PixelBadge>}
        </div>
        <PixelBadge variant={TIER_VARIANT[entry.tier]}>{TIER_LABEL[entry.tier]}</PixelBadge>
      </div>

      <div
        aria-label="intensity"
        style={{
          position: 'relative',
          height: '10px',
          border: '1px solid var(--mfd-border)',
          background: 'var(--mfd-bg)',
          overflow: 'hidden',
        }}
      >
        <div
          data-testid={`intensity-bar-${entry.id}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: `${widthPct}%`,
            background: intensityBarColor(entry.tier),
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>
          INTENSITY {Math.round(entry.intensity)} / 100
        </span>
        <span style={{ ...monoSm, color: 'var(--mfd-muted)' }}>LAST MET {entry.lastMetLabel}</span>
      </div>

      {entry.historyPreview && (
        <div style={{ ...monoSm, color: 'var(--mfd-muted)', lineHeight: 1.5 }}>
          {entry.historyPreview}
        </div>
      )}
    </div>
  );
}

function MoverRow({ mover, kind }: { mover: LeaguePulseRankMover; kind: 'riser' | 'faller' }) {
  const color = kind === 'riser' ? 'var(--mfd-green)' : 'var(--mfd-red)';
  const arrow = kind === 'riser' ? '▲' : '▼';
  const magnitude = Math.abs(mover.delta);
  return (
    <div
      data-testid={`${kind}-row-${mover.teamId}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '8px 12px',
        border: '1px solid var(--mfd-border)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '18px', color: 'var(--mfd-text)' }}>
          #{mover.rank} {mover.teamName.toUpperCase()}
        </span>
        <span style={{ ...monoSm, color: 'var(--mfd-muted)' }}>{mover.record}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '20px', color }}>
          {arrow} {magnitude}
        </span>
      </div>
    </div>
  );
}

// ── Connected screen ───────────────────────────────────

export function LeaguePulse() {
  const rivalries = useGameStore(selectLeagueRivalries);
  const powerRankings = useGameStore(selectPowerRankings);
  const teams = useGameStore(selectTeams);

  const teamNames = useMemo(() => {
    if (!teams) return {};
    const map: Record<string, string> = {};
    for (const team of Object.values(teams)) {
      map[team.id] = team.name;
    }
    return map;
  }, [teams]);

  const pulse = useMemo(
    () =>
      buildLeaguePulse(
        { rivalries, teamNames, powerRankings },
        { maxRivalries: 12, maxMovers: 5 },
      ),
    [rivalries, teamNames, powerRankings],
  );

  const { summary, hottestRivalries, risers, fallers } = pulse;
  const hasAnyData = rivalries.length > 0 || powerRankings.length > 0;

  if (!hasAnyData) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader
          title="LEAGUE PULSE"
          subtitle="Rivalry heat and rank momentum across the league."
        />
        <PixelPanel title="NO LEAGUE DATA" accent="default">
          <div style={monoSm}>Advance a week to populate rivalries and power rankings.</div>
        </PixelPanel>
      </div>
    );
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="LEAGUE PULSE"
        subtitle={`Tracking ${summary.totalRivalries} rivalries across the league.`}
        badges={
          <>
            <PixelBadge variant="red">{summary.bloodFeudCount} BLOOD FEUDS</PixelBadge>
            <PixelBadge variant="gold">{summary.heatedCount} HEATED</PixelBadge>
            <PixelBadge variant="cyan">{summary.divisionalCount} DIVISION</PixelBadge>
          </>
        }
      />

      <div style={autoGrid(160)}>
        <SummaryCard label="RIVALRIES" value={summary.totalRivalries} accent="var(--mfd-text)" />
        <SummaryCard label="AVG HEAT" value={summary.averageIntensity} accent="var(--mfd-cyan)" />
        <SummaryCard label="TOP HEAT" value={summary.topIntensity} accent="var(--mfd-red)" />
        <SummaryCard label="DIVISIONAL" value={summary.divisionalCount} accent="var(--mfd-gold)" />
      </div>

      <PixelPanel title="HOTTEST RIVALRIES" accent="red">
        {hottestRivalries.length === 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-muted)' }}>
            No rivalry has hit the highlight threshold yet.
          </div>
        ) : (
          <div
            data-testid="hottest-rivalries-list"
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {hottestRivalries.map((entry) => (
              <RivalryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </PixelPanel>

      <div style={autoGrid(280)}>
        <PixelPanel title="RISERS" accent="green">
          {risers.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-muted)' }}>No upward movement this week.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {risers.map((mover) => (
                <MoverRow key={mover.teamId} mover={mover} kind="riser" />
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="FALLERS" accent="red">
          {fallers.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-muted)' }}>No slides this week.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fallers.map((mover) => (
                <MoverRow key={mover.teamId} mover={mover} kind="faller" />
              ))}
            </div>
          )}
        </PixelPanel>
      </div>
    </div>
  );
}

export default LeaguePulse;
