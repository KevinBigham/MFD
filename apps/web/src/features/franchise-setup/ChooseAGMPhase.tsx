import { useEffect, useMemo, useState } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { getAGMProfiles, type AGMProfile, type PressureCard } from '@mfd/engine';
import { monoSm, pixelSm } from '../shared/pixelUi';
import { AGMStage } from './AGMStage';

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
  initialPreviewProfileId,
  topPressureId,
  teamName,
  crisisHeadline,
  weekOneThreat,
  recommendedProfileId,
  narrativeScenes,
  reducedMotion = false,
  onHire,
}: {
  committedProfileId: string | null;
  initialPreviewProfileId?: string | null;
  topPressureId: PressureCard['id'];
  teamName: string;
  crisisHeadline: string;
  weekOneThreat: string;
  recommendedProfileId: string;
  narrativeScenes: Record<string, {
    whyThisFits: string;
    dayOnePromise: string;
    seasonBet: string;
    recommended: boolean;
  }>;
  reducedMotion?: boolean;
  onHire: (profileId: string) => Promise<void> | void;
}) {
  const profiles = useMemo(() => getAGMProfiles(), []);
  const defaultPreviewId = initialPreviewProfileId ?? committedProfileId ?? profiles[0]?.id ?? null;
  const [previewProfileId, setPreviewProfileId] = useState<string | null>(defaultPreviewId);

  useEffect(() => {
    if (committedProfileId) {
      setPreviewProfileId(committedProfileId);
    }
  }, [committedProfileId]);

  useEffect(() => {
    if (!committedProfileId && initialPreviewProfileId) {
      setPreviewProfileId(initialPreviewProfileId);
    }
  }, [committedProfileId, initialPreviewProfileId]);

  const selectedProfile = profiles.find((profile) => profile.id === previewProfileId) ?? null;
  const dossierProfiles = profiles.filter((profile) => profile.id !== selectedProfile?.id);
  const selectedNarrative = selectedProfile ? narrativeScenes[selectedProfile.id] : null;

  const stageState = useMemo(() => {
    if (!selectedProfile) return 'enter' as const;
    if (
      (topPressureId === 'cap' && selectedProfile.expertise === 'cap_management')
      || (topPressureId === 'culture' && selectedProfile.expertise === 'personnel')
      || (topPressureId === 'roster' && (selectedProfile.expertise === 'defense' || selectedProfile.expertise === 'offense'))
    ) {
      return 'point' as const;
    }
    return 'talk' as const;
  }, [selectedProfile, topPressureId]);

  return (
    <AGMStage
      agm={selectedProfile ?? profiles[0]!}
      state={stageState}
      headline={crisisHeadline}
      subhead={weekOneThreat}
      reducedMotion={reducedMotion}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <PixelPanel accent="gold" padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>{teamName.toUpperCase()}</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
              The first voice in the room should match the first fire you need to put out.
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <PixelBadge variant="gold">TOP PRESSURE</PixelBadge>
              <PixelBadge variant="cyan">{topPressureId.toUpperCase()}</PixelBadge>
            </div>
          </div>
        </PixelPanel>

        {selectedProfile ? (
          <PixelPanel accent="gold" padding="lg">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>{selectedProfile.name.toUpperCase()}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '4px' }}>{selectedProfile.title}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {selectedNarrative?.recommended ? (
                    <PixelBadge variant="gold">RECOMMENDED FOR THIS CRISIS</PixelBadge>
                  ) : null}
                  <PixelBadge variant={PERSONALITY_BADGE[selectedProfile.personality]}>
                    {selectedProfile.personality.replace('_', ' ')}
                  </PixelBadge>
                  <PixelBadge variant={EXPERTISE_BADGE[selectedProfile.expertise]}>
                    {selectedProfile.expertise.replace('_', ' ')}
                  </PixelBadge>
                </div>
              </div>

              <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                {selectedProfile.background}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>WHY THIS FITS</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                  {selectedNarrative?.whyThisFits ?? selectedProfile.selectionPitch}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedProfile.strengths.map((strength) => (
                    <PixelBadge key={strength} variant="default">{strength}</PixelBadge>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>FIRST DAY 1 PROMISE</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                  {selectedNarrative?.dayOnePromise ?? selectedProfile.selectionPitch}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>SEASON 1 BET</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                  {selectedNarrative?.seasonBet ?? selectedProfile.selectionPitch}
                </div>
              </div>

              <div style={{ ...monoSm, color: 'var(--mfd-cyan)', lineHeight: 1.6 }}>
                &ldquo;{selectedProfile.catchphrase}&rdquo;
              </div>

              <PixelButton
                accent={committedProfileId === selectedProfile.id ? 'gold' : selectedProfile.cardAccent}
                onClick={() => { void onHire(selectedProfile.id); }}
                style={{ width: '100%' }}
              >
                {committedProfileId === selectedProfile.id ? 'Selected for Day 1' : `Hire ${selectedProfile.name}`}
              </PixelButton>
            </div>
          </PixelPanel>
        ) : null}

        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {dossierProfiles.map((profile) => {
            const accentColor = CARD_ACCENT_COLOR[profile.cardAccent];
            const narrative = narrativeScenes[profile.id];
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => setPreviewProfileId(profile.id)}
                style={{
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <PixelPanel accent={profile.cardAccent} padding="md" style={{ height: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ ...pixelSm, color: accentColor }}>{profile.name}</div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{profile.title}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {profile.id === recommendedProfileId || narrative?.recommended ? (
                        <PixelBadge variant="gold">REC</PixelBadge>
                      ) : null}
                      <PixelBadge variant={EXPERTISE_BADGE[profile.expertise]}>
                        {profile.expertise.replace('_', ' ')}
                      </PixelBadge>
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                      {narrative?.whyThisFits ?? profile.selectionPitch}
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-faint)' }}>Preview on stage</div>
                  </div>
                </PixelPanel>
              </button>
            );
          })}
        </div>
      </div>
    </AGMStage>
  );
}
