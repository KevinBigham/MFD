import { execFileSync } from 'node:child_process';

/**
 * Baseline metadata must identify the committed source used by the entire run.
 * Inspect once before generation; our own baseline writes then make Git dirty.
 *
 * @param {string} repoRoot
 * @param {(args: string[]) => string} [runGit]
 * @returns {string}
 */
export function captureBaselineSourceCommit(repoRoot, runGit = (args) => execFileSync('git', args, {
  cwd: repoRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})) {
  let prefix;
  let commit;
  let status;
  try {
    prefix = runGit(['rev-parse', '--show-prefix']).trim();
    commit = runGit(['rev-parse', '--verify', 'HEAD^{commit}']).trim();
    status = runGit(['status', '--porcelain=v1', '--untracked-files=all']);
  } catch {
    throw new Error('Cannot update shadow baselines: Git source provenance is unavailable. Use a committed Git checkout.');
  }

  if (prefix !== '') {
    throw new Error('Cannot update shadow baselines: the source directory must be its Git repository root.');
  }
  if (!/^[0-9a-f]{40}$/i.test(commit)) {
    throw new Error('Cannot update shadow baselines: HEAD did not resolve to a full Git commit SHA.');
  }
  if (status.trim() !== '') {
    throw new Error('Cannot update shadow baselines: tracked or nonignored untracked changes are present. Commit the intended source before generation; preserve unrelated work.');
  }

  return commit.toLowerCase();
}

/**
 * Keep the provenance check ahead of both expensive simulation and writes.
 * Callers supply the actual generator/writer; tests use inert substitutes.
 *
 * @template Scenario, Result
 * @param {readonly Scenario[]} scenarios
 * @param {{
 *   readSourceCommit: () => string,
 *   generate: (scenario: Scenario) => Result,
 *   write: (scenario: Scenario, result: Result, sourceCommit: string) => void,
 * }} operations
 * @returns {string}
 */
export function updateShadowBaselines(scenarios, { readSourceCommit, generate, write }) {
  const sourceCommit = readSourceCommit();
  for (const scenario of scenarios) {
    const result = generate(scenario);
    write(scenario, result, sourceCommit);
  }
  return sourceCommit;
}
