import {
  MfdPanel,
  MfdKpiCard,
  MfdKpiGrid,
  MfdBadge,
  MfdRingProgress,
  MfdConsequenceRibbon,
} from '@mfd/design-system/components';
import {
  Calendar, Users, DollarSign, TrendingUp,
  AlertTriangle, Activity, Star, Shield,
} from 'lucide-react';

// Mock data — replaced with real engine data in Phase 2
const MOCK = {
  teamName: 'Chicago Bears',
  season: 2026,
  week: 8,
  record: '5-2',
  nextOpponent: 'Green Bay Packers',
  nextGameDay: 'Sunday, Oct 25',
  capSpace: '$12.4M',
  capPct: 72,
  ownerMood: 'Pleased',
  ownerPressure: 28,
  injuries: [
    { player: 'J. Fields', position: 'QB', status: 'Questionable', weeks: 1 },
    { player: 'M. Williams', position: 'WR', status: 'Out', weeks: 3 },
  ],
  urgentDecisions: 3,
  devWatchlist: [
    { player: 'R. Johnson', position: 'CB', trait: 'Breakout candidate', progress: 68 },
    { player: 'T. Smith', position: 'OT', trait: 'High motor', progress: 45 },
  ],
  recentConsequences: [
    { id: 'c1', label: 'Cap Space', delta: '+$2.1M', direction: 'positive' as const },
    { id: 'c2', label: 'Win Probability', delta: '-4.2%', direction: 'negative' as const },
    { id: 'c3', label: 'Owner Mood', delta: 'Stable', direction: 'neutral' as const },
  ],
};

export function MondayBriefing() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--mfd-font-serif)',
            fontSize: '1.375rem',
            fontWeight: 700,
            color: 'var(--mfd-text)',
            margin: 0,
          }}>
            Monday Briefing
          </h1>
          <p style={{
            fontFamily: 'var(--mfd-font-mono)',
            fontSize: '0.75rem',
            color: 'var(--mfd-text-dim)',
            margin: '4px 0 0',
          }}>
            {MOCK.teamName} // Season {MOCK.season}, Week {MOCK.week}
          </p>
        </div>
        <MfdBadge variant="gold">{MOCK.record}</MfdBadge>
      </div>

      {/* Last action consequences */}
      <MfdConsequenceRibbon consequences={MOCK.recentConsequences} />

      {/* KPI Row */}
      <MfdKpiGrid columns={4}>
        <MfdKpiCard
          label="Next Game"
          value={MOCK.nextOpponent}
          icon={<Calendar size={14} />}
          trendLabel={MOCK.nextGameDay}
          trend="flat"
        />
        <MfdKpiCard
          label="Cap Space"
          value={MOCK.capSpace}
          icon={<DollarSign size={14} />}
          trend="up"
          trendLabel="After restructure"
          variant="success"
        />
        <MfdKpiCard
          label="Owner Mood"
          value={MOCK.ownerMood}
          icon={<Shield size={14} />}
          trend="flat"
          trendLabel={`Pressure: ${MOCK.ownerPressure}%`}
        />
        <MfdKpiCard
          label="Urgent"
          value={MOCK.urgentDecisions}
          icon={<AlertTriangle size={14} />}
          variant={MOCK.urgentDecisions > 2 ? 'danger' : 'default'}
          trendLabel="Decisions needed"
          trend="flat"
        />
      </MfdKpiGrid>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {/* Injuries */}
        <MfdPanel
          title="Injury Report"
          icon={<Activity size={14} />}
        >
          {MOCK.injuries.length === 0 ? (
            <p style={{ color: 'var(--mfd-text-faint)', fontSize: '0.8125rem', margin: 0 }}>
              No injuries to report
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
              {MOCK.injuries.map((inj) => (
                <div
                  key={inj.player}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--mfd-sp-xs) 0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)' }}>
                    <span style={{
                      fontFamily: 'var(--mfd-font-sans)',
                      fontSize: '0.8125rem',
                      color: 'var(--mfd-text)',
                    }}>
                      {inj.player}
                    </span>
                    <MfdBadge variant="default">{inj.position}</MfdBadge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)' }}>
                    <MfdBadge variant={inj.status === 'Out' ? 'danger' : 'warning'}>
                      {inj.status}
                    </MfdBadge>
                    <span style={{
                      fontFamily: 'var(--mfd-font-mono)',
                      fontSize: '0.6875rem',
                      color: 'var(--mfd-text-faint)',
                    }}>
                      {inj.weeks}w
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </MfdPanel>

        {/* Development Watchlist */}
        <MfdPanel
          title="Dev Watchlist"
          icon={<Star size={14} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
            {MOCK.devWatchlist.map((dev) => (
              <div
                key={dev.player}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--mfd-sp-md)',
                }}
              >
                <MfdRingProgress
                  value={dev.progress}
                  size={36}
                  strokeWidth={3}
                  color={dev.progress > 60 ? 'var(--mfd-green)' : 'var(--mfd-cyan)'}
                />
                <div>
                  <div style={{
                    fontFamily: 'var(--mfd-font-sans)',
                    fontSize: '0.8125rem',
                    color: 'var(--mfd-text)',
                  }}>
                    {dev.player}
                    <MfdBadge variant="default" style={{ marginLeft: 6 }}>{dev.position}</MfdBadge>
                  </div>
                  <div style={{
                    fontFamily: 'var(--mfd-font-mono)',
                    fontSize: '0.6875rem',
                    color: 'var(--mfd-text-dim)',
                    marginTop: 2,
                  }}>
                    {dev.trait}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </MfdPanel>
      </div>
    </div>
  );
}
