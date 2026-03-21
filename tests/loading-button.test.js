import { describe, expect, it } from 'vitest';
import { LoadingButton } from '../src/components/LoadingButton.jsx';

describe('LoadingButton', () => {
  it('exports a function component', () => {
    expect(typeof LoadingButton).toBe('function');
  });
});
