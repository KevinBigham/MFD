import {
  MfdPanel, MfdBadge, MfdKpiGrid, MfdKpiCard,
  MfdRingProgress, MfdStepper,
} from '@mfd/design-system/components';
import {
  GraduationCap, Award, TrendingUp, Shield,
  Zap, Target, Brain, Heart,
} from 'lucide-react';

const MOCK_HC = {
  name: 'Mike Davis',
  archetype: 'Strategist',
  level: 7,
  xp: 340,
  traits: ['Film Junkie', 'Aggressive 4th'],
  skillBranch: 'Air Raid',
  skillTier: 2,
};

const MOCK_OC = {
  name: 'James Wilson',
  archetype: 'QB Guru',
  level: 5,
  specialty: 'Pass Architect',
  traits: ['QB Whisperer'],
};

const MOCK_DC = {
  name: 'Robert Taylor',
  archetype: 'Blitz Master',
  level: 6,
  specialty: 'Blitz Designer',
  traits: ['Blitz Packages', 'Ball Hawks'],
};

const SKILL_TREE_BRANCHES = [
  { id: 'air_raid', name: 'Air Raid', icon: <Zap size={14} />, tiers: [
    { label: 'Quick Release', unlocked: true },
    { label: 'Spread Master', unlocked: true },
    { label: 'Aerial Dominance', unlocked: false },
  ]},
  { id: 'ground_pound', name: 'Ground & Pound', icon: <Shield size={14} />, tiers: [
    { label: 'Power Run', unlocked: false },
    { label: 'Clock Killer', unlocked: false },
    { label: 'Steamroller', unlocked: false },
  ]},
  { id: 'analytics', name: 'Analytics King', icon: <Brain size={14} />, tiers: [
    { label: '4th Down Guru', unlocked: true },
    { label: 'Matchup Hunter', unlocked: false },
    { label: 'Moneyball', unlocked: false },
  ]},
];

const CLINIC_TRACKS = [
  { id: 'offense', label: 'Offensive Mind', xp: 45, maxXp: 80, perks: 1 },
  { id: 'defense', label: 'Defensive Architect', xp: 20, maxXp: 80, perks: 0 },
  { id: 'analytics', label: 'Analytics', xp: 35, maxXp: 80, perks: 1 },
  { id: 'leadership', label: 'Leadership', xp: 60, maxXp: 80, perks: 1 },
  { id: 'development', label: 'Player Dev', xp: 10, maxXp: 80, perks: 0 },
];

function CoachCard({ coach, role }: { coach: typeof MOCK_HC | typeof MOCK_OC; role: string }) {
  return (
    <MfdPanel title={`${role}: ${coach.name}`} icon={<GraduationCap size={14} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-sm)' }}>
        <div style={{ display: 'flex', gap: 'var(--mfd-sp-sm)', alignItems: 'center' }}>
          <MfdBadge variant="gold">{coach.archetype}</MfdBadge>
          <MfdBadge variant="info">Lvl {coach.level}</MfdBadge>
          {'specialty' in coach && coach.specialty && (
            <MfdBadge variant="purple">{coach.specialty}</MfdBadge>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--mfd-sp-xs)', flexWrap: 'wrap' }}>
          {coach.traits.map((t) => (
            <MfdBadge key={t} variant="default">{t}</MfdBadge>
          ))}
        </div>
      </div>
    </MfdPanel>
  );
}

export function CoachingStaff() {
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
        <CoachCard coach={MOCK_HC} role="HC" />
        <CoachCard coach={MOCK_OC} role="OC" />
        <CoachCard coach={MOCK_DC} role="DC" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mfd-sp-lg)' }}>
        {/* Skill Tree */}
        <MfdPanel title="HC Skill Tree: Strategist" icon={<Award size={14} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mfd-sp-lg)' }}>
            {SKILL_TREE_BRANCHES.map((branch) => (
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
            {CLINIC_TRACKS.map((track) => (
              <div key={track.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--mfd-sp-md)',
              }}>
                <MfdRingProgress
                  value={Math.round(track.xp / track.maxXp * 100)}
                  size={32}
                  strokeWidth={3}
                  color={track.perks > 0 ? 'var(--mfd-green)' : 'var(--mfd-cyan)'}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'var(--mfd-font-sans)', fontSize: '0.8125rem',
                    color: 'var(--mfd-text)',
                  }}>
                    {track.label}
                  </div>
                  <div style={{
                    fontFamily: 'var(--mfd-font-mono)', fontSize: '0.6875rem',
                    color: 'var(--mfd-text-dim)',
                  }}>
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
