import { useMemo, useState } from 'react';
import {
  PixelBadge, PixelButton, PixelPanel,
} from '@mfd/design-system/components';
import {
  selectCurrentDraftEntry,
  selectDraftClass,
  selectOffseasonState,
  selectPhase,
  selectUserTeam,
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

export function DraftBoard() {
  const phase = useGameStore(selectPhase);
  const userTeam = useGameStore(selectUserTeam);
  const draftClass = useGameStore(selectDraftClass);
  const offseasonState = useGameStore(selectOffseasonState);
  const currentEntry = useGameStore(selectCurrentDraftEntry);
  const { advanceWeek, makeDraftPick } = useGameStore((s) => s.actions);
  const [pending, setPending] = useState<string | null>(null);

  const userOnClock = Boolean(userTeam && currentEntry && currentEntry.teamId === userTeam.id);
  const visibleProspects = useMemo(() => draftClass.slice(0, 20), [draftClass]);

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
        subtitle={phase === 'draft' ? 'Advance to your next pick or make the selection.' : `Current phase: ${phase}`}
        badges={(
          <>
            <PixelBadge variant={userOnClock ? 'gold' : 'cyan'}>{userOnClock ? 'On The Clock' : 'Waiting'}</PixelBadge>
            {currentEntry ? <PixelBadge variant="default">R{currentEntry.round} P{currentEntry.pick}</PixelBadge> : null}
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Board Size" value={visibleProspects.length} accent="cyan" detail="Visible prospects" />
        <PixelMetricCard label="Current Round" value={currentEntry?.round ?? '-'} accent="gold" detail="Live draft slot" />
        <PixelMetricCard label="Overall Pick" value={currentEntry?.overall ?? '-'} accent={userOnClock ? 'gold' : 'default'} detail={userOnClock ? 'Your selection' : 'League clock'} />
      </div>

      <PixelPanel title="Current Pick" accent={userOnClock ? 'gold' : 'cyan'}>
        {currentEntry ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...display, fontSize: '24px', color: '#fff', lineHeight: 1 }}>
              {`OVERALL #${currentEntry.overall}`.toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="default">Round {currentEntry.round}</PixelBadge>
              <PixelBadge variant="default">Pick {currentEntry.pick}</PixelBadge>
              <PixelBadge variant={userOnClock ? 'gold' : 'cyan'}>
                {userOnClock ? 'YOU ARE ON THE CLOCK' : 'AI PICK'}
              </PixelBadge>
            </div>
            <div style={{ ...monoSm, color: '#999' }}>
              Team on clock: {currentEntry.teamId}
            </div>
          </div>
        ) : (
          <div style={{ ...monoSm, color: '#999' }}>
            Draft order not available.
          </div>
        )}

        {phase === 'draft' && !userOnClock ? (
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
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
      </PixelPanel>

      <PixelPanel title="Big Board" accent="cyan">
        {visibleProspects.length === 0 ? (
          <div style={{ ...monoSm, color: '#999' }}>
            No prospects remain on the board.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleProspects.map((prospect) => {
              const scouting = offseasonState?.scoutingState[prospect.id];
              const visibleGrade = scouting?.visibleScoutGrade ?? prospect.scoutGrade;
              return (
                <div key={prospect.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '10px',
                  border: '3px solid var(--mfd-border)',
                  background: 'var(--mfd-bg-3)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ ...display, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                        {`${prospect.firstName} ${prospect.lastName}`.toUpperCase()}
                      </div>
                      <div style={{ ...monoSm, color: '#888', marginTop: '6px' }}>
                        {prospect.pos} // {prospect.college} // projected round {prospect.projectedRound}
                      </div>
                    </div>
                    <PixelBadge variant="cyan">{visibleGrade.toFixed(1)}</PixelBadge>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                    {userOnClock ? (
                      <PixelButton
                        accent="gold"
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
