import { useState } from 'react';
import { Chip, ChipDialogueBubble, PixelBadge, PixelButton, PixelModal, PixelPanel, type ChipPose } from '@mfd/design-system/components';
import type { HalftimeDecisionChoice, PendingHalftimeDecision } from '@mfd/engine';
import { useGameStore } from '../../app/store/game-store';

const optionDescriptions: Record<HalftimeDecisionChoice, { title: string; detail: string }> = {
  stick: {
    title: 'Stick',
    detail: 'Keep the halftime calls. No first-drive boost and no late-drive penalty; choose it when the matchup is not the problem.',
  },
  switch: {
    title: 'Switch',
    detail: 'Change the plan after halftime. The first second-half drive starts slower while players adjust; later drives get a small lift.',
  },
  gamble: {
    title: 'Gamble',
    detail: 'Push for an immediate score. The first second-half drive gets the biggest lift; later drives get weaker if the push misses.',
  },
};

function cardAccent(choice: HalftimeDecisionChoice): 'default' | 'cyan' | 'gold' {
  if (choice === 'switch') return 'cyan';
  if (choice === 'gamble') return 'gold';
  return 'default';
}

function switchCopy(pending: PendingHalftimeDecision): string {
  return `${optionDescriptions.switch.detail} ${pending.suggestion.summary}`;
}

export const HALFTIME_CHIP_COPY =
  'Must Do: choose Stick, Switch, or Gamble before second half. Where: Halftime cards. Consequence: Stick keeps calls; Switch starts slower, then improves later drives; Gamble boosts drive one but weakens later drives if it misses.';

export function getHalftimeChipPose(
  previewChoice: HalftimeDecisionChoice | null,
  lockedIn: boolean,
  reducedMotion = false,
): ChipPose {
  if (lockedIn) return 'fist-bump';
  if (reducedMotion || !previewChoice) return 'time-out';
  if (previewChoice === 'stick') return 'coaching-crouch';
  if (previewChoice === 'switch') return 'calling-play';
  return 'frustrated';
}

interface HalftimeDecisionViewProps {
  pending: PendingHalftimeDecision | null;
  homeLabel: string;
  awayLabel: string;
  onChoose: (choice: HalftimeDecisionChoice) => void;
  onOpenChange?: (open: boolean) => void;
  reducedMotion?: boolean;
}

export function HalftimeDecisionView({
  pending,
  homeLabel,
  awayLabel,
  onChoose,
  onOpenChange = () => undefined,
  reducedMotion = false,
}: HalftimeDecisionViewProps) {
  const [previewChoice, setPreviewChoice] = useState<HalftimeDecisionChoice | null>(null);
  const [lockedIn, setLockedIn] = useState(false);

  if (!pending) return null;

  const chipPose = getHalftimeChipPose(previewChoice, lockedIn, reducedMotion);
  const setPreview = (choice: HalftimeDecisionChoice | null) => {
    if (!reducedMotion) setPreviewChoice(choice);
  };

  return (
    <PixelModal
      open
      onOpenChange={onOpenChange}
      title="Halftime Adjustment"
      description="Choose whether to keep the plan, adjust after drive one, or gamble on the first drive."
      accent="gold"
      width={720}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          data-halftime-chip-host="true"
          data-halftime-chip-pose={chipPose}
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr)',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <Chip pose={chipPose} size="md" reducedMotion={reducedMotion} ariaLabel="Chip hosts the halftime decision" />
          <ChipDialogueBubble
            text={HALFTIME_CHIP_COPY}
            pose={chipPose}
            pointer="left"
            reducedMotion={reducedMotion}
            monoBody
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PixelBadge variant="gold">HALFTIME</PixelBadge>
            <PixelBadge variant="default">{`WEEK ${pending.week}`}</PixelBadge>
          </div>
          <div style={{
            fontFamily: 'var(--mfd-font-display)',
            fontSize: '20px',
            color: 'var(--mfd-text)',
            letterSpacing: '1px',
          }}
          >
            {homeLabel.toUpperCase()} {pending.homeScore} - {pending.awayScore} {awayLabel.toUpperCase()}
          </div>
        </div>

        <PixelPanel title="Suggested Switch" accent="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelBadge variant="cyan">{pending.suggestion.responseLabel.toUpperCase()}</PixelBadge>
              <PixelBadge variant="default">{pending.suggestion.direction.replaceAll('_', ' ')}</PixelBadge>
            </div>
            <div style={{
              fontFamily: 'var(--mfd-font-mono)',
              fontSize: '11px',
              lineHeight: 1.6,
              color: 'var(--mfd-text)',
            }}
            >
              {pending.suggestion.reason}
            </div>
          </div>
        </PixelPanel>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
        >
          {(['stick', 'switch', 'gamble'] as const).map((choice) => (
            <PixelPanel key={choice} title={optionDescriptions[choice].title} accent={cardAccent(choice)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  fontFamily: 'var(--mfd-font-mono)',
                  fontSize: '11px',
                  lineHeight: 1.6,
                  color: 'var(--mfd-text)',
                  minHeight: '72px',
                }}
                >
                  {choice === 'switch' ? switchCopy(pending) : optionDescriptions[choice].detail}
                </div>
                <PixelButton
                  accent={choice === 'gamble' ? 'gold' : choice === 'switch' ? 'cyan' : 'default'}
                  onMouseEnter={() => setPreview(choice)}
                  onFocus={() => setPreview(choice)}
                  onMouseLeave={() => setPreview(null)}
                  onBlur={() => setPreview(null)}
                  onClick={() => {
                    setLockedIn(true);
                    onChoose(choice);
                  }}
                >
                  {optionDescriptions[choice].title}
                </PixelButton>
              </div>
            </PixelPanel>
          ))}
        </div>
      </div>
    </PixelModal>
  );
}

export function HalftimeDecision() {
  const pending = useGameStore((state) => state.game?.postGameUi?.pendingHalftimeDecision ?? null);
  const teams = useGameStore((state) => state.game?.teams ?? null);
  const resolveHalftimeDecision = useGameStore((state) => state.actions.resolveHalftimeDecision);

  if (!pending || !teams) return null;

  const homeTeam = teams[pending.homeTeamId];
  const awayTeam = teams[pending.awayTeamId];
  const homeLabel = homeTeam ? `${homeTeam.city} ${homeTeam.name}` : 'Home';
  const awayLabel = awayTeam ? `${awayTeam.city} ${awayTeam.name}` : 'Away';

  return (
    <HalftimeDecisionView
      pending={pending}
      homeLabel={homeLabel}
      awayLabel={awayLabel}
      onChoose={(choice) => {
        void resolveHalftimeDecision(choice);
      }}
    />
  );
}
