import { describe, expect, it } from 'vitest';
import fixturePacket from './fixtures/game-events/golden-consumer-packet.json';

import {
  adaptConsumerViewModel,
  createGameEventReceiver,
  createLiveEventConsumer,
  GAME_EVENT_MESSAGE_TYPE,
  SOURCE_STATE,
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

  it('marks invalid source with diagnostics when malformed envelope arrives pre-live', () => {
    const consumer = createLiveEventConsumer({ fixturePacket });
    const out = consumer.ingestMessage({ type: GAME_EVENT_MESSAGE_TYPE, envelope: { ...fixturePacket.envelope, seq: 'bad' } });
    expect(out.ok).toBe(false);
    expect(consumer.getSourceState()).toBe(SOURCE_STATE.INVALID);
    expect(consumer.diagnostics.invalidCount).toBe(1);
    expect(consumer.diagnostics.lastInvalidReason).toBe('invalid_numeric_field:seq');
  });
});
