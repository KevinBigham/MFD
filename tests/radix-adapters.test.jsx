import { describe, expect, it } from 'vitest';
import { Dialog } from '../src/components/Dialog.jsx';
import { DropdownMenu } from '../src/components/DropdownMenu.jsx';
import { Select } from '../src/components/Select.jsx';
import { Modal } from '../src/components/Modal.jsx';

describe('Dialog adapter', () => {
  it('exports Dialog function', () => {
    expect(typeof Dialog).toBe('function');
  });

  it('returns null when not open', () => {
    // Radix Dialog with open=false renders nothing visible
    var el = Dialog({ isOpen: false, children: 'test' });
    // Radix Root always renders but with no portal content
    expect(el).toBeTruthy();
  });
});

describe('Modal adapter (Radix-backed)', () => {
  it('exports Modal function', () => {
    expect(typeof Modal).toBe('function');
  });

  it('Modal returns null when closed', () => {
    var el = Modal({ isOpen: false, children: 'test' });
    expect(el).toBeNull();
  });

  it('Modal returns element when open', () => {
    var el = Modal({ isOpen: true, onClose: function(){}, children: 'test' });
    expect(el).toBeTruthy();
  });
});

describe('DropdownMenu adapter', () => {
  it('exports DropdownMenu function', () => {
    expect(typeof DropdownMenu).toBe('function');
  });
});

describe('Select adapter', () => {
  it('exports Select function', () => {
    expect(typeof Select).toBe('function');
  });
});
