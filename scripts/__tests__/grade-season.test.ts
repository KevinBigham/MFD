import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  aggregateVerdicts,
  baselinePathFor,
  buildGradeSeasonCliPreflight,
  collectJudgeRunResults,
  evaluateReleaseGate,
  formatGradeSeasonHelp,
  isGradeSeasonHelpRequested,
  reportPathFor,
  requestJudgeVerdict,
  runGradeSeason,
  validateJudgeVerdict,
  type JudgeVerdict,
} from '../grade-season.ts';

function verdict(judge: JudgeVerdict['judge'], overrides: Partial<JudgeVerdict> = {}): JudgeVerdict {
  return {
    judge,
    model: `${judge}-model`,
    category_scores: {
      realism: 'good',
      coherence: 'good',
      awards: 'acceptable',
      texture: 'excellent',
      continuity: 'good',
    },
    issues: ['none'],
    issue_notes: 'No significant issues.',
    reasoning: 'The season looks plausible. Awards and standings broadly align.',
    confidence: 0.82,
    ...overrides,
  };
}

test('schema validation rejects malformed judge verdicts', () => {
  assert.throws(
    () => validateJudgeVerdict({
      judge: 'gpt',
      model: 'gpt-model',
      category_scores: {
        realism: 'great',
        coherence: 'good',
        awards: 'acceptable',
        texture: 'excellent',
        continuity: 'good',
      },
      issues: ['none'],
      issue_notes: 'Bad score word.',
      reasoning: 'Bad score word.',
      confidence: 0.8,
    }),
    /category_scores.realism/i,
  );
});

test('grade-season help documents required flags, API keys, quorum, and baseline behavior', () => {
  const help = formatGradeSeasonHelp('grade-season');

  assert.match(help, /--seed <integer>/);
  assert.match(help, /--tag, --releaseTag <id>/);
  assert.match(help, /--fixture <path>/);
  assert.match(help, /ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY/);
  assert.match(help, /--allow-quorum-drop/);
  assert.match(help, /Missing or unreadable baselines are gate failures/);
  assert.equal(isGradeSeasonHelpRequested(['--help']), true);
  assert.equal(isGradeSeasonHelpRequested(['-h']), true);
});

test('grade-season preflight shows paths, strict quorum, missing keys, and baseline input', () => {
  const preflight = buildGradeSeasonCliPreflight({
    seed: 42,
    releaseTag: 'rc3',
    fixturePath: '/tmp/mfd-fixture.json',
    allowQuorumDrop: false,
    outputDir: '/tmp/mfd-grading-results',
    baselinePath: '/tmp/custom-baseline.json',
  }, {
    env: { ANTHROPIC_API_KEY: 'anthropic-test' },
  });

  assert.match(preflight, /Release grading preflight \(gate\)/);
  assert.match(preflight, /season report: \/tmp\/mfd-grading-results\/rc3-42-report\.json/);
  assert.match(preflight, /verdict output: \/tmp\/mfd-grading-results\/rc3-42\.json/);
  assert.match(preflight, /baseline input: \/tmp\/custom-baseline\.json/);
  assert.match(preflight, /strict tri-judge/);
  assert.match(preflight, /OPENAI_API_KEY, GOOGLE_API_KEY/);
  assert.match(preflight, /command will fail before judge calls/);
});

test('baseline preflight shows baseline output and development quorum drop semantics', () => {
  const preflight = buildGradeSeasonCliPreflight({
    seed: 7,
    releaseTag: 'rc4',
    fixturePath: '/tmp/mfd-fixture.json',
    allowQuorumDrop: true,
    outputDir: '/tmp/mfd-grading-results',
    baselinePath: null,
  }, {
    baselineMode: true,
    env: { OPENAI_API_KEY: 'openai-test', GOOGLE_API_KEY: 'google-test' },
  });

  assert.match(preflight, /Release grading preflight \(baseline\)/);
  assert.match(preflight, /baseline output: \/tmp\/mfd-grading-results\/baselines\/rc4-baseline-7\.json/);
  assert.match(preflight, /release gate: skipped while writing baseline/);
  assert.match(preflight, /development quorum drop allowed/);
  assert.match(preflight, /ANTHROPIC_API_KEY \(corresponding judges will be skipped/);
});

test('requestJudgeVerdict retries one schema mismatch and returns the second valid response', async () => {
  const valid = verdict('claude');
  let attempts = 0;

  const result = await requestJudgeVerdict({
    judge: 'claude',
    invoke: async () => {
      attempts += 1;
      return attempts === 1
        ? '{"judge":"claude","model":"bad"}'
        : JSON.stringify(valid);
    },
  });

  assert.equal(attempts, 2);
  assert.deepEqual(result.verdict, valid);
});

test('aggregation maps words to 1-4, averages categories, flags poor and 2-judge issues', () => {
  const aggregate = aggregateVerdicts([
    verdict('claude', { category_scores: { realism: 'excellent', coherence: 'good', awards: 'good', texture: 'good', continuity: 'good' }, issues: ['stat_outlier'] }),
    verdict('gpt', { category_scores: { realism: 'good', coherence: 'good', awards: 'poor', texture: 'acceptable', continuity: 'good' }, issues: ['stat_outlier', 'bland'] }),
    verdict('gemini', { category_scores: { realism: 'acceptable', coherence: 'excellent', awards: 'acceptable', texture: 'good', continuity: 'excellent' }, issues: ['bland'] }),
  ]);

  assert.equal(aggregate.categoryAverages.realism, 3);
  assert.equal(aggregate.categoryAverages.awards, 2);
  assert.equal(aggregate.totalScore, 2.87);
  assert.deepEqual(aggregate.poorFlags, ['awards']);
  assert.deepEqual(aggregate.consensusIssues, ['bland', 'stat_outlier']);
});

test('release gate blocks total regression, low categories, new poor flags, and new consensus issues', () => {
  const baseline = aggregateVerdicts([
    verdict('claude', { issues: ['none'] }),
    verdict('gpt', { issues: ['none'] }),
    verdict('gemini', { issues: ['none'] }),
  ]);
  const current = aggregateVerdicts([
    verdict('claude', { category_scores: { realism: 'acceptable', coherence: 'good', awards: 'poor', texture: 'good', continuity: 'good' }, issues: ['trade_imbalance'] }),
    verdict('gpt', { category_scores: { realism: 'acceptable', coherence: 'good', awards: 'acceptable', texture: 'good', continuity: 'good' }, issues: ['trade_imbalance'] }),
    verdict('gemini', { category_scores: { realism: 'acceptable', coherence: 'good', awards: 'acceptable', texture: 'good', continuity: 'good' }, issues: ['none'] }),
  ]);

  const gate = evaluateReleaseGate(current, baseline);

  assert.equal(gate.passed, false);
  assert.match(gate.failures.join('\n'), /total score dropped/i);
  assert.match(gate.failures.join('\n'), /awards/i);
  assert.match(gate.failures.join('\n'), /trade_imbalance/i);
});

test('single-judge failure cleanly drops to a 2-judge quorum', () => {
  const collected = collectJudgeRunResults([
    { status: 'fulfilled', value: { judge: 'claude', verdict: verdict('claude') } },
    { status: 'fulfilled', value: { judge: 'gpt', verdict: verdict('gpt') } },
    { status: 'fulfilled', value: { judge: 'gemini', failure: { reason: 'timeout' } } },
  ]);

  assert.equal(collected.verdicts.length, 2);
  assert.equal(collected.failedJudges.length, 1);
  assert.equal(collected.failedJudges[0]?.judge, 'gemini');
});

test('runGradeSeason writes a report and baseline record with mocked providers', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mfd-grade-season-'));
  const outputDir = join(dir, 'grading-results');
  const fixturePath = join(dir, 'season.json');
  const game = {
    seed: 42,
    year: 2027,
    week: 1,
    phase: 'offseason',
    teams: {
      afce1: {
        id: 'afce1',
        city: 'AFCE1',
        name: 'Club',
        conference: 'AFC',
        division: 'East',
        wins: 12,
        losses: 5,
        ties: 0,
        seasonStats: { pointDifferential: 80, pointsFor: 450, pointsAgainst: 370 },
        roster: [],
      },
      afce2: {
        id: 'afce2',
        city: 'AFCE2',
        name: 'Club',
        conference: 'AFC',
        division: 'East',
        wins: 7,
        losses: 10,
        ties: 0,
        seasonStats: { pointDifferential: -45, pointsFor: 330, pointsAgainst: 375 },
        roster: [],
      },
    },
    players: {},
    schedule: [],
    playoffBracket: null,
    awardsHistory: [],
    franchiseHistory: [{ year: 2026, teamId: 'afce1' }],
    activeProposals: [],
    offseasonState: null,
    dynastyTimeline: [],
    weekSummaries: [],
    storyArcs: [],
    leagueNews: [],
  };
  await writeFile(fixturePath, JSON.stringify(game), 'utf8');

  const fetchFn = async (url: string) => {
    const judge = url.includes('anthropic')
      ? 'claude'
      : url.includes('openai')
        ? 'gpt'
        : 'gemini';
    const text = JSON.stringify(verdict(judge));
    const payload = judge === 'claude'
      ? { content: [{ text }] }
      : judge === 'gpt'
        ? { output_text: text }
        : { candidates: [{ content: { parts: [{ text }] } }] };
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      async text() {
        return JSON.stringify(payload);
      },
    };
  };

  const record = await runGradeSeason({
    seed: 42,
    releaseTag: 'rc2',
    fixturePath,
    allowQuorumDrop: false,
    outputDir,
    baselinePath: null,
    baselineMode: true,
    env: {
      ANTHROPIC_API_KEY: 'anthropic-test',
      OPENAI_API_KEY: 'openai-test',
      GOOGLE_API_KEY: 'google-test',
    },
    fetchFn,
  });

  assert.equal(record.aggregate.judgeCount, 3);
  assert.equal(record.gate.passed, true);
  const report = JSON.parse(await readFile(reportPathFor(outputDir, 'rc2', 42), 'utf8'));
  const baseline = JSON.parse(await readFile(baselinePathFor(outputDir, 'rc2', 42), 'utf8'));
  assert.equal(report.seed, 42);
  assert.equal(baseline.aggregate.judgeCount, 3);
});
