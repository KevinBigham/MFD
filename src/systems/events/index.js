/**
 * MFD Game Event Spine — Public API
 */

export { EVENT_NAMES, EVENT_NAME_LIST, SCHEMA_VERSION } from './event-types.js';
export { buildEnvelope, resetSeq } from './envelope.js';
export { createEventLog } from './emitter.js';
export {
  reduceTeamStats,
  reduceDrives,
  reducePlayerStats,
  reduceScoringPlays,
  reduceTurnovers,
  reduceInjuries,
  reduceMomentum,
} from './reducers.js';
export { buildWeeklyHook } from './weekly-hook.js';
export { buildPostgameAutopsy } from './postgame-autopsy.js';
export { createParentBridge, isEmbeddedContext } from './parent-bridge.js';
