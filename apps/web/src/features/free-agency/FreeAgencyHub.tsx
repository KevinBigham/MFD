import { useMemo, useState } from 'react';
import { Handshake, Coins, ArrowRight } from 'lucide-react';
import {
  MfdBadge,
  MfdPanel,
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

function actionButtonStyle(color: string) {
  return {
    padding: '6px 10px',
    borderRadius: 'var(--mfd-rad-md)',
    border: `1px solid ${color}`,
    background: 'transparent',
    color,
    cursor: 'pointer',
    fontFamily: 'var(--mfd-font-mono)',
    fontSize: '0.6875rem',
  } as const;
}

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--mfd-font-serif)',
          fontSize: '1.375rem',
          fontWeight: 700,
          color: 'var(--mfd-text)',
          margin: 0,
        }}>
          Free Agency Hub
        </h1>
        <p style={{
          fontFamily: 'var(--mfd-font-mono)',
          fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)',
          margin: '4px 0 0',
        }}>
          {phase === 'offseason' ? 'Re-sign your expiring core before they walk.' : `Round ${freeAgencyRound} of 3`}
        </p>
      </div>

      {phase === 'offseason' && (
        <MfdPanel title="Re-Sign Window" icon={<Handshake size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {expiringPlayers.length === 0 && (
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
                No expiring contracts on your roster.
              </div>
            )}

            {expiringPlayers.map((player) => {
              const decision = offseasonState?.reSignDecisions[player.id];
              if (!decision) return null;

              return (
                <div key={player.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr auto',
                  gap: 'var(--mfd-sp-md)',
                  alignItems: 'center',
                  padding: 'var(--mfd-sp-sm)',
                  border: '1px solid var(--mfd-border)',
                  borderRadius: 'var(--mfd-rad-md)',
                  background: 'var(--mfd-bg-2)',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>
                      {player.name} <span style={{ color: 'var(--mfd-text-dim)' }}>{player.pos} // {player.ovr} OVR</span>
                    </div>
                    <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)', marginTop: 4 }}>
                      Ask: {decision.askingPrice.years}Y / ${decision.askingPrice.salary}M + ${decision.askingPrice.signingBonus}M SB
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <MfdBadge variant={decision.status === 'accepted' ? 'success' : decision.status === 'declined' ? 'warning' : 'default'}>
                      {decision.status.toUpperCase()}
                    </MfdBadge>
                    {decision.lastOffer && (
                      <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.625rem', color: 'var(--mfd-text-dim)' }}>
                        Last: {decision.lastOffer.years}Y / ${decision.lastOffer.salary}M
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--mfd-sp-xs)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      disabled={pending === `${player.id}-value`}
                      style={actionButtonStyle('var(--mfd-cyan)')}
                      onClick={() => void handleOffer(`${player.id}-value`, async () => {
                        await submitReSignOffer(player.id, askBasedOffer(decision.askingPrice, 0.92));
                      })}
                    >
                      Value Offer
                    </button>
                    <button
                      disabled={pending === `${player.id}-match`}
                      style={actionButtonStyle('var(--mfd-gold)')}
                      onClick={() => void handleOffer(`${player.id}-match`, async () => {
                        await submitReSignOffer(player.id, decision.askingPrice);
                      })}
                    >
                      Match Ask
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 'var(--mfd-sp-md)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              disabled={pending === 'advance-offseason'}
              style={actionButtonStyle('var(--mfd-green)')}
              onClick={() => void handleOffer('advance-offseason', async () => {
                await advanceWeek();
              })}
            >
              Advance To Market <ArrowRight size={12} style={{ display: 'inline', marginLeft: 4 }} />
            </button>
          </div>
        </MfdPanel>
      )}

      {phase === 'free_agency' && (
        <MfdPanel title="Open Market" icon={<Coins size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
            {freeAgents.length === 0 && (
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
                No unsigned players remain this round.
              </div>
            )}

            {freeAgents.slice(0, 18).map((player) => {
              const currentBid = offseasonState?.freeAgencyBids[player.id]?.find((bid) => bid.teamId === userTeamId && bid.round === freeAgencyRound);
              return (
                <div key={player.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr auto',
                  gap: 'var(--mfd-sp-md)',
                  alignItems: 'center',
                  padding: 'var(--mfd-sp-sm)',
                  border: '1px solid var(--mfd-border)',
                  borderRadius: 'var(--mfd-rad-md)',
                  background: 'var(--mfd-bg-2)',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>
                      {player.name} <span style={{ color: 'var(--mfd-text-dim)' }}>{player.pos} // {player.ovr} OVR</span>
                    </div>
                    <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)', marginTop: 4 }}>
                      Age {player.age} // market score based on current round
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <MfdBadge variant={currentBid ? 'info' : 'default'}>
                      {currentBid ? 'BID PLACED' : 'OPEN'}
                    </MfdBadge>
                    {currentBid && (
                      <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.625rem', color: 'var(--mfd-text-dim)' }}>
                        {currentBid.years}Y / ${currentBid.salary}M
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--mfd-sp-xs)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      disabled={pending === `${player.id}-market`}
                      style={actionButtonStyle('var(--mfd-cyan)')}
                      onClick={() => void handleOffer(`${player.id}-market`, async () => {
                        await submitFreeAgentBid(player.id, marketOffer(player, 0.95));
                      })}
                    >
                      Market
                    </button>
                    <button
                      disabled={pending === `${player.id}-aggressive`}
                      style={actionButtonStyle('var(--mfd-gold)')}
                      onClick={() => void handleOffer(`${player.id}-aggressive`, async () => {
                        await submitFreeAgentBid(player.id, marketOffer(player, 1.1));
                      })}
                    >
                      Aggressive
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 'var(--mfd-sp-md)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              disabled={pending === 'resolve-fa'}
              style={actionButtonStyle('var(--mfd-green)')}
              onClick={() => void handleOffer('resolve-fa', async () => {
                await advanceWeek();
              })}
            >
              Resolve Round {freeAgencyRound}
            </button>
          </div>
        </MfdPanel>
      )}

      {phase !== 'offseason' && phase !== 'free_agency' && (
        <MfdPanel title="Market Status" icon={<Handshake size={14} />}>
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
            Free agency is only actionable during the re-sign window and market rounds. Current phase: {phase}.
          </div>
        </MfdPanel>
      )}
    </div>
  );
}
