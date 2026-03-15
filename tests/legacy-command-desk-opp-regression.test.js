import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('legacy game.js - command desk opp regression', () => {
  var srcPath = resolve('mr-football-dynasty/game.js');
  var publicPath = resolve('public/legacy/game.js');
  var srcContent = readFileSync(srcPath, 'utf8');
  var publicContent = readFileSync(publicPath, 'utf8');

  function getCommandDeskWindow(content) {
    var idx = content.indexOf('// Command Desk: Pre-Game Intelligence Report');
    expect(idx).toBeGreaterThan(-1);
    return content.substring(Math.max(0, idx - 420), idx + 420);
  }

  it('does not guard the command desk block with an out-of-scope opp reference', () => {
    expect(srcContent).not.toContain('season2.phase === "regular" && my && opp && (function() {');
    expect(publicContent).not.toContain('season2.phase === "regular" && my && opp && (function() {');
  });

  it('recomputes the next opponent inside the command desk block', () => {
    var srcWindow = getCommandDeskWindow(srcContent);

    expect(srcWindow).toContain('var nextGame = sched.find(function(g) {');
    expect(srcWindow).toContain('var opp = teams.find(function(t2) {');
    expect(srcWindow).toContain('if (!opp) return null;');
  });

  it('keeps source and public legacy game assets identical', () => {
    expect(srcContent).toBe(publicContent);
  });
});
