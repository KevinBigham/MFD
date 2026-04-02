import { useMemo, useState } from 'react';
import {
  PixelBadge, PixelButton, PixelPanel,
} from '@mfd/design-system/components';
import type { ContractOffer, Player } from '@mfd/engine';
import {
  selectFreeAgentPlayers,
  selectOffseasonState,
  selectPhase,
  selectRoster,
  selectUserTeamId,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';

function askBasedOffer(base: ContractOffer, multiplier: number): ContractOffer {
  return {
    years: base.years,
    salary: Math.round(base.salary * multiplier * 10) / 10,
    signingBonus: Math.round(base.signingBonus * multiplier * 10) / 10,
    guaranteed: Math.round(base.guaranteed * multiplier * 10) / 10,
  };
}

function marketOffer(player: Player, multiplier: number): ContractOffer {
  const years = player.age <= 25 ? 4 : player.age <= 29 ? 3 : 2;
  const salary = Math.round(Math.max(1.5, (player.ovr / 8.5) * multiplier) * 10) / 10;
  return {
    years,
    salary,
    signingBonus: Math.round(salary * years * 0.25 * 10) / 10,
    guaranteed: Math.round(salary * Math.min(years, 2) * multiplier * 10) / 10,
  };
}

export function FreeAgencyHub() {
  const phase = useGameStore(selectPhase);
  const roster = useGameStore(selectRoster);
  const offseasonState = useGameStore(selectOffseasonState);
  const freeAgents = useGameStore(selectFreeAgentPlayers);
  const userTeamId = useGameStore(selectUserTeamId);
  const { advanceWeek, submitFreeAgentBid, submitReSignOffer } = useGameStore((s) => s.actions);
  const [pending, setPending] = useState<string | null>(null);

  const expiringPlayers = useMemo(() => {
    if (!offseasonState) return [];
    const ids = new Set(offseasonState.expiringPlayerIds);
    return roster.filter((player) => ids.has(player.id));
  }, [offseasonState, roster]);

  const handleOffer = async (key: string, run: () => Promise<void>) => {
    setPending(key);
    try {
      await run();
    } finally {
      setPending(null);
    }
  };

  const freeAgencyRound = offseasonState?.round ?? 1;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Free Agency Hub"
        subtitle={phase === 'offseason' ? 'Re-sign your expiring core before they walk.' : `Round ${freeAgencyRound} of 3`}
        badges={(
          <>
            <PixelBadge variant={phase === 'offseason' ? 'gold' : 'cyan'}>{phase.replace(/_/g, ' ')}</PixelBadge>
            <PixelBadge variant="green">Round {freeAgencyRound}</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Expiring Deals" value={expiringPlayers.length} accent="gold" detail="Players up for renewal" />
        <PixelMetricCard label="Open Market" value={freeAgents.length} accent="cyan" detail="Unsigned players available" />
        <PixelMetricCard label="Round" value={freeAgencyRound} accent="green" detail="Current market cycle" />
      </div>

      {phase === 'offseason' ? (
        <PixelPanel title="Re-Sign Window" accent="gold">
          {expiringPlayers.length === 0 ? (
            <div style={{ ...monoSm, color: '#999' }}>
              No expiring contracts on your roster.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {expiringPlayers.map((player) => {
                const decision = offseasonState?.reSignDecisions[player.id];
                if (!decision) return null;

                return (
                  <div key={player.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '10px',
                    border: '3px solid var(--mfd-gold)',
                    background: 'var(--mfd-bg-3)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                          {player.name.toUpperCase()}
                        </div>
                        <div style={{ ...monoSm, color: '#888', marginTop: '6px' }}>
                          {player.pos} // {player.ovr} OVR
                        </div>
                        <div style={{ ...monoSm, color: '#bbb', marginTop: '6px' }}>
                          Ask: {decision.askingPrice.years}Y / ${decision.askingPrice.salary}M + ${decision.askingPrice.signingBonus}M SB
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <PixelBadge variant={decision.status === 'accepted' ? 'green' : decision.status === 'declined' ? 'red' : 'default'}>
                          {decision.status}
                        </PixelBadge>
                        {decision.lastOffer ? (
                          <PixelBadge variant="cyan">
                            {decision.lastOffer.years}Y / ${decision.lastOffer.salary}M
                          </PixelBadge>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelButton
                        accent="cyan"
                        disabled={pending === `${player.id}-value`}
                        onClick={() => void handleOffer(`${player.id}-value`, async () => {
                          await submitReSignOffer(player.id, askBasedOffer(decision.askingPrice, 0.92));
                        })}
                      >
                        Value Offer
                      </PixelButton>
                      <PixelButton
                        accent="gold"
                        disabled={pending === `${player.id}-match`}
                        onClick={() => void handleOffer(`${player.id}-match`, async () => {
                          await submitReSignOffer(player.id, decision.askingPrice);
                        })}
                      >
                        Match Ask
                      </PixelButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <PixelButton
              accent="green"
              disabled={pending === 'advance-offseason'}
              onClick={() => void handleOffer('advance-offseason', async () => {
                await advanceWeek();
              })}
            >
              Advance To Market
            </PixelButton>
          </div>
        </PixelPanel>
      ) : null}

      {phase === 'free_agency' ? (
        <PixelPanel title="Open Market" accent="cyan">
          {freeAgents.length === 0 ? (
            <div style={{ ...monoSm, color: '#999' }}>
              No unsigned players remain this round.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {freeAgents.slice(0, 18).map((player) => {
                const currentBid = offseasonState?.freeAgencyBids[player.id]?.find((bid) => bid.teamId === userTeamId && bid.round === freeAgencyRound);
                return (
                  <div key={player.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '10px',
                    border: '3px solid var(--mfd-cyan)',
                    background: 'var(--mfd-bg-3)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                          {player.name.toUpperCase()}
                        </div>
                        <div style={{ ...monoSm, color: '#888', marginTop: '6px' }}>
                          {player.pos} // {player.ovr} OVR // Age {player.age}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <PixelBadge variant={currentBid ? 'cyan' : 'default'}>
                          {currentBid ? 'Bid Placed' : 'Open'}
                        </PixelBadge>
                        {currentBid ? <PixelBadge variant="gold">{currentBid.years}Y / ${currentBid.salary}M</PixelBadge> : null}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelButton
                        accent="cyan"
                        disabled={pending === `${player.id}-market`}
                        onClick={() => void handleOffer(`${player.id}-market`, async () => {
                          await submitFreeAgentBid(player.id, marketOffer(player, 0.95));
                        })}
                      >
                        Market
                      </PixelButton>
                      <PixelButton
                        accent="gold"
                        disabled={pending === `${player.id}-aggressive`}
                        onClick={() => void handleOffer(`${player.id}-aggressive`, async () => {
                          await submitFreeAgentBid(player.id, marketOffer(player, 1.1));
                        })}
                      >
                        Aggressive
                      </PixelButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <PixelButton
              accent="green"
              disabled={pending === 'resolve-fa'}
              onClick={() => void handleOffer('resolve-fa', async () => {
                await advanceWeek();
              })}
            >
              Resolve Round {freeAgencyRound}
            </PixelButton>
          </div>
        </PixelPanel>
      ) : null}

      {phase !== 'offseason' && phase !== 'free_agency' ? (
        <PixelPanel title="Market Status" accent="default">
          <div style={{ ...monoSm, color: '#999' }}>
            Free agency is only actionable during the re-sign window and market rounds. Current phase: {phase}.
          </div>
        </PixelPanel>
      ) : null}
    </div>
  );
}
