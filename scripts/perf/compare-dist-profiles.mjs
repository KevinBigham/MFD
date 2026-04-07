import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function readProfile(filePath) {
  var abs = path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function toMap(assets) {
  var map = {};
  (assets || []).forEach(function (a) {
    map[a.file] = a;
  });
  return map;
}

export function compareProfiles(base, current) {
  var baseAssets = toMap(base.assets || []);
  var currentAssets = toMap(current.assets || []);
  var allFiles = Object.keys({ ...baseAssets, ...currentAssets }).sort();

  var assetDeltas = allFiles.map(function (file) {
    var b = baseAssets[file] || { bytes: 0, gzipBytes: 0 };
    var c = currentAssets[file] || { bytes: 0, gzipBytes: 0 };
    return {
      file: file,
      baseBytes: b.bytes,
      currentBytes: c.bytes,
      deltaBytes: c.bytes - b.bytes,
      baseGzipBytes: b.gzipBytes,
      currentGzipBytes: c.gzipBytes,
      deltaGzipBytes: c.gzipBytes - b.gzipBytes,
      status: baseAssets[file] && currentAssets[file] ? 'changed' : (baseAssets[file] ? 'removed' : 'added'),
    };
  });

  var basePreloads = base.index && Array.isArray(base.index.modulePreloads) ? base.index.modulePreloads : [];
  var currentPreloads = current.index && Array.isArray(current.index.modulePreloads) ? current.index.modulePreloads : [];

  var baseSet = new Set(basePreloads);
  var currentSet = new Set(currentPreloads);

  var addedPreloads = currentPreloads.filter(function (p) { return !baseSet.has(p); });
  var removedPreloads = basePreloads.filter(function (p) { return !currentSet.has(p); });

  return {
    comparedAt: new Date().toISOString(),
    summary: {
      assetCountBase: (base.assets || []).length,
      assetCountCurrent: (current.assets || []).length,
      totalBytesDelta: assetDeltas.reduce(function (n, d) { return n + d.deltaBytes; }, 0),
      totalGzipBytesDelta: assetDeltas.reduce(function (n, d) { return n + d.deltaGzipBytes; }, 0),
    },
    preloadDelta: {
      added: addedPreloads,
      removed: removedPreloads,
    },
    assetDeltas: assetDeltas,
  };
}

function parseArgs(args) {
  var out = {
    base: 'dist/perf-profile-baseline.json',
    current: 'dist/perf-profile.json',
    report: 'dist/perf-profile-compare.json',
  };

  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--base' && args[i + 1]) out.base = args[i + 1];
    if (args[i] === '--current' && args[i + 1]) out.current = args[i + 1];
    if (args[i] === '--report' && args[i + 1]) out.report = args[i + 1];
  }
  return out;
}

export function runComparison(opts) {
  var options = opts || parseArgs([]);
  var base = readProfile(options.base);
  var current = readProfile(options.current);
  var compared = compareProfiles(base, current);
  var reportPath = path.resolve(process.cwd(), options.report);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(compared, null, 2) + '\n');
  return {
    reportPath: reportPath,
    result: compared,
  };
}

var isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  try {
    var options = parseArgs(process.argv.slice(2));
    var out = runComparison(options);
    console.log('[profile-compare] wrote ' + out.reportPath);
    console.log('[profile-compare] preload +added: ' + out.result.preloadDelta.added.length + ', -removed: ' + out.result.preloadDelta.removed.length);
  } catch (err) {
    console.error('[profile-compare] ' + (err && err.message ? err.message : String(err)));
    process.exit(1);
  }
}
