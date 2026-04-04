import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { PixelBadge, PixelButton, PixelPanel, PixelTable } from '@mfd/design-system/components';
import type { EndorsementDeal, Player, Team } from '@mfd/engine';
import {
  selectActiveEndorsements,
  selectEndorsementOffers,
  selectEndorsementRevenue,
  selectPhase,
  selectUserTeam,
  useGameStore,
} from '../../app/store/game-store';
import { display, monoSm, PixelScreenHeader, PlayerNameLink, autoGrid, screenStackStyle } from '../shared/pixelUi';

function tierAccent(tier: EndorsementDeal['tier']): 'default' | 'cyan' | 'green' | 'gold' {
  if (tier === 'local') return 'default';
  if (tier === 'regional') return 'cyan';
  if (tier === 'national') return 'green';
  return 'gold';
}

function requirementStatus(player: Player | undefined, team: Team | null, deal: EndorsementDeal) {
  if (!player) return { label: 'missing player', ok: false };
  if (deal.requirement.type === 'min_ovr') {
    return { label: `OVR ${player.ovr}/${deal.requirement.value}`, ok: player.ovr >= deal.requirement.value };
  }
  if (deal.requirement.type === 'team_wins') {
    const wins = team?.wins ?? 0;
    return { label: `wins ${wins}/${deal.requirement.value}`, ok: wins >= deal.requirement.value };
  }
  if (deal.requirement.type === 'min_games') {
    const games = player.stats.gamesPlayed ?? 0;
    return { label: `games ${games}/${deal.requirement.value}`, ok: games >= deal.requirement.value };
  }
  return { label: 'no suspensions', ok: true };
}

interface ActiveDealRow {
  id: string;
  playerId: string;
  playerName: string;
  brandName: string;
  tier: EndorsementDeal['tier'];
  revenuePerYear: number;
  yearsRemaining: number;
  requirementLabel: string;
  requirementOk: boolean;
}

const dealColumns: ColumnDef<ActiveDealRow, unknown>[] = [
  {
    accessorKey: 'playerName',
    header: 'Player',
    cell: ({ row }) => <PlayerNameLink playerId={row.original.playerId} name={row.original.playerName} style={{ ...monoSm }} />,
  },
  { accessorKey: 'brandName', header: 'Brand' },
  {
    id: 'tier',
    header: 'Tier',
    cell: ({ row }) => <PixelBadge variant={tierAccent(row.original.tier)}>{row.original.tier.toUpperCase()}</PixelBadge>,
  },
  {
    id: 'revenue',
    header: 'Revenue / Yr',
    cell: ({ row }) => `$${row.original.revenuePerYear.toFixed(1)}M`,
  },
  { accessorKey: 'yearsRemaining', header: 'Years Left' },
  {
    id: 'status',
    header: 'Requirement',
    cell: ({ row }) => <PixelBadge variant={row.original.requirementOk ? 'green' : 'red'}>{row.original.requirementLabel}</PixelBadge>,
  },
];

export function EndorsementCenter() {
  const team = useGameStore(selectUserTeam);
  const activeDeals = useGameStore(selectActiveEndorsements);
  const pendingOffers = useGameStore(selectEndorsementOffers);
  const totalRevenue = useGameStore(selectEndorsementRevenue);
  const phase = useGameStore(selectPhase);
  const acceptEndorsement = useGameStore((state) => state.actions.acceptEndorsement);
  const declineEndorsement = useGameStore((state) => state.actions.declineEndorsement);
  const [pending, setPending] = useState<string | null>(null);

  const playerMap = useMemo(
    () => new Map((team?.roster ?? []).map((player) => [player.id, player])),
    [team],
  );
  const activeRows = useMemo<ActiveDealRow[]>(() => activeDeals.map((deal) => {
    const player = playerMap.get(deal.playerId);
    const status = requirementStatus(player, team, deal);
    return {
      id: deal.id,
      playerId: deal.playerId,
      playerName: player?.name ?? deal.playerId,
      brandName: deal.brandName,
      tier: deal.tier,
      revenuePerYear: deal.revenuePerYear,
      yearsRemaining: deal.yearsRemaining,
      requirementLabel: status.label,
      requirementOk: status.ok,
    };
  }), [activeDeals, playerMap, team]);

  if (!team) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Endorsement Center" subtitle="No franchise is loaded." />
      </div>
    );
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Endorsement Center"
        subtitle={`${team.city} ${team.name} // market ${team.franchiseIdentity.marketSize}`}
        badges={(
          <>
            <PixelBadge variant="gold">${totalRevenue.toFixed(1)}M / YR</PixelBadge>
            <PixelBadge variant="cyan">{activeDeals.length} ACTIVE DEALS</PixelBadge>
            {phase === 'offseason' ? <PixelBadge variant="green">{pendingOffers.length} OFFERS</PixelBadge> : null}
          </>
        )}
      />

      <PixelPanel title="Annual Endorsement Revenue" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ ...display, fontSize: '42px', color: 'var(--mfd-gold)', lineHeight: 1 }}>
            ${totalRevenue.toFixed(1)}M
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            Player endorsement money flowing through the franchise spotlight.
          </div>
        </div>
      </PixelPanel>

      <PixelPanel title="Active Deals" accent="cyan">
        {activeDeals.length > 0 ? (
          <PixelTable
            data={activeRows}
            columns={dealColumns}
            accent="cyan"
            density="compact"
          />
        ) : (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            Your players need to shine brighter. Endorsements come to 70+ OVR stars in good markets.
          </div>
        )}
      </PixelPanel>

      {phase === 'offseason' ? (
        <PixelPanel title="Pending Offers" accent="green">
          {pendingOffers.length > 0 ? (
            <div style={autoGrid(260)}>
              {pendingOffers.map((offer) => {
                const player = playerMap.get(offer.playerId);
                const status = requirementStatus(player, team, offer);
                return (
                  <div key={offer.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '12px',
                    border: '2px solid var(--mfd-green)',
                    background: 'var(--mfd-bg-2)',
                  }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                          {offer.brandName.toUpperCase()}
                        </span>
                        {player ? <PlayerNameLink playerId={player.id} name={player.name} ovr={player.ovr} style={{ ...monoSm }} /> : null}
                      </div>
                      <PixelBadge variant={tierAccent(offer.tier)}>{offer.tier.toUpperCase()}</PixelBadge>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelBadge variant="gold">${offer.revenuePerYear.toFixed(1)}M / YR</PixelBadge>
                      <PixelBadge variant="cyan">{offer.yearsTotal} YEARS</PixelBadge>
                      <PixelBadge variant={status.ok ? 'green' : 'red'}>{status.label}</PixelBadge>
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                      Morale bonus: +{offer.moraleBonus}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelButton
                        accent="green"
                        disabled={pending === offer.id}
                        onClick={() => {
                          setPending(offer.id);
                          void acceptEndorsement(offer.id).finally(() => setPending(null));
                        }}
                      >
                        {pending === offer.id ? 'Signing...' : 'Accept'}
                      </PixelButton>
                      <PixelButton
                        accent="default"
                        disabled={pending === `decline:${offer.id}`}
                        onClick={() => {
                          setPending(`decline:${offer.id}`);
                          void declineEndorsement(offer.id).finally(() => setPending(null));
                        }}
                      >
                        {pending === `decline:${offer.id}` ? 'Declining...' : 'Decline'}
                      </PixelButton>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No pending offers this offseason.</div>
          )}
        </PixelPanel>
      ) : null}
    </div>
  );
}
