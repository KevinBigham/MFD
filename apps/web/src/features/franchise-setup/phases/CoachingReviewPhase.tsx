import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { CoachingStaffReview } from '@mfd/engine';
import { PixelMetricCard, autoGrid, monoSm, pixelSm } from '../../shared/pixelUi';

function CoachCard({ label, name, archetype, ratings, level, vacant }: {
  label: string; name: string; archetype: string; ratings: Record<string, number>; level: number; vacant: boolean;
}) {
  const topRating = Object.entries(ratings).sort(([, a], [, b]) => b - a)[0];
  return (
    <PixelPanel title={label} accent={vacant ? 'red' : 'gold'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ ...pixelSm, color: vacant ? 'var(--mfd-red, #ff4444)' : 'var(--mfd-gold)' }}>
          {vacant ? 'VACANT' : name.toUpperCase()}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <PixelBadge variant="default">{archetype.replace(/_/g, ' ')}</PixelBadge>
          <PixelBadge variant="cyan">LVL {level}</PixelBadge>
        </div>
        {topRating ? (
          <div style={{ ...monoSm, color: '#bbb' }}>
            Best: {topRating[0].replace(/([A-Z])/g, ' $1').trim()} ({topRating[1]})
          </div>
        ) : null}
      </div>
    </PixelPanel>
  );
}

export function CoachingReviewPhase({ data }: { data: CoachingStaffReview }) {
  const rec = data.schemeRecommendation;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={autoGrid(220)}>
        <CoachCard
          label="Head Coach"
          name={data.headCoach.name}
          archetype={data.headCoach.archetype}
          ratings={data.headCoach.ratings}
          level={data.headCoach.level}
          vacant={data.headCoach.vacant}
        />
        {data.coordinators.map((coord) => (
          <CoachCard
            key={coord.role}
            label={coord.role === 'OC' ? 'Offensive Coordinator' : 'Defensive Coordinator'}
            name={coord.name}
            archetype={coord.archetype}
            ratings={coord.ratings}
            level={coord.level}
            vacant={coord.vacant}
          />
        ))}
      </div>

      <PixelPanel title="Coaching Philosophy" accent="cyan">
        <div style={{ ...monoSm, color: '#ccc', lineHeight: 1.7 }}>{data.coachingPhilosophy}</div>
      </PixelPanel>

      <PixelPanel title="Staff Scheme Recommendation" accent="gold">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <div>
            <PixelBadge variant="gold">{rec.offenseLabel}</PixelBadge>
            <span style={{ ...monoSm, color: '#888', marginLeft: '6px' }}>Offense</span>
          </div>
          <div>
            <PixelBadge variant="cyan">{rec.defenseLabel}</PixelBadge>
            <span style={{ ...monoSm, color: '#888', marginLeft: '6px' }}>Defense</span>
          </div>
        </div>
        <div style={{ ...monoSm, color: '#bbb', lineHeight: 1.6 }}>{rec.reasoning}</div>
      </PixelPanel>
    </div>
  );
}
