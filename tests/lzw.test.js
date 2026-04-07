import { describe, expect, it } from 'vitest';

import { LZW } from '../src/utils/lzw.js';

describe('lzw.js', () => {
  it('round-trips plain compression and decompression', () => {
    const input = 'Mr Football Dynasty '.repeat(20);
    const compressed = LZW.compress(input);
    const decompressed = LZW.decompress(compressed);
    expect(decompressed).toBe(input);
  });

  it('round-trips base64 helpers', () => {
    const input = JSON.stringify({ a: 1, b: 'test', c: [1, 2, 3] });
    const b64 = LZW.compressToBase64(input);
    const output = LZW.decompressFromBase64(b64);
    expect(output).toBe(input);
  });

  it('handles empty input safely', () => {
    expect(LZW.compress('')).toBe('');
    expect(LZW.decompress('')).toBe('');
  });
});
