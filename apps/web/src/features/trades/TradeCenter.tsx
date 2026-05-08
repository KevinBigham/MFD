import { useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import {
  PixelBadge, PixelButton, PixelConsequenceList, PixelNav, PixelPanel, PixelProgressBar, PixelSelect,
} from '@mfd/design-system/components';
import {
  calcPickValue,
  calcPlayerValue,
  getTradeTargets,
  getTradeableAssets,
  type DraftPick,
  type Player,
  type TradeOfferAsset,
} from '@mfd/engine';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import {
  selectActiveProposals,
  selectPhase,
  selectTradeDeadlineState,
  selectTradeOffers,
  selectTradeSuggestions,
  selectUserTeam,
  selectWeek,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  navigateTo,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';
import { TradeFinder } from './TradeFinder';
import { buildDecisionImpactExplanation, decisionImpactToConsequenceItems } from '../companion/decisionImpact';

function offerAccent(status: string): 'cyan' | 'green' | 'gold' | 'red' {
  if (status === 'accepted') return 'green';
  if (status === 'rejected') return 'red';
  if (status === 'countered') return 'gold';
  return 'cyan';
}

function assetKey(asset: TradeOfferAsset): string {
  return asset.type === 'player' ? `player:${asset.playerId}` : `pick:${asset.pickId}`;
}

function pickIdFor(teamId: string, pick: DraftPick): string {
  return `${pick.currentTeamId}-${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}`;
}

function fromPlayer(teamId: string, player: Player): TradeOfferAsset {
  return {
    type: 'player',
    teamId,
    playerId: player.id,
    pickId: null,
    description: player.name,
  };
}

function fromPick(teamId: string, pick: DraftPick): TradeOfferAsset {
  return {
    type: 'pick',
    teamId,
    playerId: null,
    pickId: pickIdFor(teamId, pick),
    description: `Round ${pick.round} pick`,
  };
}

function findPickByAsset(game: NonNullable<ReturnType<typeof useGameStore.getState>['game']>, asset: TradeOfferAsset): DraftPick | null {
  if (!asset.pickId) return null;
  return game.teams[asset.teamId]?.draftPicks.find((pick) => pickIdFor(asset.teamId, pick) === asset.pickId) ?? null;
}

function assetValue(
  game: NonNullable<ReturnType<typeof useGameStore.getState>['game']>,
  valuationTeamId: string,
  asset: TradeOfferAsset,
): number {
  if (asset.type === 'player' && asset.playerId) {
    const player = game.players[asset.playerId];
    const team = game.teams[valuationTeamId];
    return player && team ? calcPlayerValue(game, player, team) : 0;
  }

  const pick = findPickByAsset(game, asset);
  if (pick) {
    return calcPickValue(pick);
  }

  const parts = asset.pickId?.split('-') ?? [];
  const round = Number(parts[parts.length - 3]);
  const pickNumber = Number(parts[parts.length - 2]);
  return Number.isFinite(round) && Number.isFinite(pickNumber) ? calcPickValue({ round, pick: pickNumber }) : 0;
}

function valueAccent(offeringValue: number, requestingValue: number): 'green' | 'gold' | 'red' {
  if (requestingValue > offeringValue * 1.1) return 'green';
  if (offeringValue > requestingValue * 1.1) return 'red';
  return 'gold';
}

function valueLabel(offeringValue: number, requestingValue: number): string {
  if (offeringValue === 0 && requestingValue === 0) return 'Idle';
  const delta = Math.round((requestingValue - offeringValue) * 10) / 10;
  if (delta > 0) return `Fav +${delta}`;
  if (delta < 0) return `Cost ${Math.abs(delta)}`;
  return 'Fair';
}

function AssetPickerRow({
  asset,
  selected,
  onToggle,
}: {
  asset: TradeOfferAsset;
  selected: boolean;
  onToggle: (asset: TradeOfferAsset) => void;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px',
      alignItems: 'center',
      padding: '10px',
      border: `3px solid ${selected ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
      background: selected ? 'rgba(255, 215, 0, 0.08)' : 'var(--mfd-bg-3)',
    }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ ...monoSm, color: '#fff' }}>{asset.description}</div>
        <div style={{ ...pixelSm, color: '#777' }}>{asset.type === 'player' ? 'PLAYER' : 'PICK'}</div>
      </div>
      <PixelButton accent={selected ? 'gold' : 'cyan'} onClick={() => onToggle(asset)}>
        {selected ? 'Remove' : 'Add'}
      </PixelButton>
    </div>
  );
}

export function TradeCenter() {
  const game = useGameStore((state) => state.game);
  const userTeam = useGameStore(selectUserTeam);
  const offers = useGameStore(selectTradeOffers);
  const proposals = useGameStore(selectActiveProposals);
  const tradeSuggestions = useGameStore(selectTradeSuggestions);
  const tradeDeadlineState = useGameStore(selectTradeDeadlineState);
  const week = useGameStore(selectWeek);
  const phase = useGameStore(selectPhase);
  const {
    acceptCounter,
    acceptTradeOffer,
    createTradeProposal,
    rejectCounter,
    rejectTradeOffer,
    submitTradeProposal,
  } = useGameStore((s) => s.actions);

  const [tab, setTab] = useState<'incoming' | 'propose'>('incoming');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [offeringKeys, setOfferingKeys] = useState<string[]>([]);
  const [requestingKeys, setRequestingKeys] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmTradeId, setConfirmTradeId] = useState<string | null>(null);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingOffers = offers.filter((offer) => offer.status === 'pending').length;
  const acceptedOffers = offers.filter((offer) => offer.status === 'accepted').length;
  const deadlineClosed = phase === 'regular_season' && week > 12;
  const showDeadlineBadge = phase === 'regular_season' && week > 10;

  const targets = useMemo(() => (
    game && userTeam ? getTradeTargets(game, userTeam.id) : []
  ), [game, userTeam]);
  const selectedTarget = targets.find((target) => target.teamId === selectedPartnerId) ?? null;

  const userAssets = useMemo(() => (
    game && userTeam ? getTradeableAssets(game, userTeam.id) : []
  ), [game, userTeam]);
  const partnerAssets = useMemo(() => {
    if (!selectedTarget) return [];
    return [
      ...selectedTarget.tradeBlock.map((player) => fromPlayer(selectedTarget.teamId, player)),
      ...selectedTarget.picks.map((pick) => fromPick(selectedTarget.teamId, pick)),
    ];
  }, [selectedTarget]);

  const userAssetMap = useMemo(() => new Map(userAssets.map((asset) => [assetKey(asset), asset])), [userAssets]);
  const partnerAssetMap = useMemo(() => new Map(partnerAssets.map((asset) => [assetKey(asset), asset])), [partnerAssets]);
  const selectedOffering = offeringKeys.map((key) => userAssetMap.get(key)).filter((asset): asset is TradeOfferAsset => Boolean(asset));
  const selectedRequesting = requestingKeys.map((key) => partnerAssetMap.get(key)).filter((asset): asset is TradeOfferAsset => Boolean(asset));

  const offeringValue = game && userTeam
    ? selectedOffering.reduce((sum, asset) => sum + assetValue(game, userTeam.id, asset), 0)
    : 0;
  const requestingValue = game && selectedTarget
    ? selectedRequesting.reduce((sum, asset) => sum + assetValue(game, selectedTarget.teamId, asset), 0)
    : 0;
  const fairness = Math.max(offeringValue, requestingValue, 1) === 0
    ? 0
    : (Math.min(offeringValue, requestingValue) / Math.max(offeringValue, requestingValue, 1)) * 100;
  const currentProposal = proposals.find((proposal) => proposal.id === activeProposalId)
    ?? proposals.filter((proposal) => proposal.fromTeamId === userTeam?.id).at(-1)
    ?? null;
  const tradeImpact = useMemo(
    () => buildDecisionImpactExplanation({
      surface: 'trade',
      label: 'Trade package',
      valueDelta: tradeSuggestions[0]?.valueGap ?? Math.round((requestingValue - offeringValue) * 10) / 10,
      capDelta: 0,
      chemistryDelta: selectedOffering.length + selectedRequesting.length > 0 ? -2 : 0,
      difficulty: 'standard',
    }),
    [offeringValue, requestingValue, selectedOffering.length, selectedRequesting.length, tradeSuggestions],
  );

  const toggleAsset = (
    asset: TradeOfferAsset,
    selectedKeys: string[],
    setKeys: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    const key = assetKey(asset);
    setKeys(selectedKeys.includes(key)
      ? selectedKeys.filter((entry) => entry !== key)
      : [...selectedKeys, key]);
  };

  const handleAction = async (key: string, run: () => Promise<void>) => {
    setPending(key);
    setError(null);
    try {
      await run();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Trade desk error.');
    } finally {
      setPending(null);
    }
  };

  const handleSubmitProposal = async () => {
    if (!userTeam || !selectedTarget) return;
    await handleAction('submit-proposal', async () => {
      const proposal = await createTradeProposal(userTeam.id, selectedTarget.teamId, selectedOffering, selectedRequesting);
      if (!proposal) return;
      setActiveProposalId(proposal.id);
      const resolved = await submitTradeProposal(proposal.id);
      if (resolved?.status === 'accepted') {
        setOfferingKeys([]);
        setRequestingKeys([]);
      }
    });
  };

  const loadSuggestion = (suggestion: (typeof tradeSuggestions)[number]) => {
    setTab('propose');
    setSelectedPartnerId(suggestion.partner);
    setOfferingKeys(suggestion.offer.offering.map((asset) => assetKey(asset)));
    setRequestingKeys(suggestion.offer.requesting.map((asset) => assetKey(asset)));
    setError(null);
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Trade Center"
        subtitle="Incoming offers remain intact. Direct negotiation lets you build and submit your own package."
        badges={(
          <>
            <PixelBadge variant="cyan">{pendingOffers} pending</PixelBadge>
            <PixelBadge variant="green">{acceptedOffers} accepted</PixelBadge>
            {tradeDeadlineState ? (
              <PixelButton
                accent="red"
                onClick={() => navigateTo('/trade-deadline')}
              >
                Deadline Live
              </PixelButton>
            ) : null}
            {showDeadlineBadge ? (
              <PixelBadge variant={deadlineClosed ? 'red' : 'gold'}>
                {deadlineClosed ? 'Deadline Passed' : `Deadline W${12 - week + 1}`}
              </PixelBadge>
            ) : null}
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Incoming Offers" value={offers.length} accent="cyan" detail="AI packages waiting for your call" />
        <PixelMetricCard label="Active Proposals" value={proposals.length} accent="gold" detail="User-initiated trade conversations" />
        <PixelMetricCard
          label="Trade Window"
          value={deadlineClosed ? 'CLOSED' : 'OPEN'}
          accent={deadlineClosed ? 'red' : 'green'}
          detail={phase === 'regular_season' ? `Regular season week ${week}` : 'Offseason trade market'}
        />
      </div>

      <PixelPanel title="League Trade Block" accent="cyan">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>
              League-wide target ticker for teams shopping players now.
            </span>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Filter by conference or division before building a user-side offer.
            </span>
          </div>
          <PixelButton accent="gold" onClick={() => navigateTo('/trade-block')}>
            <ArrowLeftRight size={14} aria-hidden="true" />
            View League Trade Block
          </PixelButton>
        </div>
      </PixelPanel>

      <TradeFinder suggestions={tradeSuggestions} onLoadSuggestion={loadSuggestion} />

      <PixelPanel title="Trade Impact" accent={tradeImpact.severity === 'high' ? 'red' : 'gold'}>
        <PixelConsequenceList items={decisionImpactToConsequenceItems(tradeImpact)} />
      </PixelPanel>

      <div data-spotlight-target="chip.route.trade-center.beat-1">
        <PixelNav
          activeKey={tab}
          items={[
            { key: 'incoming', label: `Incoming (${offers.length})` },
            { key: 'propose', label: 'Propose Trade' },
          ]}
          onSelect={(value) => setTab(value as typeof tab)}
        />
      </div>

      {tab === 'incoming' ? (
        <div data-spotlight-target="chip.route.trade-center.beat-2">
        <PixelPanel title="Incoming Offers" accent={pendingOffers > 0 ? 'gold' : 'cyan'}>
          {offers.length === 0 ? (
            <div style={{ ...monoSm, color: '#999' }}>
              No active offers. Put veterans on the block or advance the market.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {offers.map((offer) => (
                <div key={offer.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '10px',
                  border: `3px solid ${offer.status === 'accepted' ? 'var(--mfd-green)' : offer.status === 'rejected' ? 'var(--mfd-gold)' : 'var(--mfd-cyan)'}`,
                  background: 'var(--mfd-bg-3)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                      {offer.summary.toUpperCase()}
                    </div>
                    <PixelBadge variant={offerAccent(offer.status)}>
                      {offer.status}
                    </PixelBadge>
                  </div>

                  <div style={autoGrid(220)}>
                    <div>
                      <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>YOU SEND</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {offer.send.map((asset) => (
                          <div key={`${offer.id}-${asset.description}-send`} style={{ ...monoSm, color: '#ddd' }}>
                            {asset.description}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>YOU RECEIVE</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {offer.receive.map((asset) => (
                          <div key={`${offer.id}-${asset.description}-receive`} style={{ ...monoSm, color: '#ddd' }}>
                            {asset.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {offer.status === 'pending' ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelButton
                        accent="gold"
                        disabled={pending === `${offer.id}-reject`}
                        onClick={() => void handleAction(`${offer.id}-reject`, async () => {
                          await rejectTradeOffer(offer.id);
                        })}
                      >
                        Reject
                      </PixelButton>
                      <PixelButton
                        accent="green"
                        disabled={pending === `${offer.id}-accept`}
                        onClick={() => setConfirmTradeId(offer.id)}
                      >
                        Accept
                      </PixelButton>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <PixelPanel title="Step 1 // Trade Partner" accent="cyan">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <PixelSelect
                value={selectedPartnerId}
                onChange={(event) => {
                  setSelectedPartnerId(event.target.value);
                  setOfferingKeys([]);
                  setRequestingKeys([]);
                  setError(null);
                }}
                options={[
                  { value: '', label: 'Select Partner' },
                  ...targets.map((target) => ({ value: target.teamId, label: target.teamName })),
                ]}
                accent="cyan"
                style={{ maxWidth: '320px' }}
              />

              {selectedTarget ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ ...display, fontSize: '20px', color: '#fff', lineHeight: 1 }}>
                    {selectedTarget.teamName.toUpperCase()}
                  </div>
                  <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
                    Trade block: {selectedTarget.tradeBlock.slice(0, 4).map((player) => player.name).join(', ') || 'No players flagged.'}
                  </div>
                </div>
              ) : (
                <div style={{ ...monoSm, color: '#888' }}>
                  Pick a partner to see their trade block and available picks.
                </div>
              )}
            </div>
          </PixelPanel>

          <div style={autoGrid(320)}>
            <PixelPanel title="Step 2 // You Offer" accent="cyan">
              {userAssets.length === 0 ? (
                <div style={{ ...monoSm, color: '#888' }}>No tradeable assets available.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflow: 'auto' }}>
                  {userAssets.map((asset) => (
                    <AssetPickerRow
                      key={assetKey(asset)}
                      asset={asset}
                      selected={offeringKeys.includes(assetKey(asset))}
                      onToggle={(nextAsset) => toggleAsset(nextAsset, offeringKeys, setOfferingKeys)}
                    />
                  ))}
                </div>
              )}
            </PixelPanel>

            <PixelPanel title="Step 2 // You Request" accent="gold">
              {!selectedTarget ? (
                <div style={{ ...monoSm, color: '#888' }}>Choose a partner first.</div>
              ) : partnerAssets.length === 0 ? (
                <div style={{ ...monoSm, color: '#888' }}>This partner has no trade-block assets exposed right now.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflow: 'auto' }}>
                  {partnerAssets.map((asset) => (
                    <AssetPickerRow
                      key={assetKey(asset)}
                      asset={asset}
                      selected={requestingKeys.includes(assetKey(asset))}
                      onToggle={(nextAsset) => toggleAsset(nextAsset, requestingKeys, setRequestingKeys)}
                    />
                  ))}
                </div>
              )}
            </PixelPanel>
          </div>

          <PixelPanel title="Step 3 // Review & Submit" accent={valueAccent(offeringValue, requestingValue)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <PixelProgressBar
                value={fairness}
                accent={valueAccent(offeringValue, requestingValue)}
                label="Value Comparison"
                valueLabel={valueLabel(offeringValue, requestingValue)}
              />

              <div style={autoGrid(220)}>
                <div>
                  <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>OFFERING</div>
                  <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>{offeringValue.toFixed(1)}</div>
                  <div style={{ ...monoSm, color: '#999', marginTop: '6px' }}>
                    {selectedOffering.map((asset) => asset.description).join(' | ') || 'Nothing selected.'}
                  </div>
                </div>
                <div>
                  <div style={{ ...pixelSm, color: '#666', marginBottom: '6px' }}>REQUESTING</div>
                  <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>{requestingValue.toFixed(1)}</div>
                  <div style={{ ...monoSm, color: '#999', marginTop: '6px' }}>
                    {selectedRequesting.map((asset) => asset.description).join(' | ') || 'Nothing selected.'}
                  </div>
                </div>
              </div>

              {error ? (
                <div style={{ ...monoSm, color: '#fca5a5' }}>{error}</div>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                <PixelButton
                  accent="gold"
                  onClick={() => {
                    setOfferingKeys([]);
                    setRequestingKeys([]);
                    setError(null);
                  }}
                >
                  Reset Package
                </PixelButton>
                <PixelButton
                  accent="green"
                  disabled={!selectedTarget || selectedOffering.length === 0 || selectedRequesting.length === 0 || deadlineClosed || pending === 'submit-proposal'}
                  onClick={() => void handleSubmitProposal()}
                >
                  {deadlineClosed ? 'Deadline Closed' : 'Submit Proposal'}
                </PixelButton>
              </div>
            </div>
          </PixelPanel>

          {currentProposal ? (
            <PixelPanel title="AI Response" accent={offerAccent(currentProposal.status)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                    {currentProposal.status.toUpperCase()}
                  </div>
                  <PixelBadge variant={offerAccent(currentProposal.status)}>{currentProposal.status}</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.7 }}>
                  {currentProposal.aiResponse}
                </div>

                {currentProposal.counterOffer ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ ...pixelSm, color: '#666' }}>COUNTER PACKAGE</div>
                    <div style={{ ...monoSm, color: '#fff' }}>
                      You send: {currentProposal.counterOffer.offering.map((asset) => asset.description).join(' | ')}
                    </div>
                    <div style={{ ...monoSm, color: '#fff' }}>
                      You receive: {currentProposal.counterOffer.requesting.map((asset) => asset.description).join(' | ')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelButton
                        accent="gold"
                        disabled={pending === `reject-counter-${currentProposal.id}`}
                        onClick={() => void handleAction(`reject-counter-${currentProposal.id}`, async () => {
                          await rejectCounter(currentProposal.id);
                        })}
                      >
                        Reject Counter
                      </PixelButton>
                      <PixelButton
                        accent="green"
                        disabled={deadlineClosed || pending === `accept-counter-${currentProposal.id}`}
                        onClick={() => void handleAction(`accept-counter-${currentProposal.id}`, async () => {
                          await acceptCounter(currentProposal.id);
                        })}
                      >
                        Accept Counter
                      </PixelButton>
                    </div>
                  </div>
                ) : null}
              </div>
            </PixelPanel>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={confirmTradeId !== null}
        title="Accept Trade"
        message="Accept this trade offer? This action will move players and picks between rosters."
        confirmLabel="Accept Trade"
        accent="green"
        onConfirm={() => {
          if (confirmTradeId) {
            void handleAction(`${confirmTradeId}-accept`, async () => {
              await acceptTradeOffer(confirmTradeId);
            });
          }
          setConfirmTradeId(null);
        }}
        onCancel={() => setConfirmTradeId(null)}
      />
    </div>
  );
}
