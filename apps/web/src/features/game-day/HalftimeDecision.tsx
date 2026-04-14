import { PixelBadge, PixelButton, PixelModal, PixelPanel } from '@mfd/design-system/components';
import type { HalftimeDecisionChoice, PendingHalftimeDecision } from '@mfd/engine';
import { useGameStore } from '../../app/store/game-store';

const optionDescriptions: Record<HalftimeDecisionChoice, { title: string; detail: string }> = {
  stick: {
    title: 'Stick',
    detail: 'Coach Bigham keeps his faith in the game plan. (no modifier)',
  },
  switch: {
    title: 'Switch',
    detail: 'Adjusting the approach. +5% efficiency on 2nd-half calls, -3% on first call.',
  },
  gamble: {
    title: 'Gamble',
    detail: 'Rolling the dice. +12% on one high-leverage drive, -8% on all others.',
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

interface HalftimeDecisionViewProps {
  pending: PendingHalftimeDecision | null;
  homeLabel: string;
  awayLabel: string;
  onChoose: (choice: HalftimeDecisionChoice) => void;
  onOpenChange?: (open: boolean) => void;
}

export function HalftimeDecisionView({
  pending,
  homeLabel,
  awayLabel,
  onChoose,
  onOpenChange = () => undefined,
}: HalftimeDecisionViewProps) {
  if (!pending) return null;

  return (
    <PixelModal
      open
      onOpenChange={onOpenChange}
      title="Halftime Hell"
      description="Thirty seconds to decide what the second half feels like."
      accent="gold"
      width={720}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                <PixelButton accent={choice === 'gamble' ? 'gold' : choice === 'switch' ? 'cyan' : 'default'} onClick={() => onChoose(choice)}>
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
