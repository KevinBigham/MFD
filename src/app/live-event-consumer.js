import { EVENT_NAME_LIST, SCHEMA_VERSION, EVENT_NAMES } from '../systems/events/event-types.js';

export const GAME_EVENT_MESSAGE_TYPE = 'mfd:game-event';
export const CONSUMER_PACKET_MESSAGE_TYPE = 'mfd:consumer-packet';

export const SOURCE_STATE = {
  FIXTURE: 'fixture',
  LIVE: 'live',
  STALE: 'stale',
  INVALID: 'invalid',
};

export const PACKET_BACKING = {
  FIXTURE: 'fixture',
  LIVE_PACKET: 'live-packet',
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
    // Silently ignore non-object messages (Chrome extensions, DevTools, etc.)
    if (!isObject(event.data)) return;
    // Silently ignore messages with a different or missing type — not ours
    if (event.data.type !== GAME_EVENT_MESSAGE_TYPE) return;
    // It claims to be a game event — validate the envelope
    const result = validateGameEventEnvelope(event.data.envelope);
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

export function validateConsumerPacketMessage(input) {
  if (!isObject(input)) return { ok: false, reason: 'message_not_object' };
  if (input.type !== CONSUMER_PACKET_MESSAGE_TYPE) return { ok: false, reason: 'message_type_mismatch' };
  if (!isObject(input.packet)) return { ok: false, reason: 'packet_missing_or_not_object' };

  var p = input.packet;
  if (p.schemaVersion !== SCHEMA_VERSION) return { ok: false, reason: 'schema_version_mismatch' };
  if (!isObject(p.context)) return { ok: false, reason: 'packet_context_missing' };
  if (!isObject(p.envelope)) return { ok: false, reason: 'packet_envelope_missing' };
  if (!isObject(p.weeklyHook)) return { ok: false, reason: 'packet_weekly_hook_missing' };
  if (!isObject(p.postgameAutopsy)) return { ok: false, reason: 'packet_postgame_autopsy_missing' };

  return { ok: true, reason: '' };
}

export function adaptConsumerViewModel(input = {}) {
  const fixturePacket = input.fixturePacket || null;
  const liveEnvelope = input.liveEnvelope || null;
  const liveConsumerPacket = input.liveConsumerPacket || null;
  const sourceState = input.sourceState || SOURCE_STATE.FIXTURE;

  const fixtureContext = fixturePacket && fixturePacket.context ? fixturePacket.context : {};
  const fixtureWeeklyHook = fixturePacket && fixturePacket.weeklyHook ? fixturePacket.weeklyHook : null;
  const fixtureAutopsy = fixturePacket && fixturePacket.postgameAutopsy ? fixturePacket.postgameAutopsy : null;

  const context = liveConsumerPacket && liveConsumerPacket.context
    ? liveConsumerPacket.context
    : liveEnvelope && liveEnvelope.eventName === EVENT_NAMES.GAME_START
      ? {
        userSide: fixtureContext.userSide || 'home',
        homeTeam: liveEnvelope.payload.homeTeam,
        awayTeam: liveEnvelope.payload.awayTeam,
        week: liveEnvelope.payload.week,
        year: liveEnvelope.payload.year,
        opponent: fixtureContext.userSide === 'away' ? liveEnvelope.payload.homeTeam : liveEnvelope.payload.awayTeam,
      }
      : fixtureContext;

  const weeklyHookBacking = liveConsumerPacket && liveConsumerPacket.weeklyHook
    ? PACKET_BACKING.LIVE_PACKET : PACKET_BACKING.FIXTURE;
  const autopsyBacking = liveConsumerPacket && liveConsumerPacket.postgameAutopsy
    ? PACKET_BACKING.LIVE_PACKET : PACKET_BACKING.FIXTURE;

  return {
    sourceState,
    envelope: liveEnvelope || (fixturePacket ? fixturePacket.envelope : null),
    context,
    commandDesk: {
      context,
      weeklyHook: liveConsumerPacket && liveConsumerPacket.weeklyHook
        ? liveConsumerPacket.weeklyHook : fixtureWeeklyHook,
      backing: weeklyHookBacking,
    },
    postgameAutopsy: {
      context,
      autopsy: liveConsumerPacket && liveConsumerPacket.postgameAutopsy
        ? liveConsumerPacket.postgameAutopsy : fixtureAutopsy,
      backing: autopsyBacking,
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
  let liveConsumerPacket = null;
  let activeSessionConfirmed = false;
  const diagnostics = {
    invalidCount: 0,
    lastInvalidReason: '',
    rejectedMessages: 0,
    packetCount: 0,
    packetInvalidCount: 0,
    lastPacketInvalidReason: '',
  };

  function ingestMessage(data) {
    const result = validateGameEventMessage(data);
    if (!result.ok) {
      diagnostics.invalidCount++;
      diagnostics.rejectedMessages++;
      diagnostics.lastInvalidReason = result.reason;
      // Do NOT transition to INVALID before a live session is confirmed —
      // stay at FIXTURE so noise doesn't break the status display.
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

  function ingestConsumerPacket(data) {
    const result = validateConsumerPacketMessage(data);
    if (!result.ok) {
      diagnostics.packetInvalidCount++;
      diagnostics.lastPacketInvalidReason = result.reason;
      return { ok: false, reason: result.reason };
    }

    liveConsumerPacket = data.packet;
    diagnostics.packetCount++;
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
      liveConsumerPacket,
      sourceState: getSourceState(),
    });
  }

  return {
    ingestMessage,
    ingestConsumerPacket,
    getSourceState,
    getViewModel,
    diagnostics,
  };
}
