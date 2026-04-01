/**
 * MFD Game Event Envelope Builder
 *
 * Creates schema-aligned event envelopes with consistent shape.
 */

import { SCHEMA_VERSION, type EventName } from './event-types';

export interface LiveGameState {
  gameId?: string;
  timestamp?: number;
  quarter?: number;
  clock?: number;
  possession?: string;
  fieldPos?: number;
  down?: number;
  yardsToGo?: number;
  hScore?: number;
  aScore?: number;
}

export interface EventEnvelope {
  schemaVersion: string;
  eventName: EventName;
  seq: number;
  gameId: string;
  timestamp: number;
  quarter: number;
  clock: number;
  possession: string;
  fieldPos: number;
  down: number;
  yardsToGo: number;
  homeScore: number;
  awayScore: number;
  payload: Record<string, unknown>;
}

let _seq = 0;

export function resetSeq(): void {
  _seq = 0;
}

export function buildEnvelope(
  eventName: EventName,
  gameState: LiveGameState,
  payload: Record<string, unknown>,
): EventEnvelope {
  _seq++;
  return {
    schemaVersion: SCHEMA_VERSION,
    eventName,
    seq: _seq,
    gameId: gameState.gameId ?? 'unknown',
    timestamp: gameState.timestamp ?? 0,
    quarter: gameState.quarter ?? 0,
    clock: gameState.clock ?? 0,
    possession: gameState.possession ?? '',
    fieldPos: gameState.fieldPos ?? 0,
    down: gameState.down ?? 0,
    yardsToGo: gameState.yardsToGo ?? 0,
    homeScore: gameState.hScore ?? 0,
    awayScore: gameState.aScore ?? 0,
    payload: payload,
  };
}
