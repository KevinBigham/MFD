import { useMemo, useState } from 'react';
import { FileText, ArrowRight } from 'lucide-react';
import {
  MfdBadge,
  MfdPanel,
} from '@mfd/design-system/components';
import {
  selectCurrentDraftEntry,
  selectDraftClass,
  selectOffseasonState,
  selectPhase,
  selectUserTeam,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--mfd-font-serif)',
          fontSize: '1.375rem',
          fontWeight: 700,
          color: 'var(--mfd-text)',
          margin: 0,
        }}>
          Draft Board
        </h1>
        <p style={{
          fontFamily: 'var(--mfd-font-mono)',
          fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)',
          margin: '4px 0 0',
        }}>
          {phase === 'draft' ? 'Advance to your next pick or make the selection.' : `Current phase: ${phase}`}
        </p>
      </div>

      <MfdPanel title="Current Pick" icon={<FileText size={14} />}>
        {currentEntry ? (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--mfd-sp-md)',
            padding: 'var(--mfd-sp-sm)',
            border: '1px solid var(--mfd-border)',
            borderRadius: 'var(--mfd-rad-md)',
            background: 'var(--mfd-bg-2)',
          }}>
            <div>
              <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.875rem', fontWeight: 600 }}>
                Overall #{currentEntry.overall} // Round {currentEntry.round}, Pick {currentEntry.pick}
              </div>
              <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)', marginTop: 4 }}>
                Team on clock: {currentEntry.teamId}
              </div>
            </div>
            <MfdBadge variant={userOnClock ? 'gold' : 'info'}>
              {userOnClock ? 'YOU ARE ON THE CLOCK' : 'AI PICK'}
            </MfdBadge>
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
            Draft order not available.
          </div>
        )}

        {phase === 'draft' && !userOnClock && (
          <div style={{ marginTop: 'var(--mfd-sp-md)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              disabled={pending === 'advance-draft'}
              style={actionButtonStyle('var(--mfd-green)')}
              onClick={() => void handleAction('advance-draft', async () => {
                await advanceWeek();
              })}
            >
              Advance To Next Pick <ArrowRight size={12} style={{ display: 'inline', marginLeft: 4 }} />
            </button>
          </div>
        )}
      </MfdPanel>

      <MfdPanel title="Big Board" icon={<FileText size={14} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
          {visibleProspects.length === 0 && (
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
              No prospects remain on the board.
            </div>
          )}

          {visibleProspects.map((prospect) => {
            const scouting = offseasonState?.scoutingState[prospect.id];
            const visibleGrade = scouting?.visibleScoutGrade ?? prospect.scoutGrade;
            return (
              <div key={prospect.id} style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr auto auto',
                gap: 'var(--mfd-sp-md)',
                alignItems: 'center',
                padding: 'var(--mfd-sp-sm)',
                border: '1px solid var(--mfd-border)',
                borderRadius: 'var(--mfd-rad-md)',
                background: 'var(--mfd-bg-2)',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    {prospect.firstName} {prospect.lastName} <span style={{ color: 'var(--mfd-text-dim)' }}>{prospect.pos}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)', marginTop: 4 }}>
                    {prospect.college} // projected round {prospect.projectedRound}
                  </div>
                </div>

                <MfdBadge variant="info">{visibleGrade.toFixed(1)}</MfdBadge>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {userOnClock ? (
                    <button
                      disabled={pending === prospect.id}
                      style={actionButtonStyle('var(--mfd-gold)')}
                      onClick={() => void handleAction(prospect.id, async () => {
                        await makeDraftPick(prospect.id);
                      })}
                    >
                      Draft Player
                    </button>
                  ) : (
                    <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)' }}>
                      Waiting
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </MfdPanel>
    </div>
  );
}
