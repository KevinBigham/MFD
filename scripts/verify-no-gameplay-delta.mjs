import fs from 'node:fs';
import path from 'node:path';

export function normalizePath(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

export function loadAllowlist(filePath) {
  var abs = path.resolve(process.cwd(), filePath || 'scripts/allowlists/overnight-safe-paths.json');
  var raw = fs.readFileSync(abs, 'utf8');
  var parsed = JSON.parse(raw);
  var strictLanes = {};
  var lanesInput = parsed && parsed.strictLanes && typeof parsed.strictLanes === 'object'
    ? parsed.strictLanes
    : {};

  Object.keys(lanesInput).forEach(function (laneName) {
    var lane = lanesInput[laneName] || {};
    strictLanes[laneName] = {
      safePrefixes: Array.isArray(lane.safePrefixes) ? lane.safePrefixes.map(normalizePath) : [],
      forbiddenPrefixes: Array.isArray(lane.forbiddenPrefixes) ? lane.forbiddenPrefixes.map(normalizePath) : [],
      sharedFiles: Array.isArray(lane.sharedFiles) ? lane.sharedFiles.map(normalizePath) : [],
    };
  });

  return {
    safePrefixes: Array.isArray(parsed.safePrefixes) ? parsed.safePrefixes.map(normalizePath) : [],
    forbiddenPrefixes: Array.isArray(parsed.forbiddenPrefixes) ? parsed.forbiddenPrefixes.map(normalizePath) : [],
    strictLanes: strictLanes,
    sharedWindowProfiles: parsed && parsed.sharedWindowProfiles && typeof parsed.sharedWindowProfiles === 'object'
      ? parsed.sharedWindowProfiles
      : {},
  };
}

export function classifyPaths(changedFiles, allowlist, opts) {
  var options = opts || {};
  var files = (changedFiles || []).map(normalizePath).filter(Boolean);
  var safe = [];
  var forbidden = [];
  var unknown = [];

  files.forEach(function (file) {
    var isForbidden = (allowlist.forbiddenPrefixes || []).some(function (prefix) {
      return file.startsWith(prefix);
    });
    if (isForbidden) {
      forbidden.push(file);
      return;
    }

    var isSafe = (allowlist.safePrefixes || []).some(function (prefix) {
      return file.startsWith(prefix);
    });
    if (isSafe) {
      safe.push(file);
    } else {
      unknown.push(file);
    }
  });

  var strictUnknown = options.failUnknown && unknown.length > 0 ? unknown.slice() : [];

  return {
    safe: safe,
    forbidden: forbidden,
    unknown: unknown,
    strictUnknown: strictUnknown,
  };
}

export function readChangedFilesList(args) {
  var listArg = null;
  var listFileArg = null;
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--files' && args[i + 1]) {
      listArg = args[i + 1];
    }
    if (args[i] === '--files-from' && args[i + 1]) {
      listFileArg = args[i + 1];
    }
  }

  if (listArg) {
    return listArg.split(',').map(function (s) { return normalizePath(s.trim()); }).filter(Boolean);
  }

  if (listFileArg) {
    var abs = path.resolve(process.cwd(), listFileArg);
    if (!fs.existsSync(abs)) return [];
    return fs.readFileSync(abs, 'utf8').split(/\r?\n/).map(function (s) {
      return normalizePath(s.trim());
    }).filter(Boolean);
  }

  if (process.env.CHANGED_FILES) {
    return process.env.CHANGED_FILES.split(',').map(function (s) {
      return normalizePath(s.trim());
    }).filter(Boolean);
  }

  var fallbackPath = path.resolve(process.cwd(), 'dist', 'changed-files.txt');
  if (fs.existsSync(fallbackPath)) {
    return fs.readFileSync(fallbackPath, 'utf8').split(/\r?\n/).map(function (s) {
      return normalizePath(s.trim());
    }).filter(Boolean);
  }

  return [];
}

export function resolveStrictLaneAllowlist(allowlist, laneName) {
  var lanes = (allowlist && allowlist.strictLanes) || {};
  var lane = lanes[laneName] || { safePrefixes: [], forbiddenPrefixes: [], sharedFiles: [] };
  return {
    safePrefixes: lane.safePrefixes || [],
    forbiddenPrefixes: Array.from(new Set([].concat(
      allowlist.forbiddenPrefixes || [],
      lane.forbiddenPrefixes || []
    ))),
    sharedFiles: lane.sharedFiles || [],
  };
}

export function resolveSharedWindowProfile(allowlist, profileName) {
  var name = String(profileName || '').trim();
  if (!name) return null;
  var profiles = (allowlist && allowlist.sharedWindowProfiles) || {};
  var profile = profiles[name];
  if (!profile || typeof profile !== 'object') return null;
  return {
    name: name,
    enabled: profile.enabled === true,
    description: String(profile.description || ''),
    allowedSharedFiles: Array.isArray(profile.allowedSharedFiles)
      ? profile.allowedSharedFiles.map(normalizePath)
      : [],
  };
}

export function checkConflictWindow(changedFiles, laneAllowlist, opts) {
  var options = opts || {};
  var files = (changedFiles || []).map(normalizePath).filter(Boolean);
  var shared = Array.isArray(laneAllowlist && laneAllowlist.sharedFiles)
    ? laneAllowlist.sharedFiles.map(normalizePath)
    : [];
  var profile = options.sharedWindowProfile || null;
  var sharedWindow = options.sharedWindow === true;
  var allowedSharedFiles = shared.slice();

  if (profile) {
    sharedWindow = profile.enabled === true;
    if (Array.isArray(profile.allowedSharedFiles) && profile.allowedSharedFiles.length > 0) {
      allowedSharedFiles = shared.filter(function (file) {
        return profile.allowedSharedFiles.indexOf(file) >= 0;
      });
    } else {
      allowedSharedFiles = [];
    }
  }

  if (shared.length === 0) return [];
  if (!sharedWindow) {
    return files.filter(function (file) {
      return shared.indexOf(file) >= 0;
    });
  }
  return files.filter(function (file) {
    return shared.indexOf(file) >= 0 && allowedSharedFiles.indexOf(file) < 0;
  });
}

export function buildLaneReport(result) {
  var out = result || {};
  return {
    generatedAt: new Date().toISOString(),
    ok: !!out.ok,
    strictLane: !!out.strictLane,
    laneName: out.laneName || '',
    sharedWindow: !!out.sharedWindow,
    changedCount: Array.isArray(out.changedFiles) ? out.changedFiles.length : 0,
    safe: out.safe || [],
    forbidden: out.forbidden || [],
    unknown: out.unknown || [],
    strictUnknown: out.strictUnknown || [],
    sharedWindowViolations: out.sharedWindowViolations || [],
    sharedWindowProfile: out.sharedWindowProfile || '',
    sharedWindowProfileFound: out.sharedWindowProfileFound !== false,
    sharedWindowAllowedFiles: out.sharedWindowAllowedFiles || [],
  };
}

export function buildSharedWindowAudit(result) {
  var out = result || {};
  return {
    schemaVersion: 'shared-window-audit.v1',
    generatedAt: new Date().toISOString(),
    laneName: out.laneName || '',
    strictLane: !!out.strictLane,
    activeProfile: out.sharedWindowProfile || '',
    activeProfileFound: out.sharedWindowProfileFound !== false,
    windowEnabled: !!out.sharedWindow,
    sharedWindowAllowedFiles: out.sharedWindowAllowedFiles || [],
    sharedWindowViolations: out.sharedWindowViolations || [],
    changedFiles: out.changedFiles || [],
    ok: !!out.ok,
  };
}

export function writeLaneReport(reportPath, result) {
  var abs = path.resolve(process.cwd(), reportPath || 'dist/lane-report.json');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(buildLaneReport(result), null, 2) + '\n');
  return abs;
}

export function writeSharedWindowAudit(reportPath, result) {
  var abs = path.resolve(process.cwd(), reportPath || 'dist/shared-window-audit.json');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(buildSharedWindowAudit(result), null, 2) + '\n');
  return abs;
}

export function runNoGameplayDeltaCheck(opts) {
  var options = opts || {};
  var allowlistPath = options.allowlistPath || 'scripts/allowlists/overnight-safe-paths.json';
  var changedFiles = options.changedFiles || [];
  var allowlist = loadAllowlist(allowlistPath);
  var strictLane = !!options.strictLane;
  var laneName = options.laneName || '';
  var sharedWindow = !!options.sharedWindow;
  var sharedWindowProfile = options.sharedWindowProfile || '';

  var laneAllowlist = strictLane
    ? resolveStrictLaneAllowlist(allowlist, laneName)
    : {
      safePrefixes: allowlist.safePrefixes,
      forbiddenPrefixes: allowlist.forbiddenPrefixes,
      sharedFiles: [],
    };

  var resolvedSharedWindowProfile = strictLane
    ? resolveSharedWindowProfile(allowlist, sharedWindowProfile)
    : null;
  var sharedWindowProfileOk = !sharedWindowProfile || !!resolvedSharedWindowProfile;
  if (resolvedSharedWindowProfile) {
    sharedWindow = resolvedSharedWindowProfile.enabled === true;
  }

  var result = classifyPaths(changedFiles, laneAllowlist, { failUnknown: strictLane });
  var sharedWindowViolations = strictLane
    ? checkConflictWindow(changedFiles, laneAllowlist, {
      sharedWindow: sharedWindow,
      sharedWindowProfile: resolvedSharedWindowProfile,
    })
    : [];

  return {
    ok: result.forbidden.length === 0
      && result.strictUnknown.length === 0
      && sharedWindowViolations.length === 0
      && sharedWindowProfileOk,
    changedFiles: changedFiles,
    safe: result.safe,
    forbidden: result.forbidden,
    unknown: result.unknown,
    strictUnknown: result.strictUnknown,
    strictLane: strictLane,
    laneName: laneName,
    sharedWindow: sharedWindow,
    sharedWindowViolations: sharedWindowViolations,
    sharedWindowProfile: resolvedSharedWindowProfile ? resolvedSharedWindowProfile.name : sharedWindowProfile,
    sharedWindowProfileFound: sharedWindowProfile ? !!resolvedSharedWindowProfile : true,
    sharedWindowAllowedFiles: resolvedSharedWindowProfile
      ? resolvedSharedWindowProfile.allowedSharedFiles
      : (sharedWindow ? laneAllowlist.sharedFiles || [] : []),
  };
}

function parseArgs(args) {
  var out = {
    allowlistPath: 'scripts/allowlists/overnight-safe-paths.json',
    strictLane: false,
    laneName: '',
    sharedWindow: false,
    sharedWindowProfile: '',
    reportPath: '',
    sharedAuditPath: '',
  };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--allowlist' && args[i + 1]) out.allowlistPath = args[i + 1];
    if (args[i] === '--strict-lane') out.strictLane = true;
    if (args[i] === '--lane' && args[i + 1]) out.laneName = args[i + 1];
    if (args[i] === '--shared-window') out.sharedWindow = true;
    if (args[i] === '--shared-window-profile' && args[i + 1]) out.sharedWindowProfile = args[i + 1];
    if (args[i] === '--report' && args[i + 1]) out.reportPath = args[i + 1];
    if (args[i] === '--shared-audit' && args[i + 1]) out.sharedAuditPath = args[i + 1];
  }
  return out;
}

function main() {
  var args = process.argv.slice(2);
  var parsed = parseArgs(args);
  var changedFiles = readChangedFilesList(args);
  var out = runNoGameplayDeltaCheck({
    allowlistPath: parsed.allowlistPath,
    changedFiles: changedFiles,
    strictLane: parsed.strictLane,
    laneName: parsed.laneName,
    sharedWindow: parsed.sharedWindow,
    sharedWindowProfile: parsed.sharedWindowProfile,
  });

  if (changedFiles.length === 0) {
    if (parsed.reportPath) {
      var emptyReport = writeLaneReport(parsed.reportPath, out);
      console.log('[no-gameplay-delta] report: ' + emptyReport);
    }
    if (parsed.sharedAuditPath) {
      var emptyAudit = writeSharedWindowAudit(parsed.sharedAuditPath, out);
      console.log('[no-gameplay-delta] shared window audit: ' + emptyAudit);
    }
    console.log('[no-gameplay-delta] No changed files supplied. Pass by default.');
    return;
  }

  console.log('[no-gameplay-delta] Checked ' + changedFiles.length + ' file(s).');
  if (out.strictLane) {
    console.log('[no-gameplay-delta] strict lane: ' + (out.laneName || '<unnamed>'));
  }
  if (out.sharedWindowProfile) {
    console.log('[no-gameplay-delta] shared window profile: ' + out.sharedWindowProfile + (out.sharedWindowProfileFound ? '' : ' (missing)'));
  }
  if (out.sharedWindowProfile && !out.sharedWindowProfileFound) {
    console.error('[no-gameplay-delta] shared window profile not found: ' + out.sharedWindowProfile);
  }
  if (out.sharedWindow) {
    console.log('[no-gameplay-delta] shared-file conflict window: enabled');
  }

  if (out.unknown.length > 0) {
    console.log('[no-gameplay-delta] Unknown paths (not explicitly safe):');
    out.unknown.forEach(function (f) { console.log(' - ' + f); });
  }

  if (out.strictUnknown.length > 0) {
    console.error('[no-gameplay-delta] Strict-lane unknown paths are not allowed:');
    out.strictUnknown.forEach(function (f) { console.error(' - ' + f); });
  }
  if (out.sharedWindowViolations.length > 0) {
    console.error('[no-gameplay-delta] Shared files changed outside conflict window:');
    out.sharedWindowViolations.forEach(function (f) { console.error(' - ' + f); });
  }

  if (out.forbidden.length > 0) {
    console.error('[no-gameplay-delta] Forbidden gameplay paths detected:');
    out.forbidden.forEach(function (f) { console.error(' - ' + f); });
  }

  if (!out.ok) {
    if (parsed.reportPath) {
      var failedReport = writeLaneReport(parsed.reportPath, out);
      console.error('[no-gameplay-delta] report: ' + failedReport);
    }
    if (parsed.sharedAuditPath) {
      var failedAudit = writeSharedWindowAudit(parsed.sharedAuditPath, out);
      console.error('[no-gameplay-delta] shared window audit: ' + failedAudit);
    }
    process.exit(1);
  }

  if (parsed.reportPath) {
    var okReport = writeLaneReport(parsed.reportPath, out);
    console.log('[no-gameplay-delta] report: ' + okReport);
  }
  if (parsed.sharedAuditPath) {
    var okAudit = writeSharedWindowAudit(parsed.sharedAuditPath, out);
    console.log('[no-gameplay-delta] shared window audit: ' + okAudit);
  }
  console.log('[no-gameplay-delta] OK. No gameplay system/data deltas detected.');
}

var isDirectRun = import.meta.url === new URL(process.argv[1], 'file:').href;
if (isDirectRun) {
  main();
}
