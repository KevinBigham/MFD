import { describe, expect, it } from 'vitest';
import fixturePacket from './fixtures/game-events/golden-consumer-packet.json';

import {
  adaptConsumerViewModel,
  CONSUMER_PACKET_MESSAGE_TYPE,
  createGameEventReceiver,
  createLiveEventConsumer,
  GAME_EVENT_MESSAGE_TYPE,
  PACKET_BACKING,
  SOURCE_STATE,
  validateConsumerPacketMessage,
  validateGameEventEnvelope,
  validateGameEventMessage,
} from '../src/app/live-event-consumer.js';

function createWindowStub() {
  const handlers = new Set();
  return {
    addEventListener(name, fn) {
      if (name === 'message') handlers.add(fn);
    },
    removeEventListener(name, fn) {
      if (name === 'message') handlers.delete(fn);
    },
    post(data) {
      handlers.forEach((fn) => fn({ data }));
    },
  };
}

function makeConsumerPacketMessage(overrides = {}) {
  return {
    type: CONSUMER_PACKET_MESSAGE_TYPE,
    packet: {
      schemaVersion: '0.1.0',
      context: fixturePacket.context,
      envelope: fixturePacket.envelope,
      weeklyHook: fixturePacket.weeklyHook,
      postgameAutopsy: fixturePacket.postgameAutopsy,
      ...overrides,
    },
  };
}

describe('live event consumer', () => {
  it('validates only canonical game-event messages', () => {
    const ok = validateGameEventMessage({ type: GAME_EVENT_MESSAGE_TYPE, envelope: fixturePacket.envelope });
    const badType = validateGameEventMessage({ type: 'other', envelope: fixturePacket.envelope });
    const badSchema = validateGameEventEnvelope({ ...fixturePacket.envelope, schemaVersion: '9.9.9' });
    expect(ok.ok).toBe(true);
    expect(badType.ok).toBe(false);
    expect(badSchema.reason).toBe('schema_version_mismatch');
  });

  it('receiver rejects invalid and forwards validated envelopes', () => {
    const win = createWindowStub();
    const valid = [];
    const invalid = [];
    const off = createGameEventReceiver({
      target: win,
      onEnvelope(envelope) { valid.push(envelope); },
      onInvalid(diag) { invalid.push(diag.reason); },
    });

    win.post({ type: GAME_EVENT_MESSAGE_TYPE, envelope: fixturePacket.envelope });
    win.post({ type: GAME_EVENT_MESSAGE_TYPE, envelope: { ...fixturePacket.envelope, payload: null } });

    off();

    expect(valid).toHaveLength(1);
    expect(valid[0].seq).toBe(1);
    expect(invalid).toEqual(['invalid_payload']);
  });

  it('stays on fixture until validated active session game_start arrives', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });
    const nonStart = {
      ...fixturePacket.envelope,
      eventName: 'drive_start',
      seq: 2,
      payload: { driveNum: 1 },
    };

    const blocked = consumer.ingestMessage({ type: GAME_EVENT_MESSAGE_TYPE, envelope: nonStart });
    expect(blocked.ok).toBe(false);
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.FIXTURE);

    const started = consumer.ingestMessage({ type: GAME_EVENT_MESSAGE_TYPE, envelope: fixturePacket.envelope });
    expect(started.ok).toBe(true);
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.LIVE);
  });

  it('transitions from live to stale when event stream goes quiet', () => {
    let tick = 0;
    const consumer = createLiveEventConsumer({ fixturePacket, staleAfterMs: 1000, now: () => tick });
    consumer.ingestMessage({ type: GAME_EVENT_MESSAGE_TYPE, envelope: fixturePacket.envelope });
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.LIVE);
    tick = 1001;
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.STALE);
  });

  it('has parity for fixture and live shells through one adapter', () => {
    const fixtureView = adaptConsumerViewModel({ fixturePacket, sourceState: SOURCE_STATE.FIXTURE });
    const liveView = adaptConsumerViewModel({ fixturePacket, liveEnvelope: fixturePacket.envelope, sourceState: SOURCE_STATE.LIVE });

    expect(Object.keys(fixtureView).sort()).toEqual(Object.keys(liveView).sort());
    expect(Object.keys(fixtureView.commandDesk).sort()).toEqual(Object.keys(liveView.commandDesk).sort());
    expect(Object.keys(fixtureView.postgameAutopsy).sort()).toEqual(Object.keys(liveView.postgameAutopsy).sort());
  });

  it('keeps adapted payload save/import safe and non-mutating', () => {
    const before = JSON.stringify(fixturePacket);
    const view = adaptConsumerViewModel({ fixturePacket, sourceState: SOURCE_STATE.FIXTURE });
    const roundTrip = JSON.parse(JSON.stringify(view));

    expect(roundTrip.commandDesk.weeklyHook.week).toBe(fixturePacket.weeklyHook.week);
    expect(JSON.stringify(fixturePacket)).toBe(before);
  });

  it('stays on fixture and tracks diagnostics when malformed envelope arrives pre-live', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });
    const out = consumer.ingestMessage({ type: GAME_EVENT_MESSAGE_TYPE, envelope: { ...fixturePacket.envelope, seq: 'bad' } });
    expect(out.ok).toBe(false);
    // Pre-session: stay on fixture instead of flipping to invalid from noise
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.FIXTURE);
    expect(consumer.diagnostics.invalidCount).toBe(1);
    expect(consumer.diagnostics.lastInvalidReason).toBe('invalid_numeric_field:seq');
  });
});

// ═══════════════════════════════════════════════
// Consumer packet validation
// ═══════════════════════════════════════════════

describe('consumer packet validation', () => {
  it('accepts valid mfd:consumer-packet message', () => {
    const msg = makeConsumerPacketMessage();
    expect(validateConsumerPacketMessage(msg).ok).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(validateConsumerPacketMessage(null).reason).toBe('message_not_object');
    expect(validateConsumerPacketMessage('string').reason).toBe('message_not_object');
  });

  it('rejects wrong message type', () => {
    expect(validateConsumerPacketMessage({ type: 'mfd:game-event', packet: {} }).reason).toBe('message_type_mismatch');
  });

  it('rejects missing packet', () => {
    expect(validateConsumerPacketMessage({ type: CONSUMER_PACKET_MESSAGE_TYPE }).reason).toBe('packet_missing_or_not_object');
  });

  it('rejects wrong schemaVersion', () => {
    const msg = makeConsumerPacketMessage({ schemaVersion: '9.9.9' });
    expect(validateConsumerPacketMessage(msg).reason).toBe('schema_version_mismatch');
  });

  it('rejects missing context', () => {
    const msg = makeConsumerPacketMessage({ context: null });
    expect(validateConsumerPacketMessage(msg).reason).toBe('packet_context_missing');
  });

  it('rejects missing envelope', () => {
    const msg = makeConsumerPacketMessage({ envelope: null });
    expect(validateConsumerPacketMessage(msg).reason).toBe('packet_envelope_missing');
  });

  it('rejects missing weeklyHook', () => {
    const msg = makeConsumerPacketMessage({ weeklyHook: null });
    expect(validateConsumerPacketMessage(msg).reason).toBe('packet_weekly_hook_missing');
  });

  it('rejects missing postgameAutopsy', () => {
    const msg = makeConsumerPacketMessage({ postgameAutopsy: null });
    expect(validateConsumerPacketMessage(msg).reason).toBe('packet_postgame_autopsy_missing');
  });
});

// ═══════════════════════════════════════════════
// Consumer packet ingestion + switchover
// ═══════════════════════════════════════════════

describe('consumer packet ingestion', () => {
  it('ingestConsumerPacket accepts valid packet and updates view model', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });
    const msg = makeConsumerPacketMessage();
    const result = consumer.ingestConsumerPacket(msg);

    expect(result.ok).toBe(true);
    expect(consumer.diagnostics.packetCount).toBe(1);

    const vm = consumer.getViewModel();
    expect(vm.commandDesk.backing).toBe(PACKET_BACKING.LIVE_PACKET);
    expect(vm.postgameAutopsy.backing).toBe(PACKET_BACKING.LIVE_PACKET);
  });

  it('ingestConsumerPacket rejects invalid packet and tracks diagnostics', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });
    const result = consumer.ingestConsumerPacket({ type: CONSUMER_PACKET_MESSAGE_TYPE, packet: null });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('packet_missing_or_not_object');
    expect(consumer.diagnostics.packetInvalidCount).toBe(1);
    expect(consumer.diagnostics.lastPacketInvalidReason).toBe('packet_missing_or_not_object');
  });

  it('consumer packet does not overwrite game-event source state', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });

    // Source state starts as fixture
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.FIXTURE);

    // Ingest consumer packet
    consumer.ingestConsumerPacket(makeConsumerPacketMessage());

    // Source state still fixture (not live) — game events drive source state
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.FIXTURE);
  });

  it('game-event source state remains live after consumer packet arrives', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });

    // Go live via game_start
    consumer.ingestMessage({ type: GAME_EVENT_MESSAGE_TYPE, envelope: fixturePacket.envelope });
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.LIVE);

    // Consumer packet does not change source state
    consumer.ingestConsumerPacket(makeConsumerPacketMessage());
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.LIVE);
  });

  it('weeklyHook switches to live-packet data when consumer packet is received', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });
    const customHook = { ...fixturePacket.weeklyHook, result: 'W 35-0' };
    consumer.ingestConsumerPacket(makeConsumerPacketMessage({ weeklyHook: customHook }));

    const vm = consumer.getViewModel();
    expect(vm.commandDesk.weeklyHook.result).toBe('W 35-0');
    expect(vm.commandDesk.backing).toBe(PACKET_BACKING.LIVE_PACKET);
  });

  it('postgameAutopsy switches to live-packet data when consumer packet is received', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });
    const customAutopsy = { ...fixturePacket.postgameAutopsy, summary: 'Custom summary.' };
    consumer.ingestConsumerPacket(makeConsumerPacketMessage({ postgameAutopsy: customAutopsy }));

    const vm = consumer.getViewModel();
    expect(vm.postgameAutopsy.autopsy.summary).toBe('Custom summary.');
    expect(vm.postgameAutopsy.backing).toBe(PACKET_BACKING.LIVE_PACKET);
  });

  it('fixture fallback remains when no consumer packet is received', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });
    const vm = consumer.getViewModel();

    expect(vm.commandDesk.backing).toBe(PACKET_BACKING.FIXTURE);
    expect(vm.postgameAutopsy.backing).toBe(PACKET_BACKING.FIXTURE);
    expect(vm.commandDesk.weeklyHook).toEqual(fixturePacket.weeklyHook);
    expect(vm.postgameAutopsy.autopsy).toEqual(fixturePacket.postgameAutopsy);
  });

  it('context is taken from consumer packet when available', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });
    const customContext = { ...fixturePacket.context, opponent: 'Eagles' };
    consumer.ingestConsumerPacket(makeConsumerPacketMessage({ context: customContext }));

    const vm = consumer.getViewModel();
    expect(vm.context.opponent).toBe('Eagles');
  });

  it('diagnostics track packet count separately from event diagnostics', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });

    // Ingest invalid event
    consumer.ingestMessage({ type: GAME_EVENT_MESSAGE_TYPE, envelope: { ...fixturePacket.envelope, seq: 'bad' } });
    // Ingest valid packet
    consumer.ingestConsumerPacket(makeConsumerPacketMessage());
    // Ingest invalid packet
    consumer.ingestConsumerPacket({ type: CONSUMER_PACKET_MESSAGE_TYPE, packet: null });

    expect(consumer.diagnostics.invalidCount).toBe(1);
    expect(consumer.diagnostics.packetCount).toBe(1);
    expect(consumer.diagnostics.packetInvalidCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════
// Adapter view model backing field
// ═══════════════════════════════════════════════

describe('adaptConsumerViewModel backing', () => {
  it('reports fixture backing when no live consumer packet', () => {
    const vm = adaptConsumerViewModel({ fixturePacket, sourceState: SOURCE_STATE.FIXTURE });
    expect(vm.commandDesk.backing).toBe(PACKET_BACKING.FIXTURE);
    expect(vm.postgameAutopsy.backing).toBe(PACKET_BACKING.FIXTURE);
  });

  it('reports live-packet backing when consumer packet provided', () => {
    const livePacket = {
      context: fixturePacket.context,
      weeklyHook: fixturePacket.weeklyHook,
      postgameAutopsy: fixturePacket.postgameAutopsy,
    };
    const vm = adaptConsumerViewModel({ fixturePacket, liveConsumerPacket: livePacket, sourceState: SOURCE_STATE.LIVE });
    expect(vm.commandDesk.backing).toBe(PACKET_BACKING.LIVE_PACKET);
    expect(vm.postgameAutopsy.backing).toBe(PACKET_BACKING.LIVE_PACKET);
  });

  it('view model shape keys are consistent regardless of backing', () => {
    const fixtureVM = adaptConsumerViewModel({ fixturePacket, sourceState: SOURCE_STATE.FIXTURE });
    const livePacket = {
      context: fixturePacket.context,
      weeklyHook: fixturePacket.weeklyHook,
      postgameAutopsy: fixturePacket.postgameAutopsy,
    };
    const liveVM = adaptConsumerViewModel({ fixturePacket, liveConsumerPacket: livePacket, sourceState: SOURCE_STATE.LIVE });

    expect(Object.keys(fixtureVM).sort()).toEqual(Object.keys(liveVM).sort());
    expect(Object.keys(fixtureVM.commandDesk).sort()).toEqual(Object.keys(liveVM.commandDesk).sort());
    expect(Object.keys(fixtureVM.postgameAutopsy).sort()).toEqual(Object.keys(liveVM.postgameAutopsy).sort());
  });
});

// ═══════════════════════════════════════════════
// Noise-filtering regression (truthfulness cleanup)
// ═══════════════════════════════════════════════

describe('game-event receiver noise filtering', () => {
  it('silently ignores non-object messages (string, number, null)', () => {
    const win = createWindowStub();
    const envelopes = [];
    const invalids = [];
    createGameEventReceiver({
      target: win,
      onEnvelope: (e) => envelopes.push(e),
      onInvalid: (d) => invalids.push(d),
    });

    win.post('random string');
    win.post(42);
    win.post(null);
    win.post(undefined);

    expect(envelopes).toHaveLength(0);
    expect(invalids).toHaveLength(0);
  });

  it('silently ignores mfd:consumer-packet messages', () => {
    const win = createWindowStub();
    const envelopes = [];
    const invalids = [];
    createGameEventReceiver({
      target: win,
      onEnvelope: (e) => envelopes.push(e),
      onInvalid: (d) => invalids.push(d),
    });

    win.post(makeConsumerPacketMessage());

    expect(envelopes).toHaveLength(0);
    expect(invalids).toHaveLength(0);
  });

  it('silently ignores messages with unrecognized type field', () => {
    const win = createWindowStub();
    const invalids = [];
    createGameEventReceiver({
      target: win,
      onEnvelope: () => {},
      onInvalid: (d) => invalids.push(d),
    });

    win.post({ type: 'webpackHotUpdate' });
    win.post({ type: 'react-devtools-bridge' });
    win.post({ source: 'chrome-extension', data: {} });

    expect(invalids).toHaveLength(0);
  });

  it('reports invalid only for mfd:game-event messages with bad envelopes', () => {
    const win = createWindowStub();
    const invalids = [];
    createGameEventReceiver({
      target: win,
      onEnvelope: () => {},
      onInvalid: (d) => invalids.push(d),
    });

    // This IS a game-event but with a bad envelope
    win.post({ type: GAME_EVENT_MESSAGE_TYPE, envelope: { schemaVersion: 'wrong' } });

    expect(invalids).toHaveLength(1);
    expect(invalids[0].reason).toBe('schema_version_mismatch');
  });
});

describe('consumer sourceState resilience pre-session', () => {
  it('stays FIXTURE when ingestMessage receives invalid data before session confirmation', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });
    // Feed it something that passes type check but has bad envelope
    consumer.ingestMessage({ type: GAME_EVENT_MESSAGE_TYPE, envelope: null });
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.FIXTURE);
    expect(consumer.diagnostics.invalidCount).toBe(1);
  });

  it('stays FIXTURE through multiple pre-session invalid messages', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });
    for (let i = 0; i < 5; i++) {
      consumer.ingestMessage({ type: GAME_EVENT_MESSAGE_TYPE, envelope: { bad: true } });
    }
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.FIXTURE);
    expect(consumer.diagnostics.invalidCount).toBe(5);
  });

  it('transitions to LIVE normally after noise, when valid game_start arrives', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });
    // Pre-session noise
    consumer.ingestMessage({ type: GAME_EVENT_MESSAGE_TYPE, envelope: null });
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.FIXTURE);

    // Valid game_start
    consumer.ingestMessage({
      type: GAME_EVENT_MESSAGE_TYPE,
      envelope: fixturePacket.envelope,
    });
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.LIVE);
  });
});
