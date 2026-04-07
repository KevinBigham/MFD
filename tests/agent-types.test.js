import { describe, expect, it } from 'vitest';

import { AGENT_TYPES, assignAgentType, getAgentTypeObj } from '../src/systems/agent-types.js';

describe('agent-types.js', () => {
  it('defines unique agent type ids', () => {
    const ids = AGENT_TYPES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('assignAgentType honors existing player agent type', () => {
    const player = { age: 30, agentType: 'hometown' };
    expect(assignAgentType(player, () => 0)).toBe('hometown');
  });

  it('assignAgentType routes buckets by age and rng threshold', () => {
    expect(assignAgentType({ age: 32 }, () => 0.2)).toBe('ring_chaser');
    expect(assignAgentType({ age: 29 }, () => 0.3)).toBe('loyal');
    expect(assignAgentType({ age: 24 }, () => 0.4)).toBe('spotlight');
  });

  it('getAgentTypeObj returns fallback for unknown ids', () => {
    expect(getAgentTypeObj('ring_chaser').id).toBe('ring_chaser');
    expect(getAgentTypeObj('nope').id).toBe(AGENT_TYPES[0].id);
  });
});
