function asArray(input) {
  return Array.isArray(input) ? input : [];
}

function normalizeCheck(input) {
  var row = input || {};
  return {
    name: String(row.name || 'unnamed-check'),
    pass: !!row.pass,
    detail: String(row.detail || ''),
  };
}

function normalizeSection(input) {
  var section = input || {};
  return {
    ok: section.ok !== false,
    checks: asArray(section.checks).map(normalizeCheck),
    errors: asArray(section.errors).map(function (item) { return String(item); }),
    missingFiles: asArray(section.missingFiles).map(function (item) { return String(item); }),
    badRefs: asArray(section.badRefs).map(function (item) { return String(item); }),
  };
}

function normalizeSessionHealth(input) {
  var health = input || {};
  var history = asArray(health.history);
  return {
    state: String(health.state || 'unknown'),
    running: !!health.running,
    startedAt: Number(health.startedAt || 0),
    lastHeartbeatAt: Number(health.lastHeartbeatAt || 0),
    historyCount: history.length,
  };
}

function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  var nums = values.map(function (v) { return Number(v) || 0; }).sort(function (a, b) { return a - b; });
  var idx = Math.min(nums.length - 1, Math.max(0, Math.floor((p / 100) * nums.length)));
  return nums[idx];
}

export function buildPlayabilityReport(input) {
  var data = input || {};
  var launcher = normalizeSection(data.launcher);
  var save = normalizeSection(data.save);
  var bridge = normalizeSection(data.bridge);
  var build = normalizeSection(data.build);
  var smoke = normalizeSection(data.smoke);
  var perfSamples = asArray(data.metrics && data.metrics.samples);

  var summary = summarizePlayabilityChecks({
    launcher: launcher,
    save: save,
    bridge: bridge,
    build: build,
    smoke: smoke,
  });

  return {
    schemaVersion: 'playability-report.v1',
    generatedAt: new Date().toISOString(),
    overallOk: summary.failedChecks === 0 && summary.failedSections === 0,
    sections: {
      launcher: launcher,
      save: save,
      bridge: bridge,
      build: build,
      smoke: smoke,
    },
    metrics: {
      sampleCount: perfSamples.length,
      p50Ms: percentile(perfSamples, 50),
      p95Ms: percentile(perfSamples, 95),
      samples: perfSamples,
    },
    sessionHealth: normalizeSessionHealth(data.sessionHealth),
    summary: summary,
    artifacts: {
      playableBuild: 'dist/playable-build-report.json',
      playableSmoke: 'dist/playable-smoke-report.json',
      legacySave: 'dist/legacy-save-report.json',
      legacySessionSmoke: 'dist/legacy-session-smoke-report.json',
    },
  };
}

export function summarizePlayabilityChecks(report) {
  var sections = report && report.sections ? report.sections : report || {};
  var names = Object.keys(sections);
  var totalChecks = 0;
  var failedChecks = 0;
  var failedSections = 0;
  names.forEach(function (name) {
    var section = normalizeSection(sections[name]);
    var localFailedChecks = section.checks.filter(function (row) { return !row.pass; }).length;
    totalChecks += section.checks.length;
    failedChecks += localFailedChecks;
    if (!section.ok || section.errors.length > 0 || localFailedChecks > 0 || section.missingFiles.length > 0 || section.badRefs.length > 0) {
      failedSections += 1;
    }
  });
  return {
    sectionCount: names.length,
    totalChecks: totalChecks,
    passedChecks: Math.max(0, totalChecks - failedChecks),
    failedChecks: failedChecks,
    failedSections: failedSections,
  };
}
