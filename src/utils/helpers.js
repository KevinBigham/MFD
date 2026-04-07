/**
 * MFD General Utility Functions
 */

// Object.assign polyfill (used throughout MFD instead of Object.assign)
export function assign(t) {
  for (var i = 1; i < arguments.length; i++) {
    var s = arguments[i] || {};
    for (var k in s)
      if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k];
  }
  return t;
}

// Merge style objects (variadic)
export function mS() {
  var r = {};
  for (var i = 0; i < arguments.length; i++) {
    var o = arguments[i];
    if (o) for (var k in o) r[k] = o[k];
  }
  return r;
}

// Clamp value between min and max
export function cl(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

// Sum an array, optionally with a mapper function
export function sum(a, fn) {
  return a.reduce(function (s, x) {
    return s + (fn ? fn(x) : x);
  }, 0);
}

// Average an array, optionally with a mapper function
export function avg(a, fn) {
  return a.length ? sum(a, fn) / a.length : 0;
}
