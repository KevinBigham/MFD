import { useEffect, useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel, PixelProgressBar, PixelSelect } from '@mfd/design-system/components';
import { calcPickValue } from '@mfd/engine';
import {
  selectCurrentDraftEntry,
  selectDraftClass,
  selectOffseasonState,
  selectPhase,
  selectUserTeam,
  selectUserTeamNeeds,
  selectWarRoomState,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

function needAccent(matchesNeed: boolean): 'gold' | 'default' {
  return matchesNeed ? 'gold' : 'default';
}

function offerSummary(assets: Array<{ description: string }>): string {
  return assets.map((asset) => asset.description).join(' + ');
}

export function DraftBoard() {
  const phase = useGameStore(selectPhase);
  const userTeam = useGameStore(selectUserTeam);
  const needsReport = useGameStore(selectUserTeamNeeds);
  const draftClass = useGameStore(selectDraftClass);
  const offseasonState = useGameStore(selectOffseasonState);
  const currentEntry = useGameStore(selectCurrentDraftEntry);
  const warRoomState = useGameStore(selectWarRoomState);
  const { acceptDraftTradeOffer, advanceWeek, makeDraftPick, refreshWarRoom, rejectDraftTradeOffer } = useGameStore((state) => state.actions);
  const [pending, setPending] = useState<string | null>(null);
  const [tradeUpTarget, setTradeUpTarget] = useState('');

  const userOnClock = Boolean(userTeam && currentEntry && currentEntry.teamId === userTeam.id);
  const visibleProspects = useMemo(() => draftClass.slice(0, 20), [draftClass]);
  const remainingUserPicks = useMemo(() => (
    (userTeam?.draftPicks ?? [])
      .filter((pick) => pick.year === (offseasonState?.draftOrder[0]?.id ? Number(offseasonState.draftOrder[0].id.split('-')[1]) || 0 : 0) || pick.year >= 0)
      .sort((a, b) => a.round - b.round || a.pick - b.pick)
  ), [offseasonState, userTeam]);
  const projectedPickValue = remainingUserPicks.reduce((sum, pick) => sum + calcPickValue(pick), 0);
  const suggestedProspects = visibleProspects.filter((prospect) => needsReport.criticalNeeds.includes(prospect.pos)).slice(0, 5);
  const selectedTradeUp = warRoomState?.userCanTradeUp.find((entry) => String(entry.targetPick) === tradeUpTarget) ?? warRoomState?.userCanTradeUp[0] ?? null;

  useEffect(() => {
    if (phase === 'draft' && !warRoomState) {
      void refreshWarRoom();
    }
  }, [phase, refreshWarRoom, warRoomState]);

  useEffect(() => {
    if (warRoomState?.userCanTradeUp.length) {
      setTradeUpTarget(String(warRoomState.userCanTradeUp[0]!.targetPick));
    }
  }, [warRoomState?.userCanTradeUp]);

  const handleAction = async (key: string, run: () => Promise<void>) => {
    setPending(key);
    try {
      await run();
    } finally {
      setPending(null);
    }
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Draft Board"
        subtitle={phase === 'draft' ? 'War room live: offers, grade, pick math, and needs-aware suggestions.' : `Current phase: ${phase}`}
        badges={(
          <>
            <PixelBadge variant={userOnClock ? 'gold' : 'cyan'}>{userOnClock ? 'On The Clock' : 'Waiting'}</PixelBadge>
            {warRoomState ? <PixelBadge variant="green">Class {warRoomState.draftGrade}</PixelBadge> : null}
            {currentEntry ? <PixelBadge variant="default">R{currentEntry.round} P{currentEntry.pick}</PixelBadge> : null}
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Board Size" value={visibleProspects.length} accent="cyan" detail="Visible prospects" />
        <PixelMetricCard label="Current Pick" value={currentEntry?.overall ?? '-'} accent={userOnClock ? 'gold' : 'default'} detail={userOnClock ? 'Your live slot' : 'League clock'} />
        <PixelMetricCard label="Timer" value={warRoomState?.timeRemaining ?? 90} accent={userOnClock ? 'red' : 'cyan'} detail="Cosmetic war room countdown" />
        <PixelMetricCard label="Remaining Picks" value={remainingUserPicks.length} accent="gold" detail={`${Math.round(projectedPickValue)} projected chart points`} />
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Current Pick" accent={userOnClock ? 'gold' : 'cyan'}>
          {currentEntry ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ ...display, fontSize: '24px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                {`OVERALL #${currentEntry.overall}`.toUpperCase()}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="default">Round {currentEntry.round}</PixelBadge>
                <PixelBadge variant="default">Pick {currentEntry.pick}</PixelBadge>
                <PixelBadge variant={userOnClock ? 'gold' : 'cyan'}>
                  {userOnClock ? 'YOU ARE ON THE CLOCK' : 'AI PICK'}
                </PixelBadge>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                Team on clock: {currentEntry.teamId}
              </div>
              {phase === 'draft' && !userOnClock ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <PixelButton
                    accent="green"
                    disabled={pending === 'advance-draft'}
                    onClick={() => void handleAction('advance-draft', async () => {
                      await advanceWeek();
                    })}
                  >
                    Advance To Next Pick
                  </PixelButton>
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Draft order not available.</div>
          )}
        </PixelPanel>

        <PixelPanel title="War Room" accent="red">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">Grade {warRoomState?.draftGrade ?? 'B'}</PixelBadge>
              <PixelBadge variant="cyan">{needsReport.criticalNeeds.join(' / ') || 'No urgent need'}</PixelBadge>
            </div>
            {(warRoomState?.incomingOffers ?? []).length > 0 ? (
              warRoomState!.incomingOffers.map((offer) => (
                <div key={`${offer.from}-${offer.targetPick}-${offer.reasoning}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', border: '3px solid var(--mfd-border)', background: 'var(--mfd-bg-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{offer.from} wants pick #{offer.targetPick}</div>
                    <PixelBadge variant={offer.urgency === 'desperate' ? 'red' : offer.urgency === 'interested' ? 'gold' : 'cyan'}>
                      {offer.urgency}
                    </PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                    They offer: {offerSummary(offer.offer.offering)}
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                    They want: {offerSummary(offer.offer.requesting)}
                  </div>
                  <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>{offer.reasoning}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <PixelButton
                      accent="green"
                      disabled={pending === `accept-${offer.from}`}
                      onClick={() => void handleAction(`accept-${offer.from}`, async () => {
                        await acceptDraftTradeOffer(offer);
                      })}
                    >
                      Accept
                    </PixelButton>
                    <PixelButton
                      accent="red"
                      disabled={pending === `reject-${offer.from}`}
                      onClick={() => void handleAction(`reject-${offer.from}`, async () => {
                        await rejectDraftTradeOffer(offer);
                      })}
                    >
                      Reject
                    </PixelButton>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No live offers on the board right now.</div>
            )}
          </div>
        </PixelPanel>
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Trade Up Calculator" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PixelSelect
              aria-label="Trade up target"
              value={tradeUpTarget}
              onChange={(event) => setTradeUpTarget(event.target.value)}
              options={(warRoomState?.userCanTradeUp ?? []).map((entry) => ({
                value: String(entry.targetPick),
                label: `Target Pick #${entry.targetPick}`,
              }))}
              accent="gold"
            />
            {selectedTradeUp ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>Cost: {offerSummary(selectedTradeUp.cost.offering)}</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Return: {offerSummary(selectedTradeUp.cost.requesting)}</div>
              </div>
            ) : (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No move-up options from this slot.</div>
            )}
          </div>
        </PixelPanel>

        <PixelPanel title="Needs-Aware Suggestions" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {suggestedProspects.length > 0 ? suggestedProspects.map((prospect) => (
              <div key={`suggested-${prospect.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{prospect.firstName} {prospect.lastName}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{prospect.pos} // need fit // {prospect.college}</div>
                </div>
                <PixelBadge variant="green">{prospect.scoutGrade.toFixed(1)}</PixelBadge>
              </div>
            )) : <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No top-board player cleanly matches your biggest holes.</div>}
          </div>
        </PixelPanel>

        <PixelPanel title="Your Remaining Picks" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {remainingUserPicks.slice(0, 6).map((pick) => (
              <div key={`${pick.year}-${pick.round}-${pick.pick}-${pick.originalTeamId}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>R{pick.round} // P{pick.pick}</span>
                <PixelBadge variant="cyan">{Math.round(calcPickValue(pick))}</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>

      <PixelPanel title="Big Board" accent="cyan">
        {visibleProspects.length === 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No prospects remain on the board.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleProspects.map((prospect) => {
              const scouting = offseasonState?.scoutingState[prospect.id];
              const visibleGrade = scouting?.visibleScoutGrade ?? prospect.scoutGrade;
              const matchesNeed = needsReport.criticalNeeds.includes(prospect.pos);
              return (
                <div key={prospect.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: `3px solid ${matchesNeed ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`, background: 'var(--mfd-bg-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ ...display, fontSize: '22px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                        {`${prospect.firstName} ${prospect.lastName}`.toUpperCase()}
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
                        {prospect.pos} // {prospect.college} // projected round {prospect.projectedRound}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelBadge variant="cyan">{visibleGrade.toFixed(1)}</PixelBadge>
                      <PixelBadge variant={needAccent(matchesNeed)}>{matchesNeed ? 'Need Fit' : 'Board'}</PixelBadge>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                    {userOnClock ? (
                      <PixelButton
                        accent={matchesNeed ? 'gold' : 'cyan'}
                        disabled={pending === prospect.id}
                        onClick={() => void handleAction(prospect.id, async () => {
                          await makeDraftPick(prospect.id);
                        })}
                      >
                        Draft Player
                      </PixelButton>
                    ) : (
                      <PixelBadge variant="default">Waiting</PixelBadge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PixelPanel>
    </div>
  );
}
