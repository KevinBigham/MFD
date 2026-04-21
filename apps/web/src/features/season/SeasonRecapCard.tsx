import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { buildSeasonRecap, getTeamContent, type SeasonRecap } from '@mfd/engine';
import { selectUserTeam, useGameStore } from '../../app/store/game-store';
import { EmptyState } from '../shared/EmptyState';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  display,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';
import { copyRecapAsText, exportRecapAsPng } from './recap-share';

function playoffLabel(playoffResult: SeasonRecap['playoffResult']): string {
  switch (playoffResult) {
    case 'champion':
      return 'Champion';
    case 'championship-loss':
      return 'Championship Loss';
    case 'conf-loss':
      return 'Conference Final Loss';
    case 'division-loss':
      return 'Division Round Loss';
    case 'wild-card-loss':
      return 'Wild Card Loss';
    case 'missed':
    default:
      return 'Missed Playoffs';
  }
}

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  const mod10 = value % 10;
  if (mod10 === 1) return `${value}st`;
  if (mod10 === 2) return `${value}nd`;
  if (mod10 === 3) return `${value}rd`;
  return `${value}th`;
}

function accentForPlayoffResult(playoffResult: SeasonRecap['playoffResult']) {
  if (playoffResult === 'champion') return 'gold' as const;
  if (playoffResult === 'missed') return 'red' as const;
  return 'cyan' as const;
}

function recapThemeVars(teamId: string): CSSProperties {
  const content = getTeamContent(teamId);
  return {
    '--mfd-recap-primary': content?.primaryColor ?? 'var(--mfd-gold)',
    '--mfd-recap-secondary': content?.secondaryColor ?? 'var(--mfd-cyan)',
    '--mfd-recap-tertiary': content?.tertiaryColor ?? 'var(--mfd-green)',
  } as CSSProperties;
}

function LeaderBlock({
  label,
  leader,
}: {
  label: string;
  leader: SeasonRecap['topPerformers']['passingLeader'];
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '10px',
        border: '2px solid var(--mfd-border)',
        background: 'var(--mfd-bg-2)',
      }}
    >
      <div style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>{label}</div>
      {leader ? (
        <>
          <div style={{ ...display, fontSize: '20px', color: 'var(--mfd-text)', lineHeight: 1 }}>{leader.playerName.toUpperCase()}</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            {leader.value.toLocaleString()} yards // {leader.gamesPlayed} GP // {leader.perGame.toFixed(1)} per game
          </div>
        </>
      ) : (
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>No qualified leader.</div>
      )}
    </div>
  );
}

export function SeasonRecapCard({
  recap,
}: {
  recap: SeasonRecap;
}) {
  const themeVars = recapThemeVars(recap.teamId);

  return (
    <section
      style={{
        ...themeVars,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        border: '3px solid var(--mfd-recap-secondary)',
        background: [
          'linear-gradient(180deg, rgba(0, 0, 0, 0.96) 0%, rgba(0, 0, 0, 1) 100%)',
          'repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0px, rgba(255, 255, 255, 0.03) 1px, transparent 1px, transparent 6px)',
        ].join(','),
        boxShadow: '0 0 0 2px var(--mfd-recap-primary) inset',
      }}
    >
      <PixelScreenHeader
        title={`${recap.teamCity} ${recap.teamName}`}
        subtitle={recap.teamMotto ?? 'Season recap archive'}
        kicker={`${recap.seasonYear} SEASON RECAP`}
        badges={(
          <>
            <PixelBadge variant="gold">{recap.teamAbbr}</PixelBadge>
            <PixelBadge variant="cyan">{playoffLabel(recap.playoffResult).toUpperCase()}</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(180)}>
        <PixelMetricCard
          label="Record"
          value={recap.record}
          detail={`${recap.wins} wins // ${recap.losses} losses${recap.ties ? ` // ${recap.ties} ties` : ''}`}
          accent="gold"
        />
        <PixelMetricCard
          label="Division Finish"
          value={ordinal(recap.divisionFinish)}
          detail={recap.division}
          accent="cyan"
        />
        <PixelMetricCard
          label="Conference Finish"
          value={ordinal(recap.conferenceFinish)}
          detail={recap.conference}
          accent="green"
        />
        <PixelMetricCard
          label="Playoff Result"
          value={playoffLabel(recap.playoffResult)}
          detail={recap.teamAwards.length > 0 ? recap.teamAwards.join(', ') : 'No team awards recorded'}
          accent={accentForPlayoffResult(recap.playoffResult)}
        />
      </div>

      <div style={autoGrid(280)}>
        <PixelPanel title="Season Story" accent="cyan">
          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>
            {recap.seasonStory}
          </div>
        </PixelPanel>
        <PixelPanel title="Breakouts" accent="green">
          {recap.breakoutCandidates.length === 0 ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
              No breakout candidates cleared the development threshold this season.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recap.breakoutCandidates.slice(0, 3).map((candidate) => (
                <div key={candidate.playerId} style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                  {candidate.playerName} // {candidate.pos} // +{candidate.ovrDelta} OVR
                </div>
              ))}
            </div>
          )}
        </PixelPanel>
      </div>

      <PixelPanel title="Top Performers" accent="gold">
        <div style={autoGrid(260)}>
          <LeaderBlock label="Passing Leader" leader={recap.topPerformers.passingLeader} />
          <LeaderBlock label="Rushing Leader" leader={recap.topPerformers.rushingLeader} />
        </div>
      </PixelPanel>
    </section>
  );
}

export function SeasonRecapScreen() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const [status, setStatus] = useState<string | null>(null);
  const recapRef = useRef<HTMLElement | null>(null);

  if (!game || !team) {
    return (
      <EmptyState
        title="Season Recap"
        reason="No active franchise is loaded."
        nextStep="Load or start a dynasty to generate a season recap."
      />
    );
  }

  const recap = buildSeasonRecap(game, team.id);
  if (!recap) {
    return (
      <EmptyState
        title="Season Recap"
        reason="The current season has not completed yet."
        nextStep="Advance into the next league year to unlock the recap card."
        actionLabel="Go To Advance Week"
        actionRoute="/week-advance"
      />
    );
  }

  const handleExportPng = async () => {
    if (!recapRef.current) return;
    const dataUrl = await exportRecapAsPng(recapRef.current);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${recap.teamAbbr}-${recap.seasonYear}-season-recap.png`;
    link.click();
    setStatus('PNG export ready.');
  };

  const handleCopyText = async () => {
    await copyRecapAsText(recap);
    setStatus('Plain-text recap copied.');
  };

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Season Recap"
        subtitle={`${recap.teamCity} ${recap.teamName} // ${recap.seasonYear}`}
        badges={(
          <>
            <PixelBadge variant="gold">SHARE CARD</PixelBadge>
            <PixelBadge variant="cyan">{recap.teamAbbr}</PixelBadge>
          </>
        )}
      />

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <PixelButton accent="gold" onClick={() => { void handleExportPng(); }}>
          Export PNG
        </PixelButton>
        <PixelButton accent="cyan" onClick={() => { void handleCopyText(); }}>
          Copy Text
        </PixelButton>
        {status ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', display: 'flex', alignItems: 'center' }}>
            {status}
          </div>
        ) : null}
      </div>

      <div ref={(node) => { recapRef.current = node; }}>
        <SeasonRecapCard recap={recap} />
      </div>
    </div>
  );
}
