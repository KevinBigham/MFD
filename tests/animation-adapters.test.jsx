import { describe, expect, it } from 'vitest';
import { AnimatedPresence, AnimatedPanel } from '../src/components/AnimatedPresence.jsx';
import { AnimatedList } from '../src/components/AnimatedList.jsx';

describe('AnimatedPresence adapter', () => {
  it('exports AnimatedPresence function', () => {
    expect(typeof AnimatedPresence).toBe('function');
  });

  it('exports AnimatedPanel function', () => {
    expect(typeof AnimatedPanel).toBe('function');
  });

  it('AnimatedPresence renders without crashing', () => {
    var el = AnimatedPresence({ children: null });
    expect(el).toBeTruthy();
  });

  it('AnimatedPanel renders with key', () => {
    var el = AnimatedPanel({ panelKey: 'test', children: 'content' });
    expect(el).toBeTruthy();
  });
});

describe('AnimatedList adapter', () => {
  it('exports AnimatedList function', () => {
    expect(typeof AnimatedList).toBe('function');
  });

  it('returns null for empty children', () => {
    var el = AnimatedList({ children: null });
    expect(el).toBeNull();
  });
});
