import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
  PlayerNameLink,
  autoGrid,
  display,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';
import { playSound } from '../audio/AudioManager';

interface AgentSummary {
  id: string;
  name: string;
  style: 'hardball' | 'collaborative' | 'media_savvy' | 'old_school';
  demandMultiplier: number;
}

function scaleOffer(base: ContractOffer, multiplier: number): ContractOffer {
  return {
    years: base.years,
    salary: Math.round(base.salary * multiplier * 10) / 10,
    signingBonus: Math.round(base.signingBonus * multiplier * 10) / 10,
    guaranteed: Math.round(base.guaranteed * multiplier * 10) / 10,
  };
}

function agentStyleMultiplier(agent: AgentSummary | null): number {
  if (!agent) return 1;
  if (agent.style === 'hardball') return 1.18 * agent.demandMultiplier;
  if (agent.style === 'collaborative') return 0.95 * agent.demandMultiplier;
  if (agent.style === 'media_savvy') return 1.08 * agent.demandMultiplier;
  return agent.demandMultiplier;
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

function boardLabel(phase: string): string {
  return phase === 'free_agency' ? 'Live' : 'Prep';
}

export function FreeAgencyHub() {
  const navigate = useNavigate();
  const phase = useGameStore(selectPhase);
  const roster = useGameStore(selectRoster);
  const offseasonState = useGameStore(selectOffseasonState);
  const freeAgents = useGameStore(selectFreeAgentPlayers);
  const userTeamId = useGameStore(selectUserTeamId);
  const agents = useGameStore((state) => state.game?.agents ?? []);
  const { advanceWeek, submitFreeAgentBid, signStreetFreeAgent, negotiateContract } = useGameStore((s) => s.actions);
  const [pending, setPending] = useState<string | null>(null);
  const agentById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);

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
        <PixelMetricCard label="Target Board" value={boardLabel(phase)} accent="gold" detail="Use the FA targets route for watchlist intel" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PixelButton accent="cyan" onClick={() => { void navigate({ to: '/fa-targets' }); }}>
          Open FA Target Board
        </PixelButton>
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
                          <PlayerNameLink
                            playerId={player.id}
                            name={player.name.toUpperCase()}
                            ovr={player.ovr}
                            style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', lineHeight: 1 }}
                          />
                        </div>
                        <div style={{ ...monoSm, color: '#888', marginTop: '6px' }}>
                          {player.pos} // {player.ovr} OVR
                        </div>
                        <div style={{ ...monoSm, color: '#bbb', marginTop: '6px' }}>
                          Agent demand: {decision.agentDemand.years}Y / ${decision.agentDemand.salary}M + ${decision.agentDemand.signingBonus}M SB
                        </div>
                        <div style={{ ...monoSm, color: '#888', marginTop: '6px' }}>
                          Agent: {(player.agentId ? agentById.get(player.agentId)?.name : null) ?? 'Unassigned'} // {(player.agentId ? agentById.get(player.agentId)?.style : 'old_school')?.replaceAll('_', ' ')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <PixelBadge variant={decision.status === 'accepted' ? 'green' : decision.status === 'countered' ? 'gold' : decision.status === 'declined' ? 'red' : 'default'}>
                          {decision.status}
                        </PixelBadge>
                        {player.holdout ? <PixelBadge variant="red">Holdout</PixelBadge> : null}
                        {decision.patienceWeeksRemaining > 0 ? (
                          <PixelBadge variant="cyan">{`${decision.patienceWeeksRemaining}w patience`}</PixelBadge>
                        ) : null}
                        {decision.lastOffer ? (
                          <PixelBadge variant="cyan">
                            {decision.lastOffer.years}Y / ${decision.lastOffer.salary}M
                          </PixelBadge>
                        ) : null}
                      </div>
                    </div>

                    {decision.agentResponse ? (
                      <div style={{
                        padding: '10px',
                        border: '2px solid rgba(0, 229, 255, 0.28)',
                        background: 'rgba(0, 229, 255, 0.06)',
                        ...monoSm,
                        color: '#cfefff',
                        lineHeight: 1.6,
                      }}
                      >
                        {decision.agentResponse}
                      </div>
                    ) : null}

                    {decision.counterOffer ? (
                      <div style={{ ...monoSm, color: '#f4d35e' }}>
                        Counter: {decision.counterOffer.years}Y / ${decision.counterOffer.salary}M + ${decision.counterOffer.signingBonus}M SB
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelButton
                        accent="cyan"
                        disabled={pending === `${player.id}-value`}
                        onClick={() => void handleOffer(`${player.id}-value`, async () => {
                          await negotiateContract(player.id, scaleOffer(decision.agentDemand, 0.88));
                        })}
                      >
                        Open at 88%
                      </PixelButton>
                      <PixelButton
                        accent="gold"
                        disabled={pending === `${player.id}-match`}
                        onClick={() => void handleOffer(`${player.id}-match`, async () => {
                          await negotiateContract(player.id, decision.agentDemand);
                        })}
                      >
                        Meet Demand
                      </PixelButton>
                      {decision.counterOffer ? (
                        <PixelButton
                          accent="green"
                          disabled={pending === `${player.id}-counter`}
                          onClick={() => void handleOffer(`${player.id}-counter`, async () => {
                            await negotiateContract(player.id, decision.counterOffer!);
                          })}
                        >
                          Accept Counter
                        </PixelButton>
                      ) : null}
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
                playSound('week_advance_start', { debounceMs: 0, debounceKey: `free-agency:${phase}:market` });
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
                const agent = player.agentId ? agentById.get(player.agentId) as AgentSummary | undefined : undefined;
                const demand = marketOffer(player, agentStyleMultiplier(agent ?? null));
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
                          <PlayerNameLink
                            playerId={player.id}
                            name={player.name.toUpperCase()}
                            ovr={player.ovr}
                            style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', lineHeight: 1 }}
                          />
                        </div>
                        <div style={{ ...monoSm, color: '#888', marginTop: '6px' }}>
                          {player.pos} // {player.ovr} OVR // Age {player.age}
                        </div>
                        <div style={{ ...monoSm, color: '#bbb', marginTop: '6px' }}>
                          {agent?.name ?? 'Market rep'} // {agent?.style.replaceAll('_', ' ') ?? 'open market'} // Demand {demand.years}Y / ${demand.salary}M
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
                          await submitFreeAgentBid(player.id, scaleOffer(demand, 0.95));
                        })}
                      >
                        Market
                      </PixelButton>
                      <PixelButton
                        accent="gold"
                        disabled={pending === `${player.id}-aggressive`}
                        onClick={() => void handleOffer(`${player.id}-aggressive`, async () => {
                          await submitFreeAgentBid(player.id, scaleOffer(demand, 1.08));
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
                playSound('week_advance_start', { debounceMs: 0, debounceKey: `free-agency:${phase}:resolve` });
                await advanceWeek();
              })}
            >
              Resolve Round {freeAgencyRound}
            </PixelButton>
          </div>
        </PixelPanel>
      ) : null}

      {phase !== 'offseason' && phase !== 'free_agency' ? (
        <PixelPanel title="Street Free Agents" accent="cyan">
          {freeAgents.length === 0 ? (
            <div style={{ ...monoSm, color: '#999' }}>
              No unsigned players available.
            </div>
          ) : (
            <>
              <div style={{ ...monoSm, color: '#bbb', marginBottom: '12px' }}>
                Sign available free agents directly to your roster. No bidding — immediate signings.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {freeAgents
                  .sort((a, b) => b.ovr - a.ovr)
                  .slice(0, 20)
                  .map((player) => {
                    const demand = marketOffer(player, 1);
                    return (
                      <div key={player.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: '12px', padding: '10px', border: '3px solid var(--mfd-border)',
                        background: 'var(--mfd-bg-3)', flexWrap: 'wrap',
                      }}>
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <div style={{ ...display, fontSize: '18px', color: '#fff', lineHeight: 1 }}>
                            <PlayerNameLink
                              playerId={player.id}
                              name={player.name.toUpperCase()}
                              ovr={player.ovr}
                              style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '18px', lineHeight: 1 }}
                            />
                          </div>
                          <div style={{ ...monoSm, color: '#888', marginTop: '4px' }}>
                            {player.pos} // {player.ovr} OVR // Age {player.age}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <PixelBadge variant="default">{demand.years}Y / ${demand.salary}M</PixelBadge>
                          <PixelButton
                            accent="cyan"
                            disabled={pending === `${player.id}-street`}
                            onClick={() => void handleOffer(`${player.id}-street`, async () => {
                              await signStreetFreeAgent(player.id, demand);
                            })}
                          >
                            Sign
                          </PixelButton>
                          <PixelButton
                            accent="gold"
                            disabled={pending === `${player.id}-street-overpay`}
                            onClick={() => void handleOffer(`${player.id}-street-overpay`, async () => {
                              await signStreetFreeAgent(player.id, scaleOffer(demand, 1.15));
                            })}
                          >
                            Overpay
                          </PixelButton>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </PixelPanel>
      ) : null}
    </div>
  );
}
