import { useMemo, useState } from 'react';
import type { BroadcastCommentaryGame } from '@mfd/engine';
import { buildBroadcastCommentary } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { selectBroadcastByGameId, useGameStore } from '../../app/store/game-store';
import { useUiStore } from '../../app/store/ui-store';
import { PixelScreenHeader, autoGrid, monoSm, pixelSm, screenStackStyle } from '../shared/pixelUi';
import { EmptyState } from '../shared/EmptyState';

type BroadcastTab = 'q1' | 'q2' | 'q3' | 'q4' | 'highlights';

const TABS: Array<{ id: BroadcastTab; label: string }> = [
  { id: 'q1', label: 'Q1' },
  { id: 'q2', label: 'Q2' },
  { id: 'q3', label: 'Q3' },
  { id: 'q4', label: 'Q4' },
  { id: 'highlights', label: 'Highlights' },
];

function playAccent(play: { type: string; isBigPlay: boolean; isClutch: boolean }) {
  if (play.type === 'touchdown') return 'var(--mfd-green)';
  if (play.type === 'turnover' || play.type === 'sack') return 'var(--mfd-red)';
  if (play.isClutch) return 'var(--mfd-cyan)';
  if (play.isBigPlay) return 'var(--mfd-gold)';
  return 'var(--mfd-border)';
}

export function GameBroadcast() {
  const broadcastGameId = useUiStore((state) => state.broadcastGameId);
  const game = useGameStore((state) => state.game);
  const latestBroadcast = useGameStore(useMemo(() => selectBroadcastByGameId(broadcastGameId), [broadcastGameId]));
  const [activeTab, setActiveTab] = useState<BroadcastTab>('q1');
  const broadcastNotes = useMemo(() => {
    if (!game || !latestBroadcast) {
      return { pregame: [], inGame: [], recap: [] };
    }
    return buildBroadcastCommentary(game as BroadcastCommentaryGame, {
      homeTeamId: latestBroadcast.gameResult.homeTeamId,
      awayTeamId: latestBroadcast.gameResult.awayTeamId,
      result: latestBroadcast.gameResult,
      seed: game.year * 100 + latestBroadcast.gameResult.week,
    });
  }, [game, latestBroadcast]);

  if (!latestBroadcast) {
    return (
      <EmptyState
        title="Game Broadcast"
        reason="No recent broadcast is available. Advance a game week to generate a broadcast recap and highlight reel."
        nextStep="Advance a game week to generate your first broadcast."
        actionLabel="Advance Week"
        actionRoute="/week-advance"
      />
    );
  }

  const { awayTeam, broadcast, gameResult, homeTeam } = latestBroadcast;
  const quarterIndex = activeTab === 'highlights' ? -1 : Number(activeTab.slice(1)) - 1;
  const drives = quarterIndex >= 0 ? broadcast.quarters[quarterIndex] ?? [] : [];
  const playerNameById = [...homeTeam.roster, ...awayTeam.roster].reduce<Record<string, string>>((map, player) => {
    map[player.id] = player.name;
    return map;
  }, {});

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Game Broadcast"
        subtitle={`Week ${gameResult.week} // ${awayTeam.city} at ${homeTeam.city}`}
        badges={(
          <>
            <PixelBadge variant="gold">{broadcast.broadcastNetwork}</PixelBadge>
            <PixelBadge variant={gameResult.overtime ? 'red' : 'cyan'}>
              {gameResult.overtime ? 'OVERTIME' : 'FINAL'}
            </PixelBadge>
          </>
        )}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
        gap: '12px',
        alignItems: 'center',
        padding: '18px',
        border: '3px solid var(--mfd-gold)',
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(0, 229, 255, 0.06))',
      }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{awayTeam.city}</div>
          <div style={{ fontFamily: 'var(--mfd-font-score, var(--mfd-font-display))', fontSize: '30px', color: 'var(--mfd-text)' }}>
            {awayTeam.name.toUpperCase()}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mfd-font-score, var(--mfd-font-display))', fontSize: '44px', color: 'var(--mfd-gold)', lineHeight: 1 }}>
          {gameResult.awayScore} - {gameResult.homeScore}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{homeTeam.city}</div>
          <div style={{ fontFamily: 'var(--mfd-font-score, var(--mfd-font-display))', fontSize: '30px', color: 'var(--mfd-text)' }}>
            {homeTeam.name.toUpperCase()}
          </div>
        </div>
      </div>

      {broadcastNotes.pregame.length > 0 || broadcastNotes.inGame.length > 0 ? (
        <PixelPanel title="Broadcast Notes" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...broadcastNotes.pregame, ...broadcastNotes.inGame].map((line) => (
              <div key={line} style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                {line}
              </div>
            ))}
          </div>
        </PixelPanel>
      ) : null}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <PixelButton
            key={tab.id}
            accent={activeTab === tab.id ? 'gold' : 'default'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </PixelButton>
        ))}
      </div>

      {activeTab === 'highlights' ? (
        <PixelPanel title="Highlights" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {broadcast.highlights.map((play, index) => (
              <div key={`${play.commentary}-${index}`} style={{
                borderLeft: `4px solid ${playAccent(play)}`,
                paddingLeft: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <PixelBadge variant={play.type === 'touchdown' ? 'green' : play.type === 'turnover' || play.type === 'sack' ? 'red' : play.isClutch ? 'cyan' : play.isBigPlay ? 'gold' : 'default'}>
                    {play.type.toUpperCase()}
                  </PixelBadge>
                  <PixelBadge variant="default">EXC {Math.round(play.excitement * 100)}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{play.commentary}</div>
              </div>
            ))}
          </div>
        </PixelPanel>
      ) : (
        <div style={autoGrid(320)}>
          {drives.length === 0 ? (
            <PixelPanel title={`Quarter ${quarterIndex + 1}`} accent="default">
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                No broadcast drives were reconstructed for this quarter.
              </div>
            </PixelPanel>
          ) : (
            drives.map((drive, index) => (
              <PixelPanel key={`${activeTab}-${index}`} title={`Drive ${index + 1}`} accent={drive.endResult === 'touchdown' ? 'green' : drive.endResult === 'turnover' ? 'red' : drive.endResult === 'fieldGoal' ? 'gold' : 'cyan'}>
                <details open={index === 0}>
                  <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <PixelBadge variant={drive.endResult === 'touchdown' ? 'green' : drive.endResult === 'turnover' ? 'red' : drive.endResult === 'fieldGoal' ? 'gold' : 'default'}>
                          {drive.endResult.toUpperCase()}
                        </PixelBadge>
                        <PixelBadge variant="default">{drive.yardsTotal} YDS</PixelBadge>
                        <PixelBadge variant="cyan">{Math.floor(drive.timeElapsed / 60)}:{String(drive.timeElapsed % 60).padStart(2, '0')}</PixelBadge>
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{drive.narrative}</div>
                    </div>
                  </summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    {drive.plays.map((play, playIndex) => (
                      <div key={`${index}-${playIndex}`} style={{
                        borderLeft: `4px solid ${playAccent(play)}`,
                        paddingLeft: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}>
                        <div style={{ ...pixelSm, color: playAccent(play) }}>
                          {play.type.toUpperCase()} // {play.yardsGained} YDS
                        </div>
                        <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{play.commentary}</div>
                      </div>
                    ))}
                  </div>
                </details>
              </PixelPanel>
            ))
          )}
        </div>
      )}

      <div style={autoGrid(260)}>
        <PixelPanel title="Momentum Swings" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {broadcast.momentumSwings.length === 0 ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No major momentum swings were tracked.</div>
            ) : (
              broadcast.momentumSwings.map((swing) => (
                <div key={`${swing.quarter}-${swing.play}`} style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                  Q{swing.quarter} // {swing.description}
                </div>
              ))
            )}
          </div>
        </PixelPanel>

        <PixelPanel title="MVP Radar" accent="gold">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {broadcast.mvpPlayerIds.length === 0 ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No standout performers recorded.</div>
            ) : (
              broadcast.mvpPlayerIds.map((playerId) => (
                <PixelBadge key={playerId} variant="gold">{playerNameById[playerId] ?? playerId}</PixelBadge>
              ))
            )}
          </div>
        </PixelPanel>
      </div>

      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', fontStyle: 'italic', lineHeight: 1.7 }}>
        {broadcast.finalNarrative}
      </div>
    </div>
  );
}
