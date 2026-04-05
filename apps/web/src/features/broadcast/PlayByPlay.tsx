import { useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { BroadcastOutput, DriveNarrative, PlayDescription } from '@mfd/engine/types';
import { selectLatestBroadcast, useGameStore } from '../../app/store/game-store';
import { PixelScreenHeader, monoSm, pixelSm, screenStackStyle } from '../shared/pixelUi';

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

// ── PlayByPlayView (props-based) ───────────────────────

export function PlayByPlayView({ broadcast }: { broadcast: BroadcastOutput }) {
  const [activeQuarter, setActiveQuarter] = useState(0);
  const [expandedDrive, setExpandedDrive] = useState<number | null>(null);

  const quarterCount = broadcast.quarters.length;
  const drives = broadcast.quarters[activeQuarter] ?? [];

  const sortedHighlights = [...broadcast.highlights]
    .sort((a, b) => b.excitement - a.excitement)
    .slice(0, TOP_HIGHLIGHTS);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader title="Play-by-Play" subtitle={`${broadcast.broadcastNetwork} Broadcast`} />

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

      {/* Final Narrative */}
      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', fontStyle: 'italic', lineHeight: 1.7 }}>
        {broadcast.finalNarrative}
      </div>
    </div>
  );
}

// ── PlayByPlay (connected) ─────────────────────────────

export function PlayByPlay() {
  const broadcast = useGameStore(selectLatestBroadcast);

  if (!broadcast) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Play-by-Play" subtitle="No broadcast data available." />
        <PixelPanel title="Awaiting Broadcast" accent="default">
          <div style={monoSm}>Advance to game day to generate a broadcast.</div>
        </PixelPanel>
      </div>
    );
  }

  return <PlayByPlayView broadcast={broadcast.broadcast} />;
}
