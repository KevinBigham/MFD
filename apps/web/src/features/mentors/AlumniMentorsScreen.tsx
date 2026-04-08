/**
 * AlumniMentorsScreen — Hire retired franchise legends as player mentors.
 * Each mentor boosts development for compatible roster players.
 */
import { useMemo } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { getAvailableMentors, calculateMentorEffects, type AlumniMentor } from '@mfd/engine';
import {
  selectRoster,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

function specialtyColor(spec: string): string {
  if (spec === 'technique') return 'var(--mfd-gold)';
  if (spec === 'leadership') return 'var(--mfd-cyan)';
  if (spec === 'film_study') return 'var(--mfd-green)';
  if (spec === 'conditioning') return 'var(--mfd-red, #ff4444)';
  return 'var(--mfd-text-dim)';
}

function ratingStars(rating: number): string {
  return '\u2605'.repeat(Math.min(rating, 5)) + '\u2606'.repeat(Math.max(0, 5 - rating));
}

export function AlumniMentorsScreen() {
  const game = useGameStore((s) => s.game);
  const roster = useGameStore(selectRoster);
  const hireMentor = useGameStore((s) => s.actions.hireMentor);
  const fireMentor = useGameStore((s) => s.actions.fireMentor);

  const activeMentors: AlumniMentor[] = (game as unknown as Record<string, unknown>)?.activeMentors as AlumniMentor[] ?? [];
  const mentorBudget: number = ((game as unknown as Record<string, unknown>)?.mentorBudget as number) ?? 2.5;

  const availableMentors = useMemo(() => {
    if (!game) return [];
    return getAvailableMentors(game);
  }, [game]);

  const mentorEffects = useMemo(() => {
    if (activeMentors.length === 0) return [];
    return calculateMentorEffects(activeMentors, roster);
  }, [activeMentors, roster]);

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Alumni Mentor Network"
        subtitle="Hire retired franchise legends to mentor active players. Each mentor boosts development for compatible position groups."
        badges={(
          <>
            <PixelBadge variant="gold">{activeMentors.length} Active Mentors</PixelBadge>
            <PixelBadge variant="green">${mentorBudget.toFixed(1)}M Budget</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Active Mentors" value={activeMentors.length} accent="gold" detail="Max 5 mentors per season" />
        <PixelMetricCard label="Budget Remaining" value={`$${mentorBudget.toFixed(1)}M`} accent="green" detail="$0.5M per mentor per year" />
        <PixelMetricCard label="Players Mentored" value={mentorEffects.length} accent="cyan" detail="Up to 3 per mentor" />
      </div>

      {/* Active Mentors */}
      {activeMentors.length > 0 && (
        <PixelPanel title="Active Mentors" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeMentors.map((mentor) => {
              const effects = mentorEffects.filter((e) => activeMentors.some((m) => m.position === mentor.position));
              return (
                <div key={mentor.playerId} style={{
                  display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center',
                  padding: '12px', border: '3px solid var(--mfd-gold)', background: 'rgba(255, 215, 0, 0.06)', flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ ...monoSm, color: '#fff', fontWeight: 600 }}>{mentor.name}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <PixelBadge variant="default">{mentor.position}</PixelBadge>
                      <PixelBadge variant="gold">Peak {mentor.peakOvr} OVR</PixelBadge>
                      <span style={{ ...pixelSm, color: specialtyColor(mentor.specialty) }}>
                        {mentor.specialty.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-gold)', marginTop: '4px' }}>
                      {ratingStars(mentor.mentorRating)} ({mentor.mentorRating}/5)
                    </div>
                  </div>
                  <PixelButton accent="red" onClick={() => void fireMentor(mentor.playerId)}>
                    Release
                  </PixelButton>
                </div>
              );
            })}
          </div>
        </PixelPanel>
      )}

      {/* Mentor Effects */}
      {mentorEffects.length > 0 && (
        <PixelPanel title="Mentoring Effects" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mentorEffects.map((effect) => (
              <div key={effect.targetPlayerId} style={{
                display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center',
                padding: '8px 12px', border: '2px solid var(--mfd-border)', background: 'var(--mfd-bg-2)',
              }}>
                <span style={{ ...monoSm, color: '#fff' }}>{effect.description}</span>
                <PixelBadge variant="green">+{(effect.devBonus * 100).toFixed(0)}% DEV</PixelBadge>
              </div>
            ))}
          </div>
        </PixelPanel>
      )}

      {/* Available Mentors */}
      <PixelPanel title="Available Alumni" accent="green">
        {availableMentors.length === 0 ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            No alumni are available for mentoring yet. Franchise legends and HOF inductees become available after retirement.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {availableMentors.map((mentor) => {
              const alreadyHired = activeMentors.some((m) => m.playerId === mentor.playerId);
              const canAfford = mentorBudget >= 0.5;
              return (
                <div key={mentor.playerId} style={{
                  display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center',
                  padding: '12px', border: '3px solid var(--mfd-border)', background: 'var(--mfd-bg-3)', flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ ...monoSm, color: '#fff', fontWeight: 600 }}>{mentor.name}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <PixelBadge variant="default">{mentor.position}</PixelBadge>
                      <PixelBadge variant="cyan">Peak {mentor.peakOvr}</PixelBadge>
                      <span style={{ ...pixelSm, color: specialtyColor(mentor.specialty) }}>
                        {mentor.specialty.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '4px' }}>
                      {ratingStars(mentor.mentorRating)} // $0.5M/yr
                    </div>
                  </div>
                  <PixelButton
                    accent={alreadyHired ? 'default' : canAfford ? 'green' : 'default'}
                    disabled={alreadyHired || !canAfford}
                    onClick={() => void hireMentor(mentor.playerId)}
                  >
                    {alreadyHired ? 'Hired' : canAfford ? 'Hire Mentor' : 'No Budget'}
                  </PixelButton>
                </div>
              );
            })}
          </div>
        )}
      </PixelPanel>
    </div>
  );
}
