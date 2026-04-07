/**
 * MFD Stadium Deals
 *
 * Stadium naming-rights deal templates and deal generation.
 */

import { RNG } from '../utils/rng.js';

// Clamp helper
function assign(t, s) {
  if (s) { for (var k in s) { if (s.hasOwnProperty(k)) t[k] = s[k]; } }
  return t;
}

// 8 stadium deal templates with revenue (M$/yr), years, prestige boost, and icon
export var STADIUM_DEALS976 = [
  { name: 'TechNova Field', revenue: 8, years: 5, prestige: 3, icon: '\u{1F4BB}' },
  { name: 'Ironclad Arena', revenue: 6, years: 7, prestige: 2, icon: '\u{1F3D7}\uFE0F' },
  { name: 'Velocity Park', revenue: 10, years: 4, prestige: 5, icon: '\u26A1' },
  { name: 'Pioneer Stadium', revenue: 5, years: 10, prestige: 1, icon: '\u{1F3D4}\uFE0F' },
  { name: 'Nexus Dome', revenue: 12, years: 3, prestige: 4, icon: '\u{1F52E}' },
  { name: 'Heritage Field', revenue: 4, years: 15, prestige: 6, icon: '\u{1F3DB}\uFE0F' },
  { name: 'Apex Center', revenue: 9, years: 5, prestige: 3, icon: '\u{1F3AF}' },
  { name: 'Titan Grounds', revenue: 7, years: 6, prestige: 2, icon: '\u2699\uFE0F' },
];

/**
 * Generate 3 random stadium deal offers with revenue variance.
 */
export function generateStadiumDeals976() {
  var pool = STADIUM_DEALS976.slice();
  var offers = [];
  for (var i = 0; i < 3 && pool.length > 0; i++) {
    var idx = Math.floor(RNG.ui() * pool.length);
    var deal = assign({}, pool[idx]);
    deal.revenue = Math.round(deal.revenue * (0.8 + RNG.ui() * 0.4) * 10) / 10;
    offers.push(deal);
    pool.splice(idx, 1);
  }
  return offers;
}
