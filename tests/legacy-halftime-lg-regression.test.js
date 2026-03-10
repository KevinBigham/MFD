import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Regression test for the Sim Week halftime crash.
 *
 * Root cause: the halftime panel IIFE referenced a bare `lg` identifier
 * that did not exist in scope, causing ReferenceError at runtime.
 * The correct identifier is `liveGame986`.
 *
 * This test scans the legacy game.js source to ensure no bare `lg`
 * references remain in the halftime panel section.
 */

describe('legacy game.js — halftime lg regression', () => {
  const srcPath = resolve('mr-football-dynasty/game.js');
  const publicPath = resolve('public/legacy/game.js');
  const srcContent = readFileSync(srcPath, 'utf8');
  const publicContent = readFileSync(publicPath, 'utf8');

  function findDangerousBareRefs(content) {
    const lines = content.split('\n');
    const hits = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match bare `lg.` or `lg &&` — runtime property access on undefined lg
      // These are the crash-causing patterns (not object key definitions like { lg: 16 })
      if (/\blg\s*\.\s*\w/.test(line) || /\blg\s*&&/.test(line)) {
        // Exclude lines that define lg first (var lg = ...)
        if (/\bvar\s+lg\b/.test(line) || /\blet\s+lg\b/.test(line) || /\bconst\s+lg\b/.test(line)) continue;
        // Exclude lg2 references
        if (/\blg2\b/.test(line) && !/\blg\b(?!2)/.test(line.replace(/\blg2\b/g, ''))) continue;
        // Exclude comments
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
        hits.push({ lineNum: i + 1, line: line.trim().substring(0, 120) });
      }
    }
    return hits;
  }

  it('source game.js has no dangerous bare lg property access', () => {
    const hits = findDangerousBareRefs(srcContent);
    expect(hits).toEqual([]);
  });

  it('public game.js has no dangerous bare lg property access', () => {
    const hits = findDangerousBareRefs(publicContent);
    expect(hits).toEqual([]);
  });

  it('source and public game.js are identical', () => {
    expect(srcContent).toBe(publicContent);
  });

  it('halftime panel references liveGame986 not bare lg', () => {
    // Find the halftime panel section
    const halftimeIdx = srcContent.indexOf('HALF-TIME ADJUSTMENTS');
    expect(halftimeIdx).toBeGreaterThan(-1);

    // Extract ~500 chars after the halftime marker
    const section = srcContent.substring(halftimeIdx, halftimeIdx + 800);

    // Should contain liveGame986 references
    expect(section).toContain('liveGame986');

    // Should NOT contain bare lg references
    const bareMatches = section.match(/\blg\b(?![\w])/g);
    expect(bareMatches).toBeNull();
  });
});
