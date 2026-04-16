import { useState } from 'react';
import { PixelPanel, PixelButton, PixelBadge, MfdDialog } from '@mfd/design-system/components';
import { getAGMWeeklyRecommendations, type AGMRecommendation, type GameState } from '@mfd/engine';
import { monoSm, pixelSm, navigateTo } from '../shared/pixelUi';
import { AlertTriangle, CheckCircle, ArrowRight, HelpCircle } from 'lucide-react';

interface ActionCenterProps {
  phase: string;
  hasGamePlan: boolean;
  starterCount: number;
  tradeOfferCount: number;
  ownerApproval: number;
  injuredCount: number;
  /** Optional: when provided, enables the "What should I do?" recommendations modal. */
  game?: GameState | null;
}

const PRIORITY_ACCENT: Record<AGMRecommendation['priority'], 'red' | 'gold' | 'cyan' | 'green'> = {
  urgent: 'red',
  high: 'gold',
  medium: 'cyan',
  low: 'green',
};

const PRIORITY_LABEL: Record<AGMRecommendation['priority'], string> = {
  urgent: 'URGENT',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
};

interface ActionItem {
  label: string;
  detail: string;
  route: string;
  accent: 'red' | 'gold' | 'green';
  buttonLabel: string;
}

const BUTTON_LABELS: Record<string, string> = {
  '/game-plan': 'Set Plan',
  '/depth-chart': 'Fix Depth',
  '/trades': 'Review',
  '/owner': 'Check',
  '/roster': 'View',
  '/week-advance': 'Advance',
};

function getButtonLabel(route: string): string {
  return BUTTON_LABELS[route] ?? 'Go';
}

function buildActions(props: ActionCenterProps): ActionItem[] {
  const { phase, hasGamePlan, starterCount, tradeOfferCount, ownerApproval, injuredCount } = props;
  const items: ActionItem[] = [];

  if (!hasGamePlan && (phase === 'regular_season' || phase === 'playoffs')) {
    items.push({
      label: 'Set your game plan',
      detail: 'No prep plan locked for this week',
      route: '/game-plan',
      accent: 'red',
      buttonLabel: getButtonLabel('/game-plan'),
    });
  }

  if (starterCount < 22) {
    items.push({
      label: `Review depth chart (${starterCount}/22 starters)`,
      detail: 'Starting lineup has gaps',
      route: '/depth-chart',
      accent: 'gold',
      buttonLabel: getButtonLabel('/depth-chart'),
    });
  }

  if (tradeOfferCount > 0) {
    items.push({
      label: `${tradeOfferCount} pending trade offer${tradeOfferCount > 1 ? 's' : ''}`,
      detail: 'Review before they expire',
      route: '/trades',
      accent: 'gold',
      buttonLabel: getButtonLabel('/trades'),
    });
  }

  if (ownerApproval < 50) {
    items.push({
      label: 'Owner patience is dropping',
      detail: `Approval at ${ownerApproval}%`,
      route: '/owner',
      accent: 'red',
      buttonLabel: getButtonLabel('/owner'),
    });
  }

  if (injuredCount > 0) {
    items.push({
      label: `${injuredCount} injured player${injuredCount > 1 ? 's' : ''}`,
      detail: 'Check roster for injury updates',
      route: '/roster',
      accent: 'gold',
      buttonLabel: getButtonLabel('/roster'),
    });
  }

  if (items.length === 0) {
    items.push({
      label: 'Ready to advance',
      detail: 'No blocking issues',
      route: '/week-advance',
      accent: 'green',
      buttonLabel: getButtonLabel('/week-advance'),
    });
  }

  return items;
}

function ActionCenter(props: ActionCenterProps) {
  const items = buildActions(props);
  const [showAgmModal, setShowAgmModal] = useState(false);

  const hasRed = items.some((item) => item.accent === 'red');
  const hasGold = items.some((item) => item.accent === 'gold');
  const panelAccent = hasRed ? 'red' : hasGold ? 'gold' : 'green';

  const recommendations = props.game ? getAGMWeeklyRecommendations(props.game, 3) : [];

  return (
    <PixelPanel title="YOUR NEXT MOVE" accent={panelAccent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {props.game && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--mfd-gold-mid)',
            }}
          >
            <div>
              <div style={{ ...monoSm, color: 'var(--mfd-gold)' }}>Ask your AGM</div>
              <div style={{ ...monoSm, color: '#888', marginTop: '2px' }}>Top recommendations this week</div>
            </div>
            <PixelButton
              accent="gold"
              onClick={() => setShowAgmModal(true)}
              data-tutorial-target="agm-recommendations"
            >
              <HelpCircle size={12} />
              What should I do?
            </PixelButton>
          </div>
        )}

        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid #1a1a1a',
            }}
          >
            <div>
              <div style={{ ...monoSm, color: '#fff' }}>{item.label}</div>
              <div style={{ ...monoSm, color: '#888', marginTop: '2px' }}>{item.detail}</div>
            </div>
            <PixelButton accent={item.accent} onClick={() => navigateTo(item.route)}>
              <ArrowRight size={12} />
              {item.buttonLabel}
            </PixelButton>
          </div>
        ))}
      </div>

      {showAgmModal && (
        <MfdDialog
          open={showAgmModal}
          onOpenChange={(next) => setShowAgmModal(next)}
          title="AGM Weekly Recommendations"
          width={520}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations.length === 0 ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                Your AGM has no pressing concerns this week. Consider advancing.
              </div>
            ) : (
              recommendations.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    border: `2px solid var(--mfd-${PRIORITY_ACCENT[rec.priority] === 'red' ? 'red' : PRIORITY_ACCENT[rec.priority] === 'gold' ? 'gold' : PRIORITY_ACCENT[rec.priority] === 'cyan' ? 'cyan' : 'green'})`,
                    background: 'var(--mfd-bg-2)',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <PixelBadge variant={PRIORITY_ACCENT[rec.priority]}>
                      {PRIORITY_LABEL[rec.priority]}
                    </PixelBadge>
                    <div style={{ ...pixelSm, color: 'var(--mfd-text)' }}>{rec.title}</div>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.55, marginBottom: '8px' }}>
                    {rec.body}
                  </div>
                  {rec.targetRoute && (
                    <PixelButton
                      accent={PRIORITY_ACCENT[rec.priority] === 'cyan' ? 'gold' : PRIORITY_ACCENT[rec.priority]}
                      onClick={() => {
                        setShowAgmModal(false);
                        navigateTo(rec.targetRoute!);
                      }}
                    >
                      <ArrowRight size={12} />
                      Take me there
                    </PixelButton>
                  )}
                </div>
              ))
            )}
          </div>
        </MfdDialog>
      )}
    </PixelPanel>
  );
}

export { ActionCenter };
