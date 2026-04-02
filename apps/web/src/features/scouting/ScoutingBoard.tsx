import { useMemo, useState } from 'react';
import {
  PixelBadge, PixelButton, PixelPanel,
} from '@mfd/design-system/components';
import {
  selectDraftClass,
  selectOffseasonState,
  selectScoutingDepartment,
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
  const scoutingDepartment = useGameStore(selectScoutingDepartment);
  const {
    fireScout, hireScout, runProDay, runScoutingAction,
  } = useGameStore((s) => s.actions);
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
  const combineReveals = visibleProspects.filter((prospect) =>
    prospect.combine && offseasonState?.scoutingState[prospect.id]?.actions.includes('combine')).length;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Scouting Board"
        subtitle="Auto best-fit scouting staff, combine intel, and pro-day reveals."
        badges={(
          <>
            <PixelBadge variant="cyan">{visibleProspects.length} prospects</PixelBadge>
            <PixelBadge variant="gold">{completedActions} actions logged</PixelBadge>
            <PixelBadge variant="green">{scoutingDepartment.scouts.length} scouts hired</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(210)}>
        <PixelMetricCard label="Board Size" value={visibleProspects.length} accent="cyan" detail="Visible prospects" />
        <PixelMetricCard label="Scouting Actions" value={completedActions} accent="gold" detail="Film, combine, interview" />
        <PixelMetricCard label="Combine Reveals" value={combineReveals} accent="green" detail="Prospects with measurable data" />
        <PixelMetricCard label="Scout Budget" value={`$${scoutingDepartment.budget.toFixed(1)}M`} accent="default" detail={`${scoutingDepartment.scouts.length}/${scoutingDepartment.maxScouts} hired`} />
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title={`Hired Scouts (${scoutingDepartment.scouts.length}/${scoutingDepartment.maxScouts})`} accent="green">
          {scoutingDepartment.scouts.length === 0 ? (
            <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
              No scouts on staff yet. Hire from the pool to improve grade accuracy and reveal better pro-day data.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {scoutingDepartment.scouts.map((scout) => (
                <div key={scout.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px', border: '3px solid var(--mfd-green)', background: 'rgba(74, 222, 128, 0.08)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ ...display, fontSize: '18px', color: '#fff', lineHeight: 1 }}>{scout.name.toUpperCase()}</span>
                    <span style={{ ...monoSm, color: '#999' }}>
                      {scout.specialty ?? 'Generalist'} // {Math.round(scout.accuracy * 100)}% // ${scout.salary.toFixed(1)}M
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <PixelBadge variant={scout.tier === 'elite' ? 'gold' : scout.tier === 'good' ? 'green' : scout.tier === 'average' ? 'cyan' : 'red'}>
                      {scout.tier}
                    </PixelBadge>
                    <PixelButton accent="red" disabled={pending === scout.id} onClick={() => void handleAction(scout.id, async () => fireScout(scout.id))}>
                      Fire
                    </PixelButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title={`Scout Pool (${scoutingDepartment.availableScouts.length})`} accent="cyan">
          {scoutingDepartment.availableScouts.length === 0 ? (
            <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
              No offseason candidates are listed right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {scoutingDepartment.availableScouts.slice(0, 6).map((scout) => (
                <div key={scout.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px', border: '3px solid var(--mfd-cyan)', background: 'rgba(34, 211, 238, 0.08)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ ...monoSm, color: '#fff' }}>{scout.name}</span>
                    <span style={{ ...monoSm, color: '#999' }}>
                      {scout.specialty ?? 'Generalist'} // {scout.tier} // ${scout.salary.toFixed(1)}M
                    </span>
                  </div>
                  <PixelButton
                    accent="cyan"
                    disabled={scoutingDepartment.scouts.length >= scoutingDepartment.maxScouts || scoutingDepartment.budget < scout.salary || pending === scout.id}
                    onClick={() => void handleAction(scout.id, async () => hireScout(scout.id))}
                  >
                    Hire
                  </PixelButton>
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
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
              const assignedScout = scoutingDepartment.scouts
                .filter((scout) => scout.specialty === prospect.pos)
                .sort((a, b) => b.accuracy - a.accuracy || a.id.localeCompare(b.id))[0]
                ?? [...scoutingDepartment.scouts].sort((a, b) => b.accuracy - a.accuracy || a.id.localeCompare(b.id))[0]
                ?? null;
              const visibleGrade = scouting?.visibleScoutGrade ?? prospect.scoutGrade;
              const combineVisible = Boolean(prospect.combine && scouting?.actions.includes('combine'));

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
                      {assignedScout ? (
                        <PixelBadge variant={assignedScout.tier === 'elite' ? 'gold' : assignedScout.tier === 'good' ? 'green' : assignedScout.tier === 'average' ? 'cyan' : 'red'}>
                          {assignedScout.tier} {assignedScout.specialty ?? 'GEN'}
                        </PixelBadge>
                      ) : (
                        <PixelBadge variant="default">league intel</PixelBadge>
                      )}
                    </div>
                  </div>

                  {combineVisible ? (
                    <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.6 }}>
                      40: {prospect.combine!.fortyYard}s // Bench: {prospect.combine!.benchPress} // Vertical: {prospect.combine!.vertical}"
                      <br />
                      Broad: {prospect.combine!.broadJump}" // 3-Cone: {prospect.combine!.threeCone}s // Shuttle: {prospect.combine!.shuttle}s
                    </div>
                  ) : null}

                  {scouting?.proDayRating ? (
                    <div style={{ ...monoSm, color: 'var(--mfd-green)' }}>
                      Pro Day: {scouting.proDayRating}
                    </div>
                  ) : null}

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
                    <PixelButton
                      accent="green"
                      disabled={pending === `${prospect.id}-pro-day`}
                      onClick={() => void handleAction(`${prospect.id}-pro-day`, async () => {
                        await runProDay(prospect.id);
                      })}
                    >
                      Pro Day
                    </PixelButton>
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
