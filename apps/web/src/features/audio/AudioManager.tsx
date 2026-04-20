export {
  AudioController,
  AudioToggle,
  getAudioControllerSnapshot,
  initializeAudioOnInteraction,
  notifyVisibilityChange,
  playAudioCueQueue,
  playSound,
  resetAudioControllerForTests,
  resolveAmbientModeForPath,
  setAmbientMode,
  syncAudioPreferences,
  useAudio,
} from './AudioController';

export type {
  AmbientMode,
  AudioControls,
} from './AudioController';
