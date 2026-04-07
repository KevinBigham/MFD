/**
 * MFD Owner System
 *
 * Five owner archetypes with different approval logic, tolerance,
 * and goal expectations. Drives owner patience, mandates, and
 * potential firing scenarios.
 */

import { assign } from '../utils/helpers.js';

export var OWNER_ARCHETYPES = [
  {
    id: 'win_now',
    label: '\u{1F3C6} Win-Now Owner',
    desc: 'Demands championships. Patience wears thin fast.',
    goalText: 'Make the playoffs or heads roll.',
    tolerance: 2,
    approvalCalc: function (t, s) {
      if (s.phase === 'offseason') return 0;
      var wp = t.wins / Math.max(1, t.wins + t.losses);
      if (wp >= 0.7) return 15;
      if (wp >= 0.5) return 5;
      if (wp >= 0.35) return -5;
      return -15;
    },
  },
  {
    id: 'patient_builder',
    label: '\u{1F331} Patient Builder',
    desc: 'Values long-term growth. Tolerates losing if youth develops.',
    goalText: 'Develop 3+ young starters (\u226425) and stay cap-healthy.',
    tolerance: 5,
    approvalCalc: function (t) {
      var youngStarters = t.roster.filter(function (p) {
        return p.isStarter && p.age <= 25;
      }).length;
      if (youngStarters >= 5) return 12;
      if (youngStarters >= 3) return 6;
      return -3;
    },
  },
  {
    id: 'profit_first',
    label: '\u{1F4B0} Profit-First Owner',
    desc: 'Cares about the bottom line. Keep the cap clean.',
    goalText: 'Maintain positive cap space and avoid dead cap.',
    tolerance: 3,
    approvalCalc: function (t) {
      var capRoom = 150 - (t.capUsed || 0) - (t.deadCap || 0);
      if (capRoom >= 30) return 10;
      if (capRoom >= 10) return 4;
      if (capRoom >= 0) return -2;
      return -12;
    },
  },
  {
    id: 'fan_favorite',
    label: '\u{1F389} Fan-Favorite Owner',
    desc: 'Wants excitement. Big plays, big stars, big crowds.',
    goalText: 'Keep a star player (85+ OVR) and win exciting games.',
    tolerance: 3,
    approvalCalc: function (t) {
      var hasStar = t.roster.some(function (p) {
        return p.ovr >= 85;
      });
      var streak = t.streak || 0;
      return (hasStar ? 8 : 0) + (streak >= 2 ? 4 : streak <= -2 ? -4 : 0);
    },
  },
  {
    id: 'legacy_builder',
    label: '\u{1F451} Legacy Builder',
    desc: 'Building a dynasty for the ages. Values rings above all.',
    goalText: 'Accumulate championships and Hall-worthy seasons.',
    tolerance: 4,
    approvalCalc: function (t) {
      var dom = typeof calcTeamDominance === 'function' ? calcTeamDominance(t) : 0;
      if (dom >= 60) return 12;
      if (dom >= 40) return 6;
      if (dom >= 25) return 2;
      return -4;
    },
  },
];

export function initOwner(rng2) {
  var arch = OWNER_ARCHETYPES[Math.floor(rng2() * OWNER_ARCHETYPES.length)];
  return { archetypeId: arch.id, label: arch.label, approval: 50, history: [] };
}

export function updateOwnerApproval(owner, team, season) {
  if (!owner || !owner.archetypeId) return owner;
  var arch = OWNER_ARCHETYPES.find(function (a) {
    return a.id === owner.archetypeId;
  });
  if (!arch) return owner;
  var delta = arch.approvalCalc(team, season);
  var newApproval = Math.max(0, Math.min(100, owner.approval + delta));
  var updated = assign({}, owner, { approval: newApproval });
  updated.history = (owner.history || []).concat([
    { year: season.year, week: season.week, approval: newApproval, delta: delta },
  ]);
  if (updated.history.length > 40)
    updated.history = updated.history.slice(-40);
  return updated;
}

export function getOwnerStatus(approval) {
  if (approval >= 80) return { label: 'Thrilled', emoji: '\u{1F60D}', color: '#4ade80' };
  if (approval >= 60) return { label: 'Satisfied', emoji: '\u{1F60A}', color: '#60a5fa' };
  if (approval >= 40) return { label: 'Neutral', emoji: '\u{1F610}', color: '#fbbf24' };
  if (approval >= 20) return { label: 'Unhappy', emoji: '\u{1F620}', color: '#f97316' };
  return { label: 'Furious', emoji: '\u{1F525}', color: '#ef4444' };
}
