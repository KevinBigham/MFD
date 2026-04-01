import type { GameDayPackage, SeasonPhase } from '@mfd/engine';
import { MfdBadge, MfdPanel } from '@mfd/design-system/components';
import { Gamepad2, Mic2, ShieldAlert, Sparkles, Trophy } from 'lucide-react';
import {
  selectLatestGameDayPackage,
  selectPhase,
  selectUserTeam,
  selectYear,
  useGameStore,
} from '../../app/store/game-store';

interface GameDayCenterViewProps {
  teamLabel: string;
  phase: SeasonPhase;
  year: number;
  packageData: GameDayPackage | null;
}

function impactVariant(impact: 'positive' | 'negative' | 'neutral') {
  return impact === 'positive' ? 'success' : impact === 'negative' ? 'danger' : 'default';
}

export function GameDayCenterView({ teamLabel, phase, year, packageData }: GameDayCenterViewProps) {
  if (!packageData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem', fontWeight: 700, margin: 0 }}>Game Day Center</h1>
          <p style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)', margin: '4px 0 0' }}>
            {teamLabel} // {phase} // Season {year}
          </p>
        </div>
        <MfdPanel title="Awaiting Kickoff" icon={<Gamepad2 size={14} />}>
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.8125rem', color: 'var(--mfd-text-dim)' }}>
            No postgame package yet. Advance into the regular season to generate the first cinema bundle.
          </div>
        </MfdPanel>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem', fontWeight: 700, margin: 0 }}>Game Day Center</h1>
          <p style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)', margin: '4px 0 0' }}>
            {teamLabel} // {phase} // Season {year}
          </p>
        </div>
        <MfdBadge variant={packageData.result === 'win' ? 'success' : packageData.result === 'loss' ? 'danger' : 'default'}>
          {packageData.result.toUpperCase()}
        </MfdBadge>
      </div>

      <MfdPanel title="Score Banner" icon={<Trophy size={14} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
          <div style={{ fontFamily: 'var(--mfd-font-serif)', fontSize: '1.125rem', fontWeight: 700 }}>{packageData.headline}</div>
          <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)', flexWrap: 'wrap' }}>
            <MfdBadge variant="gold">{packageData.finalScore}</MfdBadge>
            {packageData.stakes.map((stake) => <MfdBadge key={stake.label} variant="default">{stake.label}</MfdBadge>)}
          </div>
        </div>
      </MfdPanel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        <MfdPanel title="Turning Points" icon={<Sparkles size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {packageData.turningPoints.map((point) => (
              <div key={point.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>{point.label}</span>
                  <MfdBadge variant={impactVariant(point.impact)}>{point.impact}</MfdBadge>
                </div>
                <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>{point.detail}</div>
              </div>
            ))}
          </div>
        </MfdPanel>

        <MfdPanel title="Top Performers" icon={<Gamepad2 size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {packageData.topPerformers.map((performer) => (
              <div key={performer.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>{performer.label}</span>
                <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>{performer.statLine}</span>
              </div>
            ))}
          </div>
        </MfdPanel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        <MfdPanel title="Postgame Autopsy" icon={<ShieldAlert size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.875rem', fontWeight: 600 }}>{packageData.autopsy.diagnosis}</div>
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>{packageData.autopsy.leverage}</div>
            {packageData.autopsy.nextFocus.map((item) => (
              <div key={item} style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
                {item}
              </div>
            ))}
          </div>
        </MfdPanel>

        <MfdPanel title="Press Conference" icon={<Mic2 size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            <MfdBadge variant="info">{packageData.pressConference.theme}</MfdBadge>
            <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>{packageData.pressConference.opener}</div>
            {packageData.pressConference.quotes.map((quote) => (
              <div key={quote} style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
                {quote}
              </div>
            ))}
          </div>
        </MfdPanel>
      </div>
    </div>
  );
}

export function GameDayRecap() {
  const team = useGameStore(selectUserTeam);
  const phase = useGameStore(selectPhase);
  const year = useGameStore(selectYear);
  const packageData = useGameStore(selectLatestGameDayPackage);

  if (!team) return null;
  return <GameDayCenterView teamLabel={`${team.city} ${team.name}`} phase={phase} year={year} packageData={packageData} />;
}
