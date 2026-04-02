import { useMemo, useState } from 'react';
import {
  PixelBadge, PixelButton, PixelPanel,
} from '@mfd/design-system/components';
import {
  selectDraftClass,
  selectOffseasonState,
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

  const visibleProspects = draftClass.slice(0, 24);
  const completedActions = useMemo(() => {
    return visibleProspects.reduce((sum, prospect) => sum + (offseasonState?.scoutingState[prospect.id]?.actions.length ?? 0), 0);
  }, [offseasonState, visibleProspects]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Scouting Board"
        subtitle="Deterministic reveal actions. True grades stay hidden."
        badges={(
          <>
            <PixelBadge variant="cyan">{visibleProspects.length} prospects</PixelBadge>
            <PixelBadge variant="gold">{completedActions} actions logged</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Board Size" value={visibleProspects.length} accent="cyan" detail="Visible prospects" />
        <PixelMetricCard label="Scouting Actions" value={completedActions} accent="gold" detail="Film, combine, interview" />
      </div>

      <PixelPanel title="Prospect Board" accent="cyan">
        {visibleProspects.length === 0 ? (
          <div style={{ ...monoSm, color: '#999' }}>
            No draft class has been generated yet.
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
                  border: '3px solid var(--mfd-cyan)',
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
                      {scouting?.notes?.length ? (
                        <div style={{ ...monoSm, color: 'var(--mfd-cyan)', marginTop: '6px' }}>
                          {scouting.notes[scouting.notes.length - 1]}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <PixelBadge variant="cyan">{visibleGrade.toFixed(1)}</PixelBadge>
                      <PixelBadge variant="default">{(((scouting?.accuracy ?? 0) * 100)).toFixed(0)}% conf</PixelBadge>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(['film', 'combine', 'interview'] as const).map((action) => {
                      const taken = scouting?.actions.includes(action);
                      return (
                        <PixelButton
                          key={action}
                          accent={taken ? 'default' : action === 'film' ? 'cyan' : action === 'combine' ? 'gold' : 'green'}
                          disabled={taken || pending === `${prospect.id}-${action}`}
                          onClick={() => void handleAction(`${prospect.id}-${action}`, async () => {
                            await runScoutingAction(prospect.id, action);
                          })}
                        >
                          {taken ? `${action} done` : action}
                        </PixelButton>
                      );
                    })}
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
