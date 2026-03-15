import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import TopNav, {
  getModeTabs,
  handleTabKeyDown,
  resolveNextTabMode,
} from '../src/app/top-nav.jsx';

describe('top-nav', () => {
  it('renders accessible tablist semantics and runtime badge', () => {
    var html = renderToStaticMarkup(React.createElement(TopNav, {
      mode: 'play',
      forcedMode: 'status',
      runtimeVersion: 'v100',
      onChangeMode: function noop() {},
    }));
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Legacy runtime:');
    expect(html).toContain('Forced mode:');
    expect(html).not.toContain('v101 Module System');
  });

  it('resolves keyboard tab navigation order', () => {
    expect(resolveNextTabMode('play', 'ArrowRight')).toBe('status');
    expect(resolveNextTabMode('status', 'ArrowRight')).toBe('play');
    expect(resolveNextTabMode('status', 'ArrowLeft')).toBe('play');
    expect(resolveNextTabMode('status', 'Home')).toBe('play');
    expect(resolveNextTabMode('play', 'End')).toBe('status');
  });

  it('invokes onChangeMode for keyboard arrows/home/end', () => {
    var fn = vi.fn();
    var preventDefault = vi.fn();
    handleTabKeyDown({ key: 'ArrowRight', preventDefault: preventDefault }, { mode: 'play', onChangeMode: fn });
    expect(fn).toHaveBeenCalledWith('status');
    expect(preventDefault).toHaveBeenCalled();
  });

  it('exports deterministic tab definition', () => {
    var tabs = getModeTabs();
    expect(tabs.map(function (tab) { return tab.id; })).toEqual(['play', 'status']);
    expect(tabs.every(function (tab) { return typeof tab.label === 'string' && tab.label.length > 0; })).toBe(true);
  });
});
