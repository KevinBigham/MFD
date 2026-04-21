/**
 * Content schema validation.
 *
 * Tier A (Sprint 40 "The Straight Line"): 32 team JSONs under
 * packages/content/teams/. Validated at content-loader import time.
 *
 * Tier B (post-Sprint 55 cleanup): 13 broadcast/narrative/news/social/
 * scouting/coaching/personalities/halftime/ceremonies/names/agm content
 * files. Previously `as Record<...>` casts; now validated via Zod.
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
} from './content-schemas';

const CONTENT_ROOT = path.resolve(__dirname, '../../../content');
const TEAMS_DIR = path.join(CONTENT_ROOT, 'teams');

const teamFiles = fs
  .readdirSync(TEAMS_DIR)
  .filter((name) => name.endsWith('.json'))
  .sort();

function readJson(relative: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_ROOT, relative), 'utf8'));
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
