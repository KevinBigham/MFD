import fs from 'node:fs';
import path from 'node:path';

function readJson(filepath) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filepath), 'utf8'));
}

function failedCheckIds(report) {
  var ids = [];
  var sections = (report && report.sections) || {};
  Object.keys(sections).forEach(function (sectionName) {
    var section = sections[sectionName] || {};
    var checks = Array.isArray(section.checks) ? section.checks : [];
    checks.forEach(function (row) {
      if (!row.pass) ids.push(sectionName + ':' + row.name);
    });
  });
  return ids.sort();
}

export function comparePlayabilityReports(baseReport, currentReport) {
  var baseSummary = (baseReport && baseReport.summary) || {};
  var curSummary = (currentReport && currentReport.summary) || {};
  var baseFailed = failedCheckIds(baseReport);
  var curFailed = failedCheckIds(currentReport);

  var addedFailures = curFailed.filter(function (id) { return baseFailed.indexOf(id) < 0; });
  var removedFailures = baseFailed.filter(function (id) { return curFailed.indexOf(id) < 0; });

  return {
    ok: addedFailures.length === 0,
    delta: {
      failedSections: (curSummary.failedSections || 0) - (baseSummary.failedSections || 0),
      failedChecks: (curSummary.failedChecks || 0) - (baseSummary.failedChecks || 0),
      totalChecks: (curSummary.totalChecks || 0) - (baseSummary.totalChecks || 0),
    },
    addedFailures: addedFailures,
    removedFailures: removedFailures,
  };
}

export function runComparePlayabilityReports(basePath, currentPath, reportPath) {
  var base = readJson(basePath);
  var current = readJson(currentPath);
  var comparison = comparePlayabilityReports(base, current);
  var outPath = path.resolve(process.cwd(), reportPath || 'dist/playability-report-compare.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(comparison, null, 2) + '\n');
  return { comparison: comparison, reportPath: outPath };
}

function parseArgs(args) {
  var out = {
    base: 'dist/playability-report-baseline.json',
    current: 'dist/playability-report.json',
    report: 'dist/playability-report-compare.json',
  };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--base' && args[i + 1]) out.base = args[i + 1];
    if (args[i] === '--current' && args[i + 1]) out.current = args[i + 1];
    if (args[i] === '--report' && args[i + 1]) out.report = args[i + 1];
  }
  return out;
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  var out = runComparePlayabilityReports(args.base, args.current, args.report);
  console.log('[playability-compare] report: ' + out.reportPath);
  if (!out.comparison.ok) {
    console.error('[playability-compare] new failures detected:');
    out.comparison.addedFailures.forEach(function (id) { console.error(' - ' + id); });
    process.exit(1);
  }
  console.log('[playability-compare] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
