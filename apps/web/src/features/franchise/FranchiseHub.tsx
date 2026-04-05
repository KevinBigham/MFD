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
  screenStackStyle,
} from '../shared/pixelUi';
import {
  DetailStripe,
  EraTimeline,
  FranchiseGauge,
  LegendCard,
  TrendSparkline,
} from './franchiseUi';

function navigateTo(path: string) {
  if (typeof window === 'undefined') return;
  window.location.hash = path;
}

function stadiumLevelLabel(level: 1 | 2 | 3): string {
  if (level === 3) return 'Elite';
  if (level === 2) return 'Modern';
  return 'Basic';
}

export function FranchiseHub() {
  const team = useGameStore(selectUserTeam);
  const dashboard = useGameStore(selectFranchiseDashboard);
  const eras = useGameStore(selectFranchiseEras);
  const offers = useGameStore(selectStadiumDealOffers);
  const canRelocate = useGameStore(selectCanRelocate);
  const { acceptNamingRights, upgradeStadium } = useGameStore((state) => state.actions);

  if (!team || !dashboard) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Your Franchise" subtitle="No franchise record is loaded." />
      </div>
    );
  }

  const activeDeal = dashboard.identity.stadiumDeal;
  const identity = dashboard.identity;

  return (
    <div style={screenStackStyle}>
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
      </div>
    </div>
  );
}
