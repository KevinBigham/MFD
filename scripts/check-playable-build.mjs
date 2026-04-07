import fs from 'node:fs';
import path from 'node:path';

import { getLegacyRequiredFiles, LEGACY_MANIFEST } from '../src/app/legacy-manifest.js';

export function extractHtmlRefs(html) {
  var source = String(html || '');
  var refs = [];
  var re = /<(script|link)\b[^>]*>/gi;
  var match = null;
  while ((match = re.exec(source)) !== null) {
    var tag = match[0];
    var srcMatch = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag);
    var hrefMatch = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (srcMatch && srcMatch[1]) refs.push(srcMatch[1]);
    if (hrefMatch && hrefMatch[1]) refs.push(hrefMatch[1]);
  }
  return refs;
}

export function normalizeRef(ref) {
  return String(ref || '').trim();
}

export function stripLocalRefSuffix(ref) {
  return normalizeRef(ref).replace(/[?#].*$/, '');
}

export function isExternalRef(ref) {
  var value = normalizeRef(ref);
  if (!value) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return true;
  if (value.indexOf('//') === 0) return true;
  return false;
}

export function findForbiddenLegacyRefs(refs) {
  return (refs || []).filter(function (ref) {
    return !!ref && isExternalRef(ref);
  });
}

function resolveRefPath(distDir, htmlRelativePath, ref) {
  var cleanRef = stripLocalRefSuffix(ref);
  if (cleanRef.charAt(0) === '/') {
    return path.resolve(distDir, cleanRef.replace(/^\//, ''));
  }
  return path.resolve(distDir, path.dirname(htmlRelativePath), cleanRef);
}

export function verifyLegacyRefs(distDir, refs, htmlRelativePath) {
  var badRefs = [];
  (refs || []).forEach(function (ref) {
    if (!ref || isExternalRef(ref) || ref.charAt(0) === '#') return;
    var resolved = resolveRefPath(distDir, htmlRelativePath || 'legacy/index.html', ref);
    if (!fs.existsSync(resolved)) {
      badRefs.push(ref);
    }
  });
  return badRefs;
}

export function verifyPlayableBuild(distDir) {
  var dist = path.resolve(distDir || path.resolve(process.cwd(), 'dist'));
  var required = getLegacyRequiredFiles(LEGACY_MANIFEST);
  var missingFiles = required.filter(function (rel) {
    return !fs.existsSync(path.resolve(dist, rel));
  });

  var badRefs = [];
  var forbiddenRefs = [];
  var legacyEntry = path.resolve(dist, LEGACY_MANIFEST.entry);
  if (fs.existsSync(legacyEntry)) {
    var legacyHtml = fs.readFileSync(legacyEntry, 'utf8');
    var refs = extractHtmlRefs(legacyHtml);
    forbiddenRefs = findForbiddenLegacyRefs(refs);
    badRefs = verifyLegacyRefs(dist, refs, LEGACY_MANIFEST.entry);
  }

  return {
    ok: missingFiles.length === 0 && badRefs.length === 0 && forbiddenRefs.length === 0,
    missingFiles: missingFiles,
    badRefs: badRefs,
    forbiddenRefs: forbiddenRefs,
    distDir: dist,
  };
}

function writeReport(reportPath, payload) {
  var abs = path.resolve(process.cwd(), reportPath || 'dist/playable-build-report.json');
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(payload, null, 2) + '\n');
  return abs;
}

export function runPlayableBuildCheck(distDir, reportPath) {
  var result = verifyPlayableBuild(distDir || path.resolve(process.cwd(), 'dist'));
  var out = {
    generatedAt: new Date().toISOString(),
    ok: result.ok,
    missingFiles: result.missingFiles,
    badRefs: result.badRefs,
    forbiddenRefs: result.forbiddenRefs,
    distDir: result.distDir,
  };
  var report = writeReport(reportPath || 'dist/playable-build-report.json', out);
  return { result: out, report: report };
}

function parseCliArgs(args) {
  var out = { distDir: '', reportPath: 'dist/playable-build-report.json' };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--dist' && args[i + 1]) out.distDir = args[i + 1];
    if (args[i] === '--report' && args[i + 1]) out.reportPath = args[i + 1];
  }
  return out;
}

function main() {
  var args = parseCliArgs(process.argv.slice(2));
  var out = runPlayableBuildCheck(args.distDir || path.resolve(process.cwd(), 'dist'), args.reportPath);
  console.log('[playable-build] report: ' + out.report);
  if (!out.result.ok) {
    if (out.result.missingFiles.length > 0) {
      console.error('[playable-build] missing files:');
      out.result.missingFiles.forEach(function (f) { console.error(' - ' + f); });
    }
    if (out.result.badRefs.length > 0) {
      console.error('[playable-build] broken references:');
      out.result.badRefs.forEach(function (f) { console.error(' - ' + f); });
    }
    if (out.result.forbiddenRefs.length > 0) {
      console.error('[playable-build] forbidden external references:');
      out.result.forbiddenRefs.forEach(function (f) { console.error(' - ' + f); });
    }
    process.exit(1);
  }
  console.log('[playable-build] OK');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main();
}
