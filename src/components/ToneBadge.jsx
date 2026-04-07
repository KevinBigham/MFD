/**
 * ToneBadge — Small color-coded inline badge/tag.
 *
 * Props:
 *   tone     {string}  Color tone key: "gold"|"green"|"red"|"purple"|"cyan"
 *   style    {object}  Optional additional style overrides
 *   children {node}    Badge text content
 */

import { S } from '../config/theme.js';
import { mS } from '../utils/helpers.js';

export function ToneBadge(props) {
  var tones = { gold: S.badgeGold, green: S.badgeGreen, red: S.badgeRed, purple: S.badgePurple, cyan: S.badgeCyan };
  return React.createElement("span", { style: mS(S.badge, tones[props.tone] || S.badgeGold, props.style || {}) }, props.children);
}
