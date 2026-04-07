import { describe, expect, it } from 'vitest';
import { Indicator } from '../src/components/Indicator.jsx';

describe('Indicator', () => {
  it('exports a function component', () => {
    expect(typeof Indicator).toBe('function');
  });

  it('returns just children when count is 0', () => {
    var result = Indicator({ count: 0, children: 'tab' });
    expect(result).toBe('tab');
  });
});
