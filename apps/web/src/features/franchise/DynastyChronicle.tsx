import { useMemo } from 'react';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { selectUserTeam, useGameStore } from '../../app/store/game-store';
import { deriveDynastyId } from '../../lib/career-meta';
import { computeDynastyChronicle, type ChronicleEvent } from '../../lib/dynasty-chronicle';
import { PixelScreenHeader, monoSm, screenStackStyle, teamThemeVars } from '../shared/pixelUi';

function titleCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part[0] ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

function chronicleAccent(event: ChronicleEvent): 'default' | 'gold' | 'cyan' | 'green' {
  switch (event.type) {
    case 'championship_win':
    case 'hof_induction':
      return 'gold';
    case 'playoff_round':
      return 'cyan';
    case 'coach_championship':
    case 'coach_hire':
    case 'coach_retire':
      return 'green';
    case 'season_end':
    case 'scrapbook_note':
    default:
      return 'default';
  }
}

function chronicleTitle(event: ChronicleEvent): string {
  switch (event.type) {
    case 'championship_win':
      return 'Championship Won';
    case 'hof_induction':
      return 'Hall of Fame';
    case 'playoff_round':
      return `${titleCase(event.round)} Round`;
    case 'season_end':
      return 'Season End';
    case 'coach_championship':
      return 'Coach Championship';
    case 'coach_hire':
      return 'Coach Hire';
    case 'coach_retire':
      return 'Coach Retirement';
    case 'scrapbook_note':
    default:
      return 'Scrapbook Note';
  }
}

function chronicleBody(event: ChronicleEvent): string {
  switch (event.type) {
    case 'championship_win':
      return `${event.teamAbbr} finished ${event.record} and closed the year with a title.`;
    case 'hof_induction':
      return `${event.playerName} entered the Hall of Fame as a ${event.position}.`;
    case 'playoff_round':
      return `${titleCase(event.outcome)} // ${event.finalScore} // ${event.headline}`;
    case 'season_end':
      return `${event.teamAbbr} wrapped the season at ${event.record} with a ${titleCase(event.playoffFinish)} finish.`;
    case 'coach_championship':
      return `${event.coachName} guided the franchise to a championship season.`;
    case 'coach_hire':
      return `${event.coachName} took over the sideline.`;
    case 'coach_retire':
      return `${event.coachName} closed the coaching run.`;
    case 'scrapbook_note':
    default:
      return event.headline;
  }
}

export function DynastyChronicle({
  dynastyId: dynastyIdOverride,
}: {
  dynastyId?: string | null;
} = {}) {
  const game = useGameStore((state) => state.game);
  const userTeam = useGameStore(selectUserTeam);
  const dynastyId = dynastyIdOverride ?? (game ? deriveDynastyId(game) : null);
  const chronicle = useMemo(
    () => (game && dynastyId ? computeDynastyChronicle(game, dynastyId) : []),
    [dynastyId, game],
  );
  const years = [...new Set(chronicle.map((event) => event.year))];

  if (!game || !userTeam || !dynastyId) {
    return (
      <div style={{ ...screenStackStyle, ...teamThemeVars(userTeam?.id) }}>
        <PixelScreenHeader title="Dynasty Chronicle" subtitle="No dynasty is loaded." />
      </div>
    );
  }

  return (
    <div style={{ ...screenStackStyle, ...teamThemeVars(userTeam.id) }}>
      <PixelScreenHeader
        title="Dynasty Chronicle"
        subtitle={`${userTeam.city} ${userTeam.name} // one scroll across every archive`}
        badges={<PixelBadge variant="gold">CHRONICLE</PixelBadge>}
      />

      {chronicle.length === 0 ? (
        <PixelPanel title="Timeline" accent="default">
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            No chronicle events recorded for this dynasty yet. Complete seasons to build the timeline.
          </div>
        </PixelPanel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {years.map((year) => (
            <div key={year} data-testid="chronicle-year-boundary" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <PixelBadge variant="gold">{year}</PixelBadge>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  {chronicle.filter((event) => event.year === year).length} event(s)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chronicle.filter((event) => event.year === year).map((event) => {
                  const accent = chronicleAccent(event);
                  return (
                    <div
                      key={event.id}
                      data-testid="chronicle-event"
                      data-chronicle-kind={event.type}
                      data-chronicle-accent={accent}
                    >
                      <PixelPanel title={chronicleTitle(event)} accent={accent}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <PixelBadge variant={accent}>{titleCase(event.type)}</PixelBadge>
                          </div>
                          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>
                            {chronicleBody(event)}
                          </div>
                        </div>
                      </PixelPanel>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
