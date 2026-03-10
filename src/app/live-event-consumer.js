import { EVENT_NAME_LIST, SCHEMA_VERSION, EVENT_NAMES } from '../systems/events/event-types.js';

export const GAME_EVENT_MESSAGE_TYPE = 'mfd:game-event';

export const SOURCE_STATE = {
  FIXTURE: 'fixture',
  LIVE: 'live',
  STALE: 'stale',
  INVALID: 'invalid',
};

const ENVELOPE_NUMERIC_FIELDS = [
  'seq', 'timestamp', 'quarter', 'clock', 'fieldPos', 'down', 'yardsToGo', 'homeScore', 'awayScore',
];

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function validateGameEventEnvelope(envelope) {
  if (!isObject(envelope)) return { ok: false, reason: 'envelope_missing_or_not_object' };
  if (envelope.schemaVersion !== SCHEMA_VERSION) return { ok: false, reason: 'schema_version_mismatch' };
  if (!EVENT_NAME_LIST.includes(envelope.eventName)) return { ok: false, reason: 'invalid_event_name' };
  if (typeof envelope.gameId !== 'string' || !envelope.gameId) return { ok: false, reason: 'invalid_game_id' };
  if (!isObject(envelope.payload)) return { ok: false, reason: 'invalid_payload' };

  for (const field of ENVELOPE_NUMERIC_FIELDS) {
    if (typeof envelope[field] !== 'number' || Number.isNaN(envelope[field])) {
      return { ok: false, reason: 'invalid_numeric_field:' + field };
    }
  }

  if (typeof envelope.possession !== 'string') return { ok: false, reason: 'invalid_possession' };

  return { ok: true, reason: '' };
}

export function validateGameEventMessage(input) {
  if (!isObject(input)) return { ok: false, reason: 'message_not_object' };
  if (input.type !== GAME_EVENT_MESSAGE_TYPE) return { ok: false, reason: 'message_type_mismatch' };
  return validateGameEventEnvelope(input.envelope);
}

export function createGameEventReceiver(options = {}) {
  const target = options.target || (typeof window !== 'undefined' ? window : null);
  const onEnvelope = typeof options.onEnvelope === 'function' ? options.onEnvelope : function () {};
  const onInvalid = typeof options.onInvalid === 'function' ? options.onInvalid : function () {};
  if (!target || typeof target.addEventListener !== 'function') return function noop() {};

  const handler = function onMessage(event) {
    const result = validateGameEventMessage(event.data);
    if (!result.ok) {
      onInvalid({ reason: result.reason, data: event.data });
      return;
    }
    onEnvelope(event.data.envelope);
  };

  target.addEventListener('message', handler);
  return function detach() {
    target.removeEventListener('message', handler);
  };
}

export function adaptConsumerViewModel(input = {}) {
  const fixturePacket = input.fixturePacket || null;
  const liveEnvelope = input.liveEnvelope || null;
  const sourceState = input.sourceState || SOURCE_STATE.FIXTURE;

  const fixtureContext = fixturePacket && fixturePacket.context ? fixturePacket.context : {};
  const fixtureWeeklyHook = fixturePacket && fixturePacket.weeklyHook ? fixturePacket.weeklyHook : null;
  const fixtureAutopsy = fixturePacket && fixturePacket.postgameAutopsy ? fixturePacket.postgameAutopsy : null;

  const context = liveEnvelope && liveEnvelope.eventName === EVENT_NAMES.GAME_START
    ? {
      userSide: fixtureContext.userSide || 'home',
      homeTeam: liveEnvelope.payload.homeTeam,
      awayTeam: liveEnvelope.payload.awayTeam,
      week: liveEnvelope.payload.week,
      year: liveEnvelope.payload.year,
      opponent: fixtureContext.userSide === 'away' ? liveEnvelope.payload.homeTeam : liveEnvelope.payload.awayTeam,
    }
    : fixtureContext;

  return {
    sourceState,
    envelope: liveEnvelope || (fixturePacket ? fixturePacket.envelope : null),
    context,
    commandDesk: {
      context,
      weeklyHook: fixtureWeeklyHook,
    },
    postgameAutopsy: {
      context,
      autopsy: fixtureAutopsy,
    },
  };
}

export function createLiveEventConsumer(options = {}) {
  const staleAfterMs = typeof options.staleAfterMs === 'number' ? options.staleAfterMs : 10000;
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const fixturePacket = options.fixturePacket || null;

  let sourceState = SOURCE_STATE.FIXTURE;
  let lastLiveAt = null;
  let liveEnvelope = null;
  let activeSessionConfirmed = false;
  const diagnostics = {
    invalidCount: 0,
    lastInvalidReason: '',
    rejectedMessages: 0,
  };

  function ingestMessage(data) {
    const result = validateGameEventMessage(data);
    if (!result.ok) {
      diagnostics.invalidCount++;
      diagnostics.rejectedMessages++;
      diagnostics.lastInvalidReason = result.reason;
      if (!activeSessionConfirmed) sourceState = SOURCE_STATE.INVALID;
      return { ok: false, reason: result.reason };
    }

    const envelope = data.envelope;

    if (!activeSessionConfirmed) {
      if (envelope.eventName !== EVENT_NAMES.GAME_START || envelope.seq < 1) {
        return { ok: false, reason: 'awaiting_active_session_confirmation' };
      }
      activeSessionConfirmed = true;
    }

    liveEnvelope = envelope;
    lastLiveAt = now();
    sourceState = SOURCE_STATE.LIVE;
    return { ok: true, reason: '' };
  }

  function getSourceState() {
    if (sourceState === SOURCE_STATE.LIVE && lastLiveAt !== null && (now() - lastLiveAt) > staleAfterMs) {
      return SOURCE_STATE.STALE;
    }
    return sourceState;
  }

  function getViewModel() {
    return adaptConsumerViewModel({
      fixturePacket,
      liveEnvelope,
      sourceState: getSourceState(),
    });
  }

  return {
    ingestMessage,
    getSourceState,
    getViewModel,
    diagnostics,
  };
}
