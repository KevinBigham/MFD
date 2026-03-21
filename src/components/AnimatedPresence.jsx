/**
 * AnimatedPresence — MFD adapter wrapping Motion's AnimatePresence.
 *
 * Provides enter/exit animations for tab transitions and screen swaps.
 * Respects prefers-reduced-motion.
 *
 * Props:
 *   children   {ReactNode}   Content to animate (keyed for transitions)
 *   mode       {string}      'wait' | 'sync' | 'popLayout' (default 'wait')
 */
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MOTION } from '../config/theme.js';

// Detect reduced motion preference
var prefersReduced = typeof window !== 'undefined' &&
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

var fadeSlide = prefersReduced
  ? { initial: {}, animate: {}, exit: {} }
  : {
      initial: { opacity: 0, y: 6 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.12, ease: 'easeOut' } },
      exit: { opacity: 0, y: -4, transition: { duration: 0.08, ease: 'easeIn' } },
    };

export function AnimatedPresence(props) {
  var mode = props.mode || 'wait';
  return React.createElement(AnimatePresence, { mode: mode }, props.children);
}

/**
 * AnimatedPanel — wraps a keyed panel with fade+slide enter/exit.
 *
 * Props:
 *   panelKey   {string}   Unique key for AnimatePresence transitions
 *   children   {ReactNode}
 *   style      {object}   Additional inline styles
 */
export function AnimatedPanel(props) {
  return React.createElement(
    motion.div,
    {
      key: props.panelKey,
      initial: fadeSlide.initial,
      animate: fadeSlide.animate,
      exit: fadeSlide.exit,
      style: props.style || {},
    },
    props.children
  );
}
