import type { DialogueCatalogEntry } from './types';
import { assertDialogueEntry } from './types';

export const ONBOARDING_ANCHOR_LINE =
  'Where: pick both scheme cards, then open Depth Chart and Game Plan to protect the most exposed starter or first-backup job before Week 1.';

const onboardingDialogueEntries: DialogueCatalogEntry[] = [
  {
    id: 'chip.onboarding.beat-1',
    beat: 1,
    pose: 'reviewing-tablet',
    text: 'Must Do: hire the Assistant GM — your first call, Coach. My first setup priority follows yours: cap space, starter and backup roles, the Week 1 game plan, or owner patience.',
    contextDetails: [
      'Consequence: choose cap-first and I keep money warnings up front; starter jobs and the coach responsible for Week 1 still need fixing before kickoff.',
      'Why: this hire decides whether I call out cap space, starter and backup roles, the Week 1 game plan, or owner patience first.',
      'Where: choose the advisor promise that matches the biggest Week 1 danger: cap space, roster roles, game plan, or owner patience.',
    ],
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-2',
    beat: 2,
    pose: 'pointing-at-tape',
    text: 'Must Do: open the highlighted Intel card. It names whether roster, cap, staff, or owner patience needs action first — no guessing before Week 1.',
    contextDetails: [
      'Consequence: skipping Intel leaves one Week 1 decision unnamed: exposed starter, cap squeeze, no coach owning the game plan, or no cover for an injury.',
      'Why: the highlighted Intel card names the Week 1 starter, cap, game-plan, or owner-patience consequence before you spend a hire, scheme choice, cap choice, or promise.',
      'Where: open the highlighted Intel card before choosing a coach, scout, scheme, depth chart, cap plan, or goals.',
    ],
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-3',
    beat: 3,
    pose: 'reviewing-tablet',
    text: 'Must Do: name your protected stars and first backups before any roster move. Contracts that block injury replacements make Week 1 fixes harder.',
    contextDetails: [
      'Consequence: skipping this leaves stars unprotected, first-backup jobs uncovered, and cap space tied up before Week 1.',
      'Why: this roster step names which star to protect, which starter or first backup needs cover, and which cap space must stay open for injury depth.',
      'Where: name who must carry the first month and which position needs a first backup before one injury changes the lineup.',
    ],
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-4',
    beat: 4,
    pose: 'calling-play',
    text: "Must Do: hire the coach whose calls fit today's starters, not the roster you wish you had. A pairing that does not fit slows install, costs development reps, and exposes Week 1 assignments.",
    contextDetails: [
      'Consequence: a coach-player pairing that does not match slows install, costs development reps, and leaves protection or coverage assignments unassigned for Week 1.',
      'Why: the coach sets practice installs, development reps, and which calls current starters must learn before kickoff.',
      'Where: match the coach to the quarterback, line, coverage players, and defenders you already have, not the roster you plan to build later.',
    ],
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-5',
    beat: 5,
    pose: 'note-taking',
    text: 'Must Do: hire scouting for the starter, backup, or future replacement free agency would overprice. Scout info we skip now becomes picks and veteran bids wasted later.',
    contextDetails: [
      'Consequence: incomplete scout info misses future starter or backup answers, wastes picks, and pushes fixes into veteran bids.',
      'Why: the scout finds medical limits, assigned-role gaps, and coachability warnings before you spend draft picks or free-agent money.',
      'Where: pick the scouting director who names the starter, backup, or future replacement that free agency would overprice.',
    ],
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-6',
    beat: 6,
    pose: 'think',
    text: 'Must Do: choose schemes that protect the starters already on this roster. Bad fits create missed assignments and force Depth Chart or Game Plan protection by Week 1.',
    contextDetails: [
      'Consequence: a scheme-player pairing that does not match creates missed assignments and forces extra Depth Chart or Game Plan protection in Week 1.',
      'Why: scheme choice decides which starters know their assignments now and which positions need protection in Depth Chart or Game Plan.',
      ONBOARDING_ANCHOR_LINE,
    ],
    anchor: true,
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-7',
    beat: 7,
    pose: 'point-left',
    text: 'Must Do: set starters deliberately — this one is your call, Coach. Higher-rated players reduce matchup mistakes, veterans cut assignment misses, and young starters trade Week 1 points for development snaps.',
    contextDetails: [
      'Consequence: unplanned depth order puts a player without the assigned role on the field when injuries hit.',
      'Why: depth order decides who plays tired snaps, injury snaps, and late-game snaps before the opener uses that saved substitute.',
      'Where: choose veteran mistake control or young-player development snaps at each unsettled position before saving the lineup.',
    ],
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-8',
    beat: 8,
    pose: 'skeptical',
    text: 'Must Do: choose the cap plan before any moves. Restructures create cap space now by moving money into future seasons — the bill always comes due.',
    contextDetails: [
      'Consequence: creating cap space now limits injury replacements, trades, extensions, and next offseason.',
      'Why: the cap plan decides whether a Week 1 upgrade spends future cap space needed for injuries, trades, extensions, and next offseason.',
      'Where: choose no restructure, one restructure, or several restructures before contracts or trades.',
    ],
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-9',
    beat: 9,
    pose: 'concern',
    text: 'Must Do: pick promises this roster can defend. Owner goals become expectations; missed promises cut owner patience even after roster upgrades.',
    contextDetails: [
      'Consequence: missed promises cut owner patience for normal losses, budget asks, and roster resets.',
      'Why: owner promises turn normal losses into judgment calls, so goals must match starters, depth, cap space, and owner patience.',
      'Where: choose goals that match starter strength, depth, cap space, and owner patience.',
    ],
    archetype: 'host',
  },
  {
    id: 'chip.onboarding.beat-10',
    beat: 10,
    pose: 'mic-check',
    text: 'Must Do: open the blueprint before Week 1 — walk it with me. It locks staff, scouting, scheme, lineup rules, cap plan, and owner promises.',
    contextDetails: [
      'Consequence: Week 1 starts from this plan; later fixes cost time, cap space, or morale.',
      'Why: this is the last setup screen to catch a setup mistake before Week 1; after kickoff, fixes cost cap space, morale, or owner patience.',
      'Where: open the blueprint to catch one staff, scheme, lineup, cap, or owner-promise mistake before the first season starts.',
    ],
    archetype: 'host',
  },
];

export const onboardingDialogue = onboardingDialogueEntries.map(assertDialogueEntry);
