import { useEffect, useMemo, useRef, useState } from 'react';
import { PixelButton, PixelPanel } from '@mfd/design-system/components';
import type { GameState, Team } from '@mfd/engine';
import { selectUserTeam, useGameStore } from '../../app/store/game-store';
import { TeamLogo } from '../shared/TeamLogo';
import { useReducedMotionPreference } from '../shared/transitions/RouteTransition';
import { display, monoSm, pixelSm } from '../shared/pixelUi';

export interface ChampionshipSnapshot {
  key: string;
  year: number;
  teamCity: string;
  teamName: string;
  teamAbbrev: string;
  seasonRecord: string;
}

export interface ChampionshipParadeResolution {
  currentChampionship: ChampionshipSnapshot | null;
  previousKey: string | null;
  firedKeys: ReadonlySet<string>;
}

export function resolveChampionshipParadeEvent({
  currentChampionship,
  previousKey,
  firedKeys,
}: ChampionshipParadeResolution): ChampionshipSnapshot | null {
  if (!currentChampionship || !previousKey) return null;
  if (currentChampionship.key === previousKey) return null;
  if (firedKeys.has(currentChampionship.key)) return null;
  return currentChampionship;
}

function latestUserChampionship(game: GameState | null, userTeam: Team | null): ChampionshipSnapshot | null {
  if (!game || !userTeam) return null;
  const latest = [...game.franchiseHistory]
    .filter((entry) => entry.teamId === userTeam.id && entry.playoffFinish === 'champion')
    .sort((left, right) => right.year - left.year)[0] ?? null;

  if (!latest) return null;

  return {
    key: `${userTeam.id}:${latest.year}`,
    year: latest.year,
    teamCity: userTeam.city,
    teamName: userTeam.name,
    teamAbbrev: userTeam.icon,
    seasonRecord: `${latest.wins}-${latest.losses}${latest.ties ? `-${latest.ties}` : ''}`,
  };
}

export function ChampionshipParadeEmitterView({
  championship,
  reducedMotion,
  onDismiss,
}: {
  championship: ChampionshipSnapshot | null;
  reducedMotion: boolean;
  onDismiss: () => void;
}) {
  if (!championship) return null;

  return (
    <div
      data-championship-parade="true"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      role="dialog"
      aria-label="Championship parade"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9997,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--mfd-sp-xl)',
        background: 'var(--mfd-bg)',
        animation: reducedMotion ? 'none' : 'mfdRouteEnter 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      <PixelPanel title="Championship Parade" accent="gold" style={{ width: 'min(560px, 100%)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', textAlign: 'center', alignItems: 'center' }}>
          <TeamLogo icon={championship.teamAbbrev} size={80} />
          <div style={{ ...pixelSm, color: 'var(--mfd-cyan)', textTransform: 'uppercase' }}>
            Season {championship.year} | {championship.seasonRecord}
          </div>
          <div style={{ ...display, color: 'var(--mfd-gold)', fontSize: '32px', lineHeight: 1.1 }}>
            {championship.teamCity} {championship.teamName}
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            The city gets its parade route. The banner goes up. The dynasty ledger records another championship.
          </div>
          <div>
            <PixelButton accent="gold" onClick={onDismiss}>Continue</PixelButton>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}

export function ChampionshipParadeEmitter() {
  const game = useGameStore((state) => state.game);
  const userTeam = useGameStore(selectUserTeam);
  const reducedMotion = useReducedMotionPreference();
  const currentChampionship = useMemo(() => latestUserChampionship(game, userTeam), [game, userTeam]);
  const previousKey = useRef<string | null>(currentChampionship?.key ?? null);
  const firedKeys = useRef<Set<string>>(new Set());
  const [championship, setChampionship] = useState<ChampionshipSnapshot | null>(null);

  useEffect(() => {
    const event = resolveChampionshipParadeEvent({
      currentChampionship,
      previousKey: previousKey.current,
      firedKeys: firedKeys.current,
    });

    if (currentChampionship) {
      previousKey.current = currentChampionship.key;
    }

    if (!event) return;
    firedKeys.current.add(event.key);
    setChampionship(event);
  }, [currentChampionship]);

  return (
    <ChampionshipParadeEmitterView
      championship={championship}
      reducedMotion={reducedMotion}
      onDismiss={() => setChampionship(null)}
    />
  );
}
