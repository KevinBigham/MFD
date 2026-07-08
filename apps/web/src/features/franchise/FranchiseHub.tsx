import { useState } from 'react';
import { buildCoachingLegacy, STADIUM_UPGRADE_COSTS, type StadiumDeal } from '@mfd/engine';
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
  CommandCallout,
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
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
import { ContinuityMeter } from './ContinuityMeter';
import { RivalryHeatMap } from './RivalryHeatMap';
import { PowerRankingsTicker } from '../newsroom/PowerRankingsTicker';
import { FRANCHISE_HUB_ROUTE_ACTIONS } from './franchiseHubRoutes';

const DOCTRINE_ACCENTS = {
  culture: 'green',
  strategy: 'gold',
  reputation: 'cyan',
  personnel: 'default',
} as const;

type FranchiseActionReceiptKind = 'stadium_upgrade' | 'naming_rights';

export interface FranchiseActionReceipt {
  title: string;
  kind: FranchiseActionReceiptKind;
  target: string;
  result: string;
  detail: string;
  source: string;
  stateTouched: string;
  accent: 'gold' | 'green';
}

interface StadiumUpgradeReceiptInput {
  type: 'stadium_upgrade';
  teamName: string;
  stadiumName: string;
  levelBefore: 1 | 2 | 3;
  capSpaceBefore: number;
}

interface NamingRightsReceiptInput {
  type: 'naming_rights';
  teamName: string;
  deal: StadiumDeal;
  dealIndex: number;
}

type FranchiseActionReceiptInput = StadiumUpgradeReceiptInput | NamingRightsReceiptInput;

function stadiumLevelLabel(level: 1 | 2 | 3): string {
  if (level === 3) return 'Elite';
  if (level === 2) return 'Modern';
  return 'Basic';
}

function stadiumUpgradeCost(level: 1 | 2 | 3): number | null {
  if (level === 1) return STADIUM_UPGRADE_COSTS[1];
  if (level === 2) return STADIUM_UPGRADE_COSTS[2];
  return null;
}

export function buildFranchiseActionReceipt(input: FranchiseActionReceiptInput): FranchiseActionReceipt {
  if (input.type === 'stadium_upgrade') {
    const nextLevel = input.levelBefore < 3 ? input.levelBefore + 1 : input.levelBefore;
    const cost = stadiumUpgradeCost(input.levelBefore);
    const costLabel = cost === null ? 'max level' : `$${cost.toFixed(1)}M`;
    return {
      title: 'Stadium Upgrade Receipt',
      kind: 'stadium_upgrade',
      target: `${input.teamName} // ${input.stadiumName}`,
      result: `Upgrade request resolved for level ${input.levelBefore} -> ${nextLevel}`,
      detail: `Pre-action cap space $${input.capSpaceBefore.toFixed(1)}M; the store applies the upgrade only when the engine cost check clears ${costLabel}.`,
      source: 'actions.upgradeStadium -> game-store upgradeStadium -> engine upgradeStadium; this on-screen confirmation is not saved separately.',
      stateTouched: 'When accepted by the store, team.franchiseIdentity stadium level/prestige and franchise cap totals are updated; no games, outcome rerolls, routes, or save-schema shape changed.',
      accent: 'gold',
    };
  }

  return {
    title: 'Naming Rights Receipt',
    kind: 'naming_rights',
    target: `${input.teamName} // offer ${input.dealIndex + 1}`,
    result: `${input.deal.sponsorName} accepted for ${input.deal.yearsTotal} years`,
    detail: `$${input.deal.revenuePerYear.toFixed(1)}M per year // +${input.deal.prestigeBonus} prestige // ${input.deal.yearsRemaining} years remaining at signing.`,
    source: 'actions.acceptNamingRights -> game-store acceptNamingRights -> engine acceptStadiumDeal; this on-screen confirmation is not saved separately.',
    stateTouched: 'When the deal index is valid, team.franchiseIdentity stadiumDeal/stadiumName/prestige are updated and game.stadiumDealOffers is cleared; no games, outcome rerolls, routes, or save-schema shape changed.',
    accent: 'green',
  };
}

export function FranchiseActionReceiptPanel({ receipt }: { receipt: FranchiseActionReceipt }) {
  return (
    <PixelPanel title={receipt.title} accent={receipt.accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={receipt.accent}>{receipt.kind.replace(/_/g, ' ').toUpperCase()}</PixelBadge>
          <PixelBadge variant="cyan">ON-SCREEN CONFIRMATION</PixelBadge>
        </div>
        <DetailStripe label="Action" value={receipt.target} accent={receipt.accent} />
        <DetailStripe label="Result" value={receipt.result} accent="cyan" />
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>
          {receipt.detail}
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Source: {receipt.source}
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Changed now: {receipt.stateTouched}
        </div>
      </div>
    </PixelPanel>
  );
}

function FranchiseSourcesPanel() {
  return (
    <PixelPanel title="Franchise Sources" accent="cyan">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="cyan">DASHBOARD READ MODEL</PixelBadge>
          <PixelBadge variant="gold">ACTION BUTTONS SEPARATE</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>
          This hub reads <strong>selectFranchiseDashboard</strong>, <strong>selectUserTeam</strong>, <strong>selectFranchiseEras</strong>, <strong>selectStadiumDealOffers</strong>, and <strong>selectCanRelocate</strong> to project saved identity, history, eras, stadium offers, and relocation eligibility.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          The surrounding modules stay read-only: Power Rankings, Homegrown, Continuity, Rivalries, Legends, Doctrines, and <strong>buildCoachingLegacy</strong> only explain existing saved or derived context while this screen renders.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          The write paths remain explicit buttons: <strong>upgradeStadium</strong>, <strong>acceptNamingRights</strong>, and relocation through <strong>/relocate</strong>. Opening Franchise Hub does not upgrade the stadium, accept naming rights, relocate, award doctrines, detect eras, update franchise history, change the live save, or play scheduled games.
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
          Stadium and naming-rights buttons show an on-screen confirmation after the saved action resolves. It explains what changed, but it is not saved as a separate log.
        </div>
      </div>
    </PixelPanel>
  );
}

export function FranchiseHub() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const dashboard = useGameStore(selectFranchiseDashboard);
  const eras = useGameStore(selectFranchiseEras);
  const offers = useGameStore(selectStadiumDealOffers);
  const canRelocate = useGameStore(selectCanRelocate);
  const { acceptNamingRights, upgradeStadium } = useGameStore((state) => state.actions);
  const [actionReceipt, setActionReceipt] = useState<FranchiseActionReceipt | null>(null);

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
  const teamName = `${team.city} ${team.name}`;

  const handleUpgradeStadium = async () => {
    const receipt = buildFranchiseActionReceipt({
      type: 'stadium_upgrade',
      teamName,
      stadiumName: identity.stadiumName,
      levelBefore: identity.stadiumLevel,
      capSpaceBefore: team.capSpace,
    });
    await upgradeStadium();
    setActionReceipt(receipt);
  };

  const handleAcceptNamingRights = async (deal: StadiumDeal, index: number) => {
    const receipt = buildFranchiseActionReceipt({
      type: 'naming_rights',
      teamName,
      deal,
      dealIndex: index,
    });
    await acceptNamingRights(index);
    setActionReceipt(receipt);
  };

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

      <PowerRankingsTicker limit={12} />
      <CommandCallout
        eyebrow="Dynasty Desk"
        title={dashboard.championships > 0 ? 'Protect the standard' : 'Write the first defining chapter'}
        body={`Current mark ${dashboard.allTimeRecord.wins}-${dashboard.allTimeRecord.losses}${dashboard.allTimeRecord.ties ? `-${dashboard.allTimeRecord.ties}` : ''}. ${dashboard.currentEra.description} Next useful move: secure the venue, review the archive, or turn this roster core into a season milestone.`}
        accent="gold"
        meta={(
          <>
            <PixelBadge variant="cyan">{dashboard.currentEra.name}</PixelBadge>
            <PixelBadge variant={activeDeal ? 'green' : 'red'}>{activeDeal ? `${activeDeal.yearsRemaining}Y stadium deal` : 'naming rights open'}</PixelBadge>
          </>
        )}
        actions={[
          { label: 'Chronicle', accent: 'gold', onClick: FRANCHISE_HUB_ROUTE_ACTIONS.chronicle },
          { label: 'GM Career', accent: 'cyan', onClick: FRANCHISE_HUB_ROUTE_ACTIONS.career },
        ]}
      />
      <FranchiseSourcesPanel />
      {actionReceipt ? <FranchiseActionReceiptPanel receipt={actionReceipt} /> : null}
      <HomegrownMeter game={game} />
      <ContinuityMeter game={game} />
      <RivalryHeatMap />

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
              <PixelButton accent="gold" disabled={identity.stadiumLevel >= 3} onClick={() => { void handleUpgradeStadium(); }}>
                Upgrade Stadium
              </PixelButton>
              <PixelButton accent={canRelocate ? 'cyan' : 'default'} disabled={!canRelocate} onClick={FRANCHISE_HUB_ROUTE_ACTIONS.relocate}>
                Relocate Franchise
              </PixelButton>
              <PixelButton accent="green" onClick={FRANCHISE_HUB_ROUTE_ACTIONS.legends}>
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
                    <PixelButton accent="green" onClick={() => { void handleAcceptNamingRights(deal, index); }}>
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
            <PixelButton accent="gold" onClick={FRANCHISE_HUB_ROUTE_ACTIONS.career}>
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
            <PixelButton accent="green" onClick={FRANCHISE_HUB_ROUTE_ACTIONS.coachingTree}>
              View Coaching Tree
            </PixelButton>
          </div>
        </PixelPanel>

        <PixelPanel title="Hall of Fame" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Every Hall of Famer you ever developed, across every dynasty you ever coached.
            </div>
            <PixelButton accent="red" onClick={FRANCHISE_HUB_ROUTE_ACTIONS.hall}>
              Open Hall of Fame
            </PixelButton>
          </div>
        </PixelPanel>

        <PixelPanel title="Playoff Lore" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Every postseason moment, across every dynasty.
            </div>
            <PixelButton accent="cyan" onClick={FRANCHISE_HUB_ROUTE_ACTIONS.playoffLore}>
              Open Playoff Lore
            </PixelButton>
          </div>
        </PixelPanel>

        <PixelPanel title="Dynasty Chronicle" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Franchise history, Hall of Fame, scrapbook notes, and playoff lore in one chronological scroll.
            </div>
            <PixelButton accent="gold" onClick={FRANCHISE_HUB_ROUTE_ACTIONS.chronicle}>
              Open Dynasty Chronicle
            </PixelButton>
          </div>
        </PixelPanel>

        <PixelPanel title="Dynasty Scrapbook" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Every completed season becomes a scrapbook page in your dynasty archive.
            </div>
            <PixelButton accent="cyan" onClick={FRANCHISE_HUB_ROUTE_ACTIONS.scrapbook}>
              View Dynasty Scrapbook
            </PixelButton>
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
