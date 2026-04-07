import { describe, expect, it } from 'vitest';
import { LucideIcon } from '../src/components/LucideIcon.jsx';

describe('LucideIcon adapter', () => {
  it('exports LucideIcon function', () => {
    expect(typeof LucideIcon).toBe('function');
  });

  it('renders without crashing with valid icon name', () => {
    var el = LucideIcon({ name: 'trophy', size: 16, color: '#f0a028' });
    expect(el).toBeTruthy();
    expect(el.props.size).toBe(16);
    expect(el.props.color).toBe('#f0a028');
  });

  it('renders fallback circle for unknown icon name', () => {
    var el = LucideIcon({ name: 'nonexistent-icon-xyz' });
    expect(el).toBeTruthy();
    expect(el.type).toBe('svg');
    expect(el.props.width).toBe(14);
  });

  it('uses defaults when no props provided', () => {
    var el = LucideIcon({});
    expect(el).toBeTruthy();
  });

  it('uses default name when name is missing', () => {
    var el = LucideIcon(null);
    expect(el).toBeTruthy();
  });

  it('passes through style prop', () => {
    var el = LucideIcon({ name: 'trophy', style: { marginLeft: 4 } });
    expect(el).toBeTruthy();
    expect(el.props.style.marginLeft).toBe(4);
  });

  it('sets aria-hidden for accessibility', () => {
    var el = LucideIcon({ name: 'trophy' });
    expect(el.props['aria-hidden']).toBe('true');
  });

  it('known Lucide icons resolve to components', () => {
    var knownIcons = ['trophy', 'flame', 'search', 'target', 'shield', 'brain', 'zap', 'star', 'check-circle', 'alert-triangle', 'bar-chart-3', 'clipboard-list', 'play', 'refresh-cw', 'fast-forward', 'dumbbell', 'swords', 'info'];
    knownIcons.forEach(function (name) {
      var el = LucideIcon({ name: name });
      expect(el).toBeTruthy();
      // Known icons should NOT be fallback svg elements
      expect(el.type).not.toBe('svg');
    });
  });
});
