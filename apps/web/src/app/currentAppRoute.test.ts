import { describe, expect, it } from 'vitest';
import { resolveCurrentAppRoute } from './currentAppRoute';

describe('resolveCurrentAppRoute', () => {
  it('prefers the hash route used by createHashHistory', () => {
    expect(resolveCurrentAppRoute({ hash: '#/league/weather', pathname: '/MFD/' }, '/MFD/')).toBe('/league/weather');
  });

  it('normalizes the deploy base to the home route when no hash is present', () => {
    expect(resolveCurrentAppRoute({ hash: '', pathname: '/MFD/' }, '/MFD/')).toBe('/');
    expect(resolveCurrentAppRoute({ hash: '', pathname: '/MFD' }, '/MFD/')).toBe('/');
  });

  it('strips the deploy base from browser-history-style paths', () => {
    expect(resolveCurrentAppRoute({ hash: '', pathname: '/MFD/roster' }, '/MFD/')).toBe('/roster');
  });

  it('keeps browser-history-style paths when they are outside the deploy base', () => {
    expect(resolveCurrentAppRoute({ hash: '', pathname: '/roster' }, '/MFD/')).toBe('/roster');
  });

  it('falls back to home route without a browser location', () => {
    expect(resolveCurrentAppRoute(null, '/MFD/')).toBe('/');
  });
});
