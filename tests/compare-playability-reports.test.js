import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  comparePlayabilityReports,
  runComparePlayabilityReports,
} from '../scripts/perf/compare-playability-reports.mjs';

function makeReport(failedIds) {
  var checks = failedIds.map(function (id) {
    var parts = id.split(':');
    return {
      section: parts[0],
      name: parts.slice(1).join(':'),
    };
  });
  var sections = {};
  checks.forEach(function (row) {
    if (!sections[row.section]) sections[row.section] = { checks: [] };
    sections[row.section].checks.push({ name: row.name, pass: false });
  });
  if (!sections.launcher) sections.launcher = { checks: [{ name: 'ok', pass: true }] };
  return {
    summary: {
      failedSections: Object.keys(sections).filter(function (k) {
        return sections[k].checks.some(function (c) { return !c.pass; });
      }).length,
      failedChecks: failedIds.length,
      totalChecks: failedIds.length + 1,
    },
    sections: sections,
  };
}

describe('compare-playability-reports', () => {
  it('detects added/removed failing checks', () => {
    var base = makeReport(['save:decode']);
    var current = makeReport(['save:decode', 'bridge:timeout']);
    var out = comparePlayabilityReports(base, current);
    expect(out.ok).toBe(false);
    expect(out.addedFailures).toEqual(['bridge:timeout']);
    expect(out.removedFailures).toEqual([]);
    expect(out.delta.failedChecks).toBe(1);
  });

  it('writes comparison report', () => {
    var root = fs.mkdtempSync(path.join(os.tmpdir(), 'mfd-playability-compare-'));
    var basePath = path.join(root, 'base.json');
    var currentPath = path.join(root, 'current.json');
    var reportPath = path.join(root, 'out.json');
    fs.writeFileSync(basePath, JSON.stringify(makeReport(['save:decode'])));
    fs.writeFileSync(currentPath, JSON.stringify(makeReport(['save:decode'])));

    var out = runComparePlayabilityReports(basePath, currentPath, reportPath);
    var parsed = JSON.parse(fs.readFileSync(out.reportPath, 'utf8'));
    expect(parsed.ok).toBe(true);
    expect(parsed.delta.failedChecks).toBe(0);
  });
});
