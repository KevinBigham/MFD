import { describe, expect, it } from 'vitest';
import { MfdToaster, mfdToast } from '../src/components/MfdToaster.jsx';

describe('MfdToaster adapter', () => {
  it('exports MfdToaster function', () => {
    expect(typeof MfdToaster).toBe('function');
  });

  it('exports mfdToast function', () => {
    expect(typeof mfdToast).toBe('function');
  });

  it('MfdToaster returns a React element', () => {
    var el = MfdToaster();
    expect(el).toBeTruthy();
    expect(el.props.position).toBe('top-right');
  });

  it('mfdToast accepts text, type, and opts without error', () => {
    // Sonner needs DOM to actually render toasts, but calling the function
    // should not throw even without a DOM
    expect(function () {
      mfdToast('Test toast', 'green');
    }).not.toThrow();

    expect(function () {
      mfdToast('Warning', 'red', { duration: 3000 });
    }).not.toThrow();

    expect(function () {
      mfdToast('Gold event', 'gold', { onClick: function () {} });
    }).not.toThrow();
  });

  it('mfdToast handles all type variants', () => {
    var types = ['red', 'green', 'gold', 'purple', 'cyan', 'info'];
    types.forEach(function (type) {
      expect(function () {
        mfdToast('Test ' + type, type);
      }).not.toThrow();
    });
  });

  it('mfdToast handles unknown type gracefully', () => {
    expect(function () {
      mfdToast('Unknown type', 'unknown');
    }).not.toThrow();
  });
});
