import { useEffect, useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { getAGMProfiles, type AGMProfile } from '@mfd/engine';
import { monoSm, pixelSm } from '../shared/pixelUi';

const PERSONALITY_BADGE: Record<AGMProfile['personality'], 'default' | 'gold' | 'cyan' | 'green' | 'red'> = {
  analytical: 'cyan',
  fiery: 'red',
  old_school: 'gold',
  player_whisperer: 'green',
};

const EXPERTISE_BADGE: Record<AGMProfile['expertise'], 'default' | 'gold' | 'cyan' | 'green' | 'red'> = {
  offense: 'gold',
  defense: 'red',
  personnel: 'green',
  cap_management: 'cyan',
};

const CARD_ACCENT_COLOR: Record<AGMProfile['cardAccent'], string> = {
  default: 'var(--mfd-border)',
  gold: 'var(--mfd-gold)',
  cyan: 'var(--mfd-cyan)',
  green: 'var(--mfd-green)',
  red: 'var(--mfd-red)',
};

export function ChooseAGMPhase({
  committedProfileId,
  onHire,
}: {
  committedProfileId: string | null;
  onHire: (profileId: string) => Promise<void> | void;
}) {
  const profiles = useMemo(() => getAGMProfiles(), []);
  const [previewProfileId, setPreviewProfileId] = useState<string | null>(committedProfileId ?? profiles[0]?.id ?? null);

  useEffect(() => {
    if (committedProfileId) {
      setPreviewProfileId(committedProfileId);
    }
  }, [committedProfileId]);

  const selectedProfile = profiles.find((profile) => profile.id === previewProfileId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PixelPanel accent="gold" padding="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>YOUR FIRST DECISION AS GM</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text)', fontSize: '14px' }}>
            Three candidates are waiting in the conference room.
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Hire the assistant GM who will shape your first read on the roster, the room, and the long-term build.
          </div>
        </div>
      </PixelPanel>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          alignItems: 'stretch',
        }}
      >
        {profiles.map((profile) => {
          const isPreviewed = previewProfileId === profile.id;
          const accent = isPreviewed ? 'gold' : profile.cardAccent;
          const accentColor = CARD_ACCENT_COLOR[isPreviewed ? 'gold' : profile.cardAccent];

          return (
            <div
              key={profile.id}
              onClick={() => setPreviewProfileId(profile.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setPreviewProfileId(profile.id);
                }
              }}
              role="button"
              tabIndex={0}
              style={{
                padding: 0,
                margin: 0,
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <PixelPanel
                accent={accent}
                padding="lg"
                style={{
                  height: '100%',
                  minHeight: '100%',
                  borderColor: isPreviewed ? 'var(--mfd-gold)' : undefined,
                  boxShadow: isPreviewed ? 'var(--mfd-shadow-sm)' : 'none',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '999px',
                        border: `2px solid ${accentColor}`,
                        background: 'var(--mfd-bg-3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...pixelSm,
                        color: accentColor,
                        fontSize: '16px',
                        flexShrink: 0,
                      }}
                    >
                      {profile.name.charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ ...pixelSm, color: accentColor, fontSize: '10px' }}>{profile.name}</div>
                      <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '4px' }}>{profile.title}</div>
                    </div>
                  </div>

                  <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                    {profile.background}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <PixelBadge variant={PERSONALITY_BADGE[profile.personality]}>
                      {profile.personality.replace('_', ' ')}
                    </PixelBadge>
                    <PixelBadge variant={EXPERTISE_BADGE[profile.expertise]}>
                      {profile.expertise.replace('_', ' ')}
                    </PixelBadge>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>STRENGTHS</div>
                    {profile.strengths.map((strength) => (
                      <div key={strength} style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>
                        {strength}
                      </div>
                    ))}
                  </div>

                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6, marginTop: 'auto' }}>
                    &ldquo;{profile.selectionPitch}&rdquo;
                  </div>

                  <PixelButton
                    accent={accent}
                    onClick={() => { void onHire(profile.id); }}
                    style={{ width: '100%' }}
                  >
                    Hire
                  </PixelButton>
                </div>
              </PixelPanel>
            </div>
          );
        })}
      </div>

      <PixelPanel accent={selectedProfile ? 'gold' : 'default'} padding="md">
        <div style={{ ...monoSm, color: selectedProfile ? 'var(--mfd-text)' : 'var(--mfd-text-dim)' }}>
          {selectedProfile
            ? `Selected: ${selectedProfile.name} — "${selectedProfile.catchphrase}"`
            : 'Selected: Choose a candidate to preview the hire.'}
        </div>
      </PixelPanel>
    </div>
  );
}
