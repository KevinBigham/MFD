import { useMemo, useState } from 'react';
import {
  PixelBadge,
  PixelButton,
  PixelNav,
  PixelPanel,
  PixelProgressBar,
  PixelSelect,
} from '@mfd/design-system/components';
import {
  buildCoachRetentionDecision,
  CLINIC_TRACKS,
  DEF_SCHEMES,
  getCoachArchetype,
  getTreeKey,
  OFF_SCHEMES,
  projectSchemeTransition,
  SKILL_TREES,
  type StaffCandidate,
  type StaffMember,
  type StaffRole,
} from '@mfd/engine';
import {
  selectClinic,
  selectCoachingMarket,
  selectCoachingStaff,
  selectUserTeam,
  useGameStore,
} from '../../app/store/game-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  navigateTo,
  pixelSm,
  screenStackStyle,
} from '../shared/pixelUi';

type CoachingTab = 'staff' | 'scheme' | 'development';

function accentForFit(score: number): 'default' | 'green' | 'cyan' | 'gold' | 'red' {
  if (score >= 84) return 'green';
  if (score >= 76) return 'cyan';
  if (score >= 68) return 'gold';
  return 'red';
}

function accentForRisk(poachRisk: number): 'default' | 'green' | 'cyan' | 'gold' | 'red' {
  if (poachRisk < 30) return 'green';
  if (poachRisk < 45) return 'cyan';
  if (poachRisk < 60) return 'gold';
  return 'red';
}

function CoachPanel({
  coach,
  role,
  onFire,
  onPromote,
  retention,
}: {
  coach: StaffMember | null | undefined;
  role: StaffRole;
  onFire: () => void;
  onPromote?: () => void;
  retention: ReturnType<typeof buildCoachRetentionDecision> | null;
}) {
  if (!coach) {
    return (
      <PixelPanel title={`${role} Seat`} accent="red">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>Vacant role. Hire from the market board to restore continuity.</span>
        </div>
      </PixelPanel>
    );
  }

  const ratings = Object.entries(coach.ratings).sort(([left], [right]) => left.localeCompare(right));
  const archetypeContent = getCoachArchetype(coach.archetype);
  const archetypeLine = archetypeContent?.press_conference[0] ?? null;

  return (
    <PixelPanel title={`${role}: ${coach.name}`} accent={role === 'HC' ? 'gold' : 'cyan'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">{coach.archetype}</PixelBadge>
          <PixelBadge variant="cyan">LVL {coach.level}</PixelBadge>
          <PixelBadge variant="default">TERM {coach.term ?? 0}</PixelBadge>
          <PixelBadge variant={accentForRisk(retention?.poachRisk ?? 40)}>
            {retention ? `POACH ${retention.poachRisk}` : 'STABLE'}
          </PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          Loyalty {coach.loyalty ?? 0} // Ambition {coach.ambition ?? 0}
          {' // '}
          Lean {coach.schemeLean?.offense ?? 'balanced'} / {coach.schemeLean?.defense ?? 'cover_3'}
        </div>
        {archetypeLine ? (
          <div style={{
            ...monoSm,
            color: 'var(--mfd-text)',
            lineHeight: 1.6,
            paddingLeft: '10px',
            borderLeft: '3px solid var(--mfd-cyan)',
          }}
          >
            Profile Tape: {archetypeLine}
          </div>
        ) : null}
        {retention ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{retention.reasoning}</div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ratings.map(([label, value]) => (
            <PixelProgressBar
              key={label}
              label={label.replace(/([A-Z])/g, ' $1').trim()}
              value={value}
              max={100}
              accent={accentForFit(value)}
              valueLabel={`${value}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onPromote ? (
            <PixelButton accent="gold" onClick={onPromote}>Promote To HC</PixelButton>
          ) : null}
          <PixelButton accent="red" onClick={onFire}>Fire</PixelButton>
        </div>
      </div>
    </PixelPanel>
  );
}

function CandidateCard({
  role,
  candidate,
  onHire,
}: {
  role: StaffRole;
  candidate: StaffCandidate;
  onHire: () => void;
}) {
  const archetypeContent = getCoachArchetype(candidate.archetype);
  const archetypeLine = archetypeContent?.press_conference[0] ?? null;

  return (
    <PixelPanel title={`${candidate.name} // ${role}`} accent={accentForFit(candidate.fitScore)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={accentForFit(candidate.fitScore)}>{candidate.fitScore} FIT</PixelBadge>
          <PixelBadge variant="gold">{candidate.archetype}</PixelBadge>
          <PixelBadge variant="default">{candidate.continuityTag}</PixelBadge>
        </div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          {candidate.schemeLean?.offense ?? 'balanced'} / {candidate.schemeLean?.defense ?? 'cover_3'}
          {' // '}
          Loyalty {candidate.loyalty ?? 0} // Ambition {candidate.ambition ?? 0}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {candidate.reasoning.slice(0, 2).map((line) => (
            <div key={line} style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{line}</div>
          ))}
        </div>
        {archetypeLine ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
            Profile Tape: {archetypeLine}
          </div>
        ) : null}
        <PixelButton accent="green" onClick={onHire}>Hire</PixelButton>
      </div>
    </PixelPanel>
  );
}

export function CoachingStaff() {
  const [tab, setTab] = useState<CoachingTab>('staff');
  const staff = useGameStore(selectCoachingStaff);
  const clinic = useGameStore(selectClinic);
  const team = useGameStore(selectUserTeam);
  const coachingMarket = useGameStore(selectCoachingMarket);
  const {
    addClinicXP,
    applyTeamSchemeChange,
    fireStaff,
    hireStaff,
    promoteStaff,
    refreshCoachingMarket,
    setHeadCoachSkillSelection,
  } = useGameStore((state) => state.actions);

  const [offenseScheme, setOffenseScheme] = useState(team?.schemeOff ?? team?.offScheme ?? 'balanced');
  const [defenseScheme, setDefenseScheme] = useState(team?.schemeDef ?? team?.defScheme ?? 'cover_3');

  const schemePreview = team ? projectSchemeTransition(team, offenseScheme, defenseScheme) : null;
  const retention = useMemo(() => {
    if (!team) return { hc: null, oc: null, dc: null };
    return {
      hc: team.staff.hc ? buildCoachRetentionDecision({ teams: { [team.id]: team } } as never, team.id, 'HC') : null,
      oc: team.staff.oc ? buildCoachRetentionDecision({ teams: { [team.id]: team } } as never, team.id, 'OC') : null,
      dc: team.staff.dc ? buildCoachRetentionDecision({ teams: { [team.id]: team } } as never, team.id, 'DC') : null,
    };
  }, [team]);

  const headCoach = team?.staff.hc ?? null;
  const treeKey = getTreeKey(headCoach?.archetype ?? 'Strategist');
  const tree = SKILL_TREES[treeKey];
  const selectedSkill = headCoach ? team?.skillSelections[headCoach.id] ?? null : null;
  const totalClinicXp = Object.values(clinic?.xp ?? {}).reduce((sum, value) => sum + value, 0);

  if (!team) {
    return null;
  }

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Coaching"
        subtitle="Run the sideline market, install your scheme identity, and sharpen the weekly edge."
        badges={(
          <>
            <PixelBadge variant={coachingMarket.hotSeat ? 'red' : 'green'}>
              {coachingMarket.hotSeat ? 'HOT SEAT' : 'OWNER STABLE'}
            </PixelBadge>
            <PixelBadge variant="cyan">{totalClinicXp} clinic XP</PixelBadge>
            <PixelBadge variant="gold">{team.schemeOff} / {team.schemeDef}</PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Continuity" value={schemePreview?.overallContinuity ?? 0} accent={(schemePreview?.overallContinuity ?? 0) >= 80 ? 'green' : 'gold'} detail="Current install stability across the building" />
        <PixelMetricCard label="Market Board" value={`${coachingMarket.candidates.HC.length}/${coachingMarket.candidates.OC.length}/${coachingMarket.candidates.DC.length}`} accent="cyan" detail="HC / OC / DC candidates loaded" />
        <PixelMetricCard label="Clinic Perks" value={clinic?.perks.length ?? 0} accent="green" detail="Unlocked staff modifiers from clinic work" />
      </div>

      <PixelNav
        activeKey={tab}
        wrap
        items={[
          { key: 'staff', label: 'Staff Market' },
          { key: 'scheme', label: 'Scheme Lab' },
          { key: 'development', label: 'Development' },
        ]}
        onSelect={(key) => setTab(key as CoachingTab)}
      />

      {tab === 'staff' ? (
        <>
          <div data-spotlight-target="chip.route.staff.beat-1" style={autoGrid(300)}>
            <CoachPanel coach={staff?.hc} role="HC" retention={retention.hc} onFire={() => { void fireStaff('HC'); }} />
            <CoachPanel coach={staff?.oc} role="OC" retention={retention.oc} onFire={() => { void fireStaff('OC'); }} onPromote={() => { void promoteStaff('OC'); }} />
            <CoachPanel coach={staff?.dc} role="DC" retention={retention.dc} onFire={() => { void fireStaff('DC'); }} onPromote={() => { void promoteStaff('DC'); }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
            <PixelButton accent="gold" onClick={() => { navigateTo('/coaching/tree'); }}>View Coaching Tree</PixelButton>
            <PixelButton accent="cyan" onClick={() => { void refreshCoachingMarket(); }}>Refresh Market</PixelButton>
          </div>

          <div data-spotlight-target="chip.route.staff.beat-2">
            {(['HC', 'OC', 'DC'] as const).map((role) => (
              <PixelPanel key={role} title={`${role} Candidate Board`} accent={role === 'HC' ? 'gold' : 'cyan'}>
                <div style={autoGrid(240)}>
                  {coachingMarket.candidates[role].slice(0, 3).map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      role={role}
                      candidate={candidate}
                      onHire={() => { void hireStaff(role, candidate); }}
                    />
                  ))}
                </div>
              </PixelPanel>
            ))}
          </div>
        </>
      ) : null}

      {tab === 'scheme' ? (
        <>
          <div style={autoGrid(260)}>
            <PixelPanel title="Offense Identity" accent="gold">
              <PixelSelect
                value={offenseScheme}
                onChange={(event) => setOffenseScheme(event.target.value)}
                options={OFF_SCHEMES.map((scheme) => ({ value: scheme.id, label: scheme.name }))}
                accent="gold"
              />
            </PixelPanel>
            <PixelPanel title="Defense Identity" accent="cyan">
              <PixelSelect
                value={defenseScheme}
                onChange={(event) => setDefenseScheme(event.target.value)}
                options={DEF_SCHEMES.map((scheme) => ({ value: scheme.id, label: scheme.name }))}
                accent="cyan"
              />
            </PixelPanel>
            <PixelPanel title="Install Forecast" accent={(schemePreview?.overallContinuity ?? 0) >= 80 ? 'green' : 'gold'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  Overall continuity {schemePreview?.overallContinuity ?? 0}
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  OFF progress {schemePreview?.offense.installProgress ?? 0} // DEF progress {schemePreview?.defense.installProgress ?? 0}
                </div>
                <PixelButton accent="green" onClick={() => { void applyTeamSchemeChange(offenseScheme, defenseScheme); }}>
                  Apply Identity
                </PixelButton>
              </div>
            </PixelPanel>
          </div>

          <PixelPanel title="Room Fit" accent="cyan">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {schemePreview?.snapshot.rooms.map((room) => (
                <PixelProgressBar
                  key={room.group}
                  label={`${room.group} // ${room.topPlayerName}`}
                  value={room.fitScore}
                  max={100}
                  accent={accentForFit(room.fitScore)}
                  valueLabel={`${room.fitScore}`}
                />
              ))}
            </div>
          </PixelPanel>
        </>
      ) : null}

      {tab === 'development' ? (
        <>
          <div style={autoGrid(320)}>
            <PixelPanel title="Head Coach Skill Tree" accent="gold">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  {headCoach ? `${headCoach.name} // ${treeKey}` : 'No head coach assigned.'}
                </div>
                {tree?.branches.map((branch) => {
                  const maxTier = branch.tiers.filter((tier) => (headCoach?.level ?? 0) >= tier.level).length;
                  const selectedTier = selectedSkill?.branch === branch.id ? selectedSkill.tier : 0;
                  return (
                    <div key={branch.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                        <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{branch.name}</span>
                        <PixelBadge variant={selectedTier > 0 ? 'green' : 'default'}>
                          {selectedTier > 0 ? `ACTIVE T${selectedTier}` : `OPEN T${maxTier}`}
                        </PixelBadge>
                      </div>
                      <PixelProgressBar
                        label={branch.tiers.map((tier) => tier.label).join(' / ')}
                        value={selectedTier}
                        max={Math.max(1, maxTier)}
                        accent={selectedTier > 0 ? 'green' : 'gold'}
                        valueLabel={`${selectedTier}/${maxTier}`}
                      />
                      {maxTier > 0 ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {Array.from({ length: maxTier }, (_, index) => index + 1).map((tier) => (
                            <PixelButton
                              key={`${branch.id}-${tier}`}
                              accent={selectedTier === tier ? 'green' : 'default'}
                              onClick={() => { void setHeadCoachSkillSelection(branch.id, tier); }}
                            >
                              Activate T{tier}
                            </PixelButton>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </PixelPanel>

            <PixelPanel title="Coaching Clinic" accent="green">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {CLINIC_TRACKS.map((track) => {
                  const xp = clinic?.xp[track.id] ?? 0;
                  const maxXp = track.perks[track.perks.length - 1]?.xpReq ?? 80;
                  return (
                    <div key={track.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <PixelProgressBar
                        label={`${track.label} // ${track.perks.map((perk) => perk.name).join(' / ')}`}
                        value={xp}
                        max={maxXp}
                        accent={xp >= maxXp ? 'green' : 'cyan'}
                        valueLabel={`${xp}/${maxXp}`}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                        <span style={{ ...pixelSm, color: 'var(--mfd-text-dim)' }}>{track.desc}</span>
                        <PixelButton accent="cyan" onClick={() => addClinicXP(team.id, track.id, 10)}>
                          Run Clinic +10
                        </PixelButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PixelPanel>
          </div>
        </>
      ) : null}
    </div>
  );
}
