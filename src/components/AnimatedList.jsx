/**
 * AnimatedList — Animated wrapper for list items with enter/exit.
 *
 * Wraps each child with a motion.div for staggered list animations.
 * Respects prefers-reduced-motion.
 *
 * Props:
 *   children   {ReactNode[]}  Keyed list items
 *   stagger    {number}       Delay between items in seconds (default 0.03)
 */
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

var prefersReduced = typeof window !== 'undefined' &&
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function AnimatedList(props) {
  var stagger = props.stagger || 0.03;
  var children = props.children;

  if (!children) return null;

  var items = Array.isArray(children) ? children : [children];

  return React.createElement(
    AnimatePresence,
    { mode: 'popLayout' },
    items.map(function (child, i) {
      if (!child || !child.key) return child;
      return React.createElement(
        motion.div,
        {
          key: child.key,
          initial: prefersReduced ? {} : { opacity: 0, x: -8 },
          animate: prefersReduced ? {} : {
            opacity: 1,
            x: 0,
            transition: { duration: 0.15, delay: i * stagger, ease: 'easeOut' },
          },
          exit: prefersReduced ? {} : {
            opacity: 0,
            x: 8,
            transition: { duration: 0.1, ease: 'easeIn' },
          },
          layout: !prefersReduced,
        },
        child
      );
    })
  );
}
