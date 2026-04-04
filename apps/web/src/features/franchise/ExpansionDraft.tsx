import { useEffect, useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { getExpansionTeamNeeds } from '@mfd/engine';
import {
  useGameStore,
  selectExpansionDraftState,
  selectUserTeam,
} from '../../app/store/game-store';
import { PixelScreenHeader, autoGrid, display, monoSm, screenStackStyle } from '../shared/pixelUi';
import { DetailStripe } from './franchiseUi';

function defaultProtectedIds(playerIds: string[], limit: number): string[] {
  return playerIds.slice(0, limit);
}

export function ExpansionDraft() {
  const state = useGameStore(selectExpansionDraftState);
  const userTeam = useGameStore(selectUserTeam);
  const { finalizeExpansionDraft, protectExpansionPlayers } = useGameStore((store) => store.actions);
  const [protectedIds, setProtectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!state || !userTeam || state.phase !== 'protection') return;
    const preselected = defaultProtectedIds(
      [...userTeam.roster].sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id)).map((player) => player.id),
      15,
    );
    setProtectedIds(preselected);
  }, [state, userTeam]);

  const positionNeeds = useMemo(() => (
    state ? getExpansionTeamNeeds(state.selectedPlayers) : null
  ), [state]);

  if (!state || !userTeam) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Expansion Draft" subtitle="No expansion draft is active." />
      </div>
    );
  }

  const lostPlayers = state.selectedPlayers.filter((player) => player.teamId === userTeam.id);
  const canFinalizeProtection = protectedIds.length <= 15;

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Expansion Draft"
        subtitle={`${state.expansionTeam.city} ${state.expansionTeam.name} // ${state.phase.toUpperCase()} // ${state.picksRemaining} picks left`}
        badges={(
          <>
            <PixelBadge variant="gold">{state.expansionTeam.conference} {state.expansionTeam.division}</PixelBadge>
            <PixelBadge variant="cyan">Protected {protectedIds.length}/15</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(360)}>
        <PixelPanel title="Protection Board" accent={state.phase === 'protection' ? 'gold' : 'cyan'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {userTeam.roster
              .slice()
              .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))
              .map((player) => {
                const selected = protectedIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    disabled={state.phase !== 'protection'}
                    onClick={() => {
                      if (selected) {
                        setProtectedIds((current) => current.filter((id) => id !== player.id));
                        return;
                      }
                      if (protectedIds.length >= 15) return;
                      setProtectedIds((current) => [...current, player.id]);
                    }}
                    style={{
                      width: '100%',
                      background: selected ? 'var(--mfd-bg-3)' : 'var(--mfd-bg-2)',
                      border: `2px solid ${selected ? 'var(--mfd-gold)' : 'var(--mfd-text-dim)'}`,
                      color: 'var(--mfd-text)',
                      padding: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      alignItems: 'center',
                      cursor: state.phase === 'protection' ? 'pointer' : 'default',
                    }}
                  >
                    <div>
                      <div style={{ ...display, fontSize: '18px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                        {player.name.toUpperCase()}
                      </div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
                        {player.pos} // OVR {player.ovr} // age {player.age}
                      </div>
                    </div>
                    <PixelBadge variant={selected ? 'gold' : 'default'}>{selected ? 'PROTECTED' : 'EXPOSED'}</PixelBadge>
                  </button>
                );
              })}
            <PixelButton
              accent="green"
              disabled={!canFinalizeProtection || state.phase !== 'protection'}
              onClick={() => { void protectExpansionPlayers(protectedIds); }}
            >
              Finalize Protection
            </PixelButton>
          </div>
        </PixelPanel>

        <PixelPanel title="Expansion Feed" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              The expansion room is building its roster from the exposed pool. Once protection locks, the AI completes the full draft preview immediately.
            </div>
            {positionNeeds ? (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Object.entries(positionNeeds).map(([pos, need]) => (
                  <PixelBadge key={pos} variant={need > 0 ? 'red' : 'green'}>
                    {pos} {need}
                  </PixelBadge>
                ))}
              </div>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {state.selectedPlayers.map((player, index) => (
                <div key={`${player.id}-${index}`} style={{
                  padding: '10px',
                  background: 'var(--mfd-bg-2)',
                  border: '2px solid var(--mfd-cyan)',
                }}
                >
                  <div style={{ ...display, fontSize: '16px', color: 'var(--mfd-text)', lineHeight: 1 }}>
                    #{index + 1} {player.name.toUpperCase()}
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
                    {player.pos} // OVR {player.ovr} // from {player.teamId ?? 'FA'}
                  </div>
                </div>
              ))}
              {state.selectedPlayers.length === 0 ? (
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Awaiting user protection lock.</div>
              ) : null}
            </div>
          </div>
        </PixelPanel>
      </div>

      <div style={autoGrid(320)}>
        <PixelPanel title="Summary" accent={lostPlayers.length > 0 ? 'red' : 'green'}>
          {state.phase === 'protection' ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Lock protection to see which players the expansion team actually steals.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <DetailStripe label="Players Lost" value={lostPlayers.length} accent={lostPlayers.length > 0 ? 'red' : 'green'} />
              {lostPlayers.map((player) => (
                <div key={player.id} style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  {player.name} // {player.pos} // OVR {player.ovr}
                </div>
              ))}
            </div>
          )}
        </PixelPanel>

        <PixelPanel title="Expansion Team" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <DetailStripe label="Club" value={`${state.expansionTeam.city} ${state.expansionTeam.name}`} accent="gold" />
            <DetailStripe label="Conference" value={state.expansionTeam.conference} accent="cyan" />
            <DetailStripe label="Division" value={state.expansionTeam.division} accent="cyan" />
            <PixelButton accent="green" disabled={state.phase === 'protection'} onClick={() => { void finalizeExpansionDraft(); }}>
              Finalize Expansion Draft
            </PixelButton>
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
