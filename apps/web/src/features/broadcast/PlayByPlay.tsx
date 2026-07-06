import { useMemo, useState } from 'react';
import type { BroadcastCommentaryGame } from '@mfd/engine';
import { buildBroadcastCommentary, buildHalftimeDecisionReceipt } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { BroadcastOutput, DriveNarrative, PlayDescription } from '@mfd/engine/types';
import { selectGameDayPackageByBroadcastGameId, selectLatestBroadcast, useGameStore } from '../../app/store/game-store';
import { PixelScreenHeader, display, monoSm, pixelSm, screenStackStyle } from '../shared/pixelUi';

// ── Helpers ────────────────────────────────────────────

function endResultBadgeVariant(endResult: DriveNarrative['endResult']): 'green' | 'gold' | 'red' | 'default' {
  switch (endResult) {
    case 'touchdown': return 'green';
    case 'fieldGoal': return 'gold';
    case 'turnover': return 'red';
    default: return 'default';
  }
}

function endResultPanelAccent(endResult: DriveNarrative['endResult']): 'green' | 'gold' | 'red' | 'cyan' | 'default' {
  switch (endResult) {
    case 'touchdown': return 'green';
    case 'fieldGoal': return 'gold';
    case 'turnover': return 'red';
    case 'turnoverOnDowns': return 'red';
    default: return 'cyan';
  }
}

function playCommentaryColor(excitement: number): string {
  if (excitement >= 7) return 'var(--mfd-green)';
  if (excitement >= 5) return 'var(--mfd-gold)';
  return 'var(--mfd-text)';
}

function playBorderColor(play: PlayDescription): string {
  if (play.type === 'turnover') return 'var(--mfd-red)';
  if (play.type === 'touchdown') return 'var(--mfd-green)';
  if (play.isBigPlay) return 'var(--mfd-gold)';
  if (play.isClutch) return 'var(--mfd-cyan)';
  return 'var(--mfd-border)';
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const TOP_HIGHLIGHTS = 5;

type PlayByPlaySourceAccent = 'default' | 'green' | 'cyan' | 'gold' | 'red';

interface PlayByPlaySourceRow {
  id: string;
  label: string;
  value: string;
  detail: string;
  accent: PlayByPlaySourceAccent;
}

export function buildPlayByPlaySourceRows({
  hasBroadcast,
  quarterCount,
  driveCount,
  highlightCount,
  ghostLineCount,
  commentaryLineCount,
  activeQuarterLabel,
}: {
  hasBroadcast: boolean;
  quarterCount: number;
  driveCount: number;
  highlightCount: number;
  ghostLineCount: number;
  commentaryLineCount: number;
  activeQuarterLabel: string;
}): PlayByPlaySourceRow[] {
  return [
    {
      id: 'latest-broadcast',
      label: 'Latest broadcast',
      value: hasBroadcast ? `${quarterCount} quarters` : 'No broadcast',
      detail: 'The connected /play-by-play route reads selectLatestBroadcast, so it follows the newest user-team result instead of transient selected-game broadcast context.',
      accent: hasBroadcast ? 'green' : 'default',
    },
    {
      id: 'drive-timeline',
      label: 'Drive timeline',
      value: `${driveCount} drives`,
      detail: 'Drive cards render broadcast.quarters from saved or deterministically rebuilt BroadcastOutput. Expanding a drive only changes route-local React state.',
      accent: driveCount > 0 ? 'cyan' : 'default',
    },
    {
      id: 'highlight-sort',
      label: 'Highlight sort',
      value: `${Math.min(highlightCount, TOP_HIGHLIGHTS)} shown`,
      detail: 'Highlights are copied, sorted by excitement, and capped for display. Sorting this panel does not rewrite broadcast.highlights.',
      accent: highlightCount > 0 ? 'gold' : 'default',
    },
    {
      id: 'booth-lines',
      label: 'Booth lines',
      value: `${ghostLineCount + commentaryLineCount} lines`,
      detail: 'Ghost lines come from broadcast.ghostLines, while Broadcast Texture lines are passed from buildHalftimeDecisionReceipt and buildBroadcastCommentary. This route does not generate saved commentary.',
      accent: ghostLineCount + commentaryLineCount > 0 ? 'cyan' : 'default',
    },
    {
      id: 'render-boundary',
      label: 'Just viewing',
      value: activeQuarterLabel,
      detail: 'Quarter tabs, expanded-drive state, sorted highlights, booth sections, and texture rows are read-only presentation. Opening the route does not append packages, change broadcasts, click Advance Week, or change results.',
      accent: 'red',
    },
  ];
}

function PlayByPlaySources({ rows }: { rows: PlayByPlaySourceRow[] }) {
  return (
    <PixelPanel title="Play-by-Play Sources" accent="cyan">
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

// ── PlayByPlayView (props-based) ───────────────────────

export function PlayByPlayView({
  broadcast,
  commentaryLines = [],
}: {
  broadcast: BroadcastOutput;
  commentaryLines?: readonly string[];
}) {
  const [activeQuarter, setActiveQuarter] = useState(0);
  const [expandedDrive, setExpandedDrive] = useState<number | null>(null);

  const quarterCount = broadcast.quarters.length;
  const drives = broadcast.quarters[activeQuarter] ?? [];
  const driveCount = broadcast.quarters.reduce((total, quarter) => total + quarter.length, 0);
  const activeQuarterLabel = activeQuarter < 4 ? `Q${activeQuarter + 1}` : 'OT';
  const sourceRows = buildPlayByPlaySourceRows({
    hasBroadcast: true,
    quarterCount,
    driveCount,
    highlightCount: broadcast.highlights.length,
    ghostLineCount: broadcast.ghostLines?.length ?? 0,
    commentaryLineCount: commentaryLines.length,
    activeQuarterLabel,
  });

  const sortedHighlights = [...broadcast.highlights]
    .sort((a, b) => b.excitement - a.excitement)
    .slice(0, TOP_HIGHLIGHTS);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader title="Play-by-Play" subtitle={`${broadcast.broadcastNetwork} Broadcast`} />
      <PlayByPlaySources rows={sourceRows} />

      {/* Quarter tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {Array.from({ length: quarterCount }, (_, i) => (
          <PixelButton
            key={i}
            accent={activeQuarter === i ? 'gold' : 'default'}
            onClick={() => { setActiveQuarter(i); setExpandedDrive(null); }}
          >
            {i < 4 ? `Q${i + 1}` : 'OT'}
          </PixelButton>
        ))}
      </div>

      {/* Drive timeline */}
      {drives.length === 0 ? (
        <PixelPanel title={`Quarter ${activeQuarter < 4 ? activeQuarter + 1 : 'OT'}`} accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            No drives recorded for this quarter.
          </div>
        </PixelPanel>
      ) : (
        drives.map((drive, driveIndex) => {
          const isExpanded = expandedDrive === driveIndex;
          return (
            <PixelPanel
              key={driveIndex}
              title={`Drive #${driveIndex + 1}`}
              accent={endResultPanelAccent(drive.endResult)}
            >
              <div
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => setExpandedDrive(isExpanded ? null : driveIndex)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedDrive(isExpanded ? null : driveIndex);
                  }
                }}
              >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <PixelBadge variant={endResultBadgeVariant(drive.endResult)}>
                    {drive.endResult.toUpperCase()}
                  </PixelBadge>
                  <PixelBadge variant="default">{drive.yardsTotal} YDS</PixelBadge>
                  <PixelBadge variant="cyan">{formatTime(drive.timeElapsed)}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)', marginTop: '6px' }}>
                  {drive.narrative}
                </div>
              </div>

              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {drive.plays.map((play, playIndex) => (
                    <div
                      key={playIndex}
                      style={{
                        borderLeft: `4px solid ${playBorderColor(play)}`,
                        paddingLeft: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ ...pixelSm, color: playBorderColor(play) }}>
                          {play.type.toUpperCase()} // {play.yardsGained} YDS
                        </span>
                        {play.isBigPlay && <PixelBadge variant="gold">BIG PLAY</PixelBadge>}
                        {play.isClutch && <PixelBadge variant="cyan">CLUTCH</PixelBadge>}
                      </div>
                      <div style={{ ...monoSm, color: playCommentaryColor(play.excitement) }}>
                        {play.commentary}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PixelPanel>
          );
        })
      )}

      {/* Highlight Reel */}
      <PixelPanel title="Highlights" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sortedHighlights.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No highlights recorded.</div>
          ) : (
            sortedHighlights.map((play, index) => (
              <div
                key={`hl-${index}`}
                style={{
                  borderLeft: `4px solid ${playBorderColor(play)}`,
                  paddingLeft: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <PixelBadge variant="default">EXC {play.excitement}</PixelBadge>
                  {play.isBigPlay && <PixelBadge variant="gold">BIG PLAY</PixelBadge>}
                  {play.isClutch && <PixelBadge variant="cyan">CLUTCH</PixelBadge>}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{play.commentary}</div>
              </div>
            ))
          )}
        </div>
      </PixelPanel>

      {/* Momentum Swings */}
      <PixelPanel title="Momentum Swings" accent="cyan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {broadcast.momentumSwings.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No major momentum swings were tracked.</div>
          ) : (
            broadcast.momentumSwings.map((swing, index) => (
              <div key={`ms-${index}`} style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                Q{swing.quarter} // {swing.description}
              </div>
            ))
          )}
        </div>
      </PixelPanel>

      {(() => {
        const lines = broadcast.ghostLines ?? [];
        const hofLines = lines.filter((line) => line.source === 'hof' || (!line.source && line.commentatorName !== 'Booth Alert'));
        const calloutLines = lines.filter((line) => line.source === 'callout' || (!line.source && line.commentatorName === 'Booth Alert'));

        if (hofLines.length === 0 && calloutLines.length === 0) {
          return (
            <PixelPanel title="Booth Alerts" accent="gold">
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No booth alerts landed in this broadcast.</div>
            </PixelPanel>
          );
        }

        return (
          <>
            {hofLines.length > 0 ? (
              <PixelPanel title="Hall of Fame Voices" accent="gold">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {hofLines.map((line, index) => (
                    <div key={`hof-${line.commentatorName}-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <PixelBadge variant="gold">{line.commentatorName.toUpperCase()}</PixelBadge>
                        <PixelBadge variant="default">HOF</PixelBadge>
                        <PixelBadge variant="default">{line.trigger.replaceAll('_', ' ')}</PixelBadge>
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{line.commentary}</div>
                    </div>
                  ))}
                </div>
              </PixelPanel>
            ) : null}
            {calloutLines.length > 0 ? (
              <PixelPanel title="Booth Alerts" accent="cyan">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {calloutLines.map((line, index) => (
                    <div key={`callout-${line.commentatorName}-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <PixelBadge variant="default">{line.commentatorName.toUpperCase()}</PixelBadge>
                        <PixelBadge variant="default">{line.trigger.replaceAll('_', ' ')}</PixelBadge>
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{line.commentary}</div>
                    </div>
                  ))}
                </div>
              </PixelPanel>
            ) : null}
          </>
        );
      })()}

      {commentaryLines.length > 0 ? (
        <PixelPanel title="Broadcast Texture" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {commentaryLines.map((line) => (
              <div key={line} style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                {line}
              </div>
            ))}
          </div>
        </PixelPanel>
      ) : null}

      {/* Final Narrative */}
      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', fontStyle: 'italic', lineHeight: 1.7 }}>
        {broadcast.finalNarrative}
      </div>
    </div>
  );
}

// ── PlayByPlay (connected) ─────────────────────────────

export function PlayByPlay() {
  const game = useGameStore((state) => state.game);
  const broadcast = useGameStore(selectLatestBroadcast);
  const gameDayPackage = useGameStore(useMemo(() => selectGameDayPackageByBroadcastGameId(null), []));
  const commentaryLines = useMemo(() => {
    if (!game || !broadcast) return [];
    const commentary = buildBroadcastCommentary(game as BroadcastCommentaryGame, {
      homeTeamId: broadcast.gameResult.homeTeamId,
      awayTeamId: broadcast.gameResult.awayTeamId,
      result: broadcast.gameResult,
      seed: game.year * 100 + broadcast.gameResult.week,
    });
    const halftimeReceipt = buildHalftimeDecisionReceipt(gameDayPackage?.activeEffectSummaries ?? []);
    return [
      ...(halftimeReceipt ? [halftimeReceipt.broadcastLine] : []),
      ...commentary.pregame,
      ...commentary.inGame,
    ].slice(0, 4);
  }, [game, broadcast, gameDayPackage]);

  if (!broadcast) {
    const sourceRows = buildPlayByPlaySourceRows({
      hasBroadcast: false,
      quarterCount: 0,
      driveCount: 0,
      highlightCount: 0,
      ghostLineCount: 0,
      commentaryLineCount: 0,
      activeQuarterLabel: 'Q1',
    });
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Play-by-Play" subtitle="No broadcast data available." />
        <PixelPanel title="Awaiting Broadcast" accent="default">
          <div style={monoSm}>Advance to game day to generate a broadcast.</div>
        </PixelPanel>
        <PlayByPlaySources rows={sourceRows} />
      </div>
    );
  }

  return <PlayByPlayView broadcast={broadcast.broadcast} commentaryLines={commentaryLines} />;
}
