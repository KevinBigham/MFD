/**
 * LucideIcon — MFD adapter for lucide-react icons.
 *
 * Wraps Lucide icons with Terminal Maximalism defaults.
 * Uses deep imports from lucide-react/dist/esm/icons/ for optimal tree-shaking.
 *
 * Props:
 *   name        {string}  icon key (kebab-case)
 *   size        {number}  px (default 14)
 *   color       {string}  stroke color (default T.text)
 *   strokeWidth {number}  line width (default 1.8)
 *   style       {object}  optional inline styles
 */
import React from 'react';
import { T } from '../config/theme.js';

// ── Deep imports for true tree-shaking ───────────────────
import { default as Trophy } from 'lucide-react/dist/esm/icons/trophy.js';
import { default as Flame } from 'lucide-react/dist/esm/icons/flame.js';
import { default as Search } from 'lucide-react/dist/esm/icons/search.js';
import { default as Target } from 'lucide-react/dist/esm/icons/target.js';
import { default as Shield } from 'lucide-react/dist/esm/icons/shield.js';
import { default as Brain } from 'lucide-react/dist/esm/icons/brain.js';
import { default as Zap } from 'lucide-react/dist/esm/icons/zap.js';
import { default as Star } from 'lucide-react/dist/esm/icons/star.js';
import { default as CircleCheck } from 'lucide-react/dist/esm/icons/circle-check.js';
import { default as TriangleAlert } from 'lucide-react/dist/esm/icons/triangle-alert.js';
import { default as ChartColumn } from 'lucide-react/dist/esm/icons/chart-column.js';
import { default as CircleAlert } from 'lucide-react/dist/esm/icons/circle-alert.js';
import { default as CircleX } from 'lucide-react/dist/esm/icons/circle-x.js';
import { default as ClipboardList } from 'lucide-react/dist/esm/icons/clipboard-list.js';
import { default as Play } from 'lucide-react/dist/esm/icons/play.js';
import { default as RefreshCw } from 'lucide-react/dist/esm/icons/refresh-cw.js';
import { default as FastForward } from 'lucide-react/dist/esm/icons/fast-forward.js';
import { default as Dumbbell } from 'lucide-react/dist/esm/icons/dumbbell.js';
import { default as Swords } from 'lucide-react/dist/esm/icons/swords.js';
import { default as Info } from 'lucide-react/dist/esm/icons/info.js';
import { default as DollarSign } from 'lucide-react/dist/esm/icons/dollar-sign.js';
import { default as Heart } from 'lucide-react/dist/esm/icons/heart.js';
import { default as TrendingUp } from 'lucide-react/dist/esm/icons/trending-up.js';
import { default as TrendingDown } from 'lucide-react/dist/esm/icons/trending-down.js';
import { default as ArrowRight } from 'lucide-react/dist/esm/icons/arrow-right.js';
import { default as Scissors } from 'lucide-react/dist/esm/icons/scissors.js';
import { default as Pen } from 'lucide-react/dist/esm/icons/pen.js';
import { default as FileText } from 'lucide-react/dist/esm/icons/file-text.js';
import { default as Clock } from 'lucide-react/dist/esm/icons/clock.js';
import { default as Mic2 } from 'lucide-react/dist/esm/icons/mic.js';
import { default as Tv } from 'lucide-react/dist/esm/icons/tv.js';
import { default as Tag } from 'lucide-react/dist/esm/icons/tag.js';
import { default as Sparkles } from 'lucide-react/dist/esm/icons/sparkles.js';
import { default as ChevronDown } from 'lucide-react/dist/esm/icons/chevron-down.js';
import { default as ChevronUp } from 'lucide-react/dist/esm/icons/chevron-up.js';
import { default as ChevronRight } from 'lucide-react/dist/esm/icons/chevron-right.js';
import { default as Settings } from 'lucide-react/dist/esm/icons/settings.js';
import { default as X } from 'lucide-react/dist/esm/icons/x.js';
import { default as Menu } from 'lucide-react/dist/esm/icons/menu.js';
import { default as MoreHorizontal } from 'lucide-react/dist/esm/icons/more-horizontal.js';
import { default as Phone } from 'lucide-react/dist/esm/icons/phone.js';
import { default as Users } from 'lucide-react/dist/esm/icons/users.js';
import { default as Calendar } from 'lucide-react/dist/esm/icons/calendar.js';
import { default as Award } from 'lucide-react/dist/esm/icons/award.js';
import { default as MapPin } from 'lucide-react/dist/esm/icons/map-pin.js';
import { default as Download } from 'lucide-react/dist/esm/icons/download.js';
import { default as Upload } from 'lucide-react/dist/esm/icons/upload.js';
import { default as Save } from 'lucide-react/dist/esm/icons/save.js';
import { default as Home } from 'lucide-react/dist/esm/icons/home.js';
import { default as Mail } from 'lucide-react/dist/esm/icons/mail.js';

// ── Icon registry — maps kebab-case name to component ───
var ICON_MAP = {
  'trophy': Trophy,
  'flame': Flame,
  'search': Search,
  'target': Target,
  'shield': Shield,
  'brain': Brain,
  'zap': Zap,
  'star': Star,
  'circle-check': CircleCheck,
  'check-circle': CircleCheck,
  'triangle-alert': TriangleAlert,
  'alert-triangle': TriangleAlert,
  'chart-column': ChartColumn,
  'bar-chart-3': ChartColumn,
  'circle-alert': CircleAlert,
  'alert-circle': CircleAlert,
  'circle-x': CircleX,
  'x-circle': CircleX,
  'clipboard-list': ClipboardList,
  'play': Play,
  'refresh-cw': RefreshCw,
  'fast-forward': FastForward,
  'dumbbell': Dumbbell,
  'swords': Swords,
  'info': Info,
  'dollar-sign': DollarSign,
  'heart': Heart,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'arrow-right': ArrowRight,
  'scissors': Scissors,
  'pen': Pen,
  'file-text': FileText,
  'clock': Clock,
  'mic-2': Mic2,
  'tv': Tv,
  'tag': Tag,
  'sparkles': Sparkles,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-right': ChevronRight,
  'settings': Settings,
  'x': X,
  'menu': Menu,
  'more-horizontal': MoreHorizontal,
  'phone': Phone,
  'users': Users,
  'calendar': Calendar,
  'award': Award,
  'map-pin': MapPin,
  'download': Download,
  'upload': Upload,
  'save': Save,
  'home': Home,
  'mail': Mail,
};

export function LucideIcon(props) {
  var name = props && props.name ? props.name : 'circle';
  var size = props && props.size ? props.size : 14;
  var color = props && props.color ? props.color : T.text;
  var strokeWidth = props && props.strokeWidth ? props.strokeWidth : 1.8;
  var style = props && props.style ? props.style : {};
  var className = props && props.className ? props.className : undefined;

  var IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    // Fallback: render a small circle if icon name not found
    return React.createElement(
      'svg',
      {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        'aria-hidden': 'true',
        focusable: 'false',
        style: Object.assign(
          { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 },
          style
        ),
      },
      React.createElement('circle', {
        cx: 12,
        cy: 12,
        r: 7,
        stroke: color,
        strokeWidth: strokeWidth,
        fill: 'none',
      })
    );
  }

  return React.createElement(IconComponent, {
    size: size,
    color: color,
    strokeWidth: strokeWidth,
    'aria-hidden': 'true',
    focusable: 'false',
    className: className,
    style: Object.assign(
      { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 },
      style
    ),
  });
}
