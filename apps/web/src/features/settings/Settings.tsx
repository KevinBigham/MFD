import { useMemo } from 'react';
import { DIFF_SETTINGS, validateGameState, type DifficultyLevel } from '@mfd/engine';
import { useAudio } from '../audio/AudioManager';
import {
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelSwitch,
} from '@mfd/design-system/components';
import {
  selectDifficultyState,
  selectFacilities,
  selectMedicalStaff,
  selectPhase,
  selectUserTeam,
  useGameStore,
} from '../../app/store/game-store';
import { useUiStore } from '../../app/store/ui-store';
import {
  PixelMetricCard,
  PixelScreenHeader,
  autoGrid,
  monoSm,
  screenStackStyle,
} from '../shared/pixelUi';

const difficultyOrder: DifficultyLevel[] = ['rookie', 'pro', 'allpro', 'legend'];
const simSpeeds = ['fast', 'normal', 'detailed'] as const;

const facilityLabels: Record<string, string> = {
  training_complex: 'Training Complex',
  medical_center: 'Medical Center',
  film_room: 'Film Room',
  weight_room: 'Weight Room',
  recovery_suite: 'Recovery Suite',
};

function facilityEffectCopy(type: string, level: number): string {
  if (type === 'training_complex') return `Training XP x${(1 + level * 0.05).toFixed(2)}`;
  if (type === 'medical_center') return `Recovery x${(1 + level * 0.05).toFixed(2)}`;
  if (type === 'film_room') return `Scouting x${(1 + (level === 3 ? 0.1 : level * 0.03)).toFixed(2)}`;
  if (type === 'weight_room') return `Fatigue gain x${(1 - level * 0.03 - (level === 3 ? 0.01 : 0)).toFixed(2)}`;
  return `Injury risk x${(1 - level * 0.05).toFixed(2)}`;
}

function isDebugModeEnabled(): boolean {
  const locationRef = typeof window !== 'undefined'
    ? window.location
    : typeof globalThis.location !== 'undefined'
      ? globalThis.location
      : null;
  if (!locationRef) return false;
  if (new URLSearchParams(locationRef.search).get('debug') === '1') return true;
  const hashQuery = locationRef.hash.includes('?') ? locationRef.hash.split('?')[1] ?? '' : '';
  return new URLSearchParams(hashQuery).get('debug') === '1';
}

export function Settings() {
  const game = useGameStore((state) => state.game);
  const team = useGameStore(selectUserTeam);
  const difficulty = useGameStore((state) => state.game?.difficulty ?? 'pro');
  const halftimeDecisions = useGameStore((state) => state.game?.settings.halftimeDecisions ?? (difficulty === 'rookie' ? 'off' : 'on'));
  const difficultyState = useGameStore(selectDifficultyState);
  const facilities = useGameStore(selectFacilities);
  const medicalStaff = useGameStore(selectMedicalStaff);
  const phase = useGameStore(selectPhase);
  const setDifficulty = useGameStore((state) => state.actions.setDifficulty);
  const setHalftimeDecisions = useGameStore((state) => state.actions.setHalftimeDecisions);
  const setAdaptiveDifficultyEnabled = useGameStore((state) => state.actions.setAdaptiveDifficultyEnabled);
  const upgradeFacility = useGameStore((state) => state.actions.upgradeFacility);
  const hireMedicalStaff = useGameStore((state) => state.actions.hireMedicalStaff);
  const autosaveEnabled = useUiStore((state) => state.autosaveEnabled);
  const setAutosaveEnabled = useUiStore((state) => state.setAutosaveEnabled);
  const simSpeed = useUiStore((state) => state.simSpeed);
  const setSimSpeed = useUiStore((state) => state.setSimSpeed);
  const audio = useAudio();
  const currentMedical = medicalStaff.current;
  const availableMedicalStaff = medicalStaff.available;
  const medicalHiringOpen = phase === 'offseason';
  const debugModeEnabled = isDebugModeEnabled();
  const invariantResult = useMemo(
    () => (debugModeEnabled && game ? validateGameState(game) : null),
    [debugModeEnabled, game],
  );

  return (
    <div style={screenStackStyle}>
      <PixelScreenHeader
        title="Settings"
        subtitle="Difficulty, autosave behavior, sim pacing, and studio identity all in one control room."
        badges={(
          <>
            <PixelBadge variant="gold">{DIFF_SETTINGS[difficulty].name}</PixelBadge>
            <PixelBadge variant={autosaveEnabled ? 'green' : 'red'}>
              Autosave {autosaveEnabled ? 'On' : 'Off'}
            </PixelBadge>
            <PixelBadge variant={difficultyState.enabled ? 'cyan' : 'default'}>
              Adaptive {difficultyState.enabled ? 'On' : 'Off'}
            </PixelBadge>
            <PixelBadge variant="green">
              Facilities ${facilities.budget}
            </PixelBadge>
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Difficulty" value={DIFF_SETTINGS[difficulty].name} accent="gold" detail={DIFF_SETTINGS[difficulty].desc} />
        <PixelMetricCard label="Autosave" value={autosaveEnabled ? 'ON' : 'OFF'} accent={autosaveEnabled ? 'green' : 'red'} detail="Apply to weekly advances and state-changing actions" />
        <PixelMetricCard label="Sim Speed" value={simSpeed.toUpperCase()} accent="cyan" detail="UI preference stored locally, outside the save file" />
        <PixelMetricCard label="Halftime Hell" value={halftimeDecisions.toUpperCase()} accent={halftimeDecisions === 'on' ? 'gold' : 'default'} detail={difficulty === 'rookie' ? 'Locked off on rookie difficulty' : 'Saved with the dynasty and interrupts user games'} />
        <PixelMetricCard
          label="Adaptive Difficulty"
          value={difficultyState.enabled ? 'ON' : 'OFF'}
          accent={difficultyState.enabled ? 'cyan' : 'default'}
          detail={difficultyState.enabled
            ? `League slider ${difficultyState.adaptiveSlider}/100`
            : 'Fixed difficulty — AI teams play at their natural level'}
        />
        <PixelMetricCard
          label="Facility Budget"
          value={`$${facilities.budget}`}
          accent={facilities.budget >= 6 ? 'green' : facilities.budget >= 3 ? 'gold' : 'red'}
          detail="Available for upgrades at any point in the season"
        />
        <PixelMetricCard
          label="Medical Staff"
          value={currentMedical?.tier.toUpperCase() ?? 'NONE'}
          accent={currentMedical?.tier === 'elite' ? 'gold' : currentMedical ? 'cyan' : 'red'}
          detail={currentMedical ? currentMedical.name : medicalHiringOpen ? 'Hire from the offseason pool below' : 'Hiring reopens during the offseason'}
        />
      </div>

      <PixelPanel title="Difficulty" accent="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {difficultyOrder.map((level) => {
            const config = DIFF_SETTINGS[level];
            return (
              <div key={level} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ ...monoSm, color: '#fff' }}>{config.name}</span>
                    <PixelBadge variant={level === difficulty ? 'gold' : 'default'}>{level}</PixelBadge>
                  </div>
                  <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{config.desc}</span>
                </div>
                <PixelButton type="button" accent={level === difficulty ? 'gold' : 'default'} onClick={() => void setDifficulty(level)}>
                  {level === difficulty ? 'Current' : 'Set Difficulty'}
                </PixelButton>
              </div>
            );
          })}
        </div>
      </PixelPanel>

      <div style={autoGrid(320)}>
        <PixelPanel title="Simulation Preferences" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PixelSwitch
              checked={difficultyState.enabled}
              accent="cyan"
              label="Adaptive Difficulty"
              description={difficultyState.enabled
                ? 'AI teams subtly adjust to your performance. Winning streaks get tougher, losing streaks get gentler.'
                : 'Fixed difficulty — AI teams play at their natural level'}
              onChange={(checked) => { void setAdaptiveDifficultyEnabled(checked); }}
            />

            <PixelSwitch
              checked={halftimeDecisions === 'on'}
              disabled={difficulty === 'rookie'}
              accent="gold"
              label="Halftime Hell"
              description={difficulty === 'rookie'
                ? 'Rookie difficulty keeps halftime decisions off to avoid extra interruption.'
                : 'Pause user games at halftime for a stick, switch, or gamble decision.'}
              onChange={(checked) => { void setHalftimeDecisions(checked ? 'on' : 'off'); }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ ...monoSm, color: '#fff' }}>Autosave</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  Disable if you want manual save control during testing.
                </span>
              </div>
              <PixelButton
                type="button"
                accent={autosaveEnabled ? 'green' : 'red'}
                onClick={() => setAutosaveEnabled(!autosaveEnabled)}
              >
                {autosaveEnabled ? 'Disable Autosave' : 'Enable Autosave'}
              </PixelButton>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ ...monoSm, color: '#fff' }}>Sim Speed</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {simSpeeds.map((speed) => (
                  <PixelButton
                    key={speed}
                    type="button"
                    accent={speed === simSpeed ? 'cyan' : 'default'}
                    onClick={() => setSimSpeed(speed)}
                  >
                    {speed}
                  </PixelButton>
                ))}
              </div>
            </div>
          </div>
        </PixelPanel>

        <PixelPanel title="Audio" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ ...monoSm, color: '#fff' }}>Sound Effects</span>
                <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                  28 procedural SFX — UI feedback, game events, milestones.
                </span>
              </div>
              <PixelButton
                type="button"
                accent={audio.muted ? 'red' : 'green'}
                onClick={audio.toggleMute}
              >
                {audio.muted ? 'Unmute Audio' : 'Mute Audio'}
              </PixelButton>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ ...monoSm, color: '#fff' }}>Volume</span>
                <PixelBadge variant={audio.muted ? 'red' : 'green'}>
                  {audio.muted ? 'MUTED' : `${Math.round(audio.volume * 100)}%`}
                </PixelBadge>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(audio.volume * 100)}
                onChange={(e) => audio.setVolume(Number(e.target.value) / 100)}
                disabled={audio.muted}
                style={{
                  width: '100%',
                  height: '6px',
                  appearance: 'none',
                  background: audio.muted ? 'var(--mfd-bg-2)' : 'var(--mfd-gold)',
                  border: '1px solid var(--mfd-border)',
                  cursor: audio.muted ? 'not-allowed' : 'pointer',
                  accentColor: 'var(--mfd-gold)',
                }}
              />
            </div>

            <PixelButton
              type="button"
              accent="cyan"
              onClick={() => audio.play('notification')}
              disabled={audio.muted}
            >
              Test Sound
            </PixelButton>
          </div>
        </PixelPanel>

        <PixelPanel title="About" accent="green">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ ...monoSm, color: '#fff' }}>Mr. Football Dynasty</span>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Browser dynasty simulation built for long-horizon franchise storytelling, roster economics, and repeatable seeded outcomes.
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">8-Bit ESPN</PixelBadge>
              <PixelBadge variant="cyan">Seeded Engine</PixelBadge>
              <PixelBadge variant="green">Dynasty Legacy</PixelBadge>
            </div>
          </div>
        </PixelPanel>
      </div>

      <div style={autoGrid(360)}>
        <PixelPanel title="Facilities" accent="gold">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...monoSm, color: '#fff' }}>Budget Remaining</span>
              <PixelBadge variant={facilities.budget >= 6 ? 'green' : facilities.budget >= 3 ? 'gold' : 'red'}>
                ${facilities.budget}
              </PixelBadge>
            </div>
            {facilities.facilities.map((facility) => {
              const upgradeCost = facility.level >= 3 ? null : facilities.upgradeCosts[facility.type][facility.level - 1] ?? null;
              const canUpgrade = upgradeCost !== null && facilities.budget >= upgradeCost && team;
              return (
                <div
                  key={facility.type}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '10px',
                    border: '3px solid var(--mfd-border)',
                    background: 'var(--mfd-bg-3)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ ...monoSm, color: '#fff' }}>{facilityLabels[facility.type] ?? facility.type}</span>
                      <PixelBadge variant={facility.level === 3 ? 'gold' : 'cyan'}>{`L${facility.level}`}</PixelBadge>
                    </div>
                    <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                      {facilityEffectCopy(facility.type, facility.level)}
                    </span>
                  </div>
                  <PixelButton
                    type="button"
                    accent={canUpgrade ? 'gold' : 'default'}
                    disabled={!canUpgrade}
                    onClick={() => team && void upgradeFacility(team.id, facility.type)}
                  >
                    {facility.level >= 3 ? 'Maxed' : `Upgrade ${upgradeCost !== null ? `($${upgradeCost})` : ''}`}
                  </PixelButton>
                </div>
              );
            })}
          </div>
        </PixelPanel>

        <PixelPanel title="Medical Staff" accent={medicalHiringOpen ? 'cyan' : 'default'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentMedical ? (
              <div style={{ padding: '10px', border: '3px solid var(--mfd-cyan)', background: 'rgba(34, 211, 238, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ ...monoSm, color: '#fff' }}>{currentMedical.name}</div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                      {currentMedical.tier} // recovery x{currentMedical.recoveryBonus.toFixed(2)} // prevention x{currentMedical.preventionBonus.toFixed(2)}
                    </div>
                  </div>
                  <PixelBadge variant={currentMedical.tier === 'elite' ? 'gold' : currentMedical.tier === 'good' ? 'cyan' : 'default'}>
                    {currentMedical.tier}
                  </PixelBadge>
                </div>
              </div>
            ) : (
              <div style={{ ...monoSm, color: '#999', lineHeight: 1.6 }}>
                No medical lead is assigned right now. Average league treatment will hold until you make a hire.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...monoSm, color: '#fff' }}>Available Pool</span>
              <PixelBadge variant={medicalHiringOpen ? 'gold' : 'default'}>
                {medicalHiringOpen ? 'Offseason Open' : 'Offseason Only'}
              </PixelBadge>
            </div>

            {availableMedicalStaff.length === 0 ? (
              <div style={{ ...monoSm, color: '#888', lineHeight: 1.6 }}>
                {medicalHiringOpen
                  ? 'No staff remain in the current hiring pool.'
                  : 'Medical hiring opens in the offseason when the league refreshes the candidate pool.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availableMedicalStaff.slice(0, 5).map((staff) => (
                  <div key={staff.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px', border: '3px solid var(--mfd-border)', background: 'var(--mfd-bg-3)', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ ...monoSm, color: '#fff' }}>{staff.name}</div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                        {staff.tier} // recovery x{staff.recoveryBonus.toFixed(2)} // prevention x{staff.preventionBonus.toFixed(2)} // ${staff.salary.toFixed(1)}M
                      </div>
                    </div>
                    <PixelButton
                      type="button"
                      accent={medicalHiringOpen ? 'cyan' : 'default'}
                      disabled={!medicalHiringOpen || !team}
                      onClick={() => team && void hireMedicalStaff(team.id, staff.id)}
                    >
                      Hire Staff
                    </PixelButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PixelPanel>
      </div>

      {debugModeEnabled && invariantResult ? (
        <PixelPanel title="Invariant Debug" accent={invariantResult.valid ? 'green' : 'red'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant={invariantResult.valid ? 'green' : 'red'}>
                {invariantResult.valid ? 'State Clean' : `${invariantResult.violations.length} Violations`}
              </PixelBadge>
              <PixelBadge variant="default">Developer only</PixelBadge>
            </div>
            {invariantResult.valid ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                No invariant violations detected in the loaded save.
              </div>
            ) : (
              invariantResult.violations.map((violation, index) => (
                <div
                  key={`${violation.rule}-${index}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '10px',
                    border: '2px solid var(--mfd-border)',
                    background: 'var(--mfd-bg-3)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <PixelBadge variant={
                      violation.severity === 'critical' || violation.severity === 'high'
                        ? 'red'
                        : violation.severity === 'medium'
                          ? 'gold'
                          : 'default'
                    }
                    >
                      {violation.severity}
                    </PixelBadge>
                    <span style={{ ...monoSm, color: 'var(--mfd-text)' }}>{violation.rule}</span>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{violation.message}</div>
                </div>
              ))
            )}
          </div>
        </PixelPanel>
      ) : null}
    </div>
  );
}
