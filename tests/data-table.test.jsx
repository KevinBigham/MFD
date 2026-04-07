import { describe, expect, it } from 'vitest';
import { DataTable } from '../src/components/DataTable.jsx';

describe('DataTable adapter', () => {
  it('exports DataTable function', () => {
    expect(typeof DataTable).toBe('function');
  });

  it('accepts standard props shape', () => {
    // DataTable uses hooks internally (TanStack Table),
    // so we validate the function signature rather than calling it directly.
    // Full rendering tests require a React render environment.
    expect(DataTable.length).toBe(1); // takes a single props argument
  });

  it('DataTable has expected name', () => {
    expect(DataTable.name).toBe('DataTable');
  });
});
