import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { selectFilmRoomHistory, selectLatestFilmRoomReport, useGameStore } from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, monoSm, screenStackStyle } from '../shared/pixelUi';
import { EmptyState } from '../shared/EmptyState';

export function FilmRoom() {
  const latest = useGameStore(selectLatestFilmRoomReport);
  const history = useGameStore(selectFilmRoomHistory);

  if (!latest) {
    return (
      <EmptyState
        title="Film Room"
        reason="No postgame coaching review is available yet. Finish a game week with a saved prep plan to generate the first film-room review."
        nextStep="Set your game plan, then advance a game week to generate film."
        actionLabel="Open Game Plan"
        actionRoute="/game-plan"
      />
    );
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Film Room"
        subtitle="Review what the prep board got right, what missed, and what should carry forward."
        badges={(
          <>
            <PixelBadge variant={latest.grade === 'A' || latest.grade === 'B' ? 'green' : latest.grade === 'C' ? 'gold' : 'red'}>
              Grade {latest.grade}
            </PixelBadge>
            <PixelBadge variant="cyan">Score {latest.score}</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(280)}>
        <PixelPanel title="Latest Review" accent={latest.grade === 'A' || latest.grade === 'B' ? 'green' : latest.grade === 'C' ? 'gold' : 'red'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{latest.headline}</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{latest.planSummary}</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Aligned: {latest.alignedCalls.join(' | ') || 'None'}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Missed: {latest.missedCalls.join(' | ') || 'None'}
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="Carry Forward" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {latest.carryForward.map((line) => (
              <div key={line} style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{line}</div>
            ))}
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Recent Tape" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {history.map((report) => (
            <div key={report.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '10px', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant={report.grade === 'A' || report.grade === 'B' ? 'green' : report.grade === 'C' ? 'gold' : 'red'}>
                  {report.grade}
                </PixelBadge>
                <PixelBadge variant="default">Week {report.week}</PixelBadge>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{report.headline}</div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{report.executionNotes.join(' | ')}</div>
            </div>
          ))}
        </div>
      </PixelPanel>
    </div>
  );
}
