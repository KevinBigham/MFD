import { buildCoachingLegacy } from '@mfd/engine';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import {
  useGameStore,
  selectCanRelocate,
  selectFranchiseDashboard,
  selectFranchiseEras,
  selectStadiumDealOffers,
  selectUserTeam,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  navigateTo,
  screenStackStyle,
  teamThemeVars,
} from '../shared/pixelUi';
import {
  DetailStripe,
  EraTimeline,
  FranchiseGauge,
  LegendCard,
  TrendSparkline,
} from './franchiseUi';
import { HomegrownMeter } from './HomegrownMeter';

const DOCTRINE_ACCENTS = {
  culture: 'green',
  strategy: 'gold',
  reputation: 'cyan',
  personnel: 'default',
} as const;

function stadiumLevelLabel(level: 1 | 2 | 3): string {
  if (level === 3) return 'Elite';
  if (level === 2) return 'Modern';
  return 'Basic';
}

export function FranchiseHub() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const dashboard = useGameStore(selectFranchiseDashboard);
  const eras = useGameStore(selectFranchiseEras);
  const offers = useGameStore(selectStadiumDealOffers);
  const canRelocate = useGameStore(selectCanRelocate);
  const { acceptNamingRights, upgradeStadium } = useGameStore((state) => state.actions);

  if (!team || !dashboard) {
    return (
      <div style={{
        ...screenStackStyle,
        ...teamThemeVars(team?.id),
        borderTop: '3px solid var(--mfd-team-primary)',
        paddingTop: '8px',
      }}
      >
        <PixelScreenHeader title="Your Franchise" subtitle="No franchise record is loaded." />
      </div>
    );
  }

  const activeDeal = dashboard.identity.stadiumDeal;
  const identity = dashboard.identity;
  const doctrineGroups = dashboard.doctrineGroups ?? {
    culture: [],
    strategy: [],
    reputation: [],
    personnel: [],
  };
  const hasDoctrines = dashboard.earnedDoctrines.length > 0;
  const coachingDepth = game && team?.staff?.hc ? buildCoachingLegacy(game, team.staff.hc.id).treeDepth : 0;

  return (
    <div style={{
      ...screenStackStyle,
      ...teamThemeVars(team.id),
      borderTop: '3px solid var(--mfd-team-primary)',
      paddingTop: '8px',
    }}
    >
      <PixelScreenHeader
        title="Your Franchise"
        subtitle={`${team.city} ${team.name} // ${identity.stadiumName} // ${dashboard.currentEra.name}`}
        badges={(
          <>
            <PixelBadge variant="cyan">{identity.marketSize.toUpperCase()} MARKET</PixelBadge>
            <PixelBadge variant="gold">STADIUM LVL {identity.stadiumLevel}</PixelBadge>
          </>
        )}
      />

      <HomegrownMeter game={game} />

      <div style={autoGrid(220)}>
        <PixelMetricCard
          label="Franchise Mark"
          value={`${dashboard.allTimeRecord.wins}-${dashboard.allTimeRecord.losses}${dashboard.allTimeRecord.ties ? `-${dashboard.allTimeRecord.ties}` : ''}`}
          accent="cyan"
          detail={`Win pct ${(dashboard.allTimeRecord.winPct * 100).toFixed(1)}% // ${dashboard.championships} titles`}
        />
        <PixelMetricCard
          label="Current Era"
          value={dashboard.currentEra.name}
          accent="gold"
          detail={dashboard.currentEra.description}
        />
        <PixelMetricCard
          label="Playoff Streak"
          value={dashboard.activeStreaks.playoffStreak}
          accent={dashboard.activeStreaks.playoffStreak > 0 ? 'green' : 'default'}
          detail={`${dashboard.playoffAppearances} total playoff appearances`}
        />
        <PixelMetricCard
          label="Stadium Deal"
          value={activeDeal ? `${activeDeal.yearsRemaining}Y` : 'OPEN'}
          accent={dashboard.stadiumDealStatus === 'expiring' ? 'gold' : activeDeal ? 'green' : 'red'}
          detail={activeDeal ? `${activeDeal.sponsorName} // $${activeDeal.revenuePerYear.toFixed(1)}M/yr` : 'Naming rights available'}
        />
      </div>

      <div style={autoGrid(220)}>
        <FranchiseGauge label="Fanbase" value={identity.fanbase} accent="green" detail="Loyalty, noise, and offseason pull." />
        <FranchiseGauge label="Prestige" value={identity.prestige} accent="gold" detail="Brand gravity with players and owners." />
        <FranchiseGauge label="Attendance" value={identity.attendance} accent="cyan" detail="Current gate fill as a percent of capacity." />
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Franchise Core" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...display, fontSize: '30px', color: 'var(--mfd-text)', lineHeight: 1 }}>
              {team.city.toUpperCase()} {team.name.toUpperCase()}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              {identity.stadiumName} anchors the brand while market modifier {identity.marketModifier.toFixed(2)} shapes franchise economics.
            </div>
            <DetailStripe label="Championships" value={dashboard.championships} accent="gold" />
            <DetailStripe label="Winning Streaks" value={dashboard.activeStreaks.winningSeasons} accent="green" />
            <DetailStripe label="Losing Slide" value={dashboard.activeStreaks.losingSeasons} accent="red" />
          </div>
        </PixelPanel>

        <PixelPanel title="Era Timeline" accent="gold">
          <EraTimeline eras={eras} />
        </PixelPanel>
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Fanbase Trend" accent="green">
          <TrendSparkline values={dashboard.fanbaseTrend} accent="green" />
        </PixelPanel>
        <PixelPanel title="Prestige Trend" accent="gold">
          <TrendSparkline values={dashboard.prestigeTrend} accent="gold" />
        </PixelPanel>
      </div>

      <PixelPanel title="Franchise Legends" accent="gold">
        <div style={autoGrid(260)}>
          {dashboard.topLegends.map((legend, index) => (
            <LegendCard key={legend.playerId} legend={legend} index={index} />
          ))}
        </div>
      </PixelPanel>

      <PixelPanel title="Franchise Doctrines" accent="cyan">
        {!hasDoctrines ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No doctrines unlocked yet. Win defining seasons and shape the franchise identity to earn permanent philosophies.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(Object.entries(doctrineGroups) as Array<[keyof typeof doctrineGroups, typeof dashboard.earnedDoctrines]>)
              .filter(([, doctrines]) => doctrines.length > 0)
              .map(([category, doctrines]) => (
                <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelBadge variant={DOCTRINE_ACCENTS[category]}>{category.toUpperCase()}</PixelBadge>
                    <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{doctrines.length} unlocked</span>
                  </div>
                  <div style={autoGrid(260)}>
                    {doctrines.map((doctrine) => (
                      <div
                        key={doctrine.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          padding: '10px',
                          border: '2px solid var(--mfd-border)',
                          background: 'var(--mfd-bg-2)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                            {doctrine.name}
                          </div>
                          <PixelBadge variant={DOCTRINE_ACCENTS[category]}>{category.toUpperCase()}</PixelBadge>
                        </div>
                        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                          {doctrine.description}
                        </div>
                        <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>
                          Origin: {doctrine.origin}
                        </div>
                        <div style={{ ...monoSm, color: 'var(--mfd-green)' }}>
                          Bonus: {doctrine.bonus}
                        </div>
                        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                          Earned Y{doctrine.earnedYear} // W{doctrine.earnedWeek}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </PixelPanel>

      <div style={autoGrid(320)}>
        <PixelPanel title="Stadium" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <DetailStripe label="Venue" value={identity.stadiumName} accent="cyan" />
            <DetailStripe label="Level" value={stadiumLevelLabel(identity.stadiumLevel)} accent="gold" />
            <DetailStripe
              label="Deal Status"
              value={activeDeal ? `${activeDeal.sponsorName} (${activeDeal.yearsRemaining}Y)` : 'Unsigned'}
              accent={activeDeal ? 'green' : 'red'}
            />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <PixelButton accent="gold" disabled={identity.stadiumLevel >= 3} onClick={() => { void upgradeStadium(); }}>
                Upgrade Stadium
              </PixelButton>
              <PixelButton accent={canRelocate ? 'cyan' : 'default'} disabled={!canRelocate} onClick={() => navigateTo('/relocate')}>
                Relocate Franchise
              </PixelButton>
              <PixelButton accent="green" onClick={() => navigateTo('/legends')}>
                View All-Decade Team
              </PixelButton>
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="Naming Rights Offers" accent="green">
          {offers.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              No fresh offers are on the desk. Advance into the next offseason to reopen the market.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {offers.map((deal, index) => (
                <div key={`${deal.sponsorName}-${index}`} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '10px',
                  border: '2px solid var(--mfd-green)',
                  background: 'var(--mfd-bg-2)',
                }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                        {deal.sponsorName.toUpperCase()}
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
                        ${deal.revenuePerYear.toFixed(1)}M / year // {deal.yearsTotal} years // +{deal.prestigeBonus} prestige
                      </div>
                    </div>
                    <PixelButton accent="green" onClick={() => { void acceptNamingRights(index); }}>
                      Accept
                    </PixelButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="GM Career" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Every dynasty you coach lives here, even after wipes and fresh starts.
            </div>
            <PixelButton accent="gold" onClick={() => navigateTo('/franchise/career')}>
              View GM Career
            </PixelButton>
          </div>
        </PixelPanel>

        <PixelPanel title="Coaching Tree" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Follow your head coach&apos;s lineage and see how far the tree reaches across the league.
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-green)' }}>
              Depth: {coachingDepth}
            </div>
            <PixelButton accent="green" onClick={() => navigateTo('/coaching/tree')}>
              View Coaching Tree
            </PixelButton>
          </div>
        </PixelPanel>

        <PixelPanel title="Hall of Fame" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Every Hall of Famer you ever developed, across every dynasty you ever coached.
            </div>
            <PixelButton accent="red" onClick={() => navigateTo('/franchise/hall')}>
              Open Hall of Fame
            </PixelButton>
          </div>
        </PixelPanel>

        <PixelPanel title="Playoff Lore" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Every postseason moment, across every dynasty.
            </div>
            <PixelButton accent="cyan" onClick={() => navigateTo('/franchise/playoff-lore')}>
              Open Playoff Lore
            </PixelButton>
          </div>
        </PixelPanel>

        <PixelPanel title="Dynasty Scrapbook" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Every completed season becomes a scrapbook page in your dynasty archive.
            </div>
            <PixelButton accent="cyan" onClick={() => navigateTo('/franchise/scrapbook')}>
              View Dynasty Scrapbook
            </PixelButton>
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
