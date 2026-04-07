import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Math.random audit', () => {
  it('monolith contains no Math.random() outside comments', () => {
    var src = readFileSync(resolve(__dirname, '../mr-football-v100.jsx'), 'utf8');
    var lines = src.split('\n');
    var violations = [];
    lines.forEach(function (line, i) {
      var trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (line.indexOf('Math.random') >= 0) {
        violations.push('Line ' + (i + 1) + ': ' + trimmed.slice(0, 120));
      }
    });
    expect(violations).toEqual([]);
  });

  it('src/ contains no Math.random() outside comments', () => {
    var { execSync } = require('child_process');
    var result = execSync(
      'grep -rn "Math\\.random" --include="*.js" --include="*.jsx" ' + resolve(__dirname, '../src/'),
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString().trim();
    // Filter out comment-only lines
    var violations = result.split('\n').filter(function (line) {
      if (!line) return false;
      var content = line.split(':').slice(2).join(':').trim();
      return !content.startsWith('//') && !content.startsWith('*');
    });
    expect(violations).toEqual([]);
  });
});
