import { describe, expect, it } from 'vitest';
import { Tooltip } from '../src/components/Tooltip.jsx';

describe('Tooltip', () => {
  it('exports a function component', () => {
    expect(typeof Tooltip).toBe('function');
  });

  it('returns children when no label is provided', () => {
    var result = Tooltip({ label: null, children: 'test' });
    expect(result).toBe('test');
  });

  it('returns children when label is empty string', () => {
    var result = Tooltip({ label: '', children: 'test' });
    expect(result).toBe('test');
  });
});
