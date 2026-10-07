import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureBaselineSourceCommit, updateShadowBaselines } from '../shadow-baseline-update.mjs';

const SOURCE_COMMIT = '0123456789abcdef0123456789abcdef01234567';

function gitReader({ prefix = '', commit = SOURCE_COMMIT, status = '', failure } = {}) {
  return (args) => {
    const command = args.join(' ');
    if (failure === command) throw new Error('Git lookup failed');
    if (command === 'rev-parse --show-prefix') return prefix;
    if (command === 'rev-parse --verify HEAD^{commit}') return commit;
    if (command === 'status --porcelain=v1 --untracked-files=all') return status;
    throw new Error(`Unexpected Git command: ${command}`);
  };
}

test('captures a full source commit from a clean repository root', () => {
  assert.equal(captureBaselineSourceCommit('/unused-by-stub', gitReader()), SOURCE_COMMIT);
});

for (const [label, options, expected] of [
  ['unavailable Git', { failure: 'rev-parse --show-prefix' }, /provenance is unavailable/],
  ['unreadable HEAD', { failure: 'rev-parse --verify HEAD^{commit}' }, /provenance is unavailable/],
  ['unreadable status', { failure: 'status --porcelain=v1 --untracked-files=all' }, /provenance is unavailable/],
  ['parent repository', { prefix: 'copied-mfd/' }, /repository root/],
  ['unknown commit', { commit: 'unknown' }, /full Git commit SHA/],
  ['abbreviated commit', { commit: '0123456' }, /full Git commit SHA/],
  ['edited tracked source', { status: ' M packages/engine/src/example.ts\n' }, /changes are present/],
  ['staged source', { status: 'M  scripts/shadow-regression.ts\n' }, /changes are present/],
  ['untracked source', { status: '?? scripts/local-generator.ts\n' }, /changes are present/],
]) {
  test(`refuses ${label} before invoking any generator or writer`, () => {
    const work = [];
    assert.throws(() => updateShadowBaselines(['first', 'second'], {
      readSourceCommit: () => captureBaselineSourceCommit('/unused-by-stub', gitReader(options)),
      generate: (scenario) => { work.push(`generate ${scenario}`); return {}; },
      write: (scenario) => { work.push(`write ${scenario}`); },
    }), expected);
    assert.deepEqual(work, []);
  });
}

test('checks provenance once and reuses it after the first generated baseline dirties Git', () => {
  let status = '';
  let provenanceReads = 0;
  let statusReads = 0;
  const events = [];
  const writes = [];
  const commit = updateShadowBaselines(['first', 'second'], {
    readSourceCommit: () => {
      provenanceReads += 1;
      events.push('provenance');
      return captureBaselineSourceCommit('/unused-by-stub', (args) => {
        if (args[0] === 'status') {
          statusReads += 1;
          return status;
        }
        return gitReader()(args);
      });
    },
    generate: (scenario) => {
      events.push(`generate ${scenario}`);
      return { scenario };
    },
    write: (scenario, result, sourceCommit) => {
      events.push(`write ${scenario}`);
      writes.push({ scenario, result, sourceCommit });
      status = ' M _canon/seeds/mfd/first.json\n';
    },
  });

  assert.equal(commit, SOURCE_COMMIT);
  assert.equal(provenanceReads, 1);
  assert.equal(statusReads, 1);
  assert.deepEqual(events, ['provenance', 'generate first', 'write first', 'generate second', 'write second']);
  assert.deepEqual(writes, [
    { scenario: 'first', result: { scenario: 'first' }, sourceCommit: SOURCE_COMMIT },
    { scenario: 'second', result: { scenario: 'second' }, sourceCommit: SOURCE_COMMIT },
  ]);
});
