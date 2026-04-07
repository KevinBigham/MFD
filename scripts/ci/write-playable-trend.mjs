import fs from 'node:fs';
import path from 'node:path';

function readJson(filepath) {
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (_err) {
    return null;
  }
}

function isoDate(value) {
  return String(value || new Date().toISOString()).slice(0, 10);
}

export function updatePlayableTrend(existingEntries, report, stamp) {
  var entries = Array.isArray(existingEntries) ? existingEntries.slice() : [];
  var summary = (report && report.summary) || {};
  var next = {
    date: isoDate(stamp || new Date().toISOString()),
    overallOk: !!(report && report.overallOk),
    failedSections: Number(summary.failedSections || 0),
    failedChecks: Number(summary.failedChecks || 0),
  };
  entries = entries.filter(function (row) { return row && row.date !== next.date; });
  entries.push(next);
  entries.sort(function (a, b) {
    return String(a.date).localeCompare(String(b.date));
  });
  if (entries.length > 7) {
    entries = entries.slice(entries.length - 7);
  }
  return entries;
}

export function writePlayableTrend(reportPath, trendPath, stamp) {
  var reportAbs = path.resolve(process.cwd(), reportPath || 'dist/playability-report.json');
  var trendAbs = path.resolve(process.cwd(), trendPath || 'docs/nightly-playable-trend.json');
  var report = readJson(reportAbs);
  var existing = readJson(trendAbs);
  var entries = updatePlayableTrend(existing || [], report || {}, stamp);
  fs.mkdirSync(path.dirname(trendAbs), { recursive: true });
  fs.writeFileSync(trendAbs, JSON.stringify(entries, null, 2) + '\n');
  return {
    reportPath: reportAbs,
    trendPath: trendAbs,
    entries: entries,
  };
}

function main() {
  var out = writePlayableTrend(process.argv[2], process.argv[3], process.argv[4]);
  console.log('[playable-trend] wrote ' + out.trendPath + ' (' + out.entries.length + ' entries)');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
