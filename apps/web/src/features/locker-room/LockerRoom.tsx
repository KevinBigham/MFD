import { useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { CAPTAIN_PERK_EFFECTS, type CaptainPerk, type LockerRoomState, type Player, type Team } from '@mfd/engine';
import {
  selectLockerRoom,
  selectUserTeam,
  selectWeek,
  useGameStore,
} from '../../app/store/game-store';
import { FranchiseGauge } from '../franchise/franchiseUi';
import { PixelScreenHeader, PlayerNameLink, autoGrid, monoSm, pixelSm, screenStackStyle } from '../shared/pixelUi';

function cultureAccent(culture: LockerRoomState['culture']): 'red' | 'gold' | 'cyan' | 'green' {
  if (culture === 'toxic') return 'red';
  if (culture === 'fragile') return 'gold';
  if (culture === 'stable') return 'cyan';
  return 'green';
}

function severityAccent(severity: 'minor' | 'moderate' | 'serious'): 'cyan' | 'gold' | 'red' {
  if (severity === 'minor') return 'cyan';
  if (severity === 'moderate') return 'gold';
  return 'red';
}

function progressBar(value: number, accent: string) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{
        height: '10px',
        border: '2px solid var(--mfd-border)',
        background: 'var(--mfd-bg-2)',
        overflow: 'hidden',
      }}
      >
        <div style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: '100%',
          background: accent,
        }}
        />
      </div>
      <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{value}/100</span>
    </div>
  );
}

function perkBadge(perk: CaptainPerk) {
  return (
    <PixelBadge key={perk} variant={perk === 'rally_cry' ? 'gold' : perk === 'clutch_aura' ? 'green' : 'cyan'}>
      {perk.replace(/_/g, ' ')}
    </PixelBadge>
  );
}

function eligibleBench(team: Team, lockerRoom: LockerRoomState): Player[] {
  const captainIds = new Set(lockerRoom.captains.map((captain) => captain.playerId));
  return [...team.roster]
    .filter((player) => !captainIds.has(player.id) && player.ovr >= 78 && player.yearsExp >= 4 && !player.holdout && !player.traits.includes('cancer'))
    .sort((a, b) => b.ovr - a.ovr || b.yearsExp - a.yearsExp || a.name.localeCompare(b.name))
    .slice(0, 6);
}

export function LockerRoom() {
  const team = useGameStore(selectUserTeam);
  const lockerRoom = useGameStore(selectLockerRoom);
  const week = useGameStore(selectWeek);
  const callTeamMeeting = useGameStore((state) => state.actions.callTeamMeeting);
  const triggerCaptainRally = useGameStore((state) => state.actions.triggerCaptainRally);
  const electCaptain = useGameStore((state) => state.actions.electCaptain);
  const [pending, setPending] = useState<string | null>(null);

  const playerMap = useMemo(
    () => new Map((team?.roster ?? []).map((player) => [player.id, player])),
    [team],
  );
  const meetingCooldown = lockerRoom.lastMeetingWeek === null ? 0 : Math.max(0, 4 - (week - lockerRoom.lastMeetingWeek));
  const bench = team ? eligibleBench(team, lockerRoom) : [];

  if (!team) {
    return (
      <div style={screenStackStyle}>
        <PixelScreenHeader title="Locker Room" subtitle="No franchise is loaded." />
      </div>
    );
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Locker Room"
        subtitle={`${team.city} ${team.name} // week ${week} culture pulse`}
        badges={(
          <>
            <PixelBadge variant={cultureAccent(lockerRoom.culture)}>{lockerRoom.culture.toUpperCase()}</PixelBadge>
            <PixelBadge variant="cyan">{lockerRoom.captains.length} CAPTAINS</PixelBadge>
            <PixelBadge variant={lockerRoom.tensions.some((tension) => !tension.resolved) ? 'red' : 'green'}>
              {lockerRoom.tensions.filter((tension) => !tension.resolved).length} ACTIVE TENSIONS
            </PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(260)}>
        <FranchiseGauge
          label="Culture Meter"
          value={lockerRoom.cultureScore}
          accent={cultureAccent(lockerRoom.culture)}
          detail={`${lockerRoom.culture.toUpperCase()} room health`}
        />

        <PixelPanel title="Meeting Control" accent={meetingCooldown > 0 ? 'default' : 'gold'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              Call a team meeting to cool off active tensions. Meetings can only happen once every four weeks.
            </div>
            <PixelButton
              accent={meetingCooldown > 0 ? 'default' : 'gold'}
              disabled={meetingCooldown > 0 || pending === 'meeting'}
              onClick={() => {
                setPending('meeting');
                void callTeamMeeting().finally(() => setPending(null));
              }}
            >
              {meetingCooldown > 0 ? `Cooldown ${meetingCooldown}w` : pending === 'meeting' ? 'Calling...' : 'Call Team Meeting'}
            </PixelButton>
          </div>
        </PixelPanel>
      </div>

      <div style={autoGrid(260)}>
        {lockerRoom.cliques.map((clique) => {
          const members = clique.playerIds.map((playerId) => playerMap.get(playerId)).filter((player): player is Player => Boolean(player));
          const accent = clique.id === 0 ? 'gold' : clique.id === 1 ? 'cyan' : 'green';
          return (
            <PixelPanel key={clique.id} title={clique.label} accent={accent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant={accent}>{members.length} members</PixelBadge>
                </div>
                <div>
                  <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)', marginBottom: '6px' }}>COHESION</div>
                  {progressBar(clique.cohesion, accent === 'gold' ? 'var(--mfd-gold)' : accent === 'cyan' ? 'var(--mfd-cyan)' : 'var(--mfd-green)')}
                </div>
                <div>
                  <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)', marginBottom: '6px' }}>INFLUENCE</div>
                  {progressBar(clique.influence, accent === 'gold' ? 'var(--mfd-gold)' : accent === 'cyan' ? 'var(--mfd-cyan)' : 'var(--mfd-green)')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {members.length > 0 ? members.map((player) => (
                    <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                      <PlayerNameLink playerId={player.id} name={player.name} ovr={player.ovr} style={{ ...monoSm }} />
                      <PixelBadge variant="default">{player.pos}</PixelBadge>
                    </div>
                  )) : (
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No members assigned.</div>
                  )}
                </div>
              </div>
            </PixelPanel>
          );
        })}
      </div>

      <div style={autoGrid(280)}>
        {lockerRoom.captains.map((captain) => {
          const player = playerMap.get(captain.playerId);
          const canRally = captain.perks.includes('rally_cry') && captain.rallyCooldown === 0 && team.streak <= -3;
          return (
            <PixelPanel key={captain.playerId} title={captain.playerName} accent="gold">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant="gold">{player?.pos ?? 'CAPTAIN'}</PixelBadge>
                  <PixelBadge variant="cyan">{captain.captainMoments} moments</PixelBadge>
                  <PixelBadge variant={captain.rallyCooldown > 0 ? 'default' : 'green'}>
                    rally {captain.rallyCooldown > 0 ? `cd ${captain.rallyCooldown}w` : 'ready'}
                  </PixelBadge>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {captain.perks.map(perkBadge)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {captain.perks.map((perk) => (
                    <div key={`${captain.playerId}-${perk}`} style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                      {CAPTAIN_PERK_EFFECTS[perk]}
                    </div>
                  ))}
                </div>
                <PixelButton
                  accent={canRally ? 'green' : 'default'}
                  disabled={!canRally || pending === captain.playerId}
                  onClick={() => {
                    setPending(captain.playerId);
                    void triggerCaptainRally(captain.playerId).finally(() => setPending(null));
                  }}
                >
                  {pending === captain.playerId ? 'Rallying...' : canRally ? 'Trigger Rally' : 'Rally Locked'}
                </PixelButton>
              </div>
            </PixelPanel>
          );
        })}
      </div>

      {bench.length > 0 ? (
        <PixelPanel title="Leadership Bench" accent="cyan">
          <div style={autoGrid(220)}>
            {bench.map((player) => (
              <div key={player.id} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                border: '2px solid var(--mfd-border)',
                background: 'var(--mfd-bg-2)',
              }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                  <PlayerNameLink playerId={player.id} name={player.name} ovr={player.ovr} style={{ ...monoSm }} />
                  <PixelBadge variant="cyan">{player.ovr} OVR</PixelBadge>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  {player.pos} // exp {player.yearsExp} // age {player.age}
                </div>
                <PixelButton
                  accent="cyan"
                  disabled={pending === `captain:${player.id}`}
                  onClick={() => {
                    setPending(`captain:${player.id}`);
                    void electCaptain(player.id).finally(() => setPending(null));
                  }}
                >
                  {pending === `captain:${player.id}` ? 'Assigning...' : 'Make Captain'}
                </PixelButton>
              </div>
            ))}
          </div>
        </PixelPanel>
      ) : null}

      <PixelPanel title="Active Tensions" accent={lockerRoom.tensions.some((tension) => !tension.resolved) ? 'red' : 'green'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lockerRoom.tensions.filter((tension) => !tension.resolved).length > 0 ? lockerRoom.tensions.filter((tension) => !tension.resolved).map((tension) => (
            <div key={tension.id} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px',
              border: `2px solid ${tension.severity === 'serious' ? 'var(--mfd-red)' : tension.severity === 'moderate' ? 'var(--mfd-gold)' : 'var(--mfd-cyan)'}`,
              background: 'var(--mfd-bg-2)',
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <PixelBadge variant={severityAccent(tension.severity)}>{tension.severity.toUpperCase()}</PixelBadge>
                  <PixelBadge variant="default">{tension.type.replace(/_/g, ' ')}</PixelBadge>
                </div>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Week {tension.weekCreated}</span>
              </div>
              <div style={{ ...monoSm, color: 'var(--mfd-text)' }}>{tension.narrative}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {tension.involvedPlayerIds.map((playerId) => {
                  const player = playerMap.get(playerId);
                  return player ? (
                    <PixelBadge key={playerId} variant="cyan">{player.name}</PixelBadge>
                  ) : null;
                })}
              </div>
            </div>
          )) : (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No active tensions. The room is steady right now.</div>
          )}
        </div>
      </PixelPanel>
    </div>
  );
}
