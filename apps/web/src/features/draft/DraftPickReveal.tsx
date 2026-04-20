import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { TeamLogo } from '../shared/TeamLogo';
import { useReducedMotionPreference } from '../shared/transitions/RouteTransition';

const revealKeyframes = `
@keyframes mfdDraftRevealFlip {
  0% {
    opacity: 0;
    transform: rotateY(88deg) scale(0.92);
  }
  100% {
    opacity: 1;
    transform: rotateY(0deg) scale(1);
  }
}
`;

export interface DraftPickRevealContent {
  overall: number;
  round: number;
  pick: number;
  playerName: string;
  position: string;
  college: string;
  teamAbbrev: string;
  reaction: string;
}

interface DraftPickRevealCardProps extends DraftPickRevealContent {
  reducedMotion: boolean;
}

function DraftPickRevealCardBody({
  overall,
  round,
  pick,
  playerName,
  position,
  college,
  teamAbbrev,
  reaction,
  reducedMotion,
}: DraftPickRevealCardProps) {
  return (
    <div
      style={{
        width: 'min(520px, 100%)',
        padding: '18px',
        border: '4px solid var(--mfd-gold)',
        background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.08) 0%, rgba(12, 12, 12, 0.98) 100%)',
        animation: reducedMotion ? 'none' : 'mfdDraftRevealFlip 420ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        transformStyle: 'preserve-3d',
      }}
    >
      <style>{revealKeyframes}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PixelBadge variant="gold">OVERALL #{overall}</PixelBadge>
          <PixelBadge variant="default">R{round} / P{pick}</PixelBadge>
        </div>
        <TeamLogo icon={teamAbbrev} size={58} alt={teamAbbrev} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: '16px', alignItems: 'center', marginTop: '16px' }}>
        <div
          style={{
            width: '96px',
            height: '96px',
            border: '3px solid var(--mfd-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--mfd-bg-3)',
            color: 'var(--mfd-text-dim)',
            fontFamily: 'var(--mfd-font-pixel)',
            fontSize: '9px',
            textAlign: 'center',
          }}
        >
          PLAYER
          <br />
          PHOTO
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '28px', color: '#fff', lineHeight: 1 }}>
            {playerName.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '12px', color: 'var(--mfd-text-dim)' }}>
            {position} // {college}
          </div>
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '12px', color: 'var(--mfd-cyan)', lineHeight: 1.6 }}>
            AGM: {reaction}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DraftPickRevealViewProps extends DraftPickRevealContent {
  open: boolean;
  reducedMotion: boolean;
  onDismiss: () => void;
}

export function DraftPickRevealView({ open, reducedMotion, onDismiss, ...content }: DraftPickRevealViewProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Draft Pick Reveal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(0, 0, 0, 0.9)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', width: '100%' }}>
        <DraftPickRevealCardBody reducedMotion={reducedMotion} {...content} />
        <PixelButton accent="gold" onClick={onDismiss}>
          CONTINUE
        </PixelButton>
      </div>
    </div>
  );
}

export function DraftPickReveal(props: Omit<DraftPickRevealViewProps, 'reducedMotion'>) {
  const reducedMotion = useReducedMotionPreference();
  return <DraftPickRevealView {...props} reducedMotion={reducedMotion} />;
}

interface DraftPickRevealCardSummaryProps extends DraftPickRevealContent {
  title?: string;
}

export function DraftPickRevealCard(props: DraftPickRevealCardSummaryProps) {
  const reducedMotion = useReducedMotionPreference();
  const { title = 'Pick Reveal', ...content } = props;

  return (
    <PixelPanel title={title} accent="gold">
      <DraftPickRevealCardBody {...content} reducedMotion={reducedMotion} />
    </PixelPanel>
  );
}
