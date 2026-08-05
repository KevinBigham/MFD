import { describe, expect, it } from 'vitest';
import { ONBOARDING_ANCHOR_LINE, onboardingDialogue } from './onboarding';
import { MAX_CHIP_DIALOGUE_CHARS, assertDialogueEntry } from './types';

describe('onboardingDialogue', () => {
  it('contains exactly ten stable onboarding beats', () => {
    expect(onboardingDialogue).toHaveLength(10);
    expect(onboardingDialogue.map((entry) => entry.id)).toEqual([
      'chip.onboarding.beat-1',
      'chip.onboarding.beat-2',
      'chip.onboarding.beat-3',
      'chip.onboarding.beat-4',
      'chip.onboarding.beat-5',
      'chip.onboarding.beat-6',
      'chip.onboarding.beat-7',
      'chip.onboarding.beat-8',
      'chip.onboarding.beat-9',
      'chip.onboarding.beat-10',
    ]);
  });

  it('uses one-based beat numbers in order', () => {
    expect(onboardingDialogue.map((entry) => entry.beat)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('opens with a direct Assistant GM consequence line', () => {
    expect(onboardingDialogue[0]?.text).toBe(
      'Must Do: hire the Assistant GM — your first call, Coach. My first setup priority follows yours: cap space, starter and backup roles, the Week 1 game plan, or owner patience.',
    );
  });

  it('pins the ten phase-mapped onboarding lines verbatim after the A12 warmth pass', () => {
    expect(onboardingDialogue.map((entry) => entry.text)).toEqual([
      'Must Do: hire the Assistant GM — your first call, Coach. My first setup priority follows yours: cap space, starter and backup roles, the Week 1 game plan, or owner patience.',
      'Must Do: open the highlighted Intel card. It names whether roster, cap, staff, or owner patience needs action first — no guessing before Week 1.',
      'Must Do: name your protected stars and first backups before any roster move. Contracts that block injury replacements make Week 1 fixes harder.',
      "Must Do: hire the coach whose calls fit today's starters, not the roster you wish you had. A pairing that does not fit slows install, costs development reps, and exposes Week 1 assignments.",
      'Must Do: hire scouting for the starter, backup, or future replacement free agency would overprice. Scout info we skip now becomes picks and veteran bids wasted later.',
      'Must Do: choose schemes that protect the starters already on this roster. Bad fits create missed assignments and force Depth Chart or Game Plan protection by Week 1.',
      'Must Do: set starters deliberately — this one is your call, Coach. Higher-rated players reduce matchup mistakes, veterans cut assignment misses, and young starters trade Week 1 points for development snaps.',
      'Must Do: choose the cap plan before any moves. Restructures create cap space now by moving money into future seasons — the bill always comes due.',
      'Must Do: pick promises this roster can defend. Owner goals become expectations; missed promises cut owner patience even after roster upgrades.',
      'Must Do: open the blueprint before Week 1 — walk it with me. It locks staff, scouting, scheme, lineup rules, cap plan, and owner promises.',
    ]);
  });

  it('relocates setup consequences into Chip context details', () => {
    expect(onboardingDialogue[0]?.contextDetails).toEqual([
      'Consequence: choose cap-first and I keep money warnings up front; starter jobs and the coach responsible for Week 1 still need fixing before kickoff.',
      'Why: this hire decides whether I call out cap space, starter and backup roles, the Week 1 game plan, or owner patience first.',
      'Where: choose the advisor promise that matches the biggest Week 1 danger: cap space, roster roles, game plan, or owner patience.',
    ]);
    expect(onboardingDialogue[0]?.contextDetails?.join(' ')).not.toContain('the opener can start');
    expect(onboardingDialogue[0]?.text).not.toContain('whether to prioritize');
    expect(onboardingDialogue[0]?.contextDetails?.join(' ')).not.toMatch(/coach play calls|play-call owner/i);
    expect(onboardingDialogue[0]?.contextDetails?.join(' ')).not.toContain('I may miss unassigned starters');
    expect(onboardingDialogue[0]?.contextDetails?.join(' ')).not.toContain('my first warnings skip');
    expect(onboardingDialogue[0]?.contextDetails?.join(' ')).not.toContain('how you want help');
    expect(`${onboardingDialogue[0]?.text} ${onboardingDialogue[0]?.contextDetails?.join(' ')}`).not.toContain('risk to keep warning about');
    expect(`${onboardingDialogue[0]?.text} ${onboardingDialogue[0]?.contextDetails?.join(' ')}`).not.toMatch(/setup choices I push|bad fit can hide|staff fit|a bad fit sends|mismatched advisor|risk you trust least/i);
    expect(onboardingDialogue[2]?.contextDetails).toContain(
      'Consequence: skipping this leaves stars unprotected, first-backup jobs uncovered, and cap space tied up before Week 1.',
    );
    expect(onboardingDialogue[2]?.contextDetails).toContain(
      'Where: name who must carry the first month and which position needs a first backup before one injury changes the lineup.',
    );
    expect(onboardingDialogue[4]?.contextDetails).toContain(
      'Where: pick the scouting director who names the starter, backup, or future replacement that free agency would overprice.',
    );
    expect(onboardingDialogue[4]?.contextDetails).toContain(
      'Consequence: incomplete scout info misses future starter or backup answers, wastes picks, and pushes fixes into veteran bids.',
    );
    expect(onboardingDialogue[8]?.contextDetails).toContain(
      'Where: choose goals that match starter strength, depth, cap space, and owner patience.',
    );
    expect(onboardingDialogue[8]?.contextDetails).toContain(
      'Consequence: missed promises cut owner patience for normal losses, budget asks, and roster resets.',
    );
    expect(onboardingDialogue[8]?.contextDetails?.join(' ')).not.toContain('roster quality');
    expect(onboardingDialogue[9]?.contextDetails).toContain(
      'Why: this is the last setup screen to catch a setup mistake before Week 1; after kickoff, fixes cost cap space, morale, or owner patience.',
    );
    expect(onboardingDialogue[9]?.contextDetails?.join(' ')).not.toContain('costs only time');
    expect(onboardingDialogue.map((entry) => `${entry.text} ${(entry.contextDetails ?? []).join(' ')}`).join(' ')).not.toMatch(/owner pressure|pressure decisions|pressure calls|raises owner pressure|raise owner pressure|low-confidence|scout confidence|scouting confidence|setup problem|first setup fix/i);
    expect(onboardingDialogue.map((entry) => `${entry.text} ${(entry.contextDetails ?? []).join(' ')}`).join(' ')).not.toMatch(/watch cap space|my first lens|pick a cap advisor|wrong starters|real opener threat|real opener problem|opener problem|first Week 1 problem|bigger problem|bigger consequence|first Week 1 consequence to control|carry the bigger consequence|bad starter|wrong coach authority|wrong roster reads|thin depth-chart defaults|Best players win now|bad depth order/i);
    expect(onboardingDialogue.map((entry) => `${entry.text} ${(entry.contextDetails ?? []).join(' ')}`).join(' ')).not.toMatch(/roster can run|current starters can run|players can run|starters cannot run|can run now/i);
    expect(onboardingDialogue.map((entry) => `${entry.text} ${(entry.contextDetails ?? []).join(' ')}`).join(' ')).not.toMatch(/open and read|read the roster|roster read|missed roster reads|roster inspection|inspect the roster|Where: check|checks the roster need|review the blueprint|\bverify\b|\bverifies\b/i);
    expect(onboardingDialogue.map((entry) => `${entry.text} ${(entry.contextDetails ?? []).join(' ')}`).join(' ')).not.toMatch(/Week 1 stability|long-term development/i);
    expect(onboardingDialogue.map((entry) => `${entry.text} ${(entry.contextDetails ?? []).join(' ')}`).join(' ')).not.toMatch(/bad choice/i);
    expect(onboardingDialogue.map((entry) => `${entry.text} ${(entry.contextDetails ?? []).join(' ')}`).join(' ')).not.toMatch(/staff authority|unclear coach authority|coach-role issues/i);
    expect(onboardingDialogue[1]?.contextDetails).toContain(
      'Why: the highlighted Intel card names the Week 1 starter, cap, game-plan, or owner-patience consequence before you spend a hire, scheme choice, cap choice, or promise.',
    );
    expect(onboardingDialogue[6]?.contextDetails).toContain(
      'Why: depth order decides who plays tired snaps, injury snaps, and late-game snaps before the opener uses that saved substitute.',
    );
    expect(onboardingDialogue.map((entry) => `${entry.text} ${(entry.contextDetails ?? []).join(' ')}`).join(' ')).not.toMatch(/can swing|can flip|swing the opener/i);
    expect(onboardingDialogue.map((entry) => `${entry.text} ${(entry.contextDetails ?? []).join(' ')}`).join(' ')).not.toMatch(/skipping Intel can|young starters gain reps but can|creating cap space now can/i);
    expect(onboardingDialogue[1]?.contextDetails).toContain(
      'Consequence: skipping Intel leaves one Week 1 decision unnamed: exposed starter, cap squeeze, no coach owning the game plan, or no cover for an injury.',
    );
    expect(onboardingDialogue.map((entry) => `${entry.text} ${(entry.contextDetails ?? []).join(' ')}`).join(' ')).not.toMatch(/coach play calls|play-call owner/i);
    expect(onboardingDialogue[1]?.contextDetails?.join(' ')).not.toContain('skipping Intel sends you to contracts');
    expect(onboardingDialogue[7]?.contextDetails).toContain(
      'Consequence: creating cap space now limits injury replacements, trades, extensions, and next offseason.',
    );
    expect(onboardingDialogue.map((entry) => `${entry.text} ${(entry.contextDetails ?? []).join(' ')}`).join(' ')).not.toMatch(/thin backup|thin backups|thinnest starter|replacement question|cannot solve cheaply|future needs|protect the score/i);
  });

  it('gives every first-run setup beat explicit where and consequence detail', () => {
    for (const entry of onboardingDialogue) {
      expect(entry.contextDetails?.length, entry.id).toBeGreaterThanOrEqual(3);
      expect(entry.contextDetails?.some((detail) => detail.startsWith('Why:')), entry.id).toBe(true);
      expect(entry.contextDetails?.some((detail) => detail.startsWith('Where:')), entry.id).toBe(true);
      expect(entry.contextDetails?.some((detail) => detail.startsWith('Consequence:')), entry.id).toBe(true);
    }
  });

  it('contains the locked architectural anchor line on the identity beat', () => {
    const beat6 = onboardingDialogue[5];

    expect(beat6?.anchor).toBe(true);
    expect(beat6?.contextDetails).toContain(ONBOARDING_ANCHOR_LINE);
    expect(ONBOARDING_ANCHOR_LINE).toBe(
      'Where: pick both scheme cards, then open Depth Chart and Game Plan to protect the most exposed starter or first-backup job before Week 1.',
    );
  });

  it('keeps every onboarding line within the 240-character bubble limit', () => {
    expect(onboardingDialogue.every((entry) => entry.text.length <= MAX_CHIP_DIALOGUE_CHARS)).toBe(true);
    expect(() => onboardingDialogue.forEach(assertDialogueEntry)).not.toThrow();
  });

  it('keeps first-run Chip copy focused on decisions and consequences', () => {
    const decisionOrConsequenceCue =
      /\b(choose|hire|open|identify|pick|set|protect|name|before|consequence|risk|cost|costs|assignments|damage|miss|locks)\b/i;
    const implementationJargon = /(read-model|display-only|route-local|source panels?|commit boundary|durable|render|mutate|receipt)/i;
    const retiredSoftCopy = /Weak grades hide future needs|weak scouting hides future needs|can allow points early|Choose cap posture before making moves|Protecting future cap space keeps flexibility|Future cap space, one restructure, or several restructures each changes later fixes|choose no new cap space|balanced flexibility|cap posture|roster can execute|Week 1 execution|injury help|unsupported calls|unsupported role|what Week 1 weakness we attack|wrong Week 1 problem|wrong problem|wrong calls|wrong choice|wrong coach-player|wrong scheme-player|top risk card|highest-risk Intel|Intel risk card|weakest position|weak spot before saving|weak backups|weak depth-chart defaults|thin backup|thin backups|thinnest starter|replacement question|cannot solve cheaply|future needs|protect the score|weaken development|weakens development|mismatch|mismatched/i;

    for (const entry of onboardingDialogue) {
      expect(entry.text, entry.id).toMatch(decisionOrConsequenceCue);
      expect(entry.text, entry.id).not.toMatch(/\buse\b/i);
      expect(entry.text, entry.id).not.toMatch(implementationJargon);
      expect(entry.text, entry.id).not.toMatch(/\b(thin rooms?|pushing chips|youth bets?|board stays clean|roster diagnosis|owner read|opener context|pressure card|owns the room|immediate room|leak points|you keep final say)\b/i);
      expect(entry.text, entry.id).not.toMatch(/\b(identity|foundation|vibe|feels?|story|culture control)\b/i);
      expect(entry.text, entry.id).not.toMatch(/\bcap room\b/i);
      expect(entry.text, entry.id).not.toMatch(/\b(reduce room|later room|extension room|less room)\b/i);
      expect(entry.text, entry.id).not.toMatch(/Week 1 readiness/i);
      expect(entry.text, entry.id).not.toMatch(/transition penalties|flashy mismatch/i);
      expect(entry.text, entry.id).not.toMatch(/\belsewhere\b/i);
      expect(entry.text, entry.id).not.toMatch(retiredSoftCopy);
      for (const detail of entry.contextDetails ?? []) {
        expect(detail, entry.id).not.toMatch(/\buse\b/i);
        expect(detail, entry.id).not.toMatch(implementationJargon);
        expect(detail, entry.id).not.toMatch(/\b(thin rooms?|pushing chips|youth bets?|board stays clean|roster diagnosis|roster hole|owner read|owner heat|opener context|pressure card|owns the room|immediate room|leak points|you keep final say|Chip explains the risk)\b/i);
        expect(detail, entry.id).not.toMatch(/\b(identity|foundation|vibe|feels?|story|culture control)\b/i);
        expect(detail, entry.id).not.toMatch(/\bcap room\b/i);
        expect(detail, entry.id).not.toMatch(/\b(reduce room|later room|extension room|less room)\b/i);
        expect(detail, entry.id).not.toMatch(/Week 1 readiness/i);
        expect(detail, entry.id).not.toMatch(/matters more/i);
        expect(detail, entry.id).not.toMatch(/transition penalties|can wait/i);
        expect(detail, entry.id).not.toMatch(/costs only time/i);
        expect(detail, entry.id).not.toMatch(/\belsewhere\b/i);
        expect(detail, entry.id).not.toMatch(retiredSoftCopy);
      }
    }
  });

  it('uses the Mic Check signature at least once in the onboarding catalog', () => {
    expect(onboardingDialogue.some((entry) => entry.pose === 'mic-check')).toBe(true);
  });
});
