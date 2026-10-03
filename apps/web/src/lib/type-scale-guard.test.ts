import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Font sizes of 14px or smaller must go through the --mfd-fs-N text-size tokens so the
 * player's Text Size setting applies. This fails if a literal small size creeps back in.
 */
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const roots = ['apps/web/src', 'packages/design-system'];
const skipPart = /node_modules|\/dist\/|\.test\.|\.stories\.|tokens\/index\.css/;
// Decorative SVG text with a fixed viewBox, and print-only CSS, are intentionally literal.
const allowed = [/ChampionshipParade\.tsx$/, /paradeFloatSvg\.tsx$/, /FranchiseBook\.tsx$/];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (skipPart.test(full)) continue;
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(css|tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

function pxOf(value: string): number | null {
  const match = value.trim().match(/^['"]?(\d+(?:\.\d+)?)(px|rem)['"]?$/);
  if (!match) return null;
  return Number(match[1]) * (match[2] === 'rem' ? 16 : 1);
}

describe('type scale guard', () => {
  it('has no literal font size of 14px or smaller outside the token scale', () => {
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of sourceFiles(join(repoRoot, root))) {
        if (allowed.some((pattern) => pattern.test(file))) continue;
        const lines = readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, index) => {
          const css = line.match(/font-size:\s*([^;}\n]+?)\s*(?:!important)?\s*(?:;|$)/);
          const inline = line.match(/fontSize:\s*([^,}\n]+?)\s*(?:,|\}|$)/);
          const fallback = line.match(/fontSize\s*\?\?\s*([^,}\n]+?)\s*(?:,|\}|$)/);
          for (const match of [css, inline, fallback]) {
            const px = match ? pxOf(match[1]!) : null;
            if (px !== null && px <= 14) offenders.push(`${relative(repoRoot, file)}:${index + 1} ${match![1]}`);
          }
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
