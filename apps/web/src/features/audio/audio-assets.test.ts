import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const appSourceRoot = path.join(repoRoot, 'apps/web/src');
const publicAudioRoot = path.join(repoRoot, 'apps/web/public/audio');
const sourceExtensions = new Set(['.ts', '.tsx']);
const skippedDirectories = new Set(['node_modules', 'dist', 'build', 'coverage']);
const assetLiteralPattern = /['"`](audio\/(?:cue|event)\/[a-z0-9/_-]+\.ogg)['"`]/g;

function repoPath(filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function listSourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return skippedDirectories.has(entry.name) ? [] : listSourceFiles(entryPath);
    }

    if (!entry.isFile() || !sourceExtensions.has(path.extname(entry.name))) return [];
    if (/\.(?:test|spec)\.[jt]sx?$/.test(entry.name)) return [];
    return [entryPath];
  });
}

function listPublicAudioAssets(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) return listPublicAudioAssets(entryPath);
    if (!entry.isFile() || path.extname(entry.name) !== '.ogg') return [];
    return [repoPath(entryPath).replace(/^apps\/web\/public\//, '')];
  });
}

function extractProductionAudioAssetReferences(): Map<string, string[]> {
  const references = new Map<string, string[]>();

  for (const filePath of listSourceFiles(appSourceRoot)) {
    const source = readFileSync(filePath, 'utf8');
    for (const match of source.matchAll(assetLiteralPattern)) {
      const assetPath = match[1]!;
      const files = references.get(assetPath) ?? [];
      files.push(repoPath(filePath));
      references.set(assetPath, files);
    }
  }

  return references;
}

describe('audio asset coverage', () => {
  it('keeps production audio asset literals backed by shipped public files', () => {
    const references = extractProductionAudioAssetReferences();
    const missingAssets = [...references.keys()].filter((assetPath) => {
      return !existsSync(path.join(repoRoot, 'apps/web/public', assetPath));
    });

    expect(missingAssets).toEqual([]);
  });

  it('keeps shipped cue and event OGG files intentionally referenced by runtime code', () => {
    const references = extractProductionAudioAssetReferences();
    const referencedAssets = new Set(references.keys());
    const publicAssets = listPublicAudioAssets(publicAudioRoot);

    expect(publicAssets.filter((assetPath) => !referencedAssets.has(assetPath))).toEqual([]);
  });
});
