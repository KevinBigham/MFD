/**
 * MFD Game Event Envelope Builder
 *
 * Creates schema-aligned event envelopes.
 * Every game event produced by the spine passes through this builder
 * to ensure a consistent top-level shape.
 *
 * Envelope shape (frozen):
 * {
 *   schemaVersion: string,
 *   eventName: string,
 *   seq: number,
 *   gameId: string,
 *   timestamp: number,
 *   quarter: number,
 *   clock: number,
 *   possession: string,
 *   fieldPos: number,
 *   down: number,
 *   yardsToGo: number,
 *   homeScore: number,
 *   awayScore: number,
 *   payload: object
 * }
 */

import { SCHEMA_VERSION } from './event-types.js';

let _seq = 0;

export function resetSeq() {
  _seq = 0;
}

export function buildEnvelope(eventName, gameState, payload) {
  _seq++;
  return {
    schemaVersion: SCHEMA_VERSION,
    eventName,
    seq: _seq,
    gameId: gameState.gameId || 'unknown',
    timestamp: gameState.timestamp || Date.now(),
    quarter: gameState.quarter || 0,
    clock: gameState.clock || 0,
    possession: gameState.possession || '',
    fieldPos: gameState.fieldPos || 0,
    down: gameState.down || 0,
    yardsToGo: gameState.yardsToGo || 0,
    homeScore: gameState.hScore || 0,
    awayScore: gameState.aScore || 0,
    payload: payload || {},
  };
}
