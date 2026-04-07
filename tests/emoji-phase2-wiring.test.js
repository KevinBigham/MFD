import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('emoji phase 2 wiring', () => {
  function readMonolith() {
    var monolithPath = path.resolve(__dirname, '../mr-football-v100.jsx');
    return fs.readFileSync(monolithPath, 'utf8');
  }

  function readComponentsIndex() {
    var compPath = path.resolve(__dirname, '../src/components/index.js');
    return fs.readFileSync(compPath, 'utf8');
  }

  it('exports Icon component from shared components barrel', () => {
    var src = readComponentsIndex();
    expect(src.includes("export { Icon } from './Icon.jsx';")).toBe(true);
  });

  it('uses Icon component on title/onboarding labels and removes old emoji labels', () => {
    var src = readMonolith();

    expect(src.includes('React.createElement(Icon,{name:"play",size:16})')).toBe(true);
    expect(src.includes('React.createElement(Icon,{name:"folder",size:14})')).toBe(true);
    expect(src.includes('React.createElement(Icon,{name:"upload",size:14})')).toBe(true);
    expect(src.includes('React.createElement(Icon,{name:"music",size:13})')).toBe(true);
    expect(src.includes('React.createElement(Icon,{name:"book",size:13})')).toBe(true);
    expect(src.includes('React.createElement(Icon,{name:"list",size:13})')).toBe(true);
    expect(src.includes('React.createElement(Icon,{name:"skip",size:13})')).toBe(true);

    expect(src.includes('\u{1F3DF}\uFE0F PRESS START')).toBe(false);
    expect(src.includes('\u{1F4C2} Continue Dynasty')).toBe(false);
    expect(src.includes('\u{1F4C1} Import Save')).toBe(false);
    expect(src.includes('\u{1F3B5} Jukebox')).toBe(false);
    expect(src.includes('\u{1F4D6} Guide')).toBe(false);
    expect(src.includes('\u{1F4CB} Review Roster')).toBe(false);
    expect(src.includes('\u25B6 Sim Week 1')).toBe(false);
  });
});
