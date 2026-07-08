/**
 * Content schema validation.
 *
 * Tier A (Sprint 40 "The Straight Line"): 32 team JSONs under
 * packages/content/teams/. Validated at content-loader import time.
 *
 * Tier B (post-Sprint 55 cleanup): broadcast/narrative/news/social/
 * scouting/coaching/personalities/halftime/ceremonies/names/agm/stadium
 * content files. Previously `as Record<...>` casts; now validated via Zod.
 *
 * Both tiers: content-loader.ts throws at import if any file drifts
 * from its schema. These tests catch drift in isolation with clearer
 * failure messages, and pin the on-disk file list so renames are loud.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  TeamContentSchema,
  StadiumContentSchema,
  PressConferenceTemplatesContentSchema,
  AgmDialogueContentSchema,
  BroadcastTemplatesContentSchema,
  AwardSpeechesContentSchema,
  CoachArchetypesContentSchema,
  HalftimeContentSchema,
  PlayerNamesContentSchema,
  StoryArcTemplatesContentSchema,
  LeagueNewsTemplatesContentSchema,
  PersonalityFlavorContentSchema,
  ScoutingTemplatesContentSchema,
  SocialFeedTemplatesContentSchema,
  BroadcastPlayTypeSchema,
  CoachArchetypeKeySchema,
  CoachSchemeSideSchema,
  ScoutingPositionSchema,
  AgmPersonaIdSchema,
  PlayerSocialScenarioSchema,
  FanSocialScenarioSchema,
  AnalystSocialScenarioSchema,
  ReporterSocialScenarioSchema,
  RevengeLineBucketSchema,
  RevengeLinesContentSchema,
} from './content-schemas';

const CONTENT_ROOT = path.resolve(__dirname, '../../../content');
const TEAMS_DIR = path.join(CONTENT_ROOT, 'teams');
const STADIUMS_DIR = path.join(CONTENT_ROOT, 'stadiums');
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const CONTENT_LOADER_PATH = path.resolve(__dirname, '../content-loader.ts');

const KNOWN_DIRECT_CONTENT_IMPORT_EXCEPTIONS: Record<string, readonly string[]> = {
  'agm/agm-characters.json': ['packages/engine/src/systems/agm-setup-content.ts'],
  'agm/book-commentary.json': ['apps/web/src/features/franchise/FranchiseBook.tsx'],
  'agm/hiring-content.json': ['packages/engine/src/systems/agm-setup-content.ts'],
  'agm/screen-tips.json': ['packages/engine/src/systems/agm.ts'],
  'agm/teaching-polish.json': ['packages/engine/src/systems/agm-setup-content.ts'],
  'narrative/alumni-updates.json': ['packages/engine/src/systems/legends.ts'],
  'narrative/era-templates.json': ['apps/web/src/features/franchise/FranchiseBook.tsx'],
};

const KNOWN_DORMANT_AUTHORED_CONTENT = new Set<string>();

const teamFiles = fs
  .readdirSync(TEAMS_DIR)
  .filter((name) => name.endsWith('.json'))
  .sort();
const stadiumFiles = fs
  .readdirSync(STADIUMS_DIR)
  .filter((name) => name.endsWith('.json'))
  .sort();

function readJson(relative: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_ROOT, relative), 'utf8'));
}

const AGM_DIALOGUE_STALE_COPY = /\b(?:The numbers never lie|Trust the tape|Trust the draft grade|trust the process|over the noise|DOGS?|DAWG|let him eat|Let him EAT|Keep it simple, stupid|Other teams are dumb|Hope I'm wrong|Usually ain't|Tape don't lie|tape tells the story|film is art|museum|That's value|Plain and simple|GMs extended|every snap! every play|building culture|Culture!|brick by brick|that's our identity|Where's the dog|Championship move\. That's what this is|Puts us over the top|my kind of guy|Expected wins say|Win-probability added|surplus value|value-over-replacement|highest-leverage weak position|Our board had|on our board|outperform the board|edge survives|Opponents feel|contract leverage|cap room|clean reps|record book helps his leverage|Remember this feeling|decisions get louder|Cap utilization|The model says|The model supports|positive expected value|Playoff probability rose|expected wins|Pro Bowl probability|Rookie contract surplus|market error|above consensus|Playoff probability is|standard deviations|valuation model|Use him on the edge|creates surplus|coverage leak|model for this defense|Clean evaluation|Block, tackle, execute|boring stuff is working|practice and depth are aligned|fancy athlete|We did not execute enough|roster holes?|Sunday|raises the ceiling|defensive ceiling|when expected|wins above replacement below market|market value should rise|before the market does|before the market notices|real snaps|prove the pick|weekly standard, not by speeches|real role|real defender|roles stable long enough|real usage|prove it with practice|real upgrade|injury depth stay stable|real starter need|tools-over-production bet|real seeding cost|franchise record is real|real need|Cap value|Positional value|rookie contract matters|Effort matters|Every snap matters|Great value means nothing|tackling proof|The record matters|Development matters|decide value|coverage value|Luck becomes value|proof should show|practice production should show up|should show up before starter snaps|Good pick if|usable rookie|lucky fall helps|He can handle the assigned job|He helps on day one|A draft steal still needs|Athleticism still needs football assignments|Tools over tape is dangerous|Average film means|must earn contact reps|Physical tools matter|rookie mistakes need coverage help|Easy yards drop if|Clean up cap now|cap and pick cost now raise the standard|clean up assignments|starters execute best|elite execution|executed better than anyone|health or seeding matters more|injuries still matter|basics matter|point differential as hope|The trade helps|watch the next four games|A falling pick only helps|No obvious off-field risk helps|This upgrade helps only|Cap space is strong right now|playoff path is strong|best path is patience|anything else is decoration|Build toughness|must help the next opponent|Watch missed tackles|whole defense improves|can punish teams later|young starters in roles they can handle|evaluations are translating|big contract does not help|His best tape is old|Go watch the film|This is why we scout|should not still be here|Line play and tackling are working|Run game and run defense are winning|Win the matchup across from us|We got better today|old-school traits|championship move still needs|got him unexpectedly|Use the pick value without rushing|Overthinking the pick|One game at a time means|Use this loss when|players fit need positions|swing plays|key drives|problem positions|starter problem|run fits?|run-fit jobs|missed fits|soft run fits|gap jobs|gashing us|previous snaps say he fits|missed fit costs|coaching fit|role-fit check|if the fit holds|future cap pressure|GM job takes the pressure|extension pressure|early pick pressure|free-agency pressure|vague snaps|vague patience|vague toughness talk|unclear jobs|unclear assignments|unready|strong years|new move should|cleaner role fits|correct play should|missed standards become missed tackles|letting standards drift|roles drift|jobs drift|panic trades|Keep best players healthy and featured|Call what your starters handle best)\b/i;
const AGM_DIALOGUE_RETIRED_MISSED_TACKLE_PROBLEM_COPY =
  /\bmissed-tackle problem\b/i;
const AGM_DIALOGUE_NUMERIC_SHORTHAND =
  /\b(?:Playoff odds|cost-benefit review|title push|playoff math|Offseason modeling|projected cap space|contract value just rose|points per game|\d+(?:\.\d+)?x return|\d+(?:\.\d+)?%)\b/i;
const AGM_DIALOGUE_SUPPORT_SHORTHAND =
  /\b(?:supports the season|contract supports|tape supports|coach support|support intact|support around him|previous snaps support|tape does not support|bad support|flip that edge)\b/i;
const AGM_DIALOGUE_HELP_SHORTHAND =
  /\b(?:short-term help|starter help now|coverage help|scheme and depth-chart help|keep the plan simple|calls simple|simple job|job simple|immediate help|assignment simple|rookie help|assignments simple)\b/i;
const AGM_DIALOGUE_WEAKNESS_SHORTHAND =
  /\b(?:weak spots?|weakest starter|weak starters?|weak roster|weak links?|weak contact|weak protection|weaker production|soft spots?|weaken(?:s|ed|ing)? playoff|that weakness|the weakness|same weak spots|new weakness|single weak spot|failed positions)\b/i;
const AGM_DIALOGUE_VALUE_SHORTHAND =
  /\b(?:starter value|cheap years lose value|value gets wasted|draft-capital value|wasted value|usable depth|usable cap space|playoff value|pick value|draft value stalls|turn that into value|clean off-field file|clean character file|creates value only|development value|lucky fall)\b/i;
const AGM_DIALOGUE_GRADE_SHORTHAND =
  /\b(?:roster grade|lowest-graded|We graded him|top-15 draft grade|medical grade|higher-graded|grade every defender|draft grades|grade the play|fourth-round grade|matches the grade|grade pays|first-round grade|I graded him|better-graded|Grade playable talent|scouting grades|tying grades|start grading who|Grade missed blocking)\b/i;
const AGM_DIALOGUE_RESIDUAL_SOFT_VERBS =
  /\b(?:Check game-day blocking|Check game-day production|Check his contact|check the medical and role risk|Check practice production|check line depth|Check matchups|Season is over; review|Review missed blocking|looking ahead can leave)\b/i;
const AGM_DIALOGUE_RESTRICTIVE_OR_SOFT_ACTION_COPY =
  /\b(?:check|checking|review|Evaluate)\b|\b(?:only if|only when|only after|only where|only works if|only pays off if|only helps if|unless|if you want)\b|\bworth\b|\b(?:Avoid overreacting|unnecessary changes)\b/i;
const AGM_DIALOGUE_RETIRED_ROLE_SHORTHAND =
  /\b(?:day-one reps|before day one|mistakes are survivable|where a need position exists|where the roster failed|why teams let him fall|left on the board|valuable capital|ready now|playoff-ready|replacements are ready|clear roles?|clear depth-chart job|make the role clear|backup jobs clear|role is clear|role clarity|starter-ready|better role players|better than anyone|tough, smart players|tape showed he can handle)\b/i;
const AGM_DIALOGUE_RESOURCE_SHORTHAND =
  /\b(?:Reallocate resources|cap resources|name-only upgrades)\b/i;
const AGM_DIALOGUE_TIMING_SHORTHAND =
  /\b(?:bad timing|bad deals|bad import|If clear|clear Inbox|bad rest timing|bad habits|bad usage|bad coverage|bad assignments|bad role match|bad reports|clear tier break|Compare recent performance|Compare missed tackles)\b/i;
const AGM_DIALOGUE_HEDGED_CONSEQUENCE_SHORTHAND =
  /\b(?:pick may cover the wrong need|pick may sit without earning snaps)\b/i;
const AGM_DIALOGUE_WRONG_SHORTHAND =
  /\b(?:wrong blame|wrong need|wrong spot|wrong job|wrong cuts|role is wrong)\b/i;
const AGM_DIALOGUE_RISK_SHORTHAND =
  /\b(?:raises injury risk|playoff plan at risk|next-game risk|drive risk|easy-yard risk|snaps, coaching, and risk|every exposed snap a risk|starter risk|creates playoff risk|turns a strong season into playoff risk|injury and turnover risk|role risk|medical risk|starter injury risk|injury risk|pressure calls|prove the role|open medical risk)\b/i;
const AGM_DIALOGUE_SOFT_CONSEQUENCE_VERBS =
  /\b(?:can turn|can waste|can still waste|can block|can cost|can create|can force|can leave|can expose|can fail|can break|can remove|can erase|can stick|can become|can hand|can undo|can attack|can hold)\b/i;
const AGM_DIALOGUE_SOFT_CAPABILITY_COPY =
  /\b(?:can (?:start|cover|win|play)|pick helps when|line can win)\b/i;
const AGM_DIALOGUE_RESIDUAL_BROADCAST_SOFT_COPY =
  /\b(?:meaningful starter or rotation snaps|athletic score|risk that caused the slide|missing that prep gives the next opponent time|move from contention spending to roster evaluation|December becomes evaluation time|evaluation-only|late-season evaluation snaps|season is over, but evaluation is not|elite tape means little|Use the film, then set the role|must give him a path|development plan has to be exact|Keep the matchups that got us here|contender-level play|Start evaluation season now|line can still win|Compare every restructure|Compare years two|speed mismatches|Compare scouting reports|Compare him to available|Compare matchups|mismatches become drive risk)\b/i;
const AGM_DIALOGUE_RESIDUAL_GENERIC_PROBLEM_COPY =
  /\b(?:contact issue|scheme problems|concerns at three positions|Call fewer risks)\b/i;

const AGM_DIALOGUE_CONCRETE_COPY = /\b(?:roster|cap|contracts?|deadline|trades?|picks?|draft|depth[- ]chart|starter|starters|snaps|week|weekly|playoff|injury|injuries|practice|scheme|tackle|tackles|tackling|coverage|health|veterans?|young|free agency|restructures?|void|June 1|bonus|owner|scouting|grade|position|positions|risk|cost|space|production|role|roles|assignment|assignments|medical|extension|market|opponents?|matchups?|players?|coaches?|coaching|staff|line|linemen|turnover|seeding|special teams|seasons?|development|develop|develops|developing|value-over-replacement|consensus|workload|safety|corners?|yards|downs|defensive|offenses?|rusher|lineup|explosive|personnel|protection|teammates|reps|kickoff|talent|defenses|expectations|contact|blocks|depth plan|offseason|cuts|GM|wins?)\b/i;
const AGM_DIALOGUE_ACTION_COPY =
  /\b(add|adjust|assign|audit|avoid|budget|call|change|choose|clean|coach|compare|create|cut|define|decide|drill|extend|find|fix|give|grade|keep|limit|make|match|move|name|open|pay|pick|plan|prepare|preserve|preview|protect|raise|reallocate|replace|run|scout|set|simplify|spend|start|stop|teach|test|trade|upgrade|watch)\b/i;
const AGM_DIALOGUE_CONSEQUENCE_COPY =
  /\b(Advance Week|before|block\w*|cap|cost\w*|deadline|December|depth|develop\w*|drive\w*|evaluation|extension|fail\w*|free agency|future|injur\w*|later|limit\w*|loss\w*|mistake\w*|morale|next|opponent|owner|patience|playoff|practice|pressure|risk|roles?|seasons?|snaps?|starter|stall\w*|turnover|weak\w*)\b/i;

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

function collectStringLeaves(value: unknown, pathLabel = 'root'): Array<{ pathLabel: string; text: string }> {
  if (typeof value === 'string') return [{ pathLabel, text: value }];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectStringLeaves(entry, `${pathLabel}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      collectStringLeaves(entry, `${pathLabel}.${key}`),
    );
  }
  return [];
}

function listFilesRecursive(root: string, predicate: (file: string) => boolean): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') return [];
      return listFilesRecursive(fullPath, predicate);
    }
    return predicate(fullPath) ? [fullPath] : [];
  });
}

function listContentJsonFiles(): string[] {
  return listFilesRecursive(CONTENT_ROOT, (file) => file.endsWith('.json'))
    .map((file) => toPosixPath(path.relative(CONTENT_ROOT, file)))
    .sort();
}

function extractContentJsonImports(source: string): string[] {
  return [...source.matchAll(/from\s+['"][^'"]*(?:packages\/)?content\/([^'"]+\.json)['"]/g)]
    .map((match) => match[1]!)
    .sort();
}

function collectSourceContentJsonImports(): Array<{ importer: string; contentPath: string }> {
  const roots = ['apps', 'packages']
    .map((root) => path.join(REPO_ROOT, root))
    .filter((root) => fs.existsSync(root));
  const sourceFiles = roots.flatMap((root) => listFilesRecursive(root, (file) => /\.(?:ts|tsx|js|jsx|mts|cts)$/.test(file)));
  return sourceFiles.flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');
    const importer = toPosixPath(path.relative(REPO_ROOT, file));
    return extractContentJsonImports(source).map((contentPath) => ({ importer, contentPath }));
  });
}

function expectSchemaPass<T>(schema: z.ZodType<T>, raw: unknown, label: string) {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Schema failure in ${label}:\n${issues}`);
  }
  expect(result.success).toBe(true);
}

describe('content schemas — teams/ (Tier A)', () => {
  const files = teamFiles;

  it('discovers team JSON files on disk', () => {
    expect(files.length).toBeGreaterThanOrEqual(32);
  });

  it.each(files)('validates %s against TeamContentSchema', (file) => {
    const raw = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, file), 'utf8')) as unknown;
    const result = TeamContentSchema.safeParse(raw);

    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `  ${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('\n');
      throw new Error(`Schema failure in ${file}:\n${issues}`);
    }

    expect(result.success).toBe(true);
  });

  it('every team id matches the 3-letter uppercase abbreviation convention', () => {
    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, file), 'utf8')) as {
        id: string;
      };
      expect(raw.id).toMatch(/^[A-Z]{2,4}$/);
    }
  });

  it('no two teams share the same id', () => {
    const ids = files.map((file) => {
      const raw = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, file), 'utf8')) as {
        id: string;
      };
      return raw.id;
    });
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all conferences and divisions are in the allowed enum set', () => {
    const validConferences = new Set(['AFC', 'NFC']);
    const validDivisions = new Set(['North', 'South', 'East', 'West']);
    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, file), 'utf8')) as {
        conference: string;
        division: string;
      };
      expect(validConferences.has(raw.conference)).toBe(true);
      expect(validDivisions.has(raw.division)).toBe(true);
    }
  });
});

describe('content inventory wiring guard', () => {
  it('keeps standalone stadium content intentionally scoped to wired stadium slices', () => {
    expect(fs.readdirSync(STADIUMS_DIR).sort()).toEqual([
      '.gitkeep',
      'atl-orchard.json',
      'bal-crab-pot.json',
      'bos-kettle.json',
      'chi-deep-freeze.json',
      'cin-sty.json',
      'cle-power-chord.json',
      'dal-corral.json',
      'den-bull-market.json',
      'det-bass-drop.json',
      'kc-smokehouse.json',
      'nyc-meter.json',
      'phi-liberty-bell.json',
      'pit-furnace.json',
      'sea-feedback.json',
      'sf-mother-dough.json',
    ]);
  });

  it.each(stadiumFiles)('validates stadiums/%s against StadiumContentSchema', (file) => {
    expectSchemaPass(
      StadiumContentSchema,
      readJson(`stadiums/${file}`),
      `stadiums/${file}`,
    );
  });

  it('keeps standalone stadium ids unique', () => {
    const ids = stadiumFiles.map((file) => {
      const raw = readJson(`stadiums/${file}`) as { teamId: string };
      return raw.teamId;
    });

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('classifies every authored JSON file as loader-owned, a direct exception, or explicitly dormant', () => {
    const loaderOwned = new Set(extractContentJsonImports(fs.readFileSync(CONTENT_LOADER_PATH, 'utf8')));
    const directExceptions = Object.keys(KNOWN_DIRECT_CONTENT_IMPORT_EXCEPTIONS);
    const classified = new Set([
      ...loaderOwned,
      ...directExceptions,
      ...KNOWN_DORMANT_AUTHORED_CONTENT,
    ]);

    expect(listContentJsonFiles()).toEqual([...classified].sort());
  });

  it('keeps raw JSON content imports outside content-loader limited to known exceptions', () => {
    const imports = collectSourceContentJsonImports()
      .filter((entry) => entry.importer !== 'packages/engine/src/content-loader.ts')
      .sort((left, right) => `${left.importer}:${left.contentPath}`.localeCompare(`${right.importer}:${right.contentPath}`));
    const expected = Object.entries(KNOWN_DIRECT_CONTENT_IMPORT_EXCEPTIONS)
      .flatMap(([contentPath, importers]) => importers.map((importer) => ({ importer, contentPath })))
      .sort((left, right) => `${left.importer}:${left.contentPath}`.localeCompare(`${right.importer}:${right.contentPath}`));

    expect(imports).toEqual(expected);
  });
});

// ── Tier B — non-team content validation (cleanup sprint post-55) ─────

describe('content schemas — broadcast/press-conference-templates.json', () => {
  it('parses without error', () => {
    expectSchemaPass(
      PressConferenceTemplatesContentSchema,
      readJson('broadcast/press-conference-templates.json'),
      'press-conference-templates.json',
    );
  });

  it('covers all 10 documented press-conference scenarios', () => {
    const raw = readJson('broadcast/press-conference-templates.json') as Record<string, unknown>;
    const expected = [
      'win_blowout', 'win_close', 'loss_blowout', 'loss_close',
      'rivalry_win', 'rivalry_loss', 'playoff_win', 'playoff_loss',
      'super_bowl_win', 'super_bowl_loss',
    ];
    for (const scenario of expected) {
      expect(raw[scenario]).toBeDefined();
    }
  });
});

describe('content schemas — broadcast/agm-dialogue.json', () => {
  it('parses without error (3-level persona/event/context nesting)', () => {
    expectSchemaPass(
      AgmDialogueContentSchema,
      readJson('broadcast/agm-dialogue.json'),
      'agm-dialogue.json',
    );
  });

  it('keeps authored AGM reactions concrete instead of catchphrase filler', () => {
    const lines = collectStringLeaves(readJson('broadcast/agm-dialogue.json'), 'agm-dialogue.json');

    expect(lines.length).toBeGreaterThan(250);
    for (const line of lines) {
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_STALE_COPY);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_NUMERIC_SHORTHAND);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_SUPPORT_SHORTHAND);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_HELP_SHORTHAND);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_WEAKNESS_SHORTHAND);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_VALUE_SHORTHAND);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_GRADE_SHORTHAND);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_RESIDUAL_SOFT_VERBS);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_RESTRICTIVE_OR_SOFT_ACTION_COPY);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_RETIRED_ROLE_SHORTHAND);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_RESOURCE_SHORTHAND);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_TIMING_SHORTHAND);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_HEDGED_CONSEQUENCE_SHORTHAND);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_WRONG_SHORTHAND);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_RISK_SHORTHAND);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_SOFT_CONSEQUENCE_VERBS);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_SOFT_CAPABILITY_COPY);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_RESIDUAL_BROADCAST_SOFT_COPY);
      expect(line.text, line.pathLabel).not.toMatch(AGM_DIALOGUE_RESIDUAL_GENERIC_PROBLEM_COPY);
      expect(line.text, line.pathLabel).not.toMatch(/compare starters and snap counts before changing the scheme|compare the starters before blaming scheme|compare production against the salary before adding cost/i);
      expect(line.text, line.pathLabel).not.toMatch(/\bcompare\b|\bsunk cost\b|wrong pressure usage|looking past this opponent/i);
      expect(line.text, line.pathLabel).not.toMatch(/\b(?:bad protection|job approval)\b/i);
      expect(line.text, line.pathLabel).not.toMatch(/\broom to buy\b/i);
      expect(line.text, line.pathLabel).not.toMatch(/\bnew roster need\b/i);
      expect(line.text, line.pathLabel).not.toMatch(/\bcan (?:swing|flip)\b/i);
      expect(line.text, line.pathLabel).not.toMatch(/paid for potential|cost lingers|ignoring it|decorative packages|generic snaps|wrong future role/i);
      expect(line.text, line.pathLabel).not.toMatch(/\b(?:verify|confirm|check)\b/i);
      expect(line.text, line.pathLabel).not.toMatch(/\bread\b/i);
      expect(line.text, line.pathLabel).not.toMatch(/\bUse\b/);
      expect(line.text, line.pathLabel).toMatch(AGM_DIALOGUE_CONCRETE_COPY);
    }
  });

  it('keeps playoff and contending AGM advice specific about the next football action', () => {
    const source = fs.readFileSync(path.join(CONTENT_ROOT, 'broadcast/agm-dialogue.json'), 'utf8');

    expect(source).toContain('Set starter rest and playoff packages now; hiding top starters in key snaps leaves January downs to backups without assigned roles.');
    expect(source).toContain('Call the runs, protections, and coverages your current starters execute now; forcing extra calls creates assignment mistakes.');
    expect(source).not.toMatch(/Keep best players healthy and featured|Call what your starters handle best/i);
    expect(source).not.toMatch(AGM_DIALOGUE_RETIRED_MISSED_TACKLE_PROBLEM_COPY);
    expect(source).toContain('opponents will run at those missed tackles next game');
    expect(source).toContain('every unprotected early-down snap turns the trade cost into more missed tackles');
    expect(source).toContain('waiting carries the missed tackles forward');
  });

  it('keeps elimination and rebuild AGM advice from hiding consequences behind wrong-X shorthand', () => {
    const source = fs.readFileSync(path.join(CONTENT_ROOT, 'broadcast/agm-dialogue.json'), 'utf8');

    expect(source).toContain('Name which backups cover injuries before cuts; cut that player, and the next injury removes the backup who covers it');
    expect(source).toContain("the projected eighth pick needs a starter or backup role, or it sits outside next year's depth chart");
    expect(source).toContain('spending moves on a covered role leaves the failed spot open');
    expect(source).toContain('development reps are wasted if the depth-chart job is undefined');
    expect(source).toContain('cutting the backup who covers injuries leaves the failed starter job uncovered');
    expect(source).not.toMatch(AGM_DIALOGUE_WRONG_SHORTHAND);
  });

  it('keeps broadcast AGM risk language tied to the actual football consequence', () => {
    const source = fs.readFileSync(path.join(CONTENT_ROOT, 'broadcast/agm-dialogue.json'), 'utf8');

    expect(source).toContain('overuse puts the starter on the injury report before extension value is protected');
    expect(source).toContain('free yards hand playoff opponents short fields and force extra defensive snaps');
    expect(source).toContain('those same downs stay open for easy yards next game');
    expect(source).toContain('unprotected matchups extend drives with easy throws');
    expect(source).toContain("changing it gives next season's opponents free throws into the vacated coverage");
    expect(source).toContain('Name the failed defender jobs, practice reps, and coverage calls now; leaving them unchanged carries the same missed tackles into next season.');
    expect(source).toContain('the rebuild spends weeks on players who cannot earn jobs');
    expect(source).toContain('every isolated snap gives opponents the matchup to attack');
    expect(source).toContain('average film in a starter job gives opponents a matchup to target');
    expect(source).toContain('leaves January downs to backups without assigned roles');
    expect(source).toContain('leaving it open gives a playoff opponent the target for third down');
    expect(source).toContain('missed blocks hit the quarterback and create turnovers');
    expect(source).toContain('extra responsibility puts him on blocks or tackles he has not earned');
    expect(source).toContain('missed medical limits or an undefined job waste the roster spot');
    expect(source).toContain('Name medical limits and the depth-chart job before practice reps; forced snaps waste the pick.');
    expect(source).toContain('Open his medical report and assign a role before calling it a steal; missed limitations turn the draft capital into a redshirt year.');
    expect(source).toContain('Decide before Week 18 whether home-field gain justifies playing starters with injury tags; a full rest plan surrenders seeding when home-field is still live.');
    expect(source).toContain('Name his pass-rush or coverage assignment before Game Plan locks; undefined calls waste snaps.');
    expect(source).toContain('Assign rush downs where offenses must account for him; unused rush snaps waste the extra rusher.');
    expect(source).toContain('open the medical report, assign the role, and set the coaching plan before snaps are wasted');
    expect(source).toContain('Three starter matchups are losing on tape; name the overmatched starter before changing scheme, or the same matchup costs the next game.');
    expect(source).toContain('Call safer protections and drill blocking and tackling; missed blocks and tackles already end drives and carry into the next matchup.');
    expect(source).not.toMatch(AGM_DIALOGUE_RISK_SHORTHAND);
  });

  it('keeps game-start AGM reactions actionable with consequences', () => {
    const raw = readJson('broadcast/agm-dialogue.json') as Record<string, {
      gameStart?: Record<string, string[]>;
    }>;

    for (const [personaId, persona] of Object.entries(raw)) {
      for (const [contextKey, lines] of Object.entries(persona.gameStart ?? {})) {
        for (const [index, line] of lines.entries()) {
          const label = `agm-dialogue.json.${personaId}.gameStart.${contextKey}[${index}]`;
          expect(line, label).toMatch(AGM_DIALOGUE_ACTION_COPY);
          expect(line, label).toMatch(AGM_DIALOGUE_CONSEQUENCE_COPY);
        }
      }
    }
  });

  it('keeps draft-night AGM reactions actionable with consequences', () => {
    const raw = readJson('broadcast/agm-dialogue.json') as Record<string, {
      draftNight?: Record<string, string[]>;
    }>;

    for (const [personaId, persona] of Object.entries(raw)) {
      for (const [contextKey, lines] of Object.entries(persona.draftNight ?? {})) {
        for (const [index, line] of lines.entries()) {
          const label = `agm-dialogue.json.${personaId}.draftNight.${contextKey}[${index}]`;
          expect(line, label).toMatch(AGM_DIALOGUE_ACTION_COPY);
          expect(line, label).toMatch(AGM_DIALOGUE_CONSEQUENCE_COPY);
        }
      }
    }
  });

  it('keeps big-trade AGM reactions actionable with consequences', () => {
    const raw = readJson('broadcast/agm-dialogue.json') as Record<string, {
      bigTrade?: Record<string, string[]>;
    }>;

    for (const [personaId, persona] of Object.entries(raw)) {
      for (const [contextKey, lines] of Object.entries(persona.bigTrade ?? {})) {
        for (const [index, line] of lines.entries()) {
          const label = `agm-dialogue.json.${personaId}.bigTrade.${contextKey}[${index}]`;
          expect(line, label).toMatch(AGM_DIALOGUE_ACTION_COPY);
          expect(line, label).toMatch(AGM_DIALOGUE_CONSEQUENCE_COPY);
        }
      }
    }
  });

  it('keeps season-milestone AGM reactions actionable with consequences', () => {
    const raw = readJson('broadcast/agm-dialogue.json') as Record<string, {
      seasonMilestone?: Record<string, string[]>;
    }>;

    for (const [personaId, persona] of Object.entries(raw)) {
      for (const [contextKey, lines] of Object.entries(persona.seasonMilestone ?? {})) {
        for (const [index, line] of lines.entries()) {
          const label = `agm-dialogue.json.${personaId}.seasonMilestone.${contextKey}[${index}]`;
          expect(line, label).toMatch(AGM_DIALOGUE_ACTION_COPY);
          expect(line, label).toMatch(AGM_DIALOGUE_CONSEQUENCE_COPY);
        }
      }
    }
  });
});

describe('content schemas — broadcast play-by-play templates', () => {
  it('passing-defense-st-templates.json parses', () => {
    expectSchemaPass(
      BroadcastTemplatesContentSchema,
      readJson('broadcast/passing-defense-st-templates.json'),
      'passing-defense-st-templates.json',
    );
  });

  it('rushing-templates.json parses', () => {
    expectSchemaPass(
      BroadcastTemplatesContentSchema,
      readJson('broadcast/rushing-templates.json'),
      'rushing-templates.json',
    );
  });

  it('both broadcast files together cover the expected play-type keys', () => {
    const passing = readJson('broadcast/passing-defense-st-templates.json') as Record<string, unknown>;
    const rushing = readJson('broadcast/rushing-templates.json') as Record<string, unknown>;
    const combined = new Set([...Object.keys(passing), ...Object.keys(rushing)]);
    // Sanity: must have at least one rushing and one passing template category
    expect(combined.has('routine_run')).toBe(true);
    expect(combined.has('routine_pass')).toBe(true);
  });
});

describe('content schemas — ceremonies/award-speeches.json', () => {
  it('parses without error', () => {
    expectSchemaPass(
      AwardSpeechesContentSchema,
      readJson('ceremonies/award-speeches.json'),
      'award-speeches.json',
    );
  });

  it('MVP award has both acceptance_humble and presenter_intro variants', () => {
    const parsed = AwardSpeechesContentSchema.parse(readJson('ceremonies/award-speeches.json'));
    const mvp = parsed.award_speeches['mvp'];
    expect(mvp).toBeDefined();
    expect(mvp?.acceptance_humble?.length ?? 0).toBeGreaterThan(0);
    expect(mvp?.presenter_intro?.length ?? 0).toBeGreaterThan(0);
  });
});

describe('content schemas — coaching/coach-archetypes.json', () => {
  it('parses without error', () => {
    expectSchemaPass(
      CoachArchetypesContentSchema,
      readJson('coaching/coach-archetypes.json'),
      'coach-archetypes.json',
    );
  });

  it('scheme_descriptions has both offense and defense keys', () => {
    const parsed = CoachArchetypesContentSchema.parse(readJson('coaching/coach-archetypes.json'));
    expect(parsed.scheme_descriptions['offense']).toBeDefined();
    expect(parsed.scheme_descriptions['defense']).toBeDefined();
  });
});

describe('content schemas — halftime/halftime-performers.json', () => {
  it('parses without error', () => {
    expectSchemaPass(
      HalftimeContentSchema,
      readJson('halftime/halftime-performers.json'),
      'halftime-performers.json',
    );
  });

  it('has at least one performer and covers all PA event types', () => {
    const parsed = HalftimeContentSchema.parse(readJson('halftime/halftime-performers.json'));
    expect(parsed.performers.length).toBeGreaterThan(0);
    const expectedPaEvents = [
      'first_down', 'touchdown_home', 'touchdown_away', 'field_goal_home',
      'turnover_home', 'sack_home', 'big_play_home', 'end_of_quarter',
      'two_minute_warning', 'player_intro', 'timeout',
    ];
    for (const ev of expectedPaEvents) {
      expect((parsed.pa_templates as Record<string, readonly string[]>)[ev]).toBeDefined();
    }
  });
});

describe('content schemas — names/player-names.json', () => {
  it('parses without error', () => {
    expectSchemaPass(
      PlayerNamesContentSchema,
      readJson('names/player-names.json'),
      'player-names.json',
    );
  });

  it('all three frequency tiers are populated for both first and last names', () => {
    const parsed = PlayerNamesContentSchema.parse(readJson('names/player-names.json'));
    for (const tier of ['common', 'uncommon', 'rare'] as const) {
      expect((parsed.firstNames as Record<string, readonly string[]>)[tier]?.length ?? 0).toBeGreaterThan(0);
      expect((parsed.lastNames as Record<string, readonly string[]>)[tier]?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('content schemas — agm/screen-tips.json', () => {
  it('keeps first-visit screen tips concrete and consequence focused', () => {
    const tips = collectStringLeaves(readJson('agm/screen-tips.json'), 'agm/screen-tips.json');
    const allCopy = tips.map((line) => line.text).join(' ');

    expect(allCopy).toContain('Open Action Center first for injuries, owner requests, decisions, and next opponent');
    expect(allCopy).toContain('unresolved items lock into the next game');
    expect(allCopy).toContain('Set rest and weather calls');
    expect(allCopy).toContain('missed rest creates starter fatigue and weather shrinks calls');
    expect(allCopy).toContain('Name result cause');
    expect(allCopy).toContain('Open Broadcast after games to name turnovers, sacks, injuries, and failed drives.');
    expect(allCopy).toContain('Then change Roster, Depth Chart, or Game Plan before Advance Week; unfixed misses repeat next game');
    expect(allCopy).toContain('Scout starter jobs');
    expect(allCopy).toContain('Unassigned role answers, medical limits, or coachability warnings force a draft reach or expensive free-agent patch.');
    expect(allCopy).toContain('opponent pass rush, coverage, and run-defense targets');
    expect(allCopy).toContain('Ignoring injury flags exposes unavailable players, missed protections, or uncovered receivers.');
    expect(allCopy).toContain('Name role before pick');
    expect(allCopy).toContain('Name the top player on your board, the starter or backup job, and the rookie role before each pick');
    expect(allCopy).toContain('leaves a stronger pick unused and extends the roster gap');
    expect(allCopy).not.toMatch(/Name best player available|critical need|passes on better talent|Pick need vs talent|Scout starter needs/i);
    expect(allCopy).not.toMatch(/\b(?:swing plays|key drives)\b/i);
    expect(allCopy).not.toMatch(/\b(?:verify|confirm|check)\b/i);
    expect(allCopy).not.toMatch(/wrong call|wrong plan/i);
    expect(allCopy).not.toMatch(/Find what broke the drive|decide whether next week needs|opponent pressure|skipping it locks/i);
  });
});

describe('content schemas — narrative/story-arc-templates.json', () => {
  it('parses without error', () => {
    expectSchemaPass(
      StoryArcTemplatesContentSchema,
      readJson('narrative/story-arc-templates.json'),
      'story-arc-templates.json',
    );
  });

  it('each documented arc has all 4 phases present', () => {
    const parsed = StoryArcTemplatesContentSchema.parse(readJson('narrative/story-arc-templates.json'));
    const phases = ['start', 'peak', 'resolution_good', 'resolution_bad'] as const;
    for (const [arc, arcPhases] of Object.entries(parsed)) {
      for (const phase of phases) {
        const value = (arcPhases as Record<string, unknown>)[phase];
        expect(value, `${arc}.${phase}`).toBeDefined();
      }
    }
  });
});

describe('content schemas — narrative/revenge-lines.json', () => {
  it('parses without error', () => {
    expectSchemaPass(
      RevengeLinesContentSchema,
      readJson('narrative/revenge-lines.json'),
      'revenge-lines.json',
    );
  });

  it('keeps every authored revenge bucket populated', () => {
    const parsed = RevengeLinesContentSchema.parse(readJson('narrative/revenge-lines.json'));

    expect(parsed.pregame.agm.length).toBeGreaterThan(0);
    expect(parsed.halftime.commentary.length).toBeGreaterThan(0);
    expect(parsed.postgame.agm.length).toBeGreaterThan(0);
    expect(parsed.postgame.newsline.length).toBeGreaterThan(0);
  });
});

describe('content schemas — news/league-news-templates.json', () => {
  it('parses without error', () => {
    expectSchemaPass(
      LeagueNewsTemplatesContentSchema,
      readJson('news/league-news-templates.json'),
      'league-news-templates.json',
    );
  });
});

describe('content schemas — personalities/personality-flavor.json', () => {
  it('parses without error (3-level dimension/tier/scenario nesting)', () => {
    expectSchemaPass(
      PersonalityFlavorContentSchema,
      readJson('personalities/personality-flavor.json'),
      'personality-flavor.json',
    );
  });

  it('all 5 dimensions have all 3 tiers populated', () => {
    const parsed = PersonalityFlavorContentSchema.parse(readJson('personalities/personality-flavor.json'));
    const dimensions = ['workEthic', 'loyalty', 'greed', 'pressure', 'ambition'] as const;
    const tiers = ['low', 'mid', 'high'] as const;
    for (const dim of dimensions) {
      const dimBlock = (parsed as Record<string, unknown>)[dim];
      expect(dimBlock, dim).toBeDefined();
      for (const tier of tiers) {
        expect((dimBlock as Record<string, unknown>)[tier], `${dim}.${tier}`).toBeDefined();
      }
    }
  });
});

describe('content schemas — scouting/scouting-report-templates.json', () => {
  it('parses without error', () => {
    expectSchemaPass(
      ScoutingTemplatesContentSchema,
      readJson('scouting/scouting-report-templates.json'),
      'scouting-report-templates.json',
    );
  });

  it('includes templates for QB, RB, WR, and TE positions', () => {
    const parsed = ScoutingTemplatesContentSchema.parse(readJson('scouting/scouting-report-templates.json'));
    for (const pos of ['QB', 'RB', 'WR', 'TE']) {
      expect(parsed.scouting_templates[pos], pos).toBeDefined();
    }
  });
});

describe('content schemas — social/social-feed-templates.json', () => {
  it('parses without error', () => {
    expectSchemaPass(
      SocialFeedTemplatesContentSchema,
      readJson('social/social-feed-templates.json'),
      'social-feed-templates.json',
    );
  });

  it('all four source buckets are populated', () => {
    const parsed = SocialFeedTemplatesContentSchema.parse(readJson('social/social-feed-templates.json'));
    expect(Object.keys(parsed.player_posts).length).toBeGreaterThan(0);
    expect(Object.keys(parsed.fan_posts).length).toBeGreaterThan(0);
    expect(Object.keys(parsed.analyst_posts).length).toBeGreaterThan(0);
    expect(Object.keys(parsed.reporter_posts).length).toBeGreaterThan(0);
  });
});

describe('content schemas — Tier B drift guard', () => {
  it('rejects an obviously-bad payload', () => {
    const bad = { player_posts: { fake_scenario: [] }, fan_posts: {}, analyst_posts: {}, reporter_posts: {} };
    const result = SocialFeedTemplatesContentSchema.safeParse(bad);
    // .min(1) on the string array should reject the empty array
    expect(result.success).toBe(false);
  });

  it('rejects a missing-field payload for a bucket shape', () => {
    const bad = { openers: ['foo'] }; // missing endings
    const result = BroadcastTemplateCategorySchemaCheck(bad);
    expect(result).toBe(false);
  });
});

// Local helper to avoid importing the internal bucket schema just for one test
function BroadcastTemplateCategorySchemaCheck(raw: unknown): boolean {
  return BroadcastTemplatesContentSchema.safeParse({ fake_play: raw }).success;
}

// ── Tier C — key-space bounding (post-59 cleanup) ─────────────────────
// Previously `z.record(z.string(), ValueSchema)` accepted any key. Typos
// in content JSON → silent misses at runtime. Tier C pins the key sets
// against the shipped gameplay constants.

describe('content schemas — Tier C key-space bounding', () => {
  it('BroadcastPlayTypeSchema covers every authored play type across both broadcast files', () => {
    const passing = readJson('broadcast/passing-defense-st-templates.json') as Record<string, unknown>;
    const rushing = readJson('broadcast/rushing-templates.json') as Record<string, unknown>;
    const authored = new Set([...Object.keys(passing), ...Object.keys(rushing)]);
    for (const key of authored) {
      expect(BroadcastPlayTypeSchema.safeParse(key).success, `play type ${key}`).toBe(true);
    }
  });

  it('BroadcastTemplatesContentSchema rejects an unknown play-type key', () => {
    const bad = { not_a_real_play: { openers: ['x'], endings: ['y'] } };
    expect(BroadcastTemplatesContentSchema.safeParse(bad).success).toBe(false);
  });

  it('CoachArchetypeKeySchema covers every archetype authored under coach_archetypes', () => {
    const parsed = CoachArchetypesContentSchema.parse(readJson('coaching/coach-archetypes.json'));
    for (const key of Object.keys(parsed.coach_archetypes)) {
      expect(CoachArchetypeKeySchema.safeParse(key).success, `archetype ${key}`).toBe(true);
    }
  });

  it('CoachArchetypesContentSchema rejects an unknown archetype key', () => {
    const base = readJson('coaching/coach-archetypes.json') as { coach_archetypes: Record<string, unknown>; scheme_descriptions: Record<string, unknown> };
    const bad = {
      ...base,
      coach_archetypes: {
        ...base.coach_archetypes,
        made_up_archetype: {
          press_conference: ['x'],
          sideline_reaction_good: ['x'],
          sideline_reaction_bad: ['x'],
        },
      },
    };
    expect(CoachArchetypesContentSchema.safeParse(bad).success).toBe(false);
  });

  it('CoachSchemeSideSchema is limited to offense and defense', () => {
    expect(CoachSchemeSideSchema.safeParse('offense').success).toBe(true);
    expect(CoachSchemeSideSchema.safeParse('defense').success).toBe(true);
    expect(CoachSchemeSideSchema.safeParse('special_teams').success).toBe(false);
  });

  it('ScoutingPositionSchema covers every authored scouting-template position', () => {
    const parsed = ScoutingTemplatesContentSchema.parse(readJson('scouting/scouting-report-templates.json'));
    for (const key of Object.keys(parsed.scouting_templates)) {
      expect(ScoutingPositionSchema.safeParse(key).success, `position ${key}`).toBe(true);
    }
  });

  it('ScoutingTemplatesContentSchema rejects an unknown position key', () => {
    const base = readJson('scouting/scouting-report-templates.json') as { scouting_templates: Record<string, unknown> };
    const bad = {
      scouting_templates: {
        ...base.scouting_templates,
        PUNTER_COACH: base.scouting_templates['QB'],
      },
    };
    expect(ScoutingTemplatesContentSchema.safeParse(bad).success).toBe(false);
  });

  it('AgmPersonaIdSchema covers every authored persona in agm-dialogue.json', () => {
    const raw = readJson('broadcast/agm-dialogue.json') as Record<string, unknown>;
    for (const key of Object.keys(raw)) {
      expect(AgmPersonaIdSchema.safeParse(key).success, `persona ${key}`).toBe(true);
    }
  });

  it('AgmDialogueContentSchema rejects an unknown persona id', () => {
    const base = readJson('broadcast/agm-dialogue.json') as Record<string, unknown>;
    const bad = { ...base, someone_who_doesnt_exist: base['marcus_webb'] };
    expect(AgmDialogueContentSchema.safeParse(bad).success).toBe(false);
  });

  it('social scenario schemas cover every authored bucket scenario', () => {
    const parsed = SocialFeedTemplatesContentSchema.parse(readJson('social/social-feed-templates.json'));
    for (const key of Object.keys(parsed.player_posts)) {
      expect(PlayerSocialScenarioSchema.safeParse(key).success, `player scenario ${key}`).toBe(true);
    }
    for (const key of Object.keys(parsed.fan_posts)) {
      expect(FanSocialScenarioSchema.safeParse(key).success, `fan scenario ${key}`).toBe(true);
    }
    for (const key of Object.keys(parsed.analyst_posts)) {
      expect(AnalystSocialScenarioSchema.safeParse(key).success, `analyst scenario ${key}`).toBe(true);
    }
    for (const key of Object.keys(parsed.reporter_posts)) {
      expect(ReporterSocialScenarioSchema.safeParse(key).success, `reporter scenario ${key}`).toBe(true);
    }
  });

  it('SocialFeedTemplatesContentSchema rejects an unknown scenario in any bucket', () => {
    const base = readJson('social/social-feed-templates.json') as {
      player_posts: Record<string, string[]>;
      fan_posts: Record<string, string[]>;
      analyst_posts: Record<string, string[]>;
      reporter_posts: Record<string, string[]>;
    };
    const bad = {
      ...base,
      player_posts: { ...base.player_posts, bogus_scenario: ['one'] },
    };
    expect(SocialFeedTemplatesContentSchema.safeParse(bad).success).toBe(false);
  });

  it('RevengeLineBucketSchema covers every authored revenge-line accessor bucket', () => {
    for (const key of ['pregame.agm', 'halftime.commentary', 'postgame.agm', 'postgame.newsline']) {
      expect(RevengeLineBucketSchema.safeParse(key).success, `revenge bucket ${key}`).toBe(true);
    }
  });

  it('RevengeLinesContentSchema rejects unknown top-level or stage keys', () => {
    const base = readJson('narrative/revenge-lines.json') as Record<string, unknown>;
    expect(RevengeLinesContentSchema.safeParse({ ...base, fourthQuarter: { agm: ['x'] } }).success).toBe(false);
    expect(RevengeLinesContentSchema.safeParse({
      ...base,
      pregame: { ...(base['pregame'] as Record<string, unknown>), sideline: ['x'] },
    }).success).toBe(false);
  });

  it('TeamContentSchema rejects an empty-string motto (Tier C .min(1) bite)', () => {
    const sample = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, teamFiles[0]!), 'utf8'));
    const bad = { ...sample, motto: '' };
    expect(TeamContentSchema.safeParse(bad).success).toBe(false);
  });

  it('TeamContentSchema rejects a rivalries-free team (Tier C .min(1) bite)', () => {
    const sample = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, teamFiles[0]!), 'utf8'));
    const bad = { ...sample, rivalries: [] };
    expect(TeamContentSchema.safeParse(bad).success).toBe(false);
  });

  it('TeamContentSchema rejects a malformed team id that fails the abbreviation regex', () => {
    const sample = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, teamFiles[0]!), 'utf8'));
    const bad = { ...sample, id: 'lowercase-slug' };
    expect(TeamContentSchema.safeParse(bad).success).toBe(false);
  });
});
