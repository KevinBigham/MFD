/**
 * The Today screen — the first surface of the new shell.
 *
 * It renders a `TodayViewModel` and nothing else. Every decision about which
 * tasks appear, in what order, and what the readiness dock says was already
 * made in `today-presenter.ts`; this file turns that into semantic markup.
 * That split is what makes the LAY-04 and first-viewport contracts assertable
 * in a monorepo with no jsdom.
 *
 * Two choices worth naming:
 *
 * - **Rows are links, not buttons.** The router is hash-based, so `#/roster`
 *   is a real link: it works with keyboard, middle-click, and browser back for
 *   free, and it needs no JavaScript to be correct. A button pretending to be
 *   a link would have to reimplement all three.
 * - **Disclosure is `<details>`, not state.** The overflow of the recommended
 *   lane and the whole standing lane are native disclosures. Nothing is
 *   conditionally unmounted, so a screen reader and the geometry harness can
 *   both prove nothing was dropped — which is the audit's "no feature data
 *   deleted" requirement, discharged by construction.
 */

import { MfdStateFrame, MfdStickyAction } from '@mfd/design-system/components';
import { AppFrame } from '../layout/AppFrame';
import { StickyActionDock } from '../layout/StickyActionDock';
import type { MergedTask } from '../tasks/task-ledger';
import type { TodaySection, TodayViewModel } from './today-presenter';
import styles from './today.module.css';

export interface TodayScreenProps {
  view: TodayViewModel;
  /** Hash navigation, injected so the screen stays renderable without a router. */
  onNavigate: (route: string) => void;
}

function href(route: string): string {
  return `#${route}`;
}

function TaskRow({ task }: { task: MergedTask }) {
  return (
    <li className={styles.row}>
      <a
        className={styles.rowLink}
        href={href(task.destination.route)}
        data-mfd-v2-task={task.id}
        data-mfd-v2-severity={task.severity}
      >
        <span className={`${styles.rowTitle} mfd-v2-body-strong`}>{task.title}</span>
        <span className={`${styles.rowReason} mfd-v2-body`}>{task.reason}</span>
        <span className={`${styles.rowWhere} mfd-v2-caption`}>
          {task.destination.actionLabel} · {task.destination.label}
        </span>
      </a>

      {/* The consequence is the "why it matters" the audit found missing, and
          the merged duplicates ride along so nothing the ledger collapsed is
          lost — both behind a disclosure so the row stays one line tall. */}
      <details className={styles.rowDetails}>
        <summary className={`${styles.summary} mfd-v2-caption`}>Why this matters</summary>
        <p className={`${styles.consequence} mfd-v2-body`}>{task.consequence}</p>
        {task.merged.length > 0 ? (
          <ul className={styles.mergedList}>
            {task.merged.map((entry) => (
              <li key={entry.id} className={`${styles.mergedItem} mfd-v2-body`}>
                <span className="mfd-v2-body-strong">{entry.title}</span> — {entry.reason}
              </li>
            ))}
          </ul>
        ) : null}
      </details>
    </li>
  );
}

function TaskList({ tasks }: { tasks: readonly MergedTask[] }) {
  return (
    <ul className={styles.list}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </ul>
  );
}

function Lane({
  id,
  title,
  section,
  emptyReason,
  moreLabel,
}: {
  id: string;
  title: string;
  section: TodaySection;
  emptyReason: string;
  moreLabel: (count: number) => string;
}) {
  const total = section.tasks.length + section.hidden.length;

  return (
    <section className={styles.lane} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className={`${styles.laneHeading} mfd-v2-title-sm`}>
        {title}
        {total > 0 ? <span className={`${styles.count} mfd-v2-caption`}>{total}</span> : null}
      </h2>

      {total === 0 ? (
        <MfdStateFrame label={title} status="empty" reason={emptyReason} />
      ) : (
        <MfdStateFrame label={title}>
          <>
            {section.tasks.length > 0 ? <TaskList tasks={section.tasks} /> : null}
            {section.hidden.length > 0 ? (
              <details className={styles.overflow}>
                <summary className={`${styles.summary} mfd-v2-label`}>
                  {moreLabel(section.hidden.length)}
                </summary>
                <TaskList tasks={section.hidden} />
              </details>
            ) : null}
          </>
        </MfdStateFrame>
      )}
    </section>
  );
}

export function TodayScreen({ view, onNavigate }: TodayScreenProps) {
  const { context, opponent, readiness } = view;

  const chrome = (
    <header className={styles.chrome}>
      <p className={`${styles.kicker} mfd-v2-kicker`}>
        {context.phase} · {context.week} · {context.season}
      </p>
      <h1 className={`${styles.title} mfd-v2-title-md`}>{context.team}</h1>
    </header>
  );

  const dock = (
    <StickyActionDock label="Week readiness">
      {readiness.state === 'blocked' ? (
        <MfdStickyAction
          label="Advance Week"
          onActivate={() => onNavigate(readiness.action.route)}
          blocked
          blockedReason={readiness.summary}
          unblock={
            <a className={styles.unblock} href={href(readiness.action.route)}>
              {readiness.action.label}
            </a>
          }
        />
      ) : (
        <MfdStickyAction
          label={readiness.action.label}
          onActivate={() => onNavigate(readiness.action.route)}
        />
      )}
    </StickyActionDock>
  );

  return (
    <AppFrame chrome={chrome} dock={dock}>
      <div className={styles.screen} data-mfd-v2-screen="today" data-mfd-v2-readiness={readiness.state}>
        <section className={styles.context} aria-labelledby="today-context-heading">
          <h2 id="today-context-heading" className={`${styles.laneHeading} mfd-v2-title-sm`}>
            {opponent.headline}
          </h2>
          <p className={`${styles.opponentDetail} mfd-v2-body`}>{opponent.detail}</p>
          {context.purpose ? (
            <p className={`${styles.purpose} mfd-v2-body`}>{context.purpose}</p>
          ) : null}
        </section>

        {/* Status, not alert: the readiness line changes as tasks resolve and
            should be announced without interrupting what is being read. */}
        <p className={`${styles.readiness} mfd-v2-body-strong`} role="status">
          {readiness.headline}. {readiness.detail}
        </p>

        <Lane
          id="today-must"
          title="Must do"
          section={view.mustDo}
          emptyReason="Nothing is blocking Advance Week this week."
          moreLabel={(count) => `Show ${count} more`}
        />

        <Lane
          id="today-recommended"
          title="Recommended"
          section={view.recommended}
          emptyReason="No injury, cap, owner, trade, depth, or matchup warning needs action this week."
          moreLabel={(count) => `Show ${count} more recommended`}
        />

        <Lane
          id="today-optional"
          title="Always available"
          section={view.optional}
          emptyReason="No optional moves are available in this phase."
          moreLabel={(count) => `Show ${count} optional moves`}
        />
      </div>
    </AppFrame>
  );
}
