import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  parseSmokePreviewTimeoutMs,
  parseSmokeTimeoutMs,
  parseSmokeViewport,
  parsePostImportRouteCheck,
  parsePostSetupRouteChecks,
  shouldRunAdvanceWeekSmoke,
  shouldRunCapLabBatchSmoke,
  shouldRunCartridgeFileRoundTripSmoke,
  shouldRunCartridgeRoundTripSmoke,
  shouldRunChipAskSummarySmoke,
  shouldRunChipFocusReducedMotionSmoke,
  shouldRunChipMondayBeatChainSmoke,
  shouldRunChipMuteSmoke,
  shouldRunChipReceiptRespectSmoke,
  shouldRunContractBackloadSmoke,
  shouldRunContractCutsSmoke,
  shouldRunContractNegotiationsSmoke,
  shouldRunContractRestructureSmoke,
  shouldRunDraftScoutingSmoke,
  shouldRunDraftWarRoomTradeSmoke,
  shouldRunFullSetupCompleteSmoke,
  shouldRunFreeAgencySigningsSmoke,
  shouldRunG6CoreUxSmoke,
  shouldRunG6FocusSweepSmoke,
  shouldRunG6StateFeedbackSmoke,
  shouldRunG6VisualSweepSmoke,
  shouldRunLocalSaveSlotRoundTripSmoke,
  shouldRunNewDynastySetupEntrySmoke,
  shouldRunPostImportHardReloadSmoke,
  shouldRunRosterDepthTrainingSmoke,
  shouldRunStaffFacilityMedicalSmoke,
  shouldRunTradeCounterBlockSmoke,
  shouldRunWaiverPracticeSquadSmoke,
  shouldRunWeeklyPrepSmoke,
} from '../smoke-test-post-setup-route.mjs';

const smokeSource = readFileSync(new URL('../smoke-test-post-setup-route.mjs', import.meta.url), 'utf8');

test('parses smoke assertion and preview startup timeouts independently', () => {
  assert.equal(parseSmokeTimeoutMs({}), 30_000);
  assert.equal(parseSmokeTimeoutMs({ SMOKE_TIMEOUT_MS: '90000' }), 90_000);
  assert.equal(parseSmokeTimeoutMs({ SMOKE_TIMEOUT_MS: 'invalid' }), 30_000);

  assert.equal(parseSmokePreviewTimeoutMs({}), 30_000);
  assert.equal(parseSmokePreviewTimeoutMs({ SMOKE_TIMEOUT_MS: '90000' }), 90_000);
  assert.equal(parseSmokePreviewTimeoutMs({
    SMOKE_TIMEOUT_MS: '90000',
    SMOKE_PREVIEW_TIMEOUT_MS: '240000',
  }), 240_000);
  assert.equal(parseSmokePreviewTimeoutMs({ SMOKE_PREVIEW_TIMEOUT_MS: 'invalid' }), 30_000);
});

test('prints preview command output when preview startup fails', () => {
  assert.match(smokeSource, /formatPreviewStartFailure/);
  assert.match(smokeSource, /previewError/);
  assert.match(smokeSource, /preview\.signalCode !== null/);
  assert.match(smokeSource, /Preview command:/);
  assert.match(smokeSource, /Preview output:/);
  assert.match(smokeSource, /no preview output captured/);
});

test('prefers the local Vite preview binary before falling back to pnpm', () => {
  assert.match(
    smokeSource,
    /const viteBin = resolve\(webDir, 'node_modules\/\.bin\/vite'\);[\s\S]+if \(existsSync\(viteBin\)\)[\s\S]+if \(commandExists\(pnpmBin\)\)/,
  );
});

test('uses the default post-setup weather route check', () => {
  assert.deepEqual(parsePostSetupRouteChecks({}), [
    { route: '/league/weather', text: 'Forecast Source' },
  ]);
});

test('skips the boot overlay through the sessionStorage key used by the app', () => {
  assert.match(smokeSource, /sessionStorage\.setItem\('mfd-boot-seen', '1'\)/);
  assert.doesNotMatch(smokeSource, /localStorage\.setItem\('mfd-boot-seen'/);
});

test('keeps the legacy single-route override contract', () => {
  assert.deepEqual(parsePostSetupRouteChecks({
    SMOKE_POST_SETUP_ROUTE: '/coaching',
    SMOKE_POST_SETUP_TEXT: 'Position Coach Report',
  }), [
    { route: '/coaching', text: 'Position Coach Report' },
  ]);
});

test('parses multiple post-setup route checks from JSON', () => {
  assert.deepEqual(parsePostSetupRouteChecks({
    SMOKE_POST_SETUP_ROUTES_JSON: JSON.stringify([
      { route: '/league/weather', text: 'Forecast Source' },
      { route: '/roster', text: 'Roster Sources' },
      { route: '/contracts', text: 'Contract Sources' },
    ]),
  }), [
    { route: '/league/weather', text: 'Forecast Source' },
    { route: '/roster', text: 'Roster Sources' },
    { route: '/contracts', text: 'Contract Sources' },
  ]);
});

test('parses the opt-in G6 core UX route matrix', () => {
  assert.equal(shouldRunG6CoreUxSmoke({}), false);
  assert.equal(shouldRunG6CoreUxSmoke({ SMOKE_G6_CORE_UX: '0' }), false);
  assert.equal(shouldRunG6CoreUxSmoke({ SMOKE_G6_CORE_UX: '1' }), true);
  assert.equal(shouldRunG6CoreUxSmoke({ SMOKE_G6_CORE_UX: 'true' }), true);
  assert.equal(shouldRunG6CoreUxSmoke({ SMOKE_G6_CORE_UX: 'YES' }), true);
  assert.deepEqual(parsePostSetupRouteChecks({ SMOKE_G6_CORE_UX: '1' }), [
    { route: '/', text: 'Living Week' },
    { route: '/roster', text: 'Roster Sources' },
    { route: '/depth-chart', text: 'Depth Chart Sources' },
    { route: '/game-plan', text: 'Weekly Prep Sources' },
    { route: '/contracts', text: 'Contract Sources' },
    { route: '/cap-lab', text: 'Cap Lab Sources' },
    { route: '/front-office', text: 'Contract Tool Sources' },
    { route: '/trades', text: 'Trade Center Sources' },
    { route: '/waivers', text: 'Waiver Wire' },
    { route: '/practice-squad', text: 'Practice Squad Slots' },
    { route: '/free-agency', text: 'Free Agency Sources' },
    { route: '/scouting', text: 'Scouting Sources' },
    { route: '/draft', text: 'Draft Board Sources' },
    { route: '/settings', text: 'Operations Source' },
    { route: '/dynasty', text: 'Portable Backup' },
  ]);
});

test('parses the opt-in G6 state-feedback workflow flag', () => {
  assert.equal(shouldRunG6StateFeedbackSmoke({}), false);
  assert.equal(shouldRunG6StateFeedbackSmoke({ SMOKE_G6_STATE_FEEDBACK: '0' }), false);
  assert.equal(shouldRunG6StateFeedbackSmoke({ SMOKE_G6_STATE_FEEDBACK: '1' }), true);
  assert.equal(shouldRunG6StateFeedbackSmoke({ SMOKE_G6_STATE_FEEDBACK: 'true' }), true);
  assert.equal(shouldRunG6StateFeedbackSmoke({ SMOKE_G6_STATE_FEEDBACK: 'YES' }), true);
});

test('parses the opt-in G6 focus-sweep workflow flag', () => {
  assert.equal(shouldRunG6FocusSweepSmoke({}), false);
  assert.equal(shouldRunG6FocusSweepSmoke({ SMOKE_G6_FOCUS_SWEEP: '0' }), false);
  assert.equal(shouldRunG6FocusSweepSmoke({ SMOKE_G6_FOCUS_SWEEP: '1' }), true);
  assert.equal(shouldRunG6FocusSweepSmoke({ SMOKE_G6_FOCUS_SWEEP: 'true' }), true);
  assert.equal(shouldRunG6FocusSweepSmoke({ SMOKE_G6_FOCUS_SWEEP: 'YES' }), true);
});

test('parses the opt-in G6 visual-sweep workflow flag', () => {
  assert.equal(shouldRunG6VisualSweepSmoke({}), false);
  assert.equal(shouldRunG6VisualSweepSmoke({ SMOKE_G6_VISUAL_SWEEP: '0' }), false);
  assert.equal(shouldRunG6VisualSweepSmoke({ SMOKE_G6_VISUAL_SWEEP: '1' }), true);
  assert.equal(shouldRunG6VisualSweepSmoke({ SMOKE_G6_VISUAL_SWEEP: 'true' }), true);
  assert.equal(shouldRunG6VisualSweepSmoke({ SMOKE_G6_VISUAL_SWEEP: 'YES' }), true);
});

test('keeps explicit route matrices ahead of the G6 core UX shortcut', () => {
  assert.deepEqual(parsePostSetupRouteChecks({
    SMOKE_G6_CORE_UX: '1',
    SMOKE_POST_SETUP_ROUTES_JSON: JSON.stringify([{ route: '/league/weather', text: 'Forecast Source' }]),
  }), [
    { route: '/league/weather', text: 'Forecast Source' },
  ]);
});

test('rejects malformed route matrices before browser work starts', () => {
  assert.throws(
    () => parsePostSetupRouteChecks({ SMOKE_POST_SETUP_ROUTES_JSON: '{not-json' }),
    /must be valid JSON/,
  );
  assert.throws(
    () => parsePostSetupRouteChecks({ SMOKE_POST_SETUP_ROUTES_JSON: '[]' }),
    /non-empty array/,
  );
  assert.throws(
    () => parsePostSetupRouteChecks({
      SMOKE_POST_SETUP_ROUTES_JSON: JSON.stringify([{ route: 'roster', text: 'Roster Sources' }]),
    }),
    /starting with "\/"/,
  );
  assert.throws(
    () => parsePostSetupRouteChecks({
      SMOKE_POST_SETUP_ROUTES_JSON: JSON.stringify([{ route: '/roster', text: '' }]),
    }),
    /non-empty string/,
  );
});

test('keeps the post-import route smoke off by default', () => {
  assert.equal(parsePostImportRouteCheck({}), null);
  assert.equal(parsePostImportRouteCheck({ SMOKE_POST_IMPORT_ROUTE_SMOKE: '0' }), null);
});

test('parses the default post-import route smoke flag', () => {
  assert.deepEqual(parsePostImportRouteCheck({ SMOKE_POST_IMPORT_ROUTE_SMOKE: '1' }), {
    route: '/contracts',
    text: 'Contract Sources',
  });
  assert.deepEqual(parsePostImportRouteCheck({ SMOKE_POST_IMPORT_ROUTE_SMOKE: 'true' }), {
    route: '/contracts',
    text: 'Contract Sources',
  });
  assert.deepEqual(parsePostImportRouteCheck({ SMOKE_POST_IMPORT_ROUTE_SMOKE: 'YES' }), {
    route: '/contracts',
    text: 'Contract Sources',
  });
  assert.deepEqual(parsePostImportRouteCheck({ SMOKE_POST_IMPORT_HARD_RELOAD: '1' }), {
    route: '/contracts',
    text: 'Contract Sources',
  });
});

test('parses post-import route smoke overrides', () => {
  assert.deepEqual(parsePostImportRouteCheck({
    SMOKE_POST_IMPORT_ROUTE: '/roster',
    SMOKE_POST_IMPORT_TEXT: 'Roster Sources',
  }), {
    route: '/roster',
    text: 'Roster Sources',
  });
});

test('rejects malformed post-import route smoke overrides before browser work starts', () => {
  assert.throws(
    () => parsePostImportRouteCheck({
      SMOKE_POST_IMPORT_ROUTE_SMOKE: '1',
      SMOKE_POST_IMPORT_ROUTE: 'contracts',
    }),
    /starting with "\/"/,
  );
  assert.throws(
    () => parsePostImportRouteCheck({
      SMOKE_POST_IMPORT_ROUTE_SMOKE: '1',
      SMOKE_POST_IMPORT_TEXT: '',
    }),
    /non-empty string/,
  );
});

test('parses the opt-in week-advance workflow flag', () => {
  assert.equal(shouldRunAdvanceWeekSmoke({}), false);
  assert.equal(shouldRunAdvanceWeekSmoke({ SMOKE_ADVANCE_WEEK: '0' }), false);
  assert.equal(shouldRunAdvanceWeekSmoke({ SMOKE_ADVANCE_WEEK: '1' }), true);
  assert.equal(shouldRunAdvanceWeekSmoke({ SMOKE_ADVANCE_WEEK: 'true' }), true);
  assert.equal(shouldRunAdvanceWeekSmoke({ SMOKE_ADVANCE_WEEK: 'YES' }), true);
});

test('parses the opt-in cartridge round-trip workflow flag', () => {
  assert.equal(shouldRunCartridgeRoundTripSmoke({}), false);
  assert.equal(shouldRunCartridgeRoundTripSmoke({ SMOKE_CARTRIDGE_ROUND_TRIP: '0' }), false);
  assert.equal(shouldRunCartridgeRoundTripSmoke({ SMOKE_CARTRIDGE_ROUND_TRIP: '1' }), true);
  assert.equal(shouldRunCartridgeRoundTripSmoke({ SMOKE_CARTRIDGE_ROUND_TRIP: 'true' }), true);
  assert.equal(shouldRunCartridgeRoundTripSmoke({ SMOKE_CARTRIDGE_ROUND_TRIP: 'YES' }), true);
});

test('parses the opt-in cartridge file round-trip workflow flag', () => {
  assert.equal(shouldRunCartridgeFileRoundTripSmoke({}), false);
  assert.equal(shouldRunCartridgeFileRoundTripSmoke({ SMOKE_CARTRIDGE_FILE_ROUND_TRIP: '0' }), false);
  assert.equal(shouldRunCartridgeFileRoundTripSmoke({ SMOKE_CARTRIDGE_FILE_ROUND_TRIP: '1' }), true);
  assert.equal(shouldRunCartridgeFileRoundTripSmoke({ SMOKE_CARTRIDGE_FILE_ROUND_TRIP: 'true' }), true);
  assert.equal(shouldRunCartridgeFileRoundTripSmoke({ SMOKE_CARTRIDGE_FILE_ROUND_TRIP: 'YES' }), true);
});

test('parses the opt-in local save-slot round-trip workflow flag', () => {
  assert.equal(shouldRunLocalSaveSlotRoundTripSmoke({}), false);
  assert.equal(shouldRunLocalSaveSlotRoundTripSmoke({ SMOKE_LOCAL_SAVE_SLOT_ROUND_TRIP: '0' }), false);
  assert.equal(shouldRunLocalSaveSlotRoundTripSmoke({ SMOKE_LOCAL_SAVE_SLOT_ROUND_TRIP: '1' }), true);
  assert.equal(shouldRunLocalSaveSlotRoundTripSmoke({ SMOKE_LOCAL_SAVE_SLOT_ROUND_TRIP: 'true' }), true);
  assert.equal(shouldRunLocalSaveSlotRoundTripSmoke({ SMOKE_LOCAL_SAVE_SLOT_ROUND_TRIP: 'YES' }), true);
});

test('parses the opt-in new-dynasty setup-entry workflow flag', () => {
  assert.equal(shouldRunNewDynastySetupEntrySmoke({}), false);
  assert.equal(shouldRunNewDynastySetupEntrySmoke({ SMOKE_NEW_DYNASTY_SETUP_ENTRY: '0' }), false);
  assert.equal(shouldRunNewDynastySetupEntrySmoke({ SMOKE_NEW_DYNASTY_SETUP_ENTRY: '1' }), true);
  assert.equal(shouldRunNewDynastySetupEntrySmoke({ SMOKE_NEW_DYNASTY_SETUP_ENTRY: 'true' }), true);
  assert.equal(shouldRunNewDynastySetupEntrySmoke({ SMOKE_NEW_DYNASTY_SETUP_ENTRY: 'YES' }), true);
});

test('keeps the new-dynasty setup-entry smoke focused on Chip and the AGM chooser', () => {
  assert.match(smokeSource, /waitForBodyText\(cdp, sessionId, 'separate Must Do, Recommended, and Optional work'/);
  assert.match(smokeSource, /waitForBodyText\(cdp, sessionId, 'roster, cap space, owner patience, or the next game'/);
  assert.doesNotMatch(smokeSource, /roster, cap, owner trust, or the next game/);
  assert.match(smokeSource, /waitForBodyText\(cdp, sessionId, 'Candidate Spotlight'/);
  assert.match(smokeSource, /setup cold-open Chip Where row reachable by wheel scroll/);
  assert.match(smokeSource, /setup cold-open Chip Where row visible above setup action bar/);
  assert.match(smokeSource, /setup cold-open Chip consequences use reachable scroll/);
  assert.match(smokeSource, /setup cold-open Chip not-now control visible above setup action bar/);
  assert.match(smokeSource, /setup Chip context row keeps post-row scroll clearance/);
  assert.match(smokeSource, /AGM chooser Chip context row keeps post-row scroll clearance/);
  assert.match(smokeSource, /AGM chooser Chip Where row readable before narrow-tablet scroll/);
  assert.match(smokeSource, /waitForSetupChipContextRowReadableBeforeScroll\(cdp, sessionId, 'where'/);
  assert.match(smokeSource, /waitForSetupChipContextRowReachableByWheel\(cdp, sessionId, 'where'/);
  assert.match(smokeSource, /waitForSetupChipContextRowPostScrollClearance\(cdp, sessionId, 'where', 'AGM chooser Chip context row keeps post-row scroll clearance'\)/);
  assert.match(smokeSource, /waitForSetupChipContextUsesReachableScroll\(cdp, sessionId, 'AGM chooser Chip consequences use reachable scroll'/);
  assert.match(smokeSource, /shortViewportScrollerIsClear/);
  assert.match(smokeSource, /maxHeight <= 220/);
  assert.match(smokeSource, /scrollPaddingBottom >= 120/);
  assert.match(smokeSource, /detailsRect\.bottom <= bottomLimit - 12/);
  assert.match(smokeSource, /waitForSetupChipControlVisibleAboveCommandBar\(cdp, sessionId, 'not now Chip!'/);
  assert.match(smokeSource, /waitForSetupAGMHireCommandReachableByWheel\(cdp, sessionId, 'AGM chooser hire command reachable after Chip guidance'/);
  assert.match(smokeSource, /Choose Chip's first setup priority: cap space, starter jobs, staff plan, or owner patience/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'Pick who watches cap'/);
  assert.match(smokeSource, /type: 'mouseWheel'/);
  assert.match(smokeSource, /Setup Chip wheel-scroll geometry/);
  assert.match(smokeSource, /rowRect\.bottom <= bottomLimit - 44/);
  assert.match(smokeSource, /postRowClearance >= 88/);
  assert.match(smokeSource, /scrollPastRowRange >= 96/);
  assert.match(smokeSource, /Setup Chip control geometry/);
  assert.match(smokeSource, /Setup AGM hire command geometry/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'Forecast Board'/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'Setup Decision Impact'/);
  assert.doesNotMatch(smokeSource, /waitForBodyText\(cdp, sessionId, 'Setup Decision Impact'/);
  assert.doesNotMatch(smokeSource, /waitForBodyText\(cdp, sessionId, 'No setup choices are locked yet\.'/);
});

test('parses the opt-in full setup completion workflow flag', () => {
  assert.equal(shouldRunFullSetupCompleteSmoke({}), false);
  assert.equal(shouldRunFullSetupCompleteSmoke({ SMOKE_FULL_SETUP_COMPLETE: '0' }), false);
  assert.equal(shouldRunFullSetupCompleteSmoke({ SMOKE_FULL_SETUP_COMPLETE: '1' }), true);
  assert.equal(shouldRunFullSetupCompleteSmoke({ SMOKE_FULL_SETUP_COMPLETE: 'true' }), true);
  assert.equal(shouldRunFullSetupCompleteSmoke({ SMOKE_FULL_SETUP_COMPLETE: 'YES' }), true);
});

test('keeps full setup smoke aligned to the plain-language setup labels', () => {
  assert.match(smokeSource, /waitForBodyText\(cdp, sessionId, 'Full GM', 'new-dynasty full GM option'\)/);
  assert.match(smokeSource, /clickButtonContaining\(cdp, sessionId, 'Full GM', 'clickable Full GM onboarding option'\)/);
  assert.match(smokeSource, /clickButtonContaining\(cdp, sessionId, 'Start Full GM', 'clickable Start Full GM button'\)/);
  assert.doesNotMatch(smokeSource, /new-dynasty full setup option|clickable Start Dynasty button/);
  assert.match(smokeSource, /Open Intel for owner patience, injuries, cap space, and Week 1 matchup threats/);
  assert.match(smokeSource, /Choose restructures now or save injury, trade, and extension cap space/);
  assert.match(smokeSource, /Choose goals ownership judges and rules that change morale after losses/);
  assert.match(smokeSource, /Preview staff, scheme, lineup, cap space, and goals before Week 1 locks/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'Open owner, roster, cap'/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'protect later fixes'/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'Pick owner promises and team rules'/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'Verify locked choices before Week 1 starts'/);
  assert.match(smokeSource, /waitForSetupHeaderText\(cdp, sessionId, 'MEET THE ROSTER', 'meet roster phase'\)/);
  assert.match(smokeSource, /waitForSetupHeaderText\(cdp, sessionId, 'HIRE HEAD COACH', 'hire coach phase'\)/);
  assert.match(smokeSource, /waitForBodyText\(cdp, sessionId, 'Mistake Chance', 'plain candidate mistake-chance badge'\)/);
  assert.match(smokeSource, /waitForBodyText\(cdp, sessionId, 'WHAT CAN GO WRONG', 'plain candidate consequence warning label'\)/);
  assert.match(smokeSource, /waitForBodyText\(cdp, sessionId, 'HAS COST', 'plain candidate has-cost recommendation label'\)/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'TRADEOFF', 'coach cards avoid abstract tradeoff badge'\)/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'RISKS', 'coach cards avoid generic risks heading'\)/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'Risk -', 'coach cards avoid generic risk badge'\)/);
  assert.match(smokeSource, /waitForSetupHeaderText\(cdp, sessionId, 'HIRE SCOUTING DIRECTOR', 'hire scout phase'\)/);
  assert.match(smokeSource, /waitForSetupHeaderText\(cdp, sessionId, 'PICK SCHEMES', 'scheme phase'\)/);
  assert.match(smokeSource, /waitForSetupHeaderText\(cdp, sessionId, 'CHOOSE CAP PLAN', 'cap strategy phase'\)/);
  assert.match(smokeSource, /waitForSetupHeaderText\(cdp, sessionId, 'SET OWNER GOALS', 'goals phase'\)/);
  assert.match(smokeSource, /waitForSetupHeaderText\(cdp, sessionId, 'OPEN BLUEPRINT', 'blueprint phase'\)/);
  assert.match(smokeSource, /waitForBodyText\(cdp, sessionId, 'SELECTED FOR SETUP', 'selected AGM confirmation'\)/);
  assert.match(smokeSource, /playable Year 1 preseason Week 1 app shell after full setup/);
  assert.match(smokeSource, /action center reads phase, prep, starters/);
  assert.match(smokeSource, /must do items stop or redirect advance week/);
  assert.match(smokeSource, /recommendations explain what to fix or accept/);
  assert.doesNotMatch(smokeSource, /MEET THE PLAYERS|HIRE YOUR COACH|BUILD YOUR INTEL|SET YOUR GOALS|DAY 1 COMPLETE|SELECTED FOR DAY 1/);
  assert.doesNotMatch(smokeSource, /worth using only when/);
  assert.match(smokeSource, /data-mfd-setup-forecast-card-label/);
  assert.match(smokeSource, /const expected = \['Week 1 Plan', 'Scheme Fit', 'Team Morale', 'Cap Space', 'Owner Patience'\]/);
  assert.match(smokeSource, /const retired = \['Week 1 Readiness', 'Scheme Cohesion', 'Culture Stability', 'Cap Flexibility'\]/);
  assert.match(smokeSource, /await waitForSetupForecastLabels\(cdp, sessionId\)/);
  assert.match(smokeSource, /waitForBodyText\(cdp, sessionId, 'Setup Consequences', 'setup consequences panel title'\)/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'Setup Forecast', 'setup consequences panel avoids forecast jargon'\)/);
  assert.match(smokeSource, /async function waitForSetupCapPlanChoices/);
  assert.match(smokeSource, /const expected = \['Protect Future Cap', 'Restructure One Contract', 'Restructure Multiple Contracts'\]/);
  assert.match(smokeSource, /'Balanced Pressure Release'/);
  assert.match(smokeSource, /await waitForSetupCapPlanChoices\(cdp, sessionId\)/);
  assert.match(smokeSource, /Create cap space with one controlled restructure/);
  assert.match(smokeSource, /later injury, trade, and extension fixes stay open/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'reduce room for later fixes'/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'losing later room'/);
  assert.match(smokeSource, /Name roster roles and scheme calls before Week 1/);
  assert.match(smokeSource, /Fix unresolved roster, Week 1 game-plan, or cap choices before Week 1/);
  assert.match(smokeSource, /Preview every unresolved setup choice before the first month/);
  assert.match(smokeSource, /thin backup/);
  assert.match(smokeSource, /thinnest starter/);
  assert.match(smokeSource, /cannot survive an injury/);
  assert.match(smokeSource, /protection, coverage, or run-defense assignments/);
  assert.match(smokeSource, /blocked injury replacement/);
  assert.match(smokeSource, /opener depends on matching opponent pressure, coverage, and run-defense needs/);
  assert.match(smokeSource, /wrong pairings cost the opener/);
  assert.match(smokeSource, /wrong starter, call, or cap tradeoff/);
  assert.match(smokeSource, /Choose the coach whose scheme and teaching match current starters/);
  assert.match(smokeSource, /coach-player gaps create Week 1 missed assignments/);
  assert.match(smokeSource, /Choose Week 1 calls that avoid unassigned starter jobs/);
  assert.match(smokeSource, /late scheme changes create missed assignments before Week 1/);
  assert.match(smokeSource, /hire the coach this roster can run right now/);
  assert.match(smokeSource, /Play calls current starters cannot run/);
  assert.match(smokeSource, /choose schemes the roster can run now/);
  assert.match(smokeSource, /Fourth-down and clock rules assigned before Week 1/);
  assert.match(smokeSource, /Scouting tasks must stay secondary or Game Plan calls stay unset by Week 1/);
  assert.match(smokeSource, /Wasted-pick warnings before draft day/);
  assert.match(smokeSource, /Slow injury and testing reports leave medical limits unresolved before picks/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'WK1 ', 'coach cards avoid Week 1 abbreviation'\)/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'VOL ', 'coach cards avoid volatility abbreviation'\)/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'Situational discipline', 'coach cards avoid discipline shorthand'\)/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'Process calibration', 'scout cards avoid process-calibration shorthand'\)/);
  assert.match(smokeSource, /assertBodyTextAbsent\(cdp, sessionId, 'Verified measurables', 'scout cards avoid measurables shorthand'\)/);
  assert.match(smokeSource, /lowerBody\.includes\('preseason'\)/);
  assert.match(smokeSource, /lowerBody\.includes\('season 2026'\)/);
  assert.doesNotMatch(smokeSource, /worth using only when they change this week's lineup, cap space, market offer, staff plan, or matchup/);
  assert.doesNotMatch(smokeSource, /change the current plan or screen deadline/);
  assert.doesNotMatch(smokeSource, /SET THE IDENTITY/);
  assert.doesNotMatch(smokeSource, /THE MONEY/);
});

test('parses the opt-in contract restructure workflow flag', () => {
  assert.equal(shouldRunContractRestructureSmoke({}), false);
  assert.equal(shouldRunContractRestructureSmoke({ SMOKE_CONTRACT_RESTRUCTURE: '0' }), false);
  assert.equal(shouldRunContractRestructureSmoke({ SMOKE_CONTRACT_RESTRUCTURE: '1' }), true);
  assert.equal(shouldRunContractRestructureSmoke({ SMOKE_CONTRACT_RESTRUCTURE: 'true' }), true);
  assert.equal(shouldRunContractRestructureSmoke({ SMOKE_CONTRACT_RESTRUCTURE: 'YES' }), true);
});

test('parses the opt-in contract backload workflow flag', () => {
  assert.equal(shouldRunContractBackloadSmoke({}), false);
  assert.equal(shouldRunContractBackloadSmoke({ SMOKE_CONTRACT_BACKLOAD: '0' }), false);
  assert.equal(shouldRunContractBackloadSmoke({ SMOKE_CONTRACT_BACKLOAD: '1' }), true);
  assert.equal(shouldRunContractBackloadSmoke({ SMOKE_CONTRACT_BACKLOAD: 'true' }), true);
  assert.equal(shouldRunContractBackloadSmoke({ SMOKE_CONTRACT_BACKLOAD: 'YES' }), true);
});

test('parses the opt-in contract cuts workflow flag', () => {
  assert.equal(shouldRunContractCutsSmoke({}), false);
  assert.equal(shouldRunContractCutsSmoke({ SMOKE_CONTRACT_CUTS: '0' }), false);
  assert.equal(shouldRunContractCutsSmoke({ SMOKE_CONTRACT_CUTS: '1' }), true);
  assert.equal(shouldRunContractCutsSmoke({ SMOKE_CONTRACT_CUTS: 'true' }), true);
  assert.equal(shouldRunContractCutsSmoke({ SMOKE_CONTRACT_CUTS: 'YES' }), true);
});

test('parses the opt-in contract negotiations workflow flag', () => {
  assert.equal(shouldRunContractNegotiationsSmoke({}), false);
  assert.equal(shouldRunContractNegotiationsSmoke({ SMOKE_CONTRACT_NEGOTIATIONS: '0' }), false);
  assert.equal(shouldRunContractNegotiationsSmoke({ SMOKE_CONTRACT_NEGOTIATIONS: '1' }), true);
  assert.equal(shouldRunContractNegotiationsSmoke({ SMOKE_CONTRACT_NEGOTIATIONS: 'true' }), true);
  assert.equal(shouldRunContractNegotiationsSmoke({ SMOKE_CONTRACT_NEGOTIATIONS: 'YES' }), true);
});

test('parses the opt-in Cap Lab batch workflow flag', () => {
  assert.equal(shouldRunCapLabBatchSmoke({}), false);
  assert.equal(shouldRunCapLabBatchSmoke({ SMOKE_CAP_LAB_BATCH: '0' }), false);
  assert.equal(shouldRunCapLabBatchSmoke({ SMOKE_CAP_LAB_BATCH: '1' }), true);
  assert.equal(shouldRunCapLabBatchSmoke({ SMOKE_CAP_LAB_BATCH: 'true' }), true);
  assert.equal(shouldRunCapLabBatchSmoke({ SMOKE_CAP_LAB_BATCH: 'YES' }), true);
});

test('parses the opt-in trade counter/block workflow flag', () => {
  assert.equal(shouldRunTradeCounterBlockSmoke({}), false);
  assert.equal(shouldRunTradeCounterBlockSmoke({ SMOKE_TRADE_COUNTER_BLOCK: '0' }), false);
  assert.equal(shouldRunTradeCounterBlockSmoke({ SMOKE_TRADE_COUNTER_BLOCK: '1' }), true);
  assert.equal(shouldRunTradeCounterBlockSmoke({ SMOKE_TRADE_COUNTER_BLOCK: 'true' }), true);
  assert.equal(shouldRunTradeCounterBlockSmoke({ SMOKE_TRADE_COUNTER_BLOCK: 'YES' }), true);
});

test('parses the opt-in waiver/practice-squad workflow flag', () => {
  assert.equal(shouldRunWaiverPracticeSquadSmoke({}), false);
  assert.equal(shouldRunWaiverPracticeSquadSmoke({ SMOKE_WAIVER_PRACTICE_SQUAD: '0' }), false);
  assert.equal(shouldRunWaiverPracticeSquadSmoke({ SMOKE_WAIVER_PRACTICE_SQUAD: '1' }), true);
  assert.equal(shouldRunWaiverPracticeSquadSmoke({ SMOKE_WAIVER_PRACTICE_SQUAD: 'true' }), true);
  assert.equal(shouldRunWaiverPracticeSquadSmoke({ SMOKE_WAIVER_PRACTICE_SQUAD: 'YES' }), true);
});

test('waiver/practice smoke accepts deterministic CPU re-signing after a proven release', () => {
  assert.match(smokeSource, /const practiceReleaseSurvived = Boolean/);
  assert.match(smokeSource, /practicePlayer\?\.teamId !== fixture\.userTeamId/);
  assert.match(smokeSource, /'practiceReleaseSurvived',\s*'practice-squad release persisted after final hard reload'/);
  assert.match(smokeSource, /'practiceReleased',\s*'practice-squad release persisted to latest autosave'/);
});

test('parses the opt-in free-agency signings workflow flag', () => {
  assert.equal(shouldRunFreeAgencySigningsSmoke({}), false);
  assert.equal(shouldRunFreeAgencySigningsSmoke({ SMOKE_FREE_AGENCY_SIGNINGS: '0' }), false);
  assert.equal(shouldRunFreeAgencySigningsSmoke({ SMOKE_FREE_AGENCY_SIGNINGS: '1' }), true);
  assert.equal(shouldRunFreeAgencySigningsSmoke({ SMOKE_FREE_AGENCY_SIGNINGS: 'true' }), true);
  assert.equal(shouldRunFreeAgencySigningsSmoke({ SMOKE_FREE_AGENCY_SIGNINGS: 'YES' }), true);
});

test('parses the opt-in roster/depth/training workflow flag', () => {
  assert.equal(shouldRunRosterDepthTrainingSmoke({}), false);
  assert.equal(shouldRunRosterDepthTrainingSmoke({ SMOKE_ROSTER_DEPTH_TRAINING: '0' }), false);
  assert.equal(shouldRunRosterDepthTrainingSmoke({ SMOKE_ROSTER_DEPTH_TRAINING: '1' }), true);
  assert.equal(shouldRunRosterDepthTrainingSmoke({ SMOKE_ROSTER_DEPTH_TRAINING: 'true' }), true);
  assert.equal(shouldRunRosterDepthTrainingSmoke({ SMOKE_ROSTER_DEPTH_TRAINING: 'YES' }), true);
});

test('parses the opt-in weekly-prep workflow flag', () => {
  assert.equal(shouldRunWeeklyPrepSmoke({}), false);
  assert.equal(shouldRunWeeklyPrepSmoke({ SMOKE_WEEKLY_PREP: '0' }), false);
  assert.equal(shouldRunWeeklyPrepSmoke({ SMOKE_WEEKLY_PREP: '1' }), true);
  assert.equal(shouldRunWeeklyPrepSmoke({ SMOKE_WEEKLY_PREP: 'true' }), true);
  assert.equal(shouldRunWeeklyPrepSmoke({ SMOKE_WEEKLY_PREP: 'YES' }), true);
});

test('weekly-prep smoke proves Call Your Shot copy on high-stakes weeks', () => {
  assert.match(smokeSource, /highStakesWeeks = candidateWeeks\.filter\(\(week\) => Number\(week\.week\) >= 15\)/);
  assert.match(smokeSource, /stagedWeekNumber = Math\.max\(Number\(targetWeek\.week\), 15\)/);
  assert.match(smokeSource, /Autosave \(weekly-prep smoke fixture\)/);
  assert.match(smokeSource, /delete stagedSlot\.id/);
  assert.match(smokeSource, /deleteSmokeSaveSlot\(cdp, sessionId, fixture\.stagedSlotId/);
  assert.match(smokeSource, /Choose one promise before Save/);
  assert.match(smokeSource, /hit it for fan-confidence gain/);
  assert.match(smokeSource, /fan confidence drops in the recap receipt/);
  assert.match(smokeSource, /Promise 250\+ passing yards/);
});

test('parses the opt-in draft/scouting workflow flag', () => {
  assert.equal(shouldRunDraftScoutingSmoke({}), false);
  assert.equal(shouldRunDraftScoutingSmoke({ SMOKE_DRAFT_SCOUTING: '0' }), false);
  assert.equal(shouldRunDraftScoutingSmoke({ SMOKE_DRAFT_SCOUTING: '1' }), true);
  assert.equal(shouldRunDraftScoutingSmoke({ SMOKE_DRAFT_SCOUTING: 'true' }), true);
  assert.equal(shouldRunDraftScoutingSmoke({ SMOKE_DRAFT_SCOUTING: 'YES' }), true);
});

test('parses the opt-in draft war-room trade workflow flag', () => {
  assert.equal(shouldRunDraftWarRoomTradeSmoke({}), false);
  assert.equal(shouldRunDraftWarRoomTradeSmoke({ SMOKE_DRAFT_WAR_ROOM_TRADE: '0' }), false);
  assert.equal(shouldRunDraftWarRoomTradeSmoke({ SMOKE_DRAFT_WAR_ROOM_TRADE: '1' }), true);
  assert.equal(shouldRunDraftWarRoomTradeSmoke({ SMOKE_DRAFT_WAR_ROOM_TRADE: 'true' }), true);
  assert.equal(shouldRunDraftWarRoomTradeSmoke({ SMOKE_DRAFT_WAR_ROOM_TRADE: 'YES' }), true);
});

test('draft war-room trade smoke stages a source-backed current pick and future sweetener', () => {
  assert.match(smokeSource, /SMOKE_DRAFT_WAR_ROOM_TRADE=1/);
  assert.match(smokeSource, /Future round 3 pick/);
  assert.match(smokeSource, /draftOrderUpdated/);
  assert.match(smokeSource, /userReceivedFuturePick/);
  assert.match(smokeSource, /warRoomRebuiltForCpu/);
  assert.match(smokeSource, /draftTradeNewsPersisted/);
  assert.match(smokeSource, /Draft order ownership updated/);
});

test('parses the opt-in staff/facility/medical workflow flag', () => {
  assert.equal(shouldRunStaffFacilityMedicalSmoke({}), false);
  assert.equal(shouldRunStaffFacilityMedicalSmoke({ SMOKE_STAFF_FACILITY_MEDICAL: '0' }), false);
  assert.equal(shouldRunStaffFacilityMedicalSmoke({ SMOKE_STAFF_FACILITY_MEDICAL: '1' }), true);
  assert.equal(shouldRunStaffFacilityMedicalSmoke({ SMOKE_STAFF_FACILITY_MEDICAL: 'true' }), true);
  assert.equal(shouldRunStaffFacilityMedicalSmoke({ SMOKE_STAFF_FACILITY_MEDICAL: 'YES' }), true);
});

test('parses the opt-in Chip mute workflow flag', () => {
  assert.equal(shouldRunChipMuteSmoke({}), false);
  assert.equal(shouldRunChipMuteSmoke({ SMOKE_CHIP_MUTE: '0' }), false);
  assert.equal(shouldRunChipMuteSmoke({ SMOKE_CHIP_MUTE: '1' }), true);
  assert.equal(shouldRunChipMuteSmoke({ SMOKE_CHIP_MUTE: 'true' }), true);
  assert.equal(shouldRunChipMuteSmoke({ SMOKE_CHIP_MUTE: 'YES' }), true);
});

test('parses the opt-in Chip receipt-respect workflow flag', () => {
  assert.equal(shouldRunChipReceiptRespectSmoke({}), false);
  assert.equal(shouldRunChipReceiptRespectSmoke({ SMOKE_CHIP_RECEIPT_RESPECT: '0' }), false);
  assert.equal(shouldRunChipReceiptRespectSmoke({ SMOKE_CHIP_RECEIPT_RESPECT: '1' }), true);
  assert.equal(shouldRunChipReceiptRespectSmoke({ SMOKE_CHIP_RECEIPT_RESPECT: 'true' }), true);
  assert.equal(shouldRunChipReceiptRespectSmoke({ SMOKE_CHIP_RECEIPT_RESPECT: 'YES' }), true);
});

test('Chip receipt-respect smoke locks exact first-week roster guidance copy', () => {
  assert.match(smokeSource, /Recommended: open Roster before Game Plan\. Where: injuries and first backups\. Consequence: uncovered backups force emergency signings\./);
  assert.match(smokeSource, /Recommended: decide starter, backup, trade, or cut\. Where: highlighted player\. Consequence: extra names do not fix the role\./);
  assert.match(smokeSource, /Recommended: open Roster for injury and backup health\. Where: Roster, then Depth Chart\. Consequence: uncovered injuries force signings\./);
  assert.doesNotMatch(smokeSource, /Where: injury and first-backup flags/);
  assert.doesNotMatch(smokeSource, /emergency starters/);
});

test('parses the opt-in Chip Ask summary workflow flag', () => {
  assert.equal(shouldRunChipAskSummarySmoke({}), false);
  assert.equal(shouldRunChipAskSummarySmoke({ SMOKE_CHIP_ASK_SUMMARY: '0' }), false);
  assert.equal(shouldRunChipAskSummarySmoke({ SMOKE_CHIP_ASK_SUMMARY: '1' }), true);
  assert.equal(shouldRunChipAskSummarySmoke({ SMOKE_CHIP_ASK_SUMMARY: 'true' }), true);
  assert.equal(shouldRunChipAskSummarySmoke({ SMOKE_CHIP_ASK_SUMMARY: 'YES' }), true);
});

test('Chip Ask summary smoke checks highlighted screen badge wording', () => {
  assert.match(smokeSource, /Must Do: choose or defer/);
  assert.match(smokeSource, /Where: Inbox, Action Center, or highlighted screen badges/);
  assert.doesNotMatch(smokeSource, /Must Do: open Inbox, Action Center, or highlighted screen badges/);
  assert.doesNotMatch(smokeSource, /Must Do: open Inbox, Action Center, or route badges/);
});

test('parses the opt-in Chip Monday beat-chain workflow flag', () => {
  assert.equal(shouldRunChipMondayBeatChainSmoke({}), false);
  assert.equal(shouldRunChipMondayBeatChainSmoke({ SMOKE_CHIP_MONDAY_BEAT_CHAIN: '0' }), false);
  assert.equal(shouldRunChipMondayBeatChainSmoke({ SMOKE_CHIP_MONDAY_BEAT_CHAIN: '1' }), true);
  assert.equal(shouldRunChipMondayBeatChainSmoke({ SMOKE_CHIP_MONDAY_BEAT_CHAIN: 'true' }), true);
  assert.equal(shouldRunChipMondayBeatChainSmoke({ SMOKE_CHIP_MONDAY_BEAT_CHAIN: 'YES' }), true);
});

test('Chip Monday beat-chain smoke locks exact first-week briefing guidance copy', () => {
  assert.match(smokeSource, /Must Do: open Monday Briefing\. Where: Action Center\. Consequence: Advance Week locks injuries, promises, deadlines, and opponent prep\./);
  assert.match(smokeSource, /Must Do: open Action Center\. Where: Monday Briefing\. Consequence: Advance Week locks injuries, promises, deadlines, and opponent prep\./);
  assert.doesNotMatch(smokeSource, /open Action Center first\. Verify injuries/);
  assert.doesNotMatch(smokeSource, /Advance Week locks injuries, morale, deadlines, and opponent/);
  assert.doesNotMatch(smokeSource, /opponent lock/);
});

test('parses the opt-in Chip focus/reduced-motion workflow flag', () => {
  assert.equal(shouldRunChipFocusReducedMotionSmoke({}), false);
  assert.equal(shouldRunChipFocusReducedMotionSmoke({ SMOKE_CHIP_FOCUS_REDUCED_MOTION: '0' }), false);
  assert.equal(shouldRunChipFocusReducedMotionSmoke({ SMOKE_CHIP_FOCUS_REDUCED_MOTION: '1' }), true);
  assert.equal(shouldRunChipFocusReducedMotionSmoke({ SMOKE_CHIP_FOCUS_REDUCED_MOTION: 'true' }), true);
  assert.equal(shouldRunChipFocusReducedMotionSmoke({ SMOKE_CHIP_FOCUS_REDUCED_MOTION: 'YES' }), true);
});

test('parses the opt-in post-import hard-reload workflow flag', () => {
  assert.equal(shouldRunPostImportHardReloadSmoke({}), false);
  assert.equal(shouldRunPostImportHardReloadSmoke({ SMOKE_POST_IMPORT_HARD_RELOAD: '0' }), false);
  assert.equal(shouldRunPostImportHardReloadSmoke({ SMOKE_POST_IMPORT_HARD_RELOAD: '1' }), true);
  assert.equal(shouldRunPostImportHardReloadSmoke({ SMOKE_POST_IMPORT_HARD_RELOAD: 'true' }), true);
  assert.equal(shouldRunPostImportHardReloadSmoke({ SMOKE_POST_IMPORT_HARD_RELOAD: 'YES' }), true);
});

test('parses optional smoke viewport overrides', () => {
  assert.equal(parseSmokeViewport({}), null);
  assert.deepEqual(parseSmokeViewport({
    SMOKE_VIEWPORT_WIDTH: '480',
    SMOKE_VIEWPORT_HEIGHT: '900',
  }), { width: 480, height: 900, mobile: true });
  assert.deepEqual(parseSmokeViewport({
    SMOKE_VIEWPORT_WIDTH: '1280',
    SMOKE_VIEWPORT_HEIGHT: '900',
  }), { width: 1280, height: 900, mobile: false });
});

test('rejects malformed smoke viewport overrides before browser work starts', () => {
  assert.throws(
    () => parseSmokeViewport({ SMOKE_VIEWPORT_WIDTH: '480' }),
    /provided together/,
  );
  assert.throws(
    () => parseSmokeViewport({ SMOKE_VIEWPORT_WIDTH: 'abc', SMOKE_VIEWPORT_HEIGHT: '900' }),
    /integer CSS pixels/,
  );
  assert.throws(
    () => parseSmokeViewport({ SMOKE_VIEWPORT_WIDTH: '300', SMOKE_VIEWPORT_HEIGHT: '400' }),
    /at least 320x480/,
  );
});
