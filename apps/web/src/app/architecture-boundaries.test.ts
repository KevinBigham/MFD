import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const skippedDirectories = new Set(['node_modules', 'dist', 'build', 'coverage', '.turbo']);
const allowedEnginePackageImports = new Set([
  '@mfd/engine',
  '@mfd/engine/rng',
  '@mfd/engine/types',
  '@mfd/engine/events',
  '@mfd/engine/config',
  '@mfd/engine/save',
]);
const browserRuntimeRoots = [
  'apps/web/src',
  'packages/design-system',
];
const engineBrowserApiAllowlist = new Set<string>();

const importPatterns = [
  /\b(?:import|export)\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\b(?:vi|jest)\.(?:mock|doMock|importActual)\s*\(\s*['"]([^'"]+)['"]/g,
];

const browserApiPatterns = [
  {
    label: 'window browser API',
    pattern:
      /\b(?:typeof\s+window|window\s*\.\s*(?:localStorage|sessionStorage|location|history|addEventListener|removeEventListener|setTimeout|clearTimeout|setInterval|clearInterval|requestAnimationFrame|cancelAnimationFrame|matchMedia|dispatchEvent|print|confirm|speechSynthesis|open|URL|innerWidth|innerHeight))\b/g,
  },
  { label: 'document browser API', pattern: /\b(?:typeof\s+document|document\s*\.)/g },
  { label: 'navigator browser API', pattern: /\b(?:typeof\s+navigator|navigator\s*\.)/g },
  { label: 'localStorage browser API', pattern: /\blocalStorage\b/g },
  { label: 'IndexedDB browser API', pattern: /\bindexedDB\b/g },
  { label: 'clipboard browser API', pattern: /\bclipboard\b/g },
  { label: 'audio browser API', pattern: /\b(?:new\s+Audio\s*\(|AudioContext\b|webkitAudioContext\b)/g },
  { label: 'download browser API', pattern: /\bdownload\s*=/g },
];
const derivedRivalrySidecarSymbols = [
  'deriveRivalries',
  'loadRivalries',
  'parseRivalryPayload',
  'replaceRivalries',
  'saveRivalries',
  'clearRivalries',
  'RivalryPayload',
] as const;
const derivedRivalrySidecarRuntimeAllowlist = new Set([
  'apps/web/src/app/rivalry-rollover.ts',
  'apps/web/src/lib/dynasty-sidecar-archive.ts',
  'apps/web/src/lib/rivalry-storage.ts',
]);
const directWeekSimulationSymbols = [
  'advanceFranchiseWeek',
  'previewHalftimeDecision',
] as const;
const capRuleAwareHelpers = [
  'getSalaryCap',
  'getCapFloor',
] as const;
const chipShareScaffoldSymbols = [
  'CHIP_SHARE_FLAG',
  'CHIP_SHARE_EVENT_TYPES',
  'createChipShareService',
  'generateChipShareEvent',
  'isMfdShareEnabled',
] as const;
const engineEventEnvelopeSymbols = [
  'EVENT_NAMES',
  'EVENT_NAME_LIST',
  'SCHEMA_VERSION',
  'buildEnvelope',
  'resetSeq',
  'createEventLog',
  'EventEnvelope',
  'LiveGameState',
] as const;

function repoPath(filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function listSourceFiles(root: string): string[] {
  if (!existsSync(root)) return [];

  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return skippedDirectories.has(entry.name) ? [] : listSourceFiles(entryPath);
    }

    if (!entry.isFile() || !sourceExtensions.has(path.extname(entry.name))) return [];
    return [entryPath];
  });
}

function isTestFile(filePath: string): boolean {
  return /\.(?:test|spec)\.[jt]sx?$/.test(filePath);
}

function extractImportSpecifiers(source: string): string[] {
  return importPatterns.flatMap((pattern) => {
    pattern.lastIndex = 0;
    return Array.from(source.matchAll(pattern), (match) => match[1]).filter((specifier): specifier is string => Boolean(specifier));
  });
}

function pointsAtPrivateEngineSource(specifier: string): boolean {
  return specifier === '@mfd/engine/src'
    || specifier.startsWith('@mfd/engine/src/')
    || /(?:^|\/)packages\/engine\/src(?:\/|$)/.test(specifier)
    || /(?:^|\/)engine\/src(?:\/|$)/.test(specifier);
}

function blankPreservingNewlines(value: string): string {
  return value.replace(/[^\n\r]/g, ' ');
}

function stripCommentsAndStrings(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blankPreservingNewlines)
    .replace(/\/\/[^\n\r]*/g, blankPreservingNewlines)
    .replace(/(['"`])(?:\\[\s\S]|(?!\1)[\s\S])*\1/g, blankPreservingNewlines);
}

function lineNumberForIndex(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

describe('architecture boundaries', () => {
  it('keeps browser runtime code on exported engine package surfaces', () => {
    const violations = browserRuntimeRoots.flatMap((root) => {
      return listSourceFiles(path.join(repoRoot, root)).flatMap((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        return extractImportSpecifiers(source)
          .filter((specifier) => {
            if (specifier.startsWith('@mfd/engine')) {
              return !allowedEnginePackageImports.has(specifier);
            }

            return pointsAtPrivateEngineSource(specifier);
          })
          .map((specifier) => `${repoPath(filePath)} imports ${specifier}`);
      });
    });

    expect(violations).toEqual([]);
  });

  it('keeps browser APIs out of production engine modules', () => {
    const violations = listSourceFiles(path.join(repoRoot, 'packages/engine/src'))
      .filter((filePath) => !isTestFile(filePath))
      .flatMap((filePath) => {
        const relativePath = repoPath(filePath);
        if (engineBrowserApiAllowlist.has(relativePath)) return [];

        const source = stripCommentsAndStrings(readFileSync(filePath, 'utf8'));
        return browserApiPatterns.flatMap(({ label, pattern }) => {
          pattern.lastIndex = 0;
          return Array.from(source.matchAll(pattern), (match) => {
            return `${relativePath}:${lineNumberForIndex(source, match.index ?? 0)} uses ${label}`;
          });
        });
      });

    expect(violations).toEqual([]);
  });

  it('keeps the derived rivalry sidecar out of production app runtime wiring except the web storage helper', () => {
    const runtimeRoots = [
      'apps/web/src',
      'packages/engine/src',
    ];
    const violations = runtimeRoots.flatMap((root) => {
      return listSourceFiles(path.join(repoRoot, root))
        .filter((filePath) => !isTestFile(filePath))
        .flatMap((filePath) => {
          const relativePath = repoPath(filePath);
          if (relativePath === 'packages/engine/src/index.ts') return [];
          if (relativePath.startsWith('packages/engine/src/rivalries/')) return [];
          if (derivedRivalrySidecarRuntimeAllowlist.has(relativePath)) return [];

          const source = stripCommentsAndStrings(readFileSync(filePath, 'utf8'));
          return derivedRivalrySidecarSymbols
            .filter((symbol) => new RegExp(`\\b${symbol}\\b`).test(source))
            .map((symbol) => `${relativePath} references derived rivalry sidecar symbol ${symbol}`);
        });
    });

    expect(violations).toEqual([]);
  });

  it('keeps direct week simulation engine calls behind the web store sim boundary modules', () => {
    const violations = listSourceFiles(path.join(repoRoot, 'apps/web/src'))
      .filter((filePath) => !isTestFile(filePath))
      .flatMap((filePath) => {
        const relativePath = repoPath(filePath);
        if (
          relativePath === 'apps/web/src/app/store/sim.ts'
          || relativePath === 'apps/web/src/app/store/sim.worker.ts'
        ) return [];

        const source = stripCommentsAndStrings(readFileSync(filePath, 'utf8'));
        return directWeekSimulationSymbols
          .filter((symbol) => new RegExp(`\\b${symbol}\\b`).test(source))
          .map((symbol) => `${relativePath} references direct week simulation engine symbol ${symbol}`);
      });

    expect(violations).toEqual([]);
  });

  it('keeps salary cap read models on active league-rule context', () => {
    const runtimeRoots = [
      'apps/web/src',
      'packages/engine/src/systems',
    ];
    const defaultCapAllowlist = new Set([
      'apps/web/src/app/store/seed.ts',
    ]);
    const singleArgumentCapCall = new RegExp(`\\b(${capRuleAwareHelpers.join('|')})\\s*\\(\\s*([^,\\n)]+?)\\s*\\)`, 'g');

    const violations = runtimeRoots.flatMap((root) => {
      return listSourceFiles(path.join(repoRoot, root))
        .filter((filePath) => !isTestFile(filePath))
        .flatMap((filePath) => {
          const relativePath = repoPath(filePath);
          if (defaultCapAllowlist.has(relativePath)) return [];

          const source = stripCommentsAndStrings(readFileSync(filePath, 'utf8'));
          singleArgumentCapCall.lastIndex = 0;
          return Array.from(source.matchAll(singleArgumentCapCall), (match) => {
            const helper = match[1] ?? 'cap helper';
            return `${relativePath}:${lineNumberForIndex(source, match.index ?? 0)} calls ${helper} without GameState context`;
          });
        });
    });

    expect(violations).toEqual([]);
  });

  it('keeps the Chip share scaffold out of production UI until deliberately wired', () => {
    const violations = listSourceFiles(path.join(repoRoot, 'apps/web/src'))
      .filter((filePath) => !isTestFile(filePath))
      .flatMap((filePath) => {
        const relativePath = repoPath(filePath);
        if (relativePath === 'apps/web/src/features/companion/chipShare.ts') return [];

        const source = stripCommentsAndStrings(readFileSync(filePath, 'utf8'));
        return chipShareScaffoldSymbols
          .filter((symbol) => new RegExp(`\\b${symbol}\\b`).test(source))
          .map((symbol) => `${relativePath} references Chip share scaffold symbol ${symbol}`);
      });

    expect(violations).toEqual([]);
  });

  it('keeps companion events separate from engine live-game event envelopes', () => {
    const violations = listSourceFiles(path.join(repoRoot, 'apps/web/src/features/companion'))
      .filter((filePath) => !isTestFile(filePath))
      .flatMap((filePath) => {
        const relativePath = repoPath(filePath);
        const rawSource = readFileSync(filePath, 'utf8');
        const importViolations = extractImportSpecifiers(rawSource)
          .filter((specifier) => specifier === '@mfd/engine/events')
          .map((specifier) => `${relativePath} imports ${specifier}`);

        const source = stripCommentsAndStrings(rawSource);
        const symbolViolations = engineEventEnvelopeSymbols
          .filter((symbol) => new RegExp(`\\b${symbol}\\b`).test(source))
          .map((symbol) => `${relativePath} references engine event envelope symbol ${symbol}`);

        return [...importViolations, ...symbolViolations];
      });

    expect(violations).toEqual([]);
  });
});
