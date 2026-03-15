import fs from 'node:fs';
import path from 'node:path';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import StatusScreen from '../src/app/status-screen.jsx';

describe('status-screen regression', () => {
  it('preserves status dashboard wording in source', () => {
    var src = fs.readFileSync(path.resolve(process.cwd(), 'src/app/status-screen.jsx'), 'utf8');
    var copy = fs.readFileSync(path.resolve(process.cwd(), 'src/app/launcher-copy.js'), 'utf8');
    expect(src).toContain('STATUS_COPY.loadingTitle');
    expect(src).toContain('STATUS_COPY.errorTitle');
    expect(src).toContain('STATUS_COPY.retryLabel');
    expect(src).toContain('STATUS_COPY.runtimeTitle');
    expect(src).toContain('STATUS_COPY.systemsTitle');
    expect(src).toContain('STATUS_COPY.summaryTitle');
    expect(copy).toContain("loadingTitle: 'Loading Module Validation'");
    expect(copy).toContain("errorTitle: 'Module Validation Error'");
    expect(copy).toContain("retryLabel: 'Retry Validation'");
  });

  it('renders loading state by default for async runtime import flow', () => {
    var html = renderToStaticMarkup(React.createElement(StatusScreen));
    expect(html).toContain('Loading Module Validation');
    expect(html).toContain('Running extracted module checks...');
    expect(html).not.toContain('v101 Module System');
  });
});
