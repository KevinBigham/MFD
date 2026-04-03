import { DIFF_SETTINGS, type DifficultyLevel } from '@mfd/engine';
import {
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelSwitch,
} from '@mfd/design-system/components';
import { selectDifficultyState, useGameStore } from '../../app/store/game-store';
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

export function Settings() {
  const difficulty = useGameStore((state) => state.game?.difficulty ?? 'pro');
  const difficultyState = useGameStore(selectDifficultyState);
  const setDifficulty = useGameStore((state) => state.actions.setDifficulty);
  const setAdaptiveDifficultyEnabled = useGameStore((state) => state.actions.setAdaptiveDifficultyEnabled);
  const autosaveEnabled = useUiStore((state) => state.autosaveEnabled);
  const setAutosaveEnabled = useUiStore((state) => state.setAutosaveEnabled);
  const simSpeed = useUiStore((state) => state.simSpeed);
  const setSimSpeed = useUiStore((state) => state.setSimSpeed);

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
          </>
        )}
      />

      <div style={autoGrid(220)}>
        <PixelMetricCard label="Difficulty" value={DIFF_SETTINGS[difficulty].name} accent="gold" detail={DIFF_SETTINGS[difficulty].desc} />
        <PixelMetricCard label="Autosave" value={autosaveEnabled ? 'ON' : 'OFF'} accent={autosaveEnabled ? 'green' : 'red'} detail="Apply to weekly advances and state-changing actions" />
        <PixelMetricCard label="Sim Speed" value={simSpeed.toUpperCase()} accent="cyan" detail="UI preference stored locally, outside the save file" />
        <PixelMetricCard
          label="Adaptive Difficulty"
          value={difficultyState.enabled ? 'ON' : 'OFF'}
          accent={difficultyState.enabled ? 'cyan' : 'default'}
          detail={difficultyState.enabled
            ? `League slider ${difficultyState.adaptiveSlider}/100`
            : 'Fixed difficulty — AI teams play at their natural level'}
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
    </div>
  );
}
