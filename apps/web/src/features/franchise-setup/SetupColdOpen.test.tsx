import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PHASE_ORDER, type SetupColdOpen as SetupColdOpenModel } from '@mfd/engine';
import { SetupColdOpen } from './SetupColdOpen';
import {
  buildColdOpenChipDialogue,
  buildSetupGoalFollowUp,
  buildSetupPhaseChipDialogue,
  buildSetupSchemeFollowUp,
} from './FranchiseSetupWizard';

const coldOpen: SetupColdOpenModel = {
  ownerExpectation: 'Ownership expects immediate coherence.',
  mediaNarrative: 'The market thinks this team can wobble fast.',
  lastSeasonScar: 'Last season ended at 10-7. Lost in Divisional Round still hangs over this building.',
  crisisHeadline: 'This team can win now when Day 1 solves the right problem.',
  weekOneThreat: 'Week 1 vs Austin Nighthawks punishes unresolved cap pressure by kickoff.',
  openerLabel: 'Week 1 vs Austin Nighthawks',
  topPressureId: 'cap',
};

describe('SetupColdOpen', () => {
  it('keeps the first setup screen focused on the Assistant GM hire', () => {
    const html = renderToStaticMarkup(
      <SetupColdOpen
        coldOpen={coldOpen}
        onSkip={() => undefined}
      />,
    );

    expect(html).toContain('ASSISTANT GM HIRE');
    expect(html).toContain('Hire your Assistant GM');
    expect(html).toContain('Chip will summarize the owner expectation');
    expect(html).toContain('owner expectation, Week 1 opponent');
    expect(html).toContain('cap-space, roster-depth, Week 1 game-plan, and owner-patience consequences');
    expect(html).toContain('the hire decides which consequence');
    expect(html).toContain('Chip names first while you set staff, scouting, scheme, lineup, cap plan, and goals');
    expect(html).toContain('Skip Intro');
    expect(html).not.toContain('decision advisor');
    expect(html).not.toContain('Chip has the owner expectation');
    expect(html).not.toContain('DECISION UP NEXT');
    expect(html).not.toContain('owner read');
    expect(html).not.toContain('opener context');
    expect(html).not.toContain('first risk, and forecast');
    expect(html).not.toContain('risk to keep warning about');
    expect(html).not.toContain('cost warnings');
    expect(html).not.toContain('OWNER EXPECTATION');
    expect(html).not.toContain('MEDIA NARRATIVE');
    expect(html).not.toContain('Week 1 Readiness');
    expect(html).not.toContain('Day 1 Bet Ledger');
    expect(html).not.toMatch(/staff-authority|staff authority|coach-role issues/i);
  });

  it('keeps exposition out of the wizard panel so Chip carries the why', () => {
    const html = renderToStaticMarkup(
      <SetupColdOpen
        coldOpen={coldOpen}
        beatIndex={0}
        reducedMotion={false}
        onSkip={() => undefined}
      />,
    );

    expect(html).not.toContain('Your first morning is not a tutorial. It is a diagnosis.');
    expect(html).not.toContain('Each reveal should make the franchise problem clearer');
    expect(html).not.toContain('The next reveal lands only after you continue the briefing.');
  });

  it('collapses to the stacked diagnosis layout in reduced-motion mode', () => {
    const html = renderToStaticMarkup(
      <SetupColdOpen
        coldOpen={coldOpen}
        beatIndex={0}
        reducedMotion
        onSkip={() => undefined}
      />,
    );

    expect(html).toContain('FIRST FRONT OFFICE CALL');
    expect(html).toContain('ASSISTANT GM HIRE');
    expect(html).not.toContain('Your first morning is not a tutorial. It is a diagnosis.');
  });

  it('builds Chip guidance that explains the Assistant GM consequence', () => {
    const dialogue = buildColdOpenChipDialogue({
      coldOpen,
      forecastSummary: 'Cap flexibility is tight unless the first hire protects optionality.',
    });
    const text = dialogue.text ?? '';

    expect(text).toContain('Must Do: hire the Assistant GM.');
    expect(text).toContain('first setup priority: cap space, starter and backup roles, the Week 1 game plan, or owner patience.');
    expect(text.length).toBeLessThanOrEqual(240);
    expect(dialogue.contextDetails).toHaveLength(4);
    expect(dialogue.contextDetails?.join(' ')).toContain(
      'Why: ownership expects a named Week 1 starter, backup, cap move, or coach. Week 1 danger: Cap flexibility is tight unless the first hire protects optionality.',
    );
    expect(dialogue.contextDetails).toContain(
      'Where: choose the advisor promise that matches the biggest Week 1 danger: cap space, roster roles, game plan, or owner patience.',
    );
    expect(dialogue.contextDetails).toContain(
      'Decision up next: hire the Assistant GM whose promise matches the first Week 1 danger to track.',
    );
    expect(dialogue.contextDetails).toContain(
      'Consequence: choose cap-first and I keep money warnings up front; starter jobs and the coach responsible for Week 1 still need fixing before kickoff.',
    );
    expect(`${text} ${dialogue.contextDetails?.join(' ')}`).not.toContain('the opener can start');
    expect(`${text} ${dialogue.contextDetails?.join(' ')}`).not.toContain('whether to prioritize cap space');
    expect(`${text} ${dialogue.contextDetails?.join(' ')}`).not.toMatch(/coach play calls|play-call owner/i);
    expect(dialogue.contextDetails?.join(' ')).not.toContain('Owner expectation:');
    expect(dialogue.contextDetails?.join(' ')).not.toContain('Week 1 game:');
    expect(dialogue.contextDetails?.join(' ')).not.toMatch(/\bForecast:|Setup forecast\b/i);
    expect(`${text} ${dialogue.contextDetails?.join(' ')}`).not.toMatch(/staff authority|unclear coach authority|coach-role issues/i);
    expect(`${text} ${dialogue.contextDetails?.join(' ')}`).not.toContain('I may miss unassigned starters');
    expect(`${text} ${dialogue.contextDetails?.join(' ')}`).not.toContain('my first warnings skip');
    expect(`${text} ${dialogue.contextDetails?.join(' ')}`).not.toContain('skipping Intel sends you to contracts');
    expect(dialogue.contextDetails?.join(' ')).not.toContain('Week 1 context');
    expect(dialogue.contextDetails?.join(' ')).not.toContain('how you want help');
    expect(`${text} ${dialogue.contextDetails?.join(' ')}`).not.toContain('risk to keep warning about');
    expect(`${text} ${dialogue.contextDetails?.join(' ')}`).not.toMatch(/setup choices I push|bad fit can hide|what Week 1 weakness we attack|wrong Week 1 problem|wrong problem|first Week 1 problem|bigger problem|bigger consequence|Week 1 consequence|first Week 1 consequence to control|carry the bigger consequence|opener problem|mismatched advisor|risk you trust least|Chip should name|real opener problem|watch cap space|my first lens|pick a cap advisor|wrong starters/i);
  });

  it('keeps Chip prominent and keeps consequence text visible on mobile', async () => {
    const css = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./FranchiseSetupWizard.css', import.meta.url), 'utf8'),
    );
    const stackedLayoutStart = css.indexOf('@media (max-width: 1180px)');
    const phoneLayoutStart = css.indexOf('@media (max-width: 768px)', stackedLayoutStart);
    const midStackPortraitStart = css.indexOf('@media (min-width: 769px) and (max-width: 1180px)', stackedLayoutStart);
    const stackedLayoutBlock = css.slice(stackedLayoutStart, phoneLayoutStart);
    const midStackBlock = css.slice(midStackPortraitStart, phoneLayoutStart);

    expect(stackedLayoutStart).toBeGreaterThan(-1);
    expect(midStackPortraitStart).toBeGreaterThan(stackedLayoutStart);
    expect(midStackPortraitStart).toBeLessThan(phoneLayoutStart);
    expect(phoneLayoutStart).toBeGreaterThan(stackedLayoutStart);

    expect(css).toContain(".mfd-setup-dashboard--cold-open[data-mfd-setup-has-companion='true'][data-mfd-setup-has-summary='false']");
    expect(css).toContain('grid-template-columns: minmax(620px, 800px) minmax(0, 1fr);');
    expect(css).toContain(".mfd-setup-content[data-mfd-setup-companion-active='true']");
    expect(css).toContain('overflow-y: auto !important;');
    expect(css).toContain('-webkit-overflow-scrolling: touch;');
    expect(css).toContain('.mfd-setup-dashboard--cold-open .mfd-setup-dashboard__companion');
    expect(css).toContain('.mfd-setup-dashboard--cold-open .mfd-chip-host--setup');
    expect(css).toContain('.mfd-setup-dashboard--cold-open .mfd-chip-host--setup [data-chip-host-context-details=\'true\']');
    expect(css).toContain('max-height: calc(100vh - var(--mfd-setup-scroll-target-clearance) - 128px);');
    expect(css).toContain('max-height: calc(100dvh - var(--mfd-setup-scroll-target-clearance) - 128px);');
    expect(css).toContain('max-height: min(34vh, 300px);');
    expect(css).toContain('max-height: min(34dvh, 300px);');
    expect(css).toContain('.mfd-setup-dashboard--cold-open .mfd-chip-host--setup .mfd-chip-host__context-list::after');
    expect(css).toContain('overscroll-behavior: auto;');
    expect(css).toContain('min-height: calc(var(--mfd-setup-scroll-target-clearance) + 120px);');
    expect(css).toContain('scrollbar-gutter: stable;');
    expect(css).not.toContain('.mfd-setup-dashboard--cold-open .mfd-chip-host--setup {\n  position: relative;\n  top: auto;\n  max-height: none;\n  overflow: visible !important;\n  margin-bottom: var(--mfd-setup-command-clearance);');
    expect(css).not.toContain('.mfd-setup-dashboard--cold-open .mfd-chip-host--setup {\n  position: relative;\n  top: auto;\n  max-height: none;\n  overflow: visible !important;');
    expect(css).toContain('align-content: start;');
    expect(css).toContain('height: auto;');
    expect(css).toContain('overflow: visible;');
    expect(css).toContain('--mfd-setup-command-clearance: calc(260px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('--mfd-setup-scroll-target-clearance: calc(104px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('--mfd-setup-chip-tail-clearance: calc(112px + env(safe-area-inset-bottom, 0px));');
    expect(stackedLayoutBlock).toContain('.mfd-setup-dashboard--cold-open .mfd-chip-host--setup {\n    max-height: none;');
    expect(stackedLayoutBlock).toContain('overflow: visible !important;\n    padding-bottom: var(--mfd-setup-scroll-target-clearance) !important;');
    expect(stackedLayoutBlock).toContain(".mfd-setup-dashboard--cold-open .mfd-chip-host--setup [data-chip-host-context-details='true'] {\n    max-height: none;");
    expect(stackedLayoutBlock).toContain('.mfd-setup-dashboard--cold-open .mfd-chip-host--setup .mfd-chip-host__context-list::after {\n    min-height: calc(var(--mfd-setup-chip-tail-clearance) + 48px);');
    expect(stackedLayoutBlock).not.toContain('max-height: calc(100vh - var(--mfd-setup-scroll-target-clearance) - 128px);');
    expect(stackedLayoutBlock).not.toContain('max-height: min(34vh, 300px);');
    expect(midStackBlock).toContain(".mfd-setup-dashboard--cold-open .mfd-chip-host--setup [data-chip-host-portrait='true'] {\n    min-height: clamp(340px, 32vh, 360px);");
    expect(css).toContain('--mfd-setup-command-clearance: calc(420px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('--mfd-setup-scroll-target-clearance: calc(288px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('--mfd-setup-chip-tail-clearance: calc(348px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('.mfd-setup-dashboard--cold-open .mfd-chip-host--setup {\n    max-height: none;');
    expect(css).toContain('overflow: visible !important;\n    padding-bottom: var(--mfd-setup-scroll-target-clearance) !important;');
    expect(css).toContain(".mfd-setup-dashboard--cold-open .mfd-chip-host--setup [data-chip-host-context-details='true'] {\n    max-height: none;");
    expect(css).toContain('.mfd-setup-dashboard--cold-open .mfd-chip-host--setup .mfd-chip-host__context-list::after {\n    min-height: calc(var(--mfd-setup-chip-tail-clearance) + 48px);');
    expect(css).toContain('.mfd-setup-dashboard--cold-open .mfd-setup-dashboard__companion {\n    padding-bottom: var(--mfd-setup-scroll-target-clearance);');
    expect(css).toContain('scroll-margin-bottom: var(--mfd-setup-scroll-target-clearance);');
    expect(css).toContain('.mfd-setup-dashboard--cold-open .mfd-chip-host--setup,\n  .mfd-setup-dashboard--cold-open .mfd-chip-host--setup [data-chip-host-context-details=\'true\']');
    expect(css).toContain('min-height: calc(var(--mfd-setup-chip-tail-clearance) + 96px);');
    expect(css).toContain('--mfd-setup-command-clearance: calc(440px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('--mfd-setup-scroll-target-clearance: calc(300px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('--mfd-setup-chip-tail-clearance: calc(372px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain(".mfd-setup-dashboard--cold-open[data-mfd-setup-has-companion='true'][data-mfd-setup-has-summary='false'],");
    expect(css).toContain(".mfd-setup-choice-grid--assistant-gm .mfd-setup-choice-grid__primary");
    expect(css).toContain(".mfd-setup-dashboard--cold-open[data-mfd-setup-has-companion='true']::after,");
    expect(css).toContain('.mfd-setup-choice-grid--assistant-gm::after');
    expect(css).toContain('min-height: var(--mfd-setup-chip-tail-clearance);');
    expect(css).toContain('pointer-events: none;');
    expect(css).toContain(".mfd-setup-choice-grid--assistant-gm [data-chip-host-context-details='true']");
    expect(css).toContain('margin-bottom: var(--mfd-setup-scroll-target-clearance);');
    expect(css).toContain('scroll-margin-bottom: var(--mfd-setup-scroll-target-clearance);');
    expect(css).toContain('scroll-padding-bottom: var(--mfd-setup-scroll-target-clearance);');
    expect(css).toContain('.mfd-setup-choice-grid--assistant-gm .mfd-chip-host__context-list::after');
    expect(css).toContain('min-height: calc(var(--mfd-setup-chip-tail-clearance) + 96px);');
    expect(midStackBlock).toContain('.mfd-setup-choice-grid--assistant-gm {');
    expect(midStackBlock).toContain('--mfd-setup-scroll-target-clearance: calc(176px + env(safe-area-inset-bottom, 0px));');
    expect(midStackBlock).toContain('--mfd-setup-chip-tail-clearance: calc(220px + env(safe-area-inset-bottom, 0px));');
    expect(css).not.toContain('.mfd-setup-dashboard--cold-open .mfd-setup-dashboard__companion {\n  overflow: visible;\n  padding-bottom: var(--mfd-setup-command-clearance);');
    expect(css).toContain('scroll-padding-bottom: var(--mfd-setup-scroll-target-clearance);');
    expect(css).toContain('.mfd-setup-choice-grid--assistant-gm .mfd-agm-stage');
    expect(css).toContain('height: auto;');
    expect(css).toContain('align-items: start;');
    expect(css).toContain('.mfd-setup-choice-grid--assistant-gm .mfd-agm-stage .mfd-agm-stage__card,');
    expect(css).toContain('.mfd-setup-choice-grid--assistant-gm .mfd-agm-stage .mfd-agm-stage__content');
    expect(css).toContain('overflow: visible;');
    expect(css).toContain('.mfd-setup-shell [data-chip-host=\'true\'] .mfd-chip-bubble');
    expect(css).toContain('max-width: 100%;');
    expect(css).toContain('font-size: 17px;');
    expect(css).toContain('padding-bottom: var(--mfd-setup-command-clearance) !important;');
    expect(css).toContain('scroll-padding-bottom: var(--mfd-setup-scroll-target-clearance);');
    expect(css).toContain(".mfd-setup-content[data-mfd-setup-companion-active='true'] {\n    padding: 10px 10px var(--mfd-setup-command-clearance) !important;");
    expect(css).toContain('padding: 10px 10px var(--mfd-setup-command-clearance) !important;');
    expect(css).not.toContain('padding-bottom: 112px;');
    expect(css).not.toContain('scroll-padding-bottom: 152px;');
    expect(css).not.toContain('padding-bottom: calc(148px + env(safe-area-inset-bottom, 0px))');
    expect(css).not.toContain('padding: 10px 10px calc(168px + env(safe-area-inset-bottom, 0px))');
    expect(css).not.toContain('padding-bottom: calc(156px + env(safe-area-inset-bottom, 0px));');
    expect(css).not.toContain('padding-bottom: calc(172px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('min-height: 230px !important;');
    expect(css).toContain('transform: scale(1.15);');
    expect(css).not.toContain("[data-chip-host='true'] [data-chip-host-portrait='true'] {\n    display: none !important;");
    expect(css).not.toContain("[data-chip-host-context-details='true'] {\n    display: none !important;");
  });

  it('builds phase-by-phase Chip guidance with owner, decision, forecast, and consequence lines', () => {
    const dialogue = buildSetupPhaseChipDialogue({
      phase: 'cap_strategy',
      coldOpen,
      forecastSummary: 'Creating cap space now blocks injury replacements later.',
      topPressureLabel: 'Cap Flexibility',
      topPressureOpened: true,
      agmName: 'Marcus Webb',
      activeReaction: {
        sentiment: 'concerned',
        reaction: 'One restructure helps the opener.',
        followUp: 'Too many restructures block extensions next offseason.',
      },
    });
    const copy = [dialogue.text, ...(dialogue.contextDetails ?? [])].join(' ');

    expect(dialogue.text).toContain('Must Do: choose the cap plan before moves.');
    expect(copy).toContain('Owner expectation: Ownership expects immediate coherence.');
    expect(copy).toContain('Advisor hired: Marcus Webb.');
    expect(copy).toContain('Setup focus: Cap Space is open.');
    expect(copy).toContain('Decision up next: choose how much future cap space you are willing to spend for a Week 1 roster upgrade.');
    expect(copy).toContain('Consequence: creating cap space now limits injury replacements, trades, extensions, and next offseason.');
    expect(copy).toContain('Why: the cap plan decides whether a Week 1 upgrade spends future cap space needed for injuries, trades, extensions, and next offseason.');
    expect(copy).toContain('Where: pick the cap package before owner goals and before any later contracts or trades.');
    expect(copy).toContain('Current setup consequence: Creating cap space now blocks injury replacements later.');
    expect(copy).toContain('Latest choice consequence: One restructure helps the opener.');
    expect(copy).toContain('Too many restructures block extensions next offseason.');
    expect(copy).not.toMatch(/\b(vibe|identity|foundation|setup choices I push|bad fit can hide|culture mandate|decision advisor|Week 1 Readiness|Scheme Cohesion|Culture Stability|Cap Flexibility|Owner Heat|Day 1 Bet Ledger|Forecast board|Setup forecast|Top risk)\b/i);
  });

  it('keeps every setup phase Chip line plain and free of retired shorthand', () => {
    for (const phase of PHASE_ORDER) {
      const dialogue = buildSetupPhaseChipDialogue({
        phase,
        coldOpen,
        forecastSummary: 'Cap space is tight, so later injury replacements can get blocked.',
        topPressureLabel: 'Cap Flexibility',
        topPressureOpened: phase !== 'choose_agm',
        agmName: phase === 'choose_agm' ? null : 'Marcus Webb',
        activeReaction: {
          sentiment: 'concerned',
          reaction: 'Preview this choice before you commit.',
          followUp: 'Wrong pairing costs cap space, owner patience, or Week 1 points.',
        },
      });
      const copy = [dialogue.text, ...(dialogue.contextDetails ?? [])].join(' ');

      expect(copy, phase).toContain('Decision up next:');
      expect(copy, phase).toContain('Why:');
      expect(copy, phase).toContain('Where:');
      expect(copy, phase).toContain('Consequence:');
      expect(copy, phase).not.toMatch(/coach play calls|play-call owner|staff play-call owner|staff play-call ownership/i);
      expect(copy, phase).not.toMatch(/\b(execute|execution|future flexibility|shape draft grades|foundation|identity|momentum|vibe|setup choices I push|bad fit can hide|what Week 1 weakness we attack|wrong Week 1 problem|wrong problem|first Week 1 problem|bigger problem|opener problem|setup problem|first setup fix|top risk card|highest-risk Intel|Intel risk card|weak spot|Week 1 Readiness|Scheme Cohesion|Culture Stability|Cap Flexibility|Owner Heat|Chip should name|real opener problem|real opener threat|Setup forecast|Forecast:)\b|costs only time|Use cap space only|Use targeted moves only|name-only spending|spending without a role|name-only upgrades|chasing a later roster/i);
      expect(copy, phase).not.toMatch(/open and read|read the roster|roster read|missed roster reads|roster inspection|inspect the roster|review the blueprint|review the lineup|checks the roster need|roster need|check the skipped target|\bverify\b|\bverifies\b/i);
      expect(copy, phase).not.toMatch(/skipping Intel sends you to contracts|my first warnings skip/i);
      expect(copy, phase).toMatch(/\b(hire|open|identify|choose|set|preview|pick|compare|name)\b/i);
      expect(copy, phase).toMatch(/\b(Week 1|before|risk|cost|cap|pressure|missed|injury|lock|later|owner)\b/i);
    }

    expect(buildSetupPhaseChipDialogue({
      phase: 'set_scheme',
      coldOpen,
      forecastSummary: 'Cap space is tight, so later injury replacements can get blocked.',
    }).text).toContain(
      'choose schemes that protect current starters',
    );
    expect(buildSetupPhaseChipDialogue({
      phase: 'set_scheme',
      coldOpen,
      forecastSummary: 'Cap space is tight, so later injury replacements can get blocked.',
    }).text).not.toContain(
      'choose schemes that fit current starters',
    );
    expect(buildSetupPhaseChipDialogue({
      phase: 'cap_strategy',
      coldOpen,
      forecastSummary: 'Cap space is tight, so later injury replacements can get blocked.',
    }).text).toContain(
      'Restructures create cap space now by moving money into future seasons',
    );
  });

  it('keeps the Assistant GM chooser focused on Chip guidance instead of forecast panels', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./FranchiseSetupWizard.tsx', import.meta.url), 'utf8'),
    );
    const start = source.indexOf("setupState.currentPhase === 'choose_agm' ? (");
    const end = source.indexOf(') : showFastLaneIntel', start);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const chooseAgmBranch = source.slice(start, end);

    expect(chooseAgmBranch).toContain('mfd-setup-choice-grid--assistant-gm');
    expect(chooseAgmBranch).toContain('<ChooseAGMPhase');
    expect(chooseAgmBranch).not.toContain('<ForecastBoard');
    expect(chooseAgmBranch).not.toContain('<DayOneDecisionLedger');
    expect(chooseAgmBranch).not.toContain('mfd-setup-decision-rail');
  });

  it('keeps setup scheme reaction follow-ups focused on Week 1 consequences', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./FranchiseSetupWizard.tsx', import.meta.url), 'utf8'),
    );

    expect(source).toContain('Week 1 missed-assignment chance is lower');
    expect(buildSetupSchemeFollowUp({ staffAligned: false, transitionPenalty: 14 })).toBe(
      'Consequence: this scheme needs extra Week 1 prep. Open Depth Chart and Game Plan to protect changed roles; otherwise slower install creates missed assignments.',
    );
    expect(buildSetupSchemeFollowUp({ staffAligned: true, transitionPenalty: 0 })).toBe(
      'This scheme matches the current staff, so Week 1 missed-assignment chance is lower. Still define roles before kickoff; missed assignments still show up in a familiar scheme.',
    );
    expect(source).not.toContain('Choose it only if the roster gain is worth that cost.');
    expect(source).not.toContain('Choose it only if the roster gain is worth slower install');
    expect(source).not.toContain('otherwise keep the easier install');
    expect(source).not.toContain('Keep roles defined anyway');
    expect(source).not.toContain('unless Depth Chart and Game Plan protect the changed roles');
    expect(source).not.toMatch(/\bworth\b|only where/i);
    expect(source).not.toMatch(/Staff alignment|Transition penalty|current staff can teach this quickly/i);
  });

  it('keeps setup goal reactions consequence-first instead of bare difficulty labels', () => {
    expect(buildSetupGoalFollowUp({
      recommended: false,
      difficulty: 'hard',
      reason: 'Owner wants a big target.',
    })).toBe(
      'Consequence: this goal cuts owner patience fast after losses. If starters, injury depth, or cap space cannot absorb October losses, rushed trades or contract pushes follow.',
    );
    expect(buildSetupGoalFollowUp({
      recommended: false,
      difficulty: 'moderate',
      reason: 'Middle target.',
    })).toBe(
      'Consequence: this goal is judged every week. Roster, Depth Chart, and Game Plan must defend it before each Advance Week or lineup, trade, and morale questions get louder.',
    );
    expect(buildSetupGoalFollowUp({
      recommended: false,
      difficulty: 'easy',
      reason: 'Lower target.',
    })).toBe(
      'Consequence: this lower-demand goal protects owner patience longer, but missing it still makes losses trigger lineup, trade, and morale consequences.',
    );
    expect(buildSetupGoalFollowUp({
      recommended: true,
      difficulty: 'easy',
      reason: 'This matches roster strength.',
    })).toBe('This matches roster strength.');
    expect(`${buildSetupGoalFollowUp({
      recommended: false,
      difficulty: 'hard',
      reason: 'Owner wants a big target.',
    })} ${buildSetupGoalFollowUp({
      recommended: false,
      difficulty: 'moderate',
      reason: 'Middle target.',
    })}`).not.toMatch(/Keep it when|otherwise losses/i);
  });

  it('keeps culture reactions specific about roles, morale, and next screens', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./FranchiseSetupWizard.tsx', import.meta.url), 'utf8'),
    );

    expect(source).toContain('Choose accountability when staff has authority to enforce roles');
    expect(source).toContain('Choose player-led when veterans have authority to enforce roles');
    expect(source).toContain('Choose development-first when young players already have package, backup, or starter jobs');
    expect(source).toContain('harsh rules hit morale after losses');
    expect(source).toContain('After each of the first four weeks, open Locker Room for morale and Depth Chart for missed assignments before Advance Week.');
    expect(source).not.toMatch(/staff can enforce roles|veterans can enforce roles|missed assignments can show/i);
    expect(source).not.toMatch(/Choose player-led only if|Choose development-first only if/i);
    expect(source).not.toMatch(/Good\. Clear standards|harsh standards|first month will show whether|Watch first-month morale/i);
  });
});
