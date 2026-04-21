import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { PixelMetricCard, PixelScreenHeader, autoGrid, monoSm, screenStackStyle } from '../shared/pixelUi';
import { readCareerMeta, type CareerMeta, type DynastySummary } from '../../lib/career-meta';

function formatRecord(summary: DynastySummary | CareerMeta['careerTotals']): string {
  return `${summary.wins}-${summary.losses}${summary.ties ? `-${summary.ties}` : ''}`;
}

function dynastySortKey(summary: DynastySummary): number {
  if (summary.endYear !== null) return summary.endYear;
  if (summary.seasonsCoached > 0) return summary.startYear + summary.seasonsCoached - 1;
  return summary.startYear;
}

function legacyStats(dynasties: DynastySummary[]) {
  const longestDynasty = dynasties.reduce((max, dynasty) => Math.max(max, dynasty.seasonsCoached), 0);
  const mostTitles = dynasties.reduce((max, dynasty) => Math.max(max, dynasty.championships), 0);
  const bestWinPct = dynasties.reduce((best, dynasty) => {
    const games = dynasty.wins + dynasty.losses + dynasty.ties;
    if (games === 0) return best;
    const winPct = (dynasty.wins + dynasty.ties * 0.5) / games;
    return Math.max(best, winPct);
  }, 0);

  return {
    longestDynasty,
    mostTitles,
    bestWinPct,
  };
}

export function GmCareer() {
  const meta = readCareerMeta();
  const dynasties = [...meta.dynasties].sort((left, right) =>
    dynastySortKey(right) - dynastySortKey(left)
    || right.startYear - left.startYear
    || left.teamAbbr.localeCompare(right.teamAbbr),
  );

  if (dynasties.length === 0) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader
          title="GM Career"
          subtitle="Persistent local legacy across every dynasty."
          badges={<PixelBadge variant="cyan">CAREER META</PixelBadge>}
        />
        <PixelPanel title="Legacy Status" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No dynasties yet — start your first franchise to build your legacy.
          </div>
        </PixelPanel>
      </div>
    );
  }

  const legacy = legacyStats(dynasties);
  const dynastyLabel = meta.careerTotals.dynasties === 1 ? 'dynasty' : 'dynasties';

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="GM Career"
        subtitle="Cross-dynasty coaching ledger stored in this browser."
        badges={<PixelBadge variant="gold">LEGACY TRACKER</PixelBadge>}
      />

      <div style={autoGrid(180)}>
        <PixelMetricCard label="Seasons Coached" value={meta.careerTotals.seasonsCoached} accent="gold" detail={`${meta.careerTotals.dynasties} ${dynastyLabel}`} />
        <PixelMetricCard label="Career Record" value={formatRecord(meta.careerTotals)} accent="cyan" detail={`${meta.careerTotals.championships} titles`} />
        <PixelMetricCard label="Playoff Trips" value={meta.careerTotals.playoffAppearances} accent="green" detail="Completed seasons only" />
        <PixelMetricCard label="Breakouts Developed" value={meta.careerTotals.breakoutsDeveloped} accent="default" detail="Unique players across dynasties" />
        <PixelMetricCard label="HOFers Developed" value={meta.careerTotals.hallOfFamersDeveloped ?? 0} accent="gold" detail="First team was yours at induction" />
        <PixelMetricCard label="Coaches Developed" value={meta.careerTotals.coachesDeveloped ?? 0} accent="cyan" detail="Assistants promoted to HC" />
      </div>

      <PixelPanel title="Dynasties" accent="cyan">
        <div style={autoGrid(260)}>
          {dynasties.map((dynasty) => (
            <div
              key={dynasty.dynastyId}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                border: '2px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                  {dynasty.teamCity} {dynasty.teamName}
                </div>
                <PixelBadge variant={dynasty.endYear === null ? 'green' : 'default'}>
                  {dynasty.endYear === null ? 'ACTIVE' : 'FINAL'}
                </PixelBadge>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                {dynasty.startYear} - {dynasty.endYear ?? 'Present'}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                Record: {formatRecord(dynasty)}
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                Titles: {dynasty.championships} // Playoff Trips: {dynasty.playoffAppearances}
              </div>
            </div>
          ))}
        </div>
      </PixelPanel>

      <PixelPanel title="Legacy Stats" accent="gold">
        <div style={autoGrid(180)}>
          <PixelMetricCard
            label="Longest Dynasty"
            value={legacy.longestDynasty}
            accent="gold"
            detail="Completed seasons in one run"
          />
          <PixelMetricCard
            label="Most Titles"
            value={legacy.mostTitles}
            accent="cyan"
            detail="Championships in a single dynasty"
          />
          <PixelMetricCard
            label="Best Win Pct"
            value={`${(legacy.bestWinPct * 100).toFixed(1)}%`}
            accent="green"
            detail="Best dynasty win percentage"
          />
        </div>
      </PixelPanel>
    </div>
  );
}
