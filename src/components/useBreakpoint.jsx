/**
 * useBreakpoint — Responsive breakpoint hook for MFD.
 *
 * Returns 'mobile' | 'tablet' | 'desktop' based on window width.
 * Updates on resize with debounce.
 *
 * Breakpoints:
 *   mobile:  < 640px
 *   tablet:  640px - 1023px
 *   desktop: >= 1024px
 *
 * Usage:
 *   var bp = useBreakpoint();
 *   if (bp === 'mobile') { ... }
 */
import { useState, useEffect } from 'react';

var MOBILE = 640;
var TABLET = 1024;

function getBreakpoint() {
  if (typeof window === 'undefined') return 'desktop';
  var w = window.innerWidth;
  if (w < MOBILE) return 'mobile';
  if (w < TABLET) return 'tablet';
  return 'desktop';
}

export function useBreakpoint() {
  var _bp = useState(getBreakpoint);
  var bp = _bp[0];
  var setBp = _bp[1];

  useEffect(function () {
    var timer = null;
    function onResize() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        setBp(getBreakpoint());
      }, 100);
    }
    window.addEventListener('resize', onResize);
    return function () {
      window.removeEventListener('resize', onResize);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return bp;
}
