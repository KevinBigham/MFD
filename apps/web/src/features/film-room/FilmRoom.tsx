import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { selectFilmRoomHistory, selectLatestFilmRoomReport, useGameStore } from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, display, monoSm, screenStackStyle } from '../shared/pixelUi';
import { EmptyState } from '../shared/EmptyState';

type FilmRoomSourceAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';

interface FilmRoomSourceRow {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: FilmRoomSourceAccent;
}

export function buildFilmRoomSourceRows({
  hasLatest,
  latestGrade,
  latestScore,
  historyCount,
}: {
  hasLatest: boolean;
  latestGrade: string | null;
  latestScore: number | null;
  historyCount: number;
}): FilmRoomSourceRow[] {
  return [
    {
      id: 'latest-review',
      label: 'Latest review',
      value: hasLatest && latestGrade ? `Grade ${latestGrade}` : 'No report',
      detail: 'selectLatestFilmRoomReport returns the newest user-team entry from selectFilmRoomHistory; the route stays empty until a saved weekly prep plan creates a postgame report.',
      accent: hasLatest ? 'green' : 'default',
    },
    {
      id: 'recent-tape',
      label: 'Recent tape',
      value: `${historyCount} saved`,
      detail: 'selectFilmRoomHistory filters saved game.filmRoomHistory to the user team and reverses the saved list so the newest reports render first.',
      accent: historyCount > 0 ? 'cyan' : 'default',
    },
    {
      id: 'report-builder',
      label: 'Report builder',
      value: latestScore === null ? 'Awaiting result' : `Score ${latestScore}`,
      detail: 'buildFilmRoomReport grades saved prep against the completed result and opponent intel, then writes deterministic film-room-team-year-week report ids.',
      accent: latestScore === null ? 'gold' : 'green',
    },
    {
      id: 'write-owner',
      label: 'Write owner',
      value: 'Week advance',
      detail: 'franchise-week.ts appends weeklyPrepHistory when a user prep outcome exists and appends filmRoomHistory only when opponent intel is also available. Both arrays are capped at 24.',
      accent: 'gold',
    },
    {
      id: 'render-boundary',
      label: 'Just viewing',
      value: 'Read only',
      detail: 'Opening Film Room does not evaluate prep, generate reports, change weekly prep history, change film room history, reset gamePlan, advance the schedule, or replay results.',
      accent: 'red',
    },
  ];
}

function FilmRoomSources({ rows }: { rows: FilmRoomSourceRow[] }) {
  return (
    <PixelPanel title="Film Room Sources" accent="cyan">
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

export function FilmRoom() {
  const latest = useGameStore(selectLatestFilmRoomReport);
  const history = useGameStore(selectFilmRoomHistory);
  const sourceRows = buildFilmRoomSourceRows({
    hasLatest: Boolean(latest),
    latestGrade: latest?.grade ?? null,
    latestScore: latest?.score ?? null,
    historyCount: history.length,
  });

  if (!latest) {
    return (
      <div style={screenStackStyle}>
        <EmptyState
          title="Film Room"
          reason="No postgame coaching report is available yet. Finish a game week with a saved prep plan to generate the first Film Room report."
          nextStep="Set your game plan, then advance a game week to generate film."
          actionLabel="Open Game Plan"
          actionRoute="/game-plan"
        />
        <FilmRoomSources rows={sourceRows} />
      </div>
    );
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Film Room"
        subtitle="Use the prep board to see what worked, what missed, and what should carry forward."
        badges={(
          <>
            <PixelBadge variant={latest.grade === 'A' || latest.grade === 'B' ? 'green' : latest.grade === 'C' ? 'gold' : 'red'}>
              Grade {latest.grade}
            </PixelBadge>
            <PixelBadge variant="cyan">Score {latest.score}</PixelBadge>
          </>
        )}
      />

      <FilmRoomSources rows={sourceRows} />

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
