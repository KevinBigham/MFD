import { describe, expect, it } from 'vitest';
import { buildEnvelope, resetSeq } from '../src/systems/events/envelope.js';

describe('envelope (parity)', () => {
  it('buildEnvelope is a function', () => {
    expect(typeof buildEnvelope).toBe('function');
  });
  it('resetSeq is a function', () => {
    expect(typeof resetSeq).toBe('function');
  });
});
