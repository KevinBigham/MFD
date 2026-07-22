import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function readRepoFile(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

function stripYamlScalar(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function collectPnpmActionVersions(workflow) {
  const lines = workflow.split(/\r?\n/);
  const versions = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes('uses: pnpm/action-setup@v4')) continue;

    const versionLine = lines
      .slice(index + 1, index + 8)
      .find((line) => /^\s+version:\s+/.test(line));

    assert.ok(versionLine, 'pnpm/action-setup has a version');
    versions.push(stripYamlScalar(versionLine.split(':').slice(1).join(':')));
  }

  assert.ok(versions.length > 0, 'workflow uses pnpm/action-setup');
  return versions;
}

test('README points to the release gate contract', () => {
  const readme = readRepoFile('README.md');

  assert.match(readme, /release:gate|scripts\/release-gate\.mjs/);
});

test('package.json defines release:gate', () => {
  const packageJson = JSON.parse(readRepoFile('package.json'));

  assert.equal(packageJson.scripts?.['release:gate'], 'node scripts/release-gate.mjs');
});

test('deploy runs only after successful main-branch CI', () => {
  const deployWorkflow = readRepoFile('.github/workflows/deploy.yml');

  assert.match(deployWorkflow, /workflow_run:[\s\S]*workflows: \[CI\]/);
  assert.match(deployWorkflow, /workflow_run\.conclusion == 'success'/);
  assert.match(deployWorkflow, /workflow_run\.head_branch == 'main'/);
});

test('CI uses the package-manager pin for every build job', () => {
  const ciVersions = collectPnpmActionVersions(readRepoFile('.github/workflows/ci.yml'));
  const expectedVersion = JSON.parse(readRepoFile('package.json')).packageManager.split('@').at(-1);

  assert.ok(ciVersions.every((version) => version === expectedVersion), 'CI pnpm versions match');
});

test('deploy consumes the exact SHA-named artifact emitted by the full release gate', () => {
  const ciWorkflow = readRepoFile('.github/workflows/ci.yml');
  const deployWorkflow = readRepoFile('.github/workflows/deploy.yml');

  assert.match(ciWorkflow, /Full release gate[\s\S]*node scripts\/release-gate\.mjs[\s\S]*upload-artifact@v4[\s\S]*mfd-pages-\$\{\{ github\.sha \}\}/);
  assert.match(deployWorkflow, /download-artifact@v4[\s\S]*mfd-pages-\$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  assert.match(deployWorkflow, /run-id: \$\{\{ github\.event\.workflow_run\.id \}\}/);
  assert.doesNotMatch(deployWorkflow, /pnpm install|pnpm .*build|vite build/);
});
