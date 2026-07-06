import { describe, expect, it } from 'vitest';
import { buildColdOpenChipDialogue } from '../franchise-setup/FranchiseSetupWizard';
import { chipBriefingOutro } from '../monday-briefing/MondayBriefing';
import { HALFTIME_CHIP_COPY } from '../game-day/HalftimeDecision';
import { buildPressConferenceChipCopy } from '../game-day/PressConferenceModal';
import { buildRecapChipCopy, type RecapChipOutcome } from '../game-day/RecapChipReaction';
import { eraChipCopy, type EraTransitionVariant } from '../dynasty-era/EraTransitionReveal';
import { ACHIEVEMENT_UNLOCK_CHIP_COPY } from '../legacy/AchievementGallery';
import { createAskChipLiveBeat, createPendingDecisionsBeat } from './ChipDock';
import { createWhereAmIBeat, type WhereAmIState } from './whereAmI';
import { onboardingDialogue } from './dialogue/onboarding';
import { weeklyDialogue } from './dialogue/weekly';
import { FIRST_TEN_MINUTE_ONBOARDING_BEATS } from './onboardingMachine';
import { ROUTE_BEAT_REGISTRY, ROUTE_KEYS } from '../route-coaching/routeBeatRegistry';
import { buildWeeklyGuidance, weeklyGuidanceToDialogueEntry } from './weeklyGuidance';
import { chipCopyHasActionAndConsequence } from './dialogue/types';

function expectDirectChipCopy(copy: string, label: string): void {
  expect(copy.length, `${label}: ${copy}`).toBeGreaterThan(0);
  expect(copy, label).toSatisfy((value: string) => chipCopyHasActionAndConsequence(value));
  expect(copy, label).not.toMatch(/\b(vibe|feels?|story|context|identity|foundation|momentum|real answer|good energy|tone setter|history context|weekly work|weekly priorities)\b/i);
  expect(copy, label).not.toMatch(/\bread\b/i);
  expect(copy, label).not.toMatch(/\b(verify|verifies|verified|verification|verifications|confirm|confirmed|confirming|check|checks|checking|review|reviewing|reviewed)\b/i);
  expect(copy, label).not.toMatch(/\bcompare\b/i);
  expect(copy, label).not.toMatch(/\b(execute|execution|future flexibility|shape draft grades)\b/i);
  expect(copy, label).not.toMatch(/Review history and awards after|when they are legal|aging, contract, and staff pressure/i);
  expect(copy, label).not.toMatch(/Can wait:|No required action is stopping Advance Week|no required item is stopping|weekly decisions|Awards and history can wait|optional roster and cap moves can wait/i);
  expect(copy, label).not.toMatch(/survived late|completed the comeback|won overtime|lost overtime|won big|lost badly|Press Tone|gameplay effects/i);
  expect(copy, label).not.toMatch(/Use Film Room before changing roster or Game Plan|Open Postgame Recap and Game Plan|Check the early failure in Recap|Open Roster, Depth Chart, and Game Plan before Advance Week|Open Recap and Game Plan now|Keep roster and plan unchanged unless Film Room|Find the biggest matchup miss in Recap or Film Room before Advance Week/i);
  expect(copy, label).not.toMatch(/team rating|rating boost|rating tradeoff/i);
  expect(copy, label).not.toMatch(/prospect grades|missing grades|using the ranking|good grade|need, grade, and price|starter-need grades|grade matches a draft need/i);
  expect(copy, label).not.toMatch(/Choose now:|Choose the public answer you want saved|High Ambition saves the boldest quote|Measured saves (a middle answer|the balanced quote)|Low Key saves the quietest quote|Switch risks (the first drive to improve later possessions|drive one for later lift)|Gamble attacks the first drive, then weakens later possessions|Gamble boosts drive one but can weaken later drives if it misses/i);
  expect(copy, label).not.toMatch(/Must Do: choose the public answer/i);
  expect(copy, label).not.toMatch(/Weak grades hide future needs|weak scouting hides future needs|weak protection|thin backup|thin backups|thinnest starter|replacement question|cannot solve cheaply|future needs|protect the score|weaken development|weakens development|same weakness can decide|can allow points early/i);
  expect(copy, label).not.toMatch(/Choose cap posture before making moves|Protecting future cap space keeps flexibility|Future cap space, one restructure, or several restructures each changes later fixes|choose no new cap space|balanced flexibility/i);
  expect(copy, label).not.toMatch(/injury-replacement and extension flexibility|extension flexibility can disappear/i);
  expect(copy, label).not.toMatch(/helps answer|hope to build|game plan helps|can handle reps/i);
  expect(copy, label).not.toMatch(/yes, no, or later|decision screen flagged by the badge|future cap years/i);
  expect(copy, label).not.toMatch(/job pressure|owner pressure|screen deadline|screen's deadline|current plan/i);
  expect(copy, label).not.toMatch(/random fixes|one late weakness|tired players can carry risk|first problem repeat|guessing can create a worse fix|missed late fixes can repeat/i);
  expect(copy, label).not.toMatch(/cannot survive an injury|can survive Week 1|can handle those jobs|force a safer plan|use safer plans/i);
  expect(copy, label).not.toMatch(/each locks different risk|plan risk|shows a real fix|development help|backup or plan risk|bad depth unresolved|bad loss; review Recap before major moves/i);
  expect(copy, label).not.toMatch(/mismatched advisor|risk you trust least|Game Plan protecting cap|first risk file|installs? .* drift|safest Week 1 role plan|cap sheet grades out/i);
  expect(copy, label).not.toMatch(/roster can run|current starters can run|players can run|starters cannot run|can run now/i);
  expect(copy, label).not.toMatch(/\bForecast:|Setup forecast|real opener threat\b/i);
  expect(copy, label).not.toMatch(/\bworth\b/i);
  expect(copy, label).not.toMatch(/\bif you want\b/i);
  expect(copy, label).not.toMatch(/panic cuts/i);
  expect(copy, label).not.toMatch(/wide margin|early failure|lost late|change nothing unless Film Room shows a reason|result and next week stay unchanged/i);
  expect(copy, label).not.toMatch(/warning signs|hidden injury|wild-card path|offseason screens|will not wait|anger-driven moves|plan weaker|unchecked mistakes become next week/i);
  expect(copy, label).not.toMatch(/flagged decision/i);
  expect(copy, label).not.toMatch(/adjust only|Must Do: only|only change roster|without proof|if you only|unnecessary changes|only to save/i);
  expect(copy, label).not.toMatch(/deadlines only|deadline items|If none exist|wrong ruling request|preview first|Relocation can change location|costs only time|Use cap space only|Use targeted moves only|name-only spending|spending without a role|keeping only one recommendation|name-only upgrades/i);
  expect(copy, label).not.toMatch(/fix required items first|Open active limits|active limits before trying|Camp Readiness for open camp actions|risk you cannot accept|Answer deadline items|Only required items/i);
  expect(copy, label).not.toMatch(/When Must Do is clear|after Must Do tasks are clear|cap space and roster role are clear|choices are handled|decisions are handled|first-bid plan are clear|weekly checklist/i);
  expect(copy, label).not.toMatch(/\bunready\b/i);
  expect(copy, label).not.toMatch(/bad batches|standings justify|justify the cost|bad claims|bad-weather|may require/i);
  expect(copy, label).not.toMatch(/bad timing|bad deals|bad import|If clear|clear Inbox/i);
  expect(copy, label).not.toMatch(/waiting decision screen|waiting decision screens|unanswered items|unanswered choices|change what Advance Week locks in|picks pass|staff vacancies slow prep/i);
  expect(copy, label).not.toMatch(/make the plan fail|job approval|bad protection/i);
  expect(copy, label).not.toMatch(/next week's plan|changing the next plan|matchup risk|owner patience risk|fans flag|plan trouble|wrong choices slow|growth unused|compatible effects/i);
  expect(copy, label).not.toMatch(/unused picks leave the board/i);
  expect(copy, label).not.toMatch(/run fits?|run-fit jobs/i);
  expect(copy, label).not.toMatch(/useful starter|useful mentor|current rules are clear|blind deadline timing|blind move|acting on rank alone|misses waste growth|raise injury risk/i);
  expect(copy, label).not.toMatch(/compare sponsor requirements|compare repeated stat failures|compare age and development notes|compare traits, production|compare injuries, point margin|Compare contracts, staff vacancies/i);
}

describe('direct Chip copy surfaces', () => {
  it('keeps setup cold-open Chip override action and consequence focused', () => {
    type ColdOpen = Parameters<typeof buildColdOpenChipDialogue>[0]['coldOpen'];
    const dialogue = buildColdOpenChipDialogue({
      coldOpen: {
        ownerExpectation: 'Ownership expects a patient build if the roster keeps improving.',
        openerLabel: 'Week 1 vs Omaha Railmen',
        weekOneThreat: 'Their pass rush can punish missed protection immediately.',
      } as ColdOpen,
      forecastSummary: 'Cap space is tight, so a bad early contract blocks injury replacements.',
    });
    const copy = [dialogue.text, ...(dialogue.contextDetails ?? [])].join(' ');

    expectDirectChipCopy(copy, 'setup cold open');
    expect(copy).toContain('Must Do: hire the Assistant GM.');
    expect(copy).toContain('Consequence:');
  });

  it('keeps Monday outro and halftime Chip copy actionable', () => {
    const mondayEntry = weeklyGuidanceToDialogueEntry(buildWeeklyGuidance({
      outcome: 'loss',
      currentWeek: 4,
      injuryCount: 2,
    }));
    const mondayOutro = chipBriefingOutro(mondayEntry);

    expectDirectChipCopy(mondayOutro, 'Monday briefing outro');
    expectDirectChipCopy(HALFTIME_CHIP_COPY, 'halftime decision');
  });

  it('keeps generated Ask Chip live beats actionable', () => {
    const whereAmI: WhereAmIState = {
      week: 10,
      seasonWeeks: 18,
      wins: 6,
      losses: 3,
      divisionRank: 1,
      pendingTotal: 0,
    };

    expectDirectChipCopy(createPendingDecisionsBeat(1).text, 'pending decision single');
    expectDirectChipCopy(createPendingDecisionsBeat(4).text, 'pending decision multiple');
    expectDirectChipCopy(createWhereAmIBeat({ ...whereAmI, pendingTotal: 3 }).text, 'where am I pending');
    expectDirectChipCopy(createWhereAmIBeat(whereAmI).text, 'where am I clear');
    expectDirectChipCopy(createAskChipLiveBeat({ pendingDecisionTotal: 2, whereAmI })?.text ?? '', 'ask Chip pending');
    expectDirectChipCopy(createAskChipLiveBeat({ pendingDecisionTotal: 0, whereAmI })?.text ?? '', 'ask Chip clear');
    expect(createAskChipLiveBeat({ pendingDecisionTotal: 0, whereAmI: null })).toBeNull();
  });

  it('keeps first-ten onboarding and route-coaching beats actionable', () => {
    for (const entry of onboardingDialogue) {
      expectDirectChipCopy([entry.text, ...(entry.contextDetails ?? [])].join(' '), entry.id);
    }

    for (const entry of weeklyDialogue) {
      expectDirectChipCopy(entry.text, entry.id);
    }

    for (const beat of FIRST_TEN_MINUTE_ONBOARDING_BEATS) {
      expectDirectChipCopy(beat.text, beat.id);
    }

    for (const routeKey of ROUTE_KEYS) {
      for (const beat of ROUTE_BEAT_REGISTRY[routeKey]) {
        expectDirectChipCopy(beat.text, beat.id);
      }
    }
  });

  it('keeps press and recap Chip decisions tied to consequences', () => {
    for (const tier of ['high', 'mid', 'low'] as const) {
      expectDirectChipCopy(buildPressConferenceChipCopy(tier, false), `press ${tier}`);
    }
    expectDirectChipCopy(buildPressConferenceChipCopy('mid', true), 'press submitted');

    const outcomes: RecapChipOutcome[] = [
      'BLOWOUT_WIN',
      'CLOSE_WIN',
      'WIN',
      'OT_WIN',
      'COMEBACK_WIN',
      'CLOSE_LOSS',
      'BLOWOUT_LOSS',
      'CHOKE_LOSS',
      'LOSS',
      'OT_LOSS',
      'UNKNOWN',
    ];

    for (const outcome of outcomes) {
      const copy = buildRecapChipCopy({
        outcome,
        teamName: 'Oakland Anchors',
        opponentName: 'Omaha Railmen',
        userScore: 24,
        opponentScore: 20,
      });
      expectDirectChipCopy(copy, `recap ${outcome}`);
      expect(copy, `recap ${outcome}`).not.toMatch(/\b(check|review)\b/i);
    }
  });

  it('keeps legacy event Chip copy clear about review timing and no gameplay change', () => {
    for (const eraType of ['rebuilding', 'building', 'contender', 'dynasty', 'golden-age', 'fall-from-grace'] satisfies EraTransitionVariant[]) {
      const copy = eraChipCopy(eraType);
      expectDirectChipCopy(copy, `era ${eraType}`);
      expect(copy).toContain('Optional: open Legacy after Must Do tasks');
      expect(copy).toContain('Where: Legacy');
      expect(copy).toContain('Consequence: roster, cap space, owner patience, and next-week state do not change');
    }

    expectDirectChipCopy(ACHIEVEMENT_UNLOCK_CHIP_COPY, 'achievement unlock');
    expect(ACHIEVEMENT_UNLOCK_CHIP_COPY).toContain('Optional: open Legacy after Must Do tasks');
    expect(ACHIEVEMENT_UNLOCK_CHIP_COPY).toContain('Where: Legacy');
    expect(ACHIEVEMENT_UNLOCK_CHIP_COPY).toContain('Consequence: roster, cap space, owner patience, and next-week state do not change');
    expect(ACHIEVEMENT_UNLOCK_CHIP_COPY).not.toContain('owner approval');
  });
});
