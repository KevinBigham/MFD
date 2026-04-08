import { describe, expect, it } from 'vitest';
import {
  createAudioCue,
  getEventPriority,
  mapGameResultToAudioCues,
  shouldPlaySound,
  type AudioCue,
  type AudioQueueConfig,
} from './audio-events';

function makeConfig(overrides: Partial<AudioQueueConfig> = {}): AudioQueueConfig {
  return {
    maxQueueSize: 20,
    debounceMs: 100,
    minimumPriority: 'low',
    ...overrides,
  };
}

describe('audio events', () => {
  it('creates a deterministic cue without timestamp by default', () => {
    const cue = createAudioCue('touchdown', 'high', { teamId: 'afce1' });

    expect(cue).toEqual({
      event: 'touchdown',
      priority: 'high',
      metadata: { teamId: 'afce1' },
    });
    expect('timestamp' in cue).toBe(false);
  });

  it('uses the mapped default priority when one is not provided', () => {
    const cue = createAudioCue('super_bowl_win');

    expect(cue.priority).toBe('critical');
  });

  it('omits empty metadata objects so cue payloads stay minimal', () => {
    const cue = createAudioCue('notification', undefined, {});

    expect(cue).toEqual({
      event: 'notification',
      priority: 'medium',
    });
  });

  it('maps representative events to the correct priorities', () => {
    expect(getEventPriority('ui_click')).toBe('low');
    expect(getEventPriority('notification')).toBe('medium');
    expect(getEventPriority('touchdown')).toBe('high');
    expect(getEventPriority('super_bowl_win')).toBe('critical');
  });

  it('filters out cues below the configured minimum priority', () => {
    const cue: AudioCue = { event: 'ui_click', priority: 'low' };

    expect(shouldPlaySound(cue, makeConfig({ minimumPriority: 'medium' }))).toBe(false);
  });

  it('allows cues at or above the configured minimum priority', () => {
    const cue: AudioCue = { event: 'touchdown', priority: 'high' };

    expect(shouldPlaySound(cue, makeConfig({ minimumPriority: 'high' }))).toBe(true);
    expect(shouldPlaySound(cue, makeConfig({ minimumPriority: 'medium' }))).toBe(true);
  });

  it('maps a result summary into a stable ordered list of cues', () => {
    const cues = mapGameResultToAudioCues({
      touchdowns: 2,
      fieldGoals: 1,
      turnovers: 1,
      sacks: 1,
      bigPlays: 1,
      overtime: true,
    });

    expect(cues.map((cue) => cue.event)).toEqual([
      'overtime',
      'touchdown',
      'touchdown',
      'field_goal',
      'turnover',
      'sack',
      'big_play',
      'game_end',
    ]);
  });

  it('returns only game end when the summary has no highlight events', () => {
    const cues = mapGameResultToAudioCues({});

    expect(cues.map((cue) => cue.event)).toEqual(['game_end']);
  });

  it('uses default priorities for mapped game result cues', () => {
    const cues = mapGameResultToAudioCues({ touchdowns: 1, turnovers: 1 });

    expect(cues).toEqual([
      { event: 'touchdown', priority: 'high' },
      { event: 'turnover', priority: 'high' },
      { event: 'game_end', priority: 'medium' },
    ]);
  });
});
