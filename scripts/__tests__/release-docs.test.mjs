import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function readRepoFile(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

function stripYamlScalar(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function readInlinePushBranches(workflow) {
  const lines = workflow.split(/\r?\n/);
  const pushIndex = lines.findIndex((line) => /^  push:\s*$/.test(line));
  assert.notEqual(pushIndex, -1, 'workflow defines on.push');

  for (let index = pushIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^  [^ ]/.test(line)) break;

    const match = line.match(/^\s{4}branches:\s*\[(.*)\]\s*$/);
    if (!match) continue;

    return match[1]
      .split(',')
      .map((branch) => stripYamlScalar(branch))
      .filter(Boolean);
  }

  assert.fail('workflow push trigger defines inline branches');
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

test('deploy push branches are exactly main', () => {
  const deployWorkflow = readRepoFile('.github/workflows/deploy.yml');

  assert.deepEqual(readInlinePushBranches(deployWorkflow), ['main']);
});

test('deploy uses the same pnpm version as CI', () => {
  const deployVersions = collectPnpmActionVersions(readRepoFile('.github/workflows/deploy.yml'));
  const ciVersions = collectPnpmActionVersions(readRepoFile('.github/workflows/ci.yml'));
  const expectedVersion = ciVersions[0];

  assert.ok(ciVersions.every((version) => version === expectedVersion), 'CI pnpm versions match');
  assert.ok(deployVersions.every((version) => version === expectedVersion), 'deploy pnpm version matches CI');
});

test('deploy runs bundle-size and built-page smoke checks', () => {
  const deployWorkflow = readRepoFile('.github/workflows/deploy.yml');

  assert.match(deployWorkflow, /check-bundle-size\.sh/);
  assert.match(deployWorkflow, /smoke-test-built-page\.sh/);
});
