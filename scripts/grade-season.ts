#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateSeasonReport, type SeasonReport } from '../packages/engine/src/season/generateSeasonReport.ts';
import type { GameState } from '../packages/engine/src/types/index.ts';

export const CATEGORY_KEYS = ['realism', 'coherence', 'awards', 'texture', 'continuity'] as const;
export const QUALITY_WORDS = ['excellent', 'good', 'acceptable', 'poor'] as const;
export const ISSUE_TAGS = [
  'stat_outlier',
  'award_mismatch',
  'standings_implausible',
  'trade_imbalance',
  'development_off',
  'injury_distribution',
  'storyline_incoherent',
  'competitive_balance',
  'bland',
  'none',
] as const;
export const JUDGES = ['claude', 'gpt', 'gemini'] as const;
export const QUALITY_SCORE: Record<QualityWord, number> = {
  excellent: 4,
  good: 3,
  acceptable: 2,
  poor: 1,
};

export type CategoryKey = (typeof CATEGORY_KEYS)[number];
export type QualityWord = (typeof QUALITY_WORDS)[number];
export type IssueTag = (typeof ISSUE_TAGS)[number];
export type JudgeId = (typeof JUDGES)[number];

export interface JudgeVerdict {
  judge: JudgeId;
  model: string;
  category_scores: Record<CategoryKey, QualityWord>;
  issues: IssueTag[];
  issue_notes: string;
  reasoning: string;
  confidence: number;
}

export interface JudgeFailure {
  reason: string;
  rawResponse?: string;
  rawResponsePath?: string;
}

export type JudgeRunResult =
  | { judge: JudgeId; verdict: JudgeVerdict; attempts: number }
  | { judge: JudgeId; failure: JudgeFailure; attempts: number };

export interface AggregateVerdict {
  judgeCount: number;
  categoryAverages: Record<CategoryKey, number>;
  totalScore: number;
  poorFlags: CategoryKey[];
  issueCounts: Record<IssueTag, number>;
  consensusIssues: IssueTag[];
}

export interface ReleaseGateResult {
  passed: boolean;
  failures: string[];
}

export interface GradingRunRecord {
  releaseTag: string;
  seed: number;
  report: SeasonReport;
  verdicts: JudgeVerdict[];
  failedJudges: Array<{ judge: string; reason: string; rawResponsePath?: string }>;
  aggregate: AggregateVerdict;
  gate: ReleaseGateResult;
}

type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
}>;

interface CliOptions {
  seed: number;
  releaseTag: string;
  fixturePath: string;
  allowQuorumDrop: boolean;
  outputDir: string;
  baselinePath: string | null;
}

interface RunGradeSeasonOptions extends CliOptions {
  baselineMode?: boolean;
  env?: NodeJS.ProcessEnv;
  fetchFn?: FetchLike;
}

const DEFAULT_MODELS: Record<JudgeId, string> = {
  claude: 'claude-sonnet-4-5',
  gpt: 'gpt-5.1',
  gemini: 'gemini-2.5-pro',
};

const JUDGE_SCHEMA_TEXT = `{
  "judge": "claude" | "gpt" | "gemini",
  "model": "<exact model id>",
  "category_scores": {
    "realism": "excellent" | "good" | "acceptable" | "poor",
    "coherence": "excellent" | "good" | "acceptable" | "poor",
    "awards": "excellent" | "good" | "acceptable" | "poor",
    "texture": "excellent" | "good" | "acceptable" | "poor",
    "continuity": "excellent" | "good" | "acceptable" | "poor"
  },
  "issues": ["stat_outlier", "award_mismatch"],
  "issue_notes": "QB threw 67 TDs, above realistic ceiling. MVP went to a 4-13 team's backup.",
  "reasoning": "Two-three sentence rationale.",
  "confidence": 0.85
}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }
  return value;
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (isRecord(raw)) return raw;
  if (typeof raw !== 'string') {
    throw new Error('judge response must be a JSON object or JSON string');
  }
  const parsed = JSON.parse(raw.trim()) as unknown;
  if (!isRecord(parsed)) {
    throw new Error('judge response JSON must be an object');
  }
  return parsed;
}

export function validateJudgeVerdict(raw: unknown): JudgeVerdict {
  const parsed = parseJsonObject(raw);
  const judge = asString(parsed.judge, 'judge');
  if (!JUDGES.includes(judge as JudgeId)) {
    throw new Error(`judge must be one of ${JUDGES.join(', ')}`);
  }
  const model = asString(parsed.model, 'model');
  const scores = parsed.category_scores;
  if (!isRecord(scores)) {
    throw new Error('category_scores must be an object');
  }

  const category_scores = {} as Record<CategoryKey, QualityWord>;
  for (const key of CATEGORY_KEYS) {
    const score = scores[key];
    if (!QUALITY_WORDS.includes(score as QualityWord)) {
      throw new Error(`category_scores.${key} must be one of ${QUALITY_WORDS.join(', ')}`);
    }
    category_scores[key] = score as QualityWord;
  }
  for (const key of Object.keys(scores)) {
    if (!CATEGORY_KEYS.includes(key as CategoryKey)) {
      throw new Error(`category_scores.${key} is not part of the rubric`);
    }
  }

  if (!Array.isArray(parsed.issues) || parsed.issues.length === 0) {
    throw new Error('issues must be a non-empty array');
  }
  const issues = parsed.issues.map((issue, index) => {
    if (!ISSUE_TAGS.includes(issue as IssueTag)) {
      throw new Error(`issues[${index}] must be one of ${ISSUE_TAGS.join(', ')}`);
    }
    return issue as IssueTag;
  });
  if (issues.includes('none') && issues.length > 1) {
    throw new Error('issues cannot combine none with issue tags');
  }

  const confidence = asNumber(parsed.confidence, 'confidence');
  if (confidence < 0 || confidence > 1) {
    throw new Error('confidence must be between 0 and 1');
  }

  return {
    judge: judge as JudgeId,
    model,
    category_scores,
    issues,
    issue_notes: asString(parsed.issue_notes, 'issue_notes'),
    reasoning: asString(parsed.reasoning, 'reasoning'),
    confidence,
  };
}

export async function requestJudgeVerdict(options: {
  judge: JudgeId;
  invoke: () => Promise<string>;
  persistRawFailure?: (judge: JudgeId, rawResponse: string) => Promise<string>;
}): Promise<JudgeRunResult> {
  let latestRaw = '';
  let latestError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      latestRaw = await options.invoke();
    } catch (error) {
      return {
        judge: options.judge,
        attempts: attempt,
        failure: { reason: error instanceof Error ? error.message : String(error) },
      };
    }

    try {
      const verdict = validateJudgeVerdict(latestRaw);
      if (verdict.judge !== options.judge) {
        throw new Error(`judge field "${verdict.judge}" does not match provider "${options.judge}"`);
      }
      return { judge: options.judge, verdict, attempts: attempt };
    } catch (error) {
      latestError = error;
    }
  }

  const rawResponsePath = options.persistRawFailure
    ? await options.persistRawFailure(options.judge, latestRaw)
    : undefined;

  return {
    judge: options.judge,
    attempts: 2,
    failure: {
      reason: latestError instanceof Error ? latestError.message : String(latestError),
      rawResponse: latestRaw,
      rawResponsePath,
    },
  };
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export function aggregateVerdicts(verdicts: JudgeVerdict[]): AggregateVerdict {
  if (verdicts.length === 0) {
    throw new Error('Cannot aggregate zero judge verdicts');
  }

  const categoryAverages = {} as Record<CategoryKey, number>;
  const poorFlags: CategoryKey[] = [];
  for (const category of CATEGORY_KEYS) {
    const scores = verdicts.map((verdict) => QUALITY_SCORE[verdict.category_scores[category]]);
    categoryAverages[category] = round2(scores.reduce((sum, value) => sum + value, 0) / scores.length);
    if (verdicts.some((verdict) => verdict.category_scores[category] === 'poor')) {
      poorFlags.push(category);
    }
  }

  const issueCounts = Object.fromEntries(ISSUE_TAGS.map((tag) => [tag, 0])) as Record<IssueTag, number>;
  for (const verdict of verdicts) {
    for (const issue of verdict.issues) {
      issueCounts[issue] += 1;
    }
  }
  const consensusIssues = ISSUE_TAGS
    .filter((issue) => issue !== 'none' && issueCounts[issue] >= 2)
    .sort();
  const totalScore = round2(
    CATEGORY_KEYS.reduce((sum, category) => sum + categoryAverages[category], 0) / CATEGORY_KEYS.length,
  );

  return {
    judgeCount: verdicts.length,
    categoryAverages,
    totalScore,
    poorFlags,
    issueCounts,
    consensusIssues,
  };
}

export function evaluateReleaseGate(current: AggregateVerdict, baseline: AggregateVerdict): ReleaseGateResult {
  const failures: string[] = [];
  const totalDrop = round2(baseline.totalScore - current.totalScore);
  if (totalDrop >= 0.15) {
    failures.push(`total score dropped by ${totalDrop} vs baseline (${baseline.totalScore} -> ${current.totalScore})`);
  }

  for (const category of CATEGORY_KEYS) {
    const score = current.categoryAverages[category];
    if (score < 2.5) {
      failures.push(`${category} category average ${score} is below 2.5`);
    }
  }

  const baselinePoorFlags = new Set(baseline.poorFlags);
  for (const category of current.poorFlags) {
    if (!baselinePoorFlags.has(category)) {
      failures.push(`new single-judge poor flag: ${category}`);
    }
  }

  const baselineIssues = new Set(baseline.consensusIssues);
  for (const issue of current.consensusIssues) {
    if (!baselineIssues.has(issue)) {
      failures.push(`new 2+ judge issue tag: ${issue}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

export function collectJudgeRunResults(results: Array<PromiseSettledResult<JudgeRunResult>>): {
  verdicts: JudgeVerdict[];
  failedJudges: Array<{ judge: string; reason: string; rawResponsePath?: string }>;
} {
  const verdicts: JudgeVerdict[] = [];
  const failedJudges: Array<{ judge: string; reason: string; rawResponsePath?: string }> = [];

  for (const result of results) {
    if (result.status === 'rejected') {
      failedJudges.push({
        judge: 'unknown',
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
      continue;
    }
    if ('verdict' in result.value) {
      verdicts.push(result.value.verdict);
    } else {
      failedJudges.push({
        judge: result.value.judge,
        reason: result.value.failure.reason,
        rawResponsePath: result.value.failure.rawResponsePath,
      });
    }
  }

  verdicts.sort((a, b) => JUDGES.indexOf(a.judge) - JUDGES.indexOf(b.judge));
  failedJudges.sort((a, b) => a.judge.localeCompare(b.judge));
  return { verdicts, failedJudges };
}

export function buildJudgePrompt(report: SeasonReport): string {
  return `You are grading a simulated NFL season produced by Mr. Football Dynasty,
a deterministic football simulation game. You will see a structured
SeasonReport. Evaluate whether this season feels like a plausible NFL
season to a knowledgeable fan.

You are NOT evaluating game balance or design. Score what's in front of
you. Do not speculate about code, prompts, or systems behind the report.

Score these 5 categories: realism, coherence, awards, texture, continuity.
Use exactly one of: excellent, good, acceptable, poor.

Tag any applicable issues from this taxonomy:
- stat_outlier
- award_mismatch
- standings_implausible
- trade_imbalance
- development_off
- injury_distribution
- storyline_incoherent
- competitive_balance
- bland
- none

Provide a 2-3 sentence reasoning and a confidence float (0-1).

Return ONLY a JSON object matching this schema:
${JUDGE_SCHEMA_TEXT}

SeasonReport:
${JSON.stringify(report, null, 2)}`;
}

async function readJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

async function writeJsonFile(path: string, payload: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function unwrapGameState(raw: unknown): GameState {
  if (!isRecord(raw)) {
    throw new Error('Fixture must contain a GameState object');
  }
  if (isRecord(raw.gameState)) return raw.gameState as unknown as GameState;
  if (isRecord(raw.state)) return raw.state as unknown as GameState;
  return raw as unknown as GameState;
}

function modelFor(judge: JudgeId, env: NodeJS.ProcessEnv): string {
  const envKey = judge === 'claude'
    ? 'ANTHROPIC_MODEL'
    : judge === 'gpt'
      ? 'OPENAI_MODEL'
      : 'GOOGLE_MODEL';
  return env[envKey] ?? DEFAULT_MODELS[judge];
}

function apiKeyFor(judge: JudgeId, env: NodeJS.ProcessEnv): string | undefined {
  if (judge === 'claude') return env.ANTHROPIC_API_KEY;
  if (judge === 'gpt') return env.OPENAI_API_KEY;
  return env.GOOGLE_API_KEY;
}

function missingApiKeys(env: NodeJS.ProcessEnv): string[] {
  return [
    ['ANTHROPIC_API_KEY', env.ANTHROPIC_API_KEY],
    ['OPENAI_API_KEY', env.OPENAI_API_KEY],
    ['GOOGLE_API_KEY', env.GOOGLE_API_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

async function fetchJson(fetchFn: FetchLike, url: string, init: Parameters<FetchLike>[1]): Promise<unknown> {
  const response = await fetchFn(url, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as unknown;
}

function extractAnthropicText(data: unknown): string {
  if (!isRecord(data) || !Array.isArray(data.content)) {
    throw new Error('Anthropic response missing content array');
  }
  return data.content
    .filter(isRecord)
    .map((part) => typeof part.text === 'string' ? part.text : '')
    .join('\n')
    .trim();
}

function extractOpenAiText(data: unknown): string {
  if (isRecord(data) && typeof data.output_text === 'string') {
    return data.output_text.trim();
  }
  if (isRecord(data) && Array.isArray(data.output)) {
    return data.output
      .filter(isRecord)
      .flatMap((item) => Array.isArray(item.content) ? item.content.filter(isRecord) : [])
      .map((content) => typeof content.text === 'string' ? content.text : '')
      .join('\n')
      .trim();
  }
  if (isRecord(data) && Array.isArray(data.choices)) {
    const first = data.choices.find(isRecord);
    const message = isRecord(first?.message) ? first.message : null;
    if (typeof message?.content === 'string') return message.content.trim();
  }
  throw new Error('OpenAI response missing output text');
}

function extractGoogleText(data: unknown): string {
  if (!isRecord(data) || !Array.isArray(data.candidates)) {
    throw new Error('Google response missing candidates array');
  }
  const first = data.candidates.find(isRecord);
  const content = isRecord(first?.content) ? first.content : null;
  const parts = Array.isArray(content?.parts) ? content.parts.filter(isRecord) : [];
  const text = parts.map((part) => typeof part.text === 'string' ? part.text : '').join('\n').trim();
  if (!text) throw new Error('Google response missing text part');
  return text;
}

async function callProvider(judge: JudgeId, prompt: string, env: NodeJS.ProcessEnv, fetchFn: FetchLike): Promise<string> {
  const apiKey = apiKeyFor(judge, env);
  if (!apiKey) {
    throw new Error(`Missing API key for ${judge}`);
  }
  const model = modelFor(judge, env);

  if (judge === 'claude') {
    const data = await fetchJson(fetchFn, 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    return extractAnthropicText(data);
  }

  if (judge === 'gpt') {
    const data = await fetchJson(fetchFn, 'https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: prompt,
        temperature: 0.3,
      }),
    });
    return extractOpenAiText(data);
  }

  const data = await fetchJson(
    fetchFn,
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    },
  );
  return extractGoogleText(data);
}

function defaultOutputDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, 'grading-results');
}

export function resultPathFor(outputDir: string, releaseTag: string, seed: number): string {
  return resolve(outputDir, `${releaseTag}-${seed}.json`);
}

export function reportPathFor(outputDir: string, releaseTag: string, seed: number): string {
  return resolve(outputDir, `${releaseTag}-${seed}-report.json`);
}

export function baselinePathFor(outputDir: string, releaseTag: string, seed: number): string {
  return resolve(outputDir, 'baselines', `${releaseTag}-baseline-${seed}.json`);
}

async function persistRawFailure(outputDir: string, releaseTag: string, seed: number, judge: JudgeId, rawResponse: string): Promise<string> {
  const path = resolve(outputDir, 'raw', `${releaseTag}-${seed}-${judge}-raw.txt`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, rawResponse, 'utf8');
  return path;
}

function extractAggregateFromBaseline(raw: unknown): AggregateVerdict {
  if (!isRecord(raw)) {
    throw new Error('Baseline must be an object');
  }
  const candidate = isRecord(raw.aggregate) ? raw.aggregate : raw;
  if (!isRecord(candidate.categoryAverages)) {
    throw new Error('Baseline missing aggregate.categoryAverages');
  }
  return {
    judgeCount: asNumber(candidate.judgeCount, 'baseline.aggregate.judgeCount'),
    categoryAverages: CATEGORY_KEYS.reduce((record, category) => {
      record[category] = asNumber(candidate.categoryAverages?.[category], `baseline.aggregate.categoryAverages.${category}`);
      return record;
    }, {} as Record<CategoryKey, number>),
    totalScore: asNumber(candidate.totalScore, 'baseline.aggregate.totalScore'),
    poorFlags: Array.isArray(candidate.poorFlags)
      ? candidate.poorFlags.filter((flag): flag is CategoryKey => CATEGORY_KEYS.includes(flag as CategoryKey))
      : [],
    issueCounts: ISSUE_TAGS.reduce((record, issue) => {
      record[issue] = isRecord(candidate.issueCounts) && typeof candidate.issueCounts[issue] === 'number'
        ? candidate.issueCounts[issue]
        : 0;
      return record;
    }, {} as Record<IssueTag, number>),
    consensusIssues: Array.isArray(candidate.consensusIssues)
      ? candidate.consensusIssues.filter((issue): issue is IssueTag => ISSUE_TAGS.includes(issue as IssueTag))
      : [],
  };
}

export async function runGradeSeason(options: RunGradeSeasonOptions): Promise<GradingRunRecord> {
  const rawFixture = await readJsonFile(options.fixturePath);
  const game = unwrapGameState(rawFixture);
  const report = generateSeasonReport(game, { releaseTag: options.releaseTag });
  await writeJsonFile(reportPathFor(options.outputDir, options.releaseTag, options.seed), report);

  const missing = missingApiKeys(options.env ?? process.env);
  if (missing.length > 0 && !options.allowQuorumDrop) {
    throw new Error(`Missing required API keys: ${missing.join(', ')}. Set them or pass --allow-quorum-drop for development-only quorum drops.`);
  }

  const prompt = buildJudgePrompt(report);
  const fetchFn = options.fetchFn ?? (globalThis.fetch as unknown as FetchLike);
  const env = options.env ?? process.env;
  const tasks = JUDGES.map(async (judge): Promise<JudgeRunResult> => {
    if (!apiKeyFor(judge, env)) {
      return {
        judge,
        attempts: 0,
        failure: { reason: `Missing API key for ${judge}` },
      };
    }
    return requestJudgeVerdict({
      judge,
      invoke: () => callProvider(judge, prompt, env, fetchFn),
      persistRawFailure: (failedJudge, rawResponse) =>
        persistRawFailure(options.outputDir, options.releaseTag, options.seed, failedJudge, rawResponse),
    });
  });

  const { verdicts, failedJudges } = collectJudgeRunResults(await Promise.allSettled(tasks));
  if (verdicts.length < 2) {
    throw new Error(`Tri-judge grading requires at least 2 valid judge verdicts; received ${verdicts.length}.`);
  }

  const aggregate = aggregateVerdicts(verdicts);
  let gate: ReleaseGateResult = { passed: true, failures: [] };
  if (!options.baselineMode) {
    const baselinePath = options.baselinePath ?? baselinePathFor(options.outputDir, options.releaseTag, options.seed);
    try {
      const baseline = extractAggregateFromBaseline(await readJsonFile(baselinePath));
      gate = evaluateReleaseGate(aggregate, baseline);
    } catch (error) {
      gate = {
        passed: false,
        failures: [`no baseline - run grade-season-baseline first (${baselinePath})`, error instanceof Error ? error.message : String(error)],
      };
    }
  }

  const record: GradingRunRecord = {
    releaseTag: options.releaseTag,
    seed: options.seed,
    report,
    verdicts,
    failedJudges,
    aggregate,
    gate,
  };

  const outPath = options.baselineMode
    ? baselinePathFor(options.outputDir, options.releaseTag, options.seed)
    : resultPathFor(options.outputDir, options.releaseTag, options.seed);
  await writeJsonFile(outPath, record);

  return record;
}

function readRequiredFlag(args: string[], names: string[]): string {
  for (const name of names) {
    const index = args.indexOf(name);
    if (index !== -1) {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Flag ${name} requires a value`);
      return value;
    }
  }
  throw new Error(`Missing required flag ${names.join(' or ')}`);
}

function readOptionalFlag(args: string[], names: string[]): string | null {
  for (const name of names) {
    const index = args.indexOf(name);
    if (index !== -1) {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Flag ${name} requires a value`);
      return value;
    }
  }
  return null;
}

export function parseGradeSeasonCliArgs(args: string[]): CliOptions {
  const seed = Number(readRequiredFlag(args, ['--seed']));
  if (!Number.isInteger(seed)) {
    throw new Error(`--seed must be an integer; got ${seed}`);
  }
  const releaseTag = readRequiredFlag(args, ['--tag', '--releaseTag']);
  const fixturePath = resolve(readRequiredFlag(args, ['--fixture']));
  const outputDir = resolve(readOptionalFlag(args, ['--output-dir']) ?? defaultOutputDir());
  const baselinePath = readOptionalFlag(args, ['--baseline']);

  return {
    seed,
    releaseTag,
    fixturePath,
    allowQuorumDrop: args.includes('--allow-quorum-drop'),
    outputDir,
    baselinePath: baselinePath ? resolve(baselinePath) : null,
  };
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(resolve(entry)).href;
}

async function main(): Promise<void> {
  const options = parseGradeSeasonCliArgs(process.argv.slice(2));
  const record = await runGradeSeason(options);

  process.stdout.write(`Season report written to ${reportPathFor(options.outputDir, options.releaseTag, options.seed)}\n`);
  process.stdout.write(`Verdict written to ${resultPathFor(options.outputDir, options.releaseTag, options.seed)}\n`);
  process.stdout.write(`Judge count: ${record.aggregate.judgeCount}, total score: ${record.aggregate.totalScore}\n`);
  if (record.gate.passed) {
    process.stdout.write('Release gate: PASS\n');
  } else {
    process.stdout.write(`Release gate: FAIL\n${record.gate.failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exitCode = 1;
  }
}

if (isMainModule()) {
  main().catch((error) => {
    process.stderr.write(`grade-season failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
