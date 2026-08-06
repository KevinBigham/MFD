import { useState } from 'react';
import { PixelPanel, PixelButton, PixelBadge, PixelModal } from '@mfd/design-system/components';
import {
  buildPostWeekMoment,
  getAGMWeeklyRecommendations,
  getScenarioConstraintCoverage,
  type AGMRecommendation,
  type ActionCenterCardClosure,
  type GameState,
  type PostWeekMomentTone,
  type ScenarioConstraintCoverageItem,
} from '@mfd/engine';
import { monoSm, pixelSm, navigateTo } from '../shared/pixelUi';
import {
  OPTIONAL_TASKS,
  buildTaskLedger,
  noRecommendationsTask,
  readyToAdvanceTask,
  taskDestination,
  type TaskSeverity,
  type UiTask,
} from '../../ui/tasks/task-ledger';
import { AlertTriangle, ArrowRight, HelpCircle, X } from 'lucide-react';

interface ActionCenterProps {
  phase: string;
  hasGamePlan: boolean;
  starterCount: number;
  tradeOfferCount: number;
  ownerApproval: number;
  injuredCount: number;
  /** Optional: when provided, enables the "Show AGM advice" recommendations modal. */
  game?: GameState | null;
  onCloseAction?: (card: ActionCenterCardClosure) => void | Promise<void>;
}

const PRIORITY_ACCENT: Record<AGMRecommendation['priority'], 'red' | 'gold' | 'cyan' | 'green'> = {
  urgent: 'red',
  high: 'gold',
  medium: 'cyan',
  low: 'green',
};

const PRIORITY_LABEL: Record<AGMRecommendation['priority'], string> = {
  urgent: 'Recommended',
  high: 'Recommended',
  medium: 'Recommended',
  low: 'Optional',
};

type ActionAccent = 'red' | 'gold' | 'cyan' | 'green' | 'default';

/** The legacy board's palette for a ledger severity. Presentation only. */
const SEVERITY_ACCENT: Record<TaskSeverity, ActionAccent> = {
  blocking: 'red',
  warning: 'gold',
  clear: 'green',
  info: 'cyan',
  neutral: 'default',
};

interface WeeklyBoardAction {
  id: string;
  what: string;
  why: string;
  consequence: string;
  where: string;
  route: string;
  accent: ActionAccent;
  buttonLabel: string;
}

function borderForAccent(accent: ActionAccent): string {
  if (accent === 'default') return 'var(--mfd-border)';
  return `var(--mfd-${accent})`;
}

function toneAccent(tone: PostWeekMomentTone): 'green' | 'red' | 'gold' | 'default' {
  if (tone === 'positive') return 'green';
  if (tone === 'negative') return 'red';
  if (tone === 'warning') return 'gold';
  return 'default';
}

function latestPackageFromGame(game: GameState | null | undefined) {
  const gameDayState = game?.gameDayState;
  if (!gameDayState) return null;
  if (gameDayState.latestPackageId) {
    return gameDayState.recentPackages.find((entry) => entry.id === gameDayState.latestPackageId)
      ?? gameDayState.recentPackages.at(-1)
      ?? null;
  }
  return gameDayState.recentPackages.at(-1) ?? null;
}

function scenarioActionCopy(item: ScenarioConstraintCoverageItem): string {
  if (item.id === 'trade_market') {
    return 'Trade, deadline, and draft-day trade attempts will not take effect.';
  }
  if (item.id === 'offseason_free_agency') {
    return 'Bids, street signings, waiver claims, and practice-squad adds will not take effect.';
  }
  return 'Draft-pick submissions will not take effect.';
}

function taskToBoardAction(task: UiTask, id: string): WeeklyBoardAction {
  return {
    id,
    what: task.title,
    why: task.reason,
    consequence: task.consequence,
    where: task.destination.label,
    route: task.destination.route,
    accent: SEVERITY_ACCENT[task.severity],
    buttonLabel: task.destination.actionLabel,
  };
}

const OPTIONAL_ACTIONS: readonly WeeklyBoardAction[] = OPTIONAL_TASKS.map(
  (task) => taskToBoardAction(task, task.id),
);
function recommendationDeadline(rec: AGMRecommendation): string {
  if (rec.priority === 'urgent') return 'Recommended before Advance Week for lineup, cap space, or matchup changes. Advance Week remains available when no Must Do item stops it.';
  if (rec.priority === 'high') return 'Recommended this week: handle before Advance Week locks the next game for lineup, cap, depth, or Game Plan changes.';
  if (rec.priority === 'medium') return 'Recommended before kickoff for lineup, cap, depth, or Game Plan changes.';
  return 'Optional: handle lineup, cap space, market offer, staff plan, or matchup changes before Advance Week, offer expiration, market windows, or phase rules lock them. Advance Week remains available when no Must Do item stops it.';
}

function recommendationToBoardAction(rec: AGMRecommendation): WeeklyBoardAction {
  const route = rec.targetRoute ?? '/week-advance';
  const destination = taskDestination(route);
  return {
    id: `agm-${rec.id}`,
    what: rec.title,
    why: rec.body,
    consequence: recommendationDeadline(rec),
    where: destination.label,
    route,
    accent: PRIORITY_ACCENT[rec.priority],
    buttonLabel: destination.actionLabel,
  };
}

function WeeklyBoardLane({
  title,
  subtitle,
  badge,
  accent,
  actions,
  lane,
  onCloseAction,
}: {
  title: string;
  subtitle: string;
  badge: string;
  accent: ActionAccent;
  actions: WeeklyBoardAction[];
  lane?: ActionCenterCardClosure['lane'];
  onCloseAction?: ActionCenterProps['onCloseAction'];
}) {
  return (
    <section
      aria-label={title}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px',
        border: `1px solid ${borderForAccent(accent)}`,
        borderRadius: 'var(--mfd-rad-lg)',
        background: 'rgba(255, 255, 255, 0.025)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...pixelSm, color: borderForAccent(accent) }}>{title}</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '4px', lineHeight: 1.5 }}>{subtitle}</div>
        </div>
        <PixelBadge variant={accent}>{badge}</PixelBadge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))', gap: '10px' }}>
        {actions.map((action) => (
          <div
            key={action.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minHeight: '100%',
              padding: '10px',
              border: `1px solid ${borderForAccent(action.accent)}`,
              borderRadius: 'var(--mfd-rad-md)',
              background: 'var(--mfd-bg-2)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>
              <div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-faint)' }}>What</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text)', fontWeight: 700, lineHeight: 1.45 }}>{action.what}</div>
              </div>
              <div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-faint)' }}>Why</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.45 }}>{action.why}</div>
              </div>
              <div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-faint)' }}>Consequence / deadline</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.45 }}>{action.consequence}</div>
              </div>
              <div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-faint)' }}>Where</div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.45 }}>{action.where}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <PixelButton accent={action.accent === 'default' ? 'cyan' : action.accent} onClick={() => navigateTo(action.route)}>
                <ArrowRight size={12} />
                {action.buttonLabel}
              </PixelButton>
              {lane && onCloseAction ? (
                <PixelButton
                  accent="default"
                  aria-label={`Close ${action.what}`}
                  onClick={() => onCloseAction({ id: action.id, lane, label: action.what, route: action.route })}
                >
                  <X size={12} />
                  Close
                </PixelButton>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActionCenter(props: ActionCenterProps) {
  const tasks = buildTaskLedger(props);
  const [showAgmModal, setShowAgmModal] = useState(false);

  const requiredItems = tasks.filter((task) => task.blocksAdvance);
  const advisoryItems = tasks.filter(
    (task) => !task.blocksAdvance && task.destination.route !== '/week-advance',
  );
  const hasRed = requiredItems.length > 0 || advisoryItems.some((task) => task.severity === 'blocking');
  const hasGold = tasks.some((task) => task.severity === 'warning');
  const panelAccent = hasRed ? 'red' : hasGold ? 'gold' : 'green';

  const recommendations = props.game ? getAGMWeeklyRecommendations(props.game, 3) : [];
  const userTeamId = props.game
    ? Object.values(props.game.teams).find((team) => team.isUser)?.id ?? null
    : null;
  const closedActionIds = new Set((props.game?.leagueEvents ?? [])
    .filter((event) => event.type === 'legacy'
      && event.payload.source === 'action_center.closed'
      && event.seasonWeek.year === props.game?.year
      && event.seasonWeek.week === props.game?.week
      && Boolean(userTeamId && event.actors.teamIds.includes(userTeamId)))
    .map((event) => String(event.payload.cardId)));
  const postWeekMoment = props.game
    ? buildPostWeekMoment((props.game.weekSummaries ?? []).at(-1) ?? null, latestPackageFromGame(props.game))
    : null;
  const scenarioLocks = props.game?.scenarioState?.activeScenario
    ? getScenarioConstraintCoverage(props.game.scenarioState.activeScenario.constraints).items
      .filter((item) => item.status === 'enforced')
    : [];
  // Card ids are persisted in leagueEvents as action_center.closed payloads, so
  // their shape is a save-visible contract: changing it would resurrect cards a
  // player already dismissed this week.
  const mustDoActions = (requiredItems.length > 0
    ? requiredItems.slice(0, 3).map((task, index) => taskToBoardAction(task, `must-${index}-${task.destination.route}`))
    : [taskToBoardAction(
      tasks.find((task) => task.destination.route === '/week-advance') ?? readyToAdvanceTask(),
      'must-ready',
    )]).filter((action) => !closedActionIds.has(action.id));
  const openRequiredCount = requiredItems.length > 0 ? mustDoActions.length : 0;
  const recommendedActions = [
    ...advisoryItems.map((task, index) => taskToBoardAction(task, `recommended-alert-${index}-${task.destination.route}`)),
    ...recommendations.map(recommendationToBoardAction),
  ];
  const fallbackRecommended = noRecommendationsTask();
  const visibleRecommendedActions = (recommendedActions.length > 0
    ? recommendedActions
    : [taskToBoardAction(fallbackRecommended, fallbackRecommended.id)])
    .filter((action) => !closedActionIds.has(action.id))
    .slice(0, 3);

  return (
    <PixelPanel title="Command Queue" accent={panelAccent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {props.game && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              border: '1px solid var(--mfd-gold-mid)',
              borderRadius: 'var(--mfd-rad-lg)',
              background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.1), transparent 70%)',
              flexWrap: 'wrap',
            }}
          >
              <div>
                <div style={{ ...monoSm, color: 'var(--mfd-gold)' }}>Ask your AGM</div>
              <div style={{ ...monoSm, color: '#888', marginTop: '2px' }}>Open injury, cap, depth, or matchup fixes before Advance Week</div>
            </div>
            <PixelButton
              accent="gold"
              onClick={() => setShowAgmModal(true)}
              data-tutorial-target="agm-recommendations"
            >
              <HelpCircle size={12} />
              Show AGM advice
            </PixelButton>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            border: '1px solid var(--mfd-border)',
            borderRadius: 'var(--mfd-rad-lg)',
            background: 'rgba(255, 255, 255, 0.025)',
          }}
        >
          <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>Living week action plan</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.55 }}>
            Chip updates this list as the saved week changes. Must Do stops or redirects Advance Week; Recommended names choices to fix or accept; Optional shows legal roster, depth, cap, market, staff, and backup moves. Make those changes before Advance Week, offer expiration, market windows, or phase rules lock them.
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.55 }}>
            Any legal roster, depth-chart, training, game-plan, cap, trade, waiver, practice-squad, free-agency, scouting, coaching, facility, or medical change remains available from its normal screen until Advance Week, offer expiration, market window, or phase rule locks that action.
          </div>
        </div>

        {postWeekMoment ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--mfd-rad-lg)',
              background: 'rgba(255, 255, 255, 0.025)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <div style={{ ...monoSm, color: 'var(--mfd-gold)' }}>Last week result</div>
                <div style={{ ...pixelSm, color: 'var(--mfd-text)', lineHeight: 1.45 }}>
                  {postWeekMoment.headline.toUpperCase()}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {postWeekMoment.record ? <PixelBadge variant="gold">{postWeekMoment.record}</PixelBadge> : null}
                  {postWeekMoment.scoreLine ? <PixelBadge variant="cyan">{postWeekMoment.scoreLine}</PixelBadge> : null}
                  <PixelBadge variant={postWeekMoment.result === 'win' ? 'green' : postWeekMoment.result === 'loss' ? 'red' : 'default'}>
                    {postWeekMoment.result}
                  </PixelBadge>
                </div>
              </div>
              <PixelButton accent="cyan" onClick={() => navigateTo('/week-advance')}>
                <ArrowRight size={12} />
                Open Advance Week
              </PixelButton>
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {postWeekMoment.whatNow.slice(0, 2).map((item) => (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <PixelBadge variant={toneAccent(item.tone)}>{item.label}</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{item.detail}</div>
                </div>
              ))}
            </div>
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
              This result is already saved. Reading it does not click Advance Week, create new media, or edit reports.
            </div>
          </div>
        ) : null}

        {scenarioLocks.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px',
              border: '1px solid var(--mfd-gold)',
              borderRadius: 'var(--mfd-rad-lg)',
              background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.1), transparent 70%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <AlertTriangle size={14} aria-hidden="true" />
                  <span style={{ ...monoSm, color: 'var(--mfd-gold)' }}>Scenario locks active</span>
                </div>
                <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                  Buttons still open those screens, but locked actions will not take effect while this challenge is active.
                </div>
              </div>
              <PixelButton accent="gold" onClick={() => navigateTo('/scenarios')}>
                <ArrowRight size={12} />
                Open Guide
              </PixelButton>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {scenarioLocks.map((item) => (
                <PixelBadge key={item.id} variant="gold">
                  {item.label.toUpperCase()}
                </PixelBadge>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {scenarioLocks.slice(0, 3).map((item) => (
                <div key={`${item.id}-copy`} style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
                  {scenarioActionCopy(item)}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <WeeklyBoardLane
          title="Must Do"
          subtitle="Stops or redirects Advance Week: injuries, missing starters, expiring offers, promises, or phase rules."
          badge={`${openRequiredCount} required item${openRequiredCount === 1 ? '' : 's'}`}
          accent={openRequiredCount > 0 ? 'red' : 'green'}
          actions={mustDoActions}
          lane="must_do"
          onCloseAction={props.onCloseAction}
        />

        <WeeklyBoardLane
          title="Recommended"
          subtitle="Open alerts for injuries, cap, depth, owner patience, job security, and matchup calls before Advance Week locks the next game."
          badge={`${visibleRecommendedActions.length} item${visibleRecommendedActions.length === 1 ? '' : 's'}`}
          accent={visibleRecommendedActions.some((action) => action.accent === 'red') ? 'red' : 'gold'}
          actions={visibleRecommendedActions}
          lane="recommended"
          onCloseAction={props.onCloseAction}
        />

        <WeeklyBoardLane
          title="Optional"
          subtitle="Prioritize roster, depth, cap, market, staff, and backup choices that alter lineup, cap, offer, staff plan, or matchup before Advance Week."
          badge={`${OPTIONAL_ACTIONS.length} lanes`}
          accent="cyan"
          actions={[...OPTIONAL_ACTIONS]}
        />
      </div>

      {showAgmModal && (
        <PixelModal
          open={showAgmModal}
          onOpenChange={(next) => setShowAgmModal(next)}
          title="AGM Weekly Recommendations"
          width={520}
          accent="gold"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations.length === 0 ? (
              <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
                No AGM alert needs action before Advance Week. Prioritize optional roster, depth, cap, market, or staff moves before Advance Week, offer expiration, or a phase rule locks them.
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
        </PixelModal>
      )}
    </PixelPanel>
  );
}

export { ActionCenter };
