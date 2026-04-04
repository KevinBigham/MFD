import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { PlayerRivalry, SocialPost } from '@mfd/engine';
import {
  selectAllPlayerRivalries,
  useGameStore,
} from '../../app/store/game-store';
import { PixelScreenHeader, PlayerNameLink, autoGrid, monoSm, pixelSm, screenStackStyle } from '../shared/pixelUi';

function tierAccent(tier: PlayerRivalry['tier']): 'cyan' | 'gold' | 'red' {
  if (tier === 'budding') return 'cyan';
  if (tier === 'heated') return 'gold';
  return 'red';
}

function intensityBar(intensity: number, tier: PlayerRivalry['tier']) {
  const color = tier === 'nemesis' ? 'var(--mfd-red)' : tier === 'heated' ? 'var(--mfd-gold)' : 'var(--mfd-cyan)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{
        height: '10px',
        border: '2px solid var(--mfd-border)',
        background: 'var(--mfd-bg-2)',
        overflow: 'hidden',
      }}
      >
        <div style={{ width: `${Math.max(0, Math.min(100, intensity))}%`, height: '100%', background: color }} />
      </div>
      <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{intensity}/100 intensity</span>
    </div>
  );
}

function rivalryPosts(feed: SocialPost[], rivalry: PlayerRivalry): SocialPost[] {
  const playerALast = rivalry.playerAName.split(' ').at(-1) ?? rivalry.playerAName;
  const playerBLast = rivalry.playerBName.split(' ').at(-1) ?? rivalry.playerBName;
  return feed
    .filter((post) => post.trigger === 'rivalry')
    .filter((post) => post.content.includes(playerALast) || post.content.includes(playerBLast))
    .slice(0, 2);
}

export function PlayerRivalries() {
  const rivalries = useGameStore(selectAllPlayerRivalries);
  const game = useGameStore((state) => state.game);

  if (!game) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Player Rivalries" subtitle="No franchise is loaded." />
      </div>
    );
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Player Rivalries"
        subtitle={`Year ${game.year} // league-wide personal grudges`}
        badges={(
          <>
            <PixelBadge variant="cyan">{rivalries.length} ACTIVE</PixelBadge>
            <PixelBadge variant="gold">MAX 10</PixelBadge>
          </>
        )}
      />

      {rivalries.length === 0 ? (
        <PixelPanel title="No Rivalries Yet" accent="cyan">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            No personal feuds have ignited yet. Multi-pick meltdowns and revenge sacks will surface here.
          </div>
        </PixelPanel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rivalries.map((rivalry) => {
            const teamA = game.teams[rivalry.teamAId];
            const teamB = game.teams[rivalry.teamBId];
            const posts = rivalryPosts(game.socialFeed ?? [], rivalry);
            return (
              <PixelPanel key={rivalry.id} title={`${rivalry.playerAName} vs ${rivalry.playerBName}`} accent={tierAccent(rivalry.tier)}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <PlayerNameLink playerId={rivalry.playerAId} name={rivalry.playerAName} style={{ ...monoSm }} />
                      <span style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>VS</span>
                      <PlayerNameLink playerId={rivalry.playerBId} name={rivalry.playerBName} style={{ ...monoSm }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelBadge variant={tierAccent(rivalry.tier)}>{rivalry.tier.toUpperCase()}</PixelBadge>
                      <PixelBadge variant="default">
                        {(teamA ? `${teamA.abbr}` : rivalry.teamAId)} / {(teamB ? `${teamB.abbr}` : rivalry.teamBId)}
                      </PixelBadge>
                    </div>
                  </div>

                  {intensityBar(rivalry.intensity, rivalry.tier)}

                  <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{rivalry.origin}</div>

                  <div style={autoGrid(240)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>HISTORY</div>
                      {rivalry.history.map((event, index) => (
                        <div key={`${rivalry.id}-${index}`} style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          padding: '8px 10px',
                          borderLeft: '3px solid var(--mfd-cyan)',
                          background: 'var(--mfd-bg-2)',
                        }}
                        >
                          <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                            Week {event.week}, {event.year}: {event.description}
                          </span>
                          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Intensity +{event.intensityDelta}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>TRASH TALK</div>
                      {posts.length > 0 ? posts.map((post) => (
                        <div key={post.id} style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          padding: '10px',
                          border: '2px solid var(--mfd-border)',
                          background: 'var(--mfd-bg-2)',
                        }}
                        >
                          <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{post.content}</span>
                          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{post.authorName}</span>
                        </div>
                      )) : (
                        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No quote on the wire this week.</div>
                      )}
                    </div>
                  </div>
                </div>
              </PixelPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
