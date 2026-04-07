import fs from 'node:fs';
import path from 'node:path';

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_err) {
    return null;
  }
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function walkFixtureFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  var out = [];
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(function (entry) {
    var full = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      out = out.concat(walkFixtureFiles(full));
      return;
    }
    if (entry.isFile() && full.endsWith('.json')) out.push(full);
  });
  return out;
}

export function validateFixtureShape(fixture, filePath) {
  var errors = [];
  if (!isObject(fixture)) errors.push('fixture must be object');
  if (!fixture || typeof fixture.id !== 'string' || fixture.id.length === 0) errors.push('id is required');
  if (!fixture || typeof fixture.contractType !== 'string' || fixture.contractType.length === 0) errors.push('contractType is required');
  if (!fixture || typeof fixture.expected === 'undefined') errors.push('expected is required');
  return {
    ok: errors.length === 0,
    errors: errors,
    filePath: filePath,
  };
}

function normalizeValueType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function compareShape(expected, actual, prefix) {
  var drifts = [];
  var location = prefix || '$';
  var expectedType = normalizeValueType(expected);
  var actualType = normalizeValueType(actual);
  if (expectedType !== actualType) {
    drifts.push({
      type: 'changed-shape',
      path: location,
      detail: 'type mismatch expected=' + expectedType + ' actual=' + actualType,
    });
    return drifts;
  }

  if (isObject(expected) && isObject(actual)) {
    Object.keys(expected).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(actual, key)) {
        drifts.push({ type: 'missing', path: location + '.' + key, detail: 'missing key in actual payload' });
        return;
      }
      drifts = drifts.concat(compareShape(expected[key], actual[key], location + '.' + key));
    });
  }

  return drifts;
}

export function inferFixtureModule(fixtureId) {
  var id = String(fixtureId || '');
  if (id.indexOf('sim.output') === 0) return 'sim-output';
  if (id.indexOf('draft.threshold') === 0) return 'draft-thresholds';
  if (id.indexOf('trade.threshold') === 0) return 'trade-thresholds';
  if (id.indexOf('chemistry') === 0) return 'chemistry';
  if (id.indexOf('rivalry') === 0) return 'rivalry';
  return 'unmapped';
}

function compareFixture(fixture, actualValue, mode) {
  var tolerantMode = mode === 'tolerant';
  if (typeof actualValue === 'undefined') {
    if (tolerantMode && fixture && fixture.quirk && fixture.quirk.allowMissing === true) {
      return [];
    }
    return [{ type: 'missing', path: fixture.id, detail: 'actual value missing for fixture id' }];
  }

  if (fixture.contractType === 'threshold') {
    var tolerance = Number(fixture.tolerance || 0);
    if (tolerantMode && fixture && fixture.quirk && Number.isFinite(Number(fixture.quirk.tolerance))) {
      tolerance = Math.max(tolerance, Number(fixture.quirk.tolerance));
    }
    var expectedNum = Number(fixture.expected);
    var actualNum = Number(actualValue);
    if (!Number.isFinite(expectedNum) || !Number.isFinite(actualNum)) {
      return [{ type: 'changed-shape', path: fixture.id, detail: 'threshold values must be numeric' }];
    }
    if (Math.abs(expectedNum - actualNum) > tolerance) {
      return [{
        type: 'changed-threshold',
        path: fixture.id,
        detail: 'expected=' + expectedNum + ' actual=' + actualNum + ' tolerance=' + tolerance,
      }];
    }
    return [];
  }

  return compareShape(fixture.expected, actualValue, fixture.id);
}

function loadActualMap(actualPath) {
  if (!actualPath) return {};
  var abs = path.resolve(process.cwd(), actualPath);
  if (!fs.existsSync(abs)) return {};
  var parsed = readJson(abs);
  if (!isObject(parsed)) return {};
  return parsed;
}

export function formatDriftMarkdown(report) {
  var lines = ['# Contracts Drift Summary', ''];
  lines.push('- Status: ' + (report.ok ? 'PASS' : 'FAIL'));
  lines.push('- Mode: ' + report.mode);
  lines.push('- Fixtures: ' + report.summary.fixtureCount);
  lines.push('- Drift count: ' + report.summary.driftCount);
  lines.push('- Skipped: ' + (report.skipped ? 'yes' : 'no'));
  lines.push('');
  lines.push('| Fixture | Type | Detail |');
  lines.push('|---|---|---|');

  if (!Array.isArray(report.drift) || report.drift.length === 0) {
    lines.push('| none | - | no drift detected |');
  } else {
    report.drift.forEach(function (row) {
      lines.push('| ' + row.id + ' | ' + row.type + ' | ' + row.detail + ' |');
    });
  }
  lines.push('');
  return lines.join('\n') + '\n';
}

export function runContractGate(options) {
  var opts = options || {};
  var mode = String(opts.mode || 'optional');
  var fixturesDir = path.resolve(process.cwd(), opts.fixturesDir || 'tests/fixtures/contracts');
  var actualMap = loadActualMap(opts.actualPath || 'dist/contracts-actual.json');

  var files = walkFixtureFiles(fixturesDir).filter(function (file) {
    return file.indexOf(path.sep + 'templates' + path.sep) < 0;
  });

  if (files.length === 0) {
    var skippedReport = {
      schemaVersion: 'hybrid-contracts-report.v1',
      generatedAt: new Date().toISOString(),
      ok: mode !== 'strict',
      skipped: true,
      mode: mode,
      fixturesDir: fixturesDir,
      drift: mode === 'strict' ? [{ id: 'contracts-fixtures', type: 'missing', detail: 'no fixtures found in strict mode' }] : [],
      summary: {
        fixtureCount: 0,
      driftCount: mode === 'strict' ? 1 : 0,
      },
      fixtureModuleMap: {},
    };
    return skippedReport;
  }

  var drift = [];
  var fixtureModuleMap = {};
  files.forEach(function (file) {
    var fixture = readJson(file);
    var validation = validateFixtureShape(fixture, file);
    if (!validation.ok) {
      drift.push({
        id: path.relative(fixturesDir, file),
        type: 'changed-shape',
        detail: validation.errors.join('; '),
      });
      return;
    }
    fixtureModuleMap[fixture.id] = inferFixtureModule(fixture.id);

    var actualValue = actualMap[fixture.id];
    var fixtureDrift = compareFixture(fixture, actualValue, mode);
    fixtureDrift.forEach(function (item) {
      drift.push({
        id: fixture.id,
        type: item.type,
        detail: item.detail,
      });
    });
  });

  return {
    schemaVersion: 'hybrid-contracts-report.v1',
    generatedAt: new Date().toISOString(),
    ok: drift.length === 0,
    skipped: false,
    mode: mode,
    fixturesDir: fixturesDir,
    drift: drift,
    summary: {
      fixtureCount: files.length,
      driftCount: drift.length,
    },
    fixtureModuleMap: fixtureModuleMap,
  };
}

function writeReports(result, reportPath, markdownPath) {
  var jsonOut = path.resolve(process.cwd(), reportPath || 'dist/contracts-report.json');
  var mdOut = path.resolve(process.cwd(), markdownPath || 'dist/contracts-report.md');
  fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
  fs.writeFileSync(jsonOut, JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(mdOut, formatDriftMarkdown(result));
  return {
    jsonOut: jsonOut,
    mdOut: mdOut,
  };
}

function parseArgs(args) {
  var out = {
    fixturesDir: 'tests/fixtures/contracts',
    actualPath: 'dist/contracts-actual.json',
    mode: 'optional',
    reportPath: 'dist/contracts-report.json',
    markdownPath: 'dist/contracts-report.md',
  };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--fixtures' && args[i + 1]) out.fixturesDir = args[i + 1];
    if (args[i] === '--actual' && args[i + 1]) out.actualPath = args[i + 1];
    if (args[i] === '--mode' && args[i + 1]) out.mode = args[i + 1];
    if (args[i] === '--report' && args[i + 1]) out.reportPath = args[i + 1];
    if (args[i] === '--markdown' && args[i + 1]) out.markdownPath = args[i + 1];
  }
  return out;
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  var result = runContractGate(args);
  var out = writeReports(result, args.reportPath, args.markdownPath);

  console.log('[verify-contracts] report: ' + out.jsonOut);
  console.log('[verify-contracts] summary: ' + out.mdOut);

  if (!result.ok) {
    result.drift.forEach(function (row) {
      console.error('[verify-contracts] drift: ' + row.id + ' (' + row.type + ') - ' + row.detail);
    });
    process.exit(1);
  }

  if (result.skipped) {
    console.log('[verify-contracts] skipped (no fixtures in optional mode)');
    return;
  }
  console.log('[verify-contracts] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
