import { describe, expect, it } from 'vitest';

import { DEFAULT_CONSUMER_PACKET } from '../src/app/default-consumer-packet.js';

describe('default-consumer-packet', () => {
  it('exposes fixture-safe packet shape for launcher fallback', () => {
    expect(DEFAULT_CONSUMER_PACKET.schemaVersion).toBe('0.1.0');
    expect(DEFAULT_CONSUMER_PACKET.envelope.eventName).toBe('game_start');
    expect(DEFAULT_CONSUMER_PACKET.weeklyHook).toBeTruthy();
    expect(DEFAULT_CONSUMER_PACKET.postgameAutopsy).toBeTruthy();
  });
});
