import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export var DEFAULT_TOKENS_PATH = 'scripts/perf/forbidden-preload-tokens.json';
export var FORBIDDEN_PRELOAD_TOKENS = ['game-systems', 'data-packs'];

export function parseCommaList(raw) {
  return String(raw || '').split(',').map(function (t) {
    return t.trim();
  }).filter(Boolean);
}

export function loadForbiddenTokens(opts) {
  var options = opts || {};
  if (options.tokensList && options.tokensList.length > 0) {
    return parseCommaList(options.tokensList);
  }

  var tokenFile = options.tokensPath || DEFAULT_TOKENS_PATH;
  var abs = path.resolve(options.cwd || process.cwd(), tokenFile);
  if (fs.existsSync(abs)) {
    var parsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
    if (Array.isArray(parsed.tokens) && parsed.tokens.length > 0) {
      return parsed.tokens.map(function (t) { return String(t); });
    }
  }

  return FORBIDDEN_PRELOAD_TOKENS.slice();
}

export function extractModulePreloadHrefs(html) {
  var linkTags = String(html || '').match(/<link\s+[^>]*>/gi) || [];
  return linkTags.map(function (tag) {
    var attrs = {};
    var attrMatches = Array.from(tag.matchAll(/([^\s=]+)\s*=\s*["']([^"']+)["']/g));
    attrMatches.forEach(function (m) {
      attrs[m[1].toLowerCase()] = m[2];
    });
    return attrs;
  }).filter(function (attrs) {
    return attrs.rel === 'modulepreload' && typeof attrs.href === 'string';
  }).map(function (attrs) {
    return attrs.href;
  });
}

export function findForbiddenPreloads(preloadLinks, forbiddenTokens) {
  var tokens = forbiddenTokens || FORBIDDEN_PRELOAD_TOKENS;
  return (preloadLinks || []).filter(function (href) {
    return tokens.some(function (token) {
      return href.includes(token);
    });
  });
}

export function verifyPreloadsFromHtml(html, forbiddenTokens) {
  var preloadLinks = extractModulePreloadHrefs(html);
  var violations = findForbiddenPreloads(preloadLinks, forbiddenTokens);
  return {
    preloadLinks: preloadLinks,
    violations: violations,
    modulePreloadsCount: preloadLinks.length,
  };
}

export function runPreloadCheck(cwd, opts) {
  var options = opts || {};
  var distIndexPath = path.resolve(cwd || process.cwd(), 'dist', 'index.html');
  if (!fs.existsSync(distIndexPath)) {
    throw new Error('dist/index.html not found. Run `npm run build` first.');
  }

  var html = fs.readFileSync(distIndexPath, 'utf8');
  var forbiddenTokens = loadForbiddenTokens({
    cwd: cwd || process.cwd(),
    tokensPath: options.tokensPath,
    tokensList: options.tokensList,
  });
  var out = verifyPreloadsFromHtml(html, forbiddenTokens);
  return {
    preloadLinks: out.preloadLinks,
    violations: out.violations,
    modulePreloadsCount: out.modulePreloadsCount,
    forbiddenTokens: forbiddenTokens,
  };
}

export function writePreloadReport(reportPath, payload) {
  var abs = path.resolve(process.cwd(), reportPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(payload, null, 2) + '\n');
  return abs;
}

function parseCliArgs(args) {
  var out = {
    tokensPath: DEFAULT_TOKENS_PATH,
    tokensList: '',
    reportPath: '',
  };
  for (var i = 0; i < args.length; i += 1) {
    if (args[i] === '--tokens' && args[i + 1]) out.tokensPath = args[i + 1];
    if (args[i] === '--tokens-list' && args[i + 1]) out.tokensList = args[i + 1];
    if (args[i] === '--report' && args[i + 1]) out.reportPath = args[i + 1];
  }
  return out;
}

var isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  try {
    var args = parseCliArgs(process.argv.slice(2));
    var out = runPreloadCheck(process.cwd(), {
      tokensPath: args.tokensPath,
      tokensList: args.tokensList,
    });
    if (args.reportPath) {
      var written = writePreloadReport(args.reportPath, {
        generatedAt: new Date().toISOString(),
        preloadLinks: out.preloadLinks,
        violations: out.violations,
        modulePreloadsCount: out.modulePreloadsCount,
        forbiddenTokens: out.forbiddenTokens,
      });
      console.log('[preload-check] report: ' + written);
    }
    if (out.violations.length > 0) {
      console.error('[preload-check] Found forbidden eager preloads:');
      out.violations.forEach(function (href) {
        console.error(' - ' + href);
      });
      process.exit(1);
    }
    console.log('[preload-check] OK. Checked ' + out.preloadLinks.length + ' modulepreload links.');
  } catch (err) {
    console.error('[preload-check] ' + (err && err.message ? err.message : String(err)));
    process.exit(1);
  }
}
