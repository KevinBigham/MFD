import { useState } from 'react';
import { Search, Eye } from 'lucide-react';
import {
  MfdBadge,
  MfdPanel,
} from '@mfd/design-system/components';
import {
  selectDraftClass,
  selectOffseasonState,
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

export function ScoutingBoard() {
  const draftClass = useGameStore(selectDraftClass);
  const offseasonState = useGameStore(selectOffseasonState);
  const { runScoutingAction } = useGameStore((s) => s.actions);
  const [pending, setPending] = useState<string | null>(null);

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
          Scouting Board
        </h1>
        <p style={{
          fontFamily: 'var(--mfd-font-mono)',
          fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)',
          margin: '4px 0 0',
        }}>
          Deterministic reveal actions. True grades stay hidden.
        </p>
      </div>

      <MfdPanel title="Prospect Board" icon={<Search size={14} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
          {draftClass.length === 0 && (
            <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem', color: 'var(--mfd-text-dim)' }}>
              No draft class has been generated yet.
            </div>
          )}

          {draftClass.slice(0, 24).map((prospect) => {
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
                  {scouting?.notes?.length ? (
                    <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.625rem', color: 'var(--mfd-cyan)', marginTop: 6 }}>
                      {scouting.notes[scouting.notes.length - 1]}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  <MfdBadge variant="info">
                    <Eye size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {visibleGrade.toFixed(1)}
                  </MfdBadge>
                  <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.625rem', color: 'var(--mfd-text-dim)' }}>
                    {(((scouting?.accuracy ?? 0) * 100)).toFixed(0)}% confidence
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 'var(--mfd-sp-xs)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {(['film', 'combine', 'interview'] as const).map((action) => {
                    const taken = scouting?.actions.includes(action);
                    return (
                      <button
                        key={action}
                        disabled={taken || pending === `${prospect.id}-${action}`}
                        style={actionButtonStyle(taken ? 'var(--mfd-text-faint)' : 'var(--mfd-gold)')}
                        onClick={() => void handleAction(`${prospect.id}-${action}`, async () => {
                          await runScoutingAction(prospect.id, action);
                        })}
                      >
                        {action}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </MfdPanel>
    </div>
  );
}
