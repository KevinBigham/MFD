import { describe, expect, it } from 'vitest';
import { DraggableList } from '../src/components/DraggableList.jsx';

describe('DraggableList adapter', () => {
  it('exports DraggableList function', () => {
    expect(typeof DraggableList).toBe('function');
  });

  it('DraggableList has expected name', () => {
    expect(DraggableList.name).toBe('DraggableList');
  });
});
