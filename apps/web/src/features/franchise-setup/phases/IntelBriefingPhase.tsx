import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { FranchiseIntelBriefing } from '@mfd/engine';
import { PixelMetricCard, autoGrid, monoSm, pixelSm } from '../../shared/pixelUi';

export function IntelBriefingPhase({ data }: { data: FranchiseIntelBriefing }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={autoGrid(180)}>
        <PixelMetricCard label="Dynasty Window" value={data.windowPhase} accent="gold" detail={`Score: ${data.windowScore}`} />
        <PixelMetricCard label="Cap Grade" value={data.capGrade} accent={data.capGrade <= 'B' ? 'cyan' : 'gold'} detail={`$${data.capSpace}M space`} />
        <PixelMetricCard label="Roster OVR" value={data.rosterOverall} accent="green" detail="Avg starter overall" />
        <PixelMetricCard label="League Rank" value={`#${data.leagueRank}`} accent="cyan" detail="Overall power ranking" />
      </div>

      <div style={autoGrid(260)}>
        <PixelPanel title="Strengths" accent="green">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {data.strengths.map((s) => <PixelBadge key={s} variant="green">{s}</PixelBadge>)}
            {data.strengths.length === 0 && <span style={{ ...monoSm, color: '#666' }}>No standout groups</span>}
          </div>
        </PixelPanel>
        <PixelPanel title="Critical Needs" accent="red">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {data.criticalNeeds.map((n) => <PixelBadge key={n} variant="red">{n}</PixelBadge>)}
            {data.criticalNeeds.length === 0 && <span style={{ ...monoSm, color: '#666' }}>No critical weaknesses</span>}
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Scouting Report" accent="gold">
        <div style={{ ...monoSm, color: '#ccc', lineHeight: 1.7 }}>{data.overallAssessment}</div>
      </PixelPanel>
    </div>
  );
}
