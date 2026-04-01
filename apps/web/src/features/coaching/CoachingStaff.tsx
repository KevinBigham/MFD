import { useMemo } from 'react';
import {
  MfdPanel, MfdBadge, MfdRingProgress, MfdStepper,
} from '@mfd/design-system/components';
import {
  GraduationCap, Award, TrendingUp, Shield,
  Zap, Brain,
} from 'lucide-react';
import type { StaffMember } from '@mfd/engine';
import { SKILL_TREES, CLINIC_TRACKS as ENGINE_CLINIC_TRACKS } from '@mfd/engine';
import {
  useGameStore, selectUserTeam, selectCoachingStaff, selectClinic,
} from '../../app/store/game-store';

function CoachCard({ coach, role }: { coach: StaffMember; role: string }) {
  return (
    <MfdPanel title={`${role}: ${coach.name}`} icon={<GraduationCap size={14} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
        <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)', alignItems: 'center' }}>
          <MfdBadge variant="gold">{coach.archetype}</MfdBadge>
          <MfdBadge variant="info">Lvl {coach.level}</MfdBadge>
          {coach.specialty75 && (
            <MfdBadge variant="purple">{coach.specialty75.label}</MfdBadge>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--mfd-sp-xs)', flexWrap: 'wrap' }}>
          {coach.traits.map((t) => (
            <MfdBadge key={t} variant="default">{t}</MfdBadge>
          ))}
          {coach.traits.length === 0 && (
            <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)' }}>
              No traits
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)' }}>
          {Object.entries(coach.ratings).map(([k, v]) => (
            <span key={k} style={{ marginRight: 12 }}>{k}: {v}</span>
          ))}
        </div>
      </div>
    </MfdPanel>
  );
}

export function CoachingStaff() {
  const staff = useGameStore(selectCoachingStaff);
  const clinic = useGameStore(selectClinic);
  const team = useGameStore(selectUserTeam);

  const hc = staff?.hc;
  const oc = staff?.oc;
  const dc = staff?.dc;

  // Build skill tree display from engine SKILL_TREES
  const skillBranches = useMemo(() => {
    const icons: React.ReactNode[] = [<Zap size={14} />, <Shield size={14} />, <Brain size={14} />];
    const archetype = hc?.archetype ?? 'Strategist';
    const tree = SKILL_TREES[archetype];
    if (!tree) return [];
    return tree.branches.map((branch, i: number) => ({
      id: branch.id,
      name: branch.name,
      icon: icons[i] ?? <Zap size={14} />,
      tiers: branch.tiers.map((t: { level: number; label: string }) => ({
        label: t.label,
        unlocked: (team?.skillSelections[branch.id]?.tier ?? 0) >= t.level,
      })),
    }));
  }, [team, hc]);

  // Build clinic tracks display
  const clinicTracks = useMemo(() => {
    return ENGINE_CLINIC_TRACKS.map((track: { id: string; label: string; perks: readonly { xpReq: number }[] }) => {
      const xp = clinic?.xp[track.id] ?? 0;
      const maxXp = track.perks.length > 0 ? track.perks[track.perks.length - 1]!.xpReq : 80;
      const perksUnlocked = clinic?.perks.filter((p: string) => p.startsWith(track.id)).length ?? 0;
      return {
        id: track.id,
        label: track.label,
        xp,
        maxXp,
        perks: perksUnlocked,
      };
    });
  }, [clinic]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--mfd-font-serif)', fontSize: '1.375rem',
          fontWeight: 700, color: 'var(--mfd-text)', margin: 0,
        }}>Coaching Staff</h1>
        <p style={{
          fontFamily: 'var(--mfd-font-mono)', fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)', margin: '4px 0 0',
        }}>
          Staff management, skill trees, and coaching clinic
        </p>
      </div>

      {/* Staff Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {hc && <CoachCard coach={hc} role="HC" />}
        {oc && <CoachCard coach={oc} role="OC" />}
        {dc && <CoachCard coach={dc} role="DC" />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {/* Skill Tree */}
        <MfdPanel title={`HC Skill Tree${hc ? `: ${hc.archetype}` : ''}`} icon={<Award size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
            {skillBranches.map((branch) => (
              <div key={branch.id}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-sm)',
                  marginBottom: 'var(--mfd-sp-sm)',
                }}>
                  {branch.icon}
                  <span style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    {branch.name}
                  </span>
                </div>
                <MfdStepper
                  steps={branch.tiers.map((t) => ({
                    label: t.label,
                    description: t.unlocked ? 'Unlocked' : 'Locked',
                  }))}
                  activeStep={branch.tiers.filter((t) => t.unlocked).length}
                  orientation="horizontal"
                />
              </div>
            ))}
          </div>
        </MfdPanel>

        {/* Coaching Clinic XP */}
        <MfdPanel title="Coaching Clinic" icon={<TrendingUp size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-md)' }}>
            {clinicTracks.map((track) => (
              <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)' }}>
                <MfdRingProgress
                  value={track.maxXp > 0 ? Math.round(track.xp / track.maxXp * 100) : 0}
                  size={32} strokeWidth={3}
                  color={track.perks > 0 ? 'var(--mfd-green)' : 'var(--mfd-cyan)'}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem', color: 'var(--mfd-text)' }}>
                    {track.label}
                  </div>
                  <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem', color: 'var(--mfd-text-dim)' }}>
                    {track.xp}/{track.maxXp} XP // {track.perks} perk(s)
                  </div>
                </div>
                {track.perks > 0 && <MfdBadge variant="success">Unlocked</MfdBadge>}
              </div>
            ))}
          </div>
        </MfdPanel>
      </div>
    </div>
  );
}
