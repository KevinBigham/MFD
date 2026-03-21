import { describe, expect, it } from 'vitest';
import { Stepper } from '../src/components/Stepper.jsx';

describe('Stepper', () => {
  it('exports a function component', () => {
    expect(typeof Stepper).toBe('function');
  });
});
