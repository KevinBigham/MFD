export type SoundEvent =
  | 'ui_click'
  | 'ui_navigate'
  | 'ui_open_panel'
  | 'ui_close_panel'
  | 'notification'
  | 'week_advance_start'
  | 'week_advance_complete'
  | 'touchdown'
  | 'field_goal'
  | 'turnover'
  | 'sack'
  | 'big_play'
  | 'injury'
  | 'game_start'
  | 'game_end'
  | 'halftime'
  | 'overtime'
  | 'draft_pick'
  | 'trade_complete'
  | 'trade_rejected'
  | 'free_agent_signed'
  | 'contract_signed'
  | 'player_cut'
  | 'season_end'
  | 'super_bowl_win'
  | 'super_bowl_loss'
  | 'playoff_clinch'
  | 'playoff_elimination'
  | 'record_broken'
  | 'achievement_unlocked'
  | 'training_camp_start'
  | 'roster_cut'
  | 'coaching_hire'
  | 'coaching_fire';

export type AudioPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AudioCue {
  event: SoundEvent;
  priority: AudioPriority;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface AudioQueueConfig {
  maxQueueSize: number;
  debounceMs: number;
  minimumPriority: AudioPriority;
}

export const DEFAULT_MAX_QUEUE_SIZE = 20;
export const DEFAULT_DEBOUNCE_MS = 100;
const PRIORITY_ORDER: AudioPriority[] = ['low', 'medium', 'high', 'critical'];

const EVENT_PRIORITIES: Record<SoundEvent, AudioPriority> = {
  ui_click: 'low',
  ui_navigate: 'low',
  ui_open_panel: 'low',
  ui_close_panel: 'low',
  notification: 'medium',
  week_advance_start: 'medium',
  week_advance_complete: 'high',
  touchdown: 'high',
  field_goal: 'medium',
  turnover: 'high',
  sack: 'medium',
  big_play: 'high',
  injury: 'high',
  game_start: 'medium',
  game_end: 'medium',
  halftime: 'medium',
  overtime: 'critical',
  draft_pick: 'high',
  trade_complete: 'high',
  trade_rejected: 'medium',
  free_agent_signed: 'high',
  contract_signed: 'medium',
  player_cut: 'medium',
  season_end: 'high',
  super_bowl_win: 'critical',
  super_bowl_loss: 'critical',
  playoff_clinch: 'critical',
  playoff_elimination: 'critical',
  record_broken: 'critical',
  achievement_unlocked: 'high',
  training_camp_start: 'medium',
  roster_cut: 'medium',
  coaching_hire: 'high',
  coaching_fire: 'high',
};

export const DEFAULT_AUDIO_QUEUE_CONFIG: AudioQueueConfig = {
  maxQueueSize: DEFAULT_MAX_QUEUE_SIZE,
  debounceMs: DEFAULT_DEBOUNCE_MS,
  minimumPriority: 'low',
};

function appendRepeatedCues(cues: AudioCue[], event: SoundEvent, count = 0): void {
  for (let index = 0; index < count; index += 1) {
    cues.push(createAudioCue(event));
  }
}

export function getEventPriority(event: SoundEvent): AudioPriority {
  return EVENT_PRIORITIES[event];
}

export function createAudioCue(
  event: SoundEvent,
  priority?: AudioPriority,
  metadata?: Record<string, unknown>,
): AudioCue {
  const cue: AudioCue = {
    event,
    priority: priority ?? getEventPriority(event),
  };

  if (metadata && Object.keys(metadata).length > 0) {
    cue.metadata = metadata;
  }

  return cue;
}

export function shouldPlaySound(
  cue: AudioCue,
  config: AudioQueueConfig = DEFAULT_AUDIO_QUEUE_CONFIG,
): boolean {
  const minimumPriority = config.minimumPriority ?? DEFAULT_AUDIO_QUEUE_CONFIG.minimumPriority;
  return PRIORITY_ORDER.indexOf(cue.priority) >= PRIORITY_ORDER.indexOf(minimumPriority);
}

export function mapGameResultToAudioCues(result: {
  touchdowns?: number;
  fieldGoals?: number;
  turnovers?: number;
  sacks?: number;
  bigPlays?: number;
  overtime?: boolean;
}): AudioCue[] {
  const cues: AudioCue[] = [];

  if (result.overtime) {
    cues.push(createAudioCue('overtime'));
  }

  appendRepeatedCues(cues, 'touchdown', result.touchdowns);
  appendRepeatedCues(cues, 'field_goal', result.fieldGoals);
  appendRepeatedCues(cues, 'turnover', result.turnovers);
  appendRepeatedCues(cues, 'sack', result.sacks);
  appendRepeatedCues(cues, 'big_play', result.bigPlays);
  cues.push(createAudioCue('game_end'));

  return cues;
}
