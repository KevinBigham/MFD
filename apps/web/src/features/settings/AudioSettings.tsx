import {
  PixelBadge,
  PixelButton,
  PixelPanel,
  PixelSwitch,
} from '@mfd/design-system/components';
import type { AudioCategory } from '../../app/store/audio-preferences';
import type { AudioControls } from '../audio/AudioManager';
import { monoSm } from '../shared/pixelUi';

const CATEGORY_CONFIG: Array<{
  id: AudioCategory;
  label: string;
  description: string;
  previewEvent?: Parameters<AudioControls['play']>[0];
}> = [
  {
    id: 'ui',
    label: 'UI',
    description: 'Clicks, navigation pings, overlays, and control-room feedback.',
    previewEvent: 'ui_click',
  },
  {
    id: 'sfx',
    label: 'SFX',
    description: 'Draft picks, game beats, injuries, championships, and roster moments.',
    previewEvent: 'draft_pick',
  },
  {
    id: 'ambient',
    label: 'Ambient',
    description: 'Crowd beds on broadcast routes and office hum on roster/scouting screens.',
  },
];

interface AudioSettingsProps {
  audio: AudioControls;
  title?: string;
  type?: 'range';
  previewLabel?: string;
  onTestSound?: () => void;
}

export function AudioSettings({
  audio,
  title = 'Audio',
  type = 'range',
  previewLabel = 'Test Sound',
  onTestSound,
}: AudioSettingsProps) {
  const previewHandler = onTestSound ?? (() => audio.play('notification', { debounceMs: 0 }));

  return (
    <PixelPanel title={title} accent="gold">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ ...monoSm, color: '#fff' }}>Broadcast Mix</span>
            <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
              Master toggle plus local category sliders. Stored outside the dynasty save.
            </span>
          </div>
          <PixelButton
            type="button"
            accent={audio.masterEnabled ? 'green' : 'red'}
            onClick={audio.toggleMute}
          >
            {audio.masterEnabled ? 'Mute All Audio' : 'Enable Audio'}
          </PixelButton>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant={audio.masterEnabled ? 'green' : 'red'}>
            {audio.masterEnabled ? 'MASTER ON' : 'MASTER OFF'}
          </PixelBadge>
          <PixelBadge variant={audio.categories.ui.enabled ? 'cyan' : 'default'}>
            UI {audio.categories.ui.enabled ? `${audio.categories.ui.volume}%` : 'OFF'}
          </PixelBadge>
          <PixelBadge variant={audio.categories.sfx.enabled ? 'gold' : 'default'}>
            SFX {audio.categories.sfx.enabled ? `${audio.categories.sfx.volume}%` : 'OFF'}
          </PixelBadge>
          <PixelBadge variant={audio.categories.ambient.enabled ? 'green' : 'default'}>
            AMBIENT {audio.categories.ambient.enabled ? `${audio.categories.ambient.volume}%` : 'OFF'}
          </PixelBadge>
        </div>

        {CATEGORY_CONFIG.map((category) => {
          const categoryState = audio.categories[category.id];
          const disabled = !audio.masterEnabled;

          return (
            <div
              key={category.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '10px',
                border: '3px solid var(--mfd-border)',
                background: 'var(--mfd-bg-3)',
              }}
            >
              <PixelSwitch
                checked={categoryState.enabled}
                accent={category.id === 'ambient' ? 'green' : category.id === 'ui' ? 'cyan' : 'gold'}
                label={category.label}
                description={category.description}
                disabled={disabled}
                onChange={(checked) => audio.setAudioCategoryEnabled(category.id, checked)}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ ...monoSm, color: '#fff' }}>Volume</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <PixelBadge variant={categoryState.enabled && audio.masterEnabled ? 'green' : 'default'}>
                    {categoryState.enabled && audio.masterEnabled ? `${categoryState.volume}%` : 'OFF'}
                  </PixelBadge>
                  {category.previewEvent ? (
                    <PixelButton
                      type="button"
                      accent="default"
                      disabled={disabled || !categoryState.enabled || categoryState.volume === 0}
                      onClick={category.id === 'ui'
                        ? previewHandler
                        : () => audio.play(category.previewEvent!, {
                          debounceMs: 0,
                          debounceKey: `preview:${category.id}:${categoryState.volume}`,
                        })}
                    >
                      {category.id === 'ui' ? previewLabel : 'Preview'}
                    </PixelButton>
                  ) : null}
                </div>
              </div>

              <input
                type={type}
                min={0}
                max={100}
                value={categoryState.volume}
                disabled={disabled || !categoryState.enabled}
                onChange={(event) => audio.setAudioCategoryVolume(category.id, Number(event.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  appearance: 'none',
                  background: disabled || !categoryState.enabled ? 'var(--mfd-bg-2)' : 'var(--mfd-gold)',
                  border: '1px solid var(--mfd-border)',
                  cursor: disabled || !categoryState.enabled ? 'not-allowed' : 'pointer',
                  accentColor: category.id === 'ambient' ? 'var(--mfd-green)' : category.id === 'ui' ? 'var(--mfd-cyan)' : 'var(--mfd-gold)',
                }}
              />
            </div>
          );
        })}
      </div>
    </PixelPanel>
  );
}
