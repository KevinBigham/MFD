import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('main.jsx launcher entrypoint', () => {
  var src = fs.readFileSync(path.resolve(process.cwd(), 'src/main.jsx'), 'utf8');
  var statusSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/app/status-screen.jsx'), 'utf8');
  var copySrc = fs.readFileSync(path.resolve(process.cwd(), 'src/app/launcher-copy.js'), 'utf8');

  it('mounts launcher shell as app root', () => {
    expect(src).toContain("import LauncherShell from './app/launcher-shell.jsx'");
    expect(src).toContain('<LauncherShell basePath=');
    expect(src).not.toContain('v101 Module System');
  });

  it('keeps runtime summary labels stable via status-screen', () => {
    expect(statusSrc).toContain('STATUS_COPY.runtimeTitle');
    expect(statusSrc).toContain('STATUS_COPY.systemsTitle');
    expect(statusSrc).toContain('STATUS_COPY.summaryTitle');
    expect(copySrc).toContain("runtimeTitle: 'Runtime Validation'");
    expect(copySrc).toContain("systemsTitle: 'Extracted Module Status'");
    expect(copySrc).toContain("summaryTitle: 'Phase 1 Summary'");
    expect(copySrc).toContain("filesLabel: 'Files extracted:'");
    expect(copySrc).toContain("narrativeLabel: 'Narrative/Data:'");
  });
});
