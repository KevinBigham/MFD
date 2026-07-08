/**
 * MilestoneCard — Celebration card that slides in for major franchise milestones.
 *
 * Triggered on: First win, first playoff win, first championship, 100th win,
 * 10th season, Hall of Famer inducted, record broken.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { Trophy, Star, Medal, Crown, Award, Flame } from 'lucide-react';
import { display, pixel } from './pixelUi';

export type MilestoneType =
  | 'first_win'
  | 'first_playoff_win'
  | 'first_championship'
  | 'win_100'
  | 'season_10'
  | 'hof_inductee'
  | 'record_broken'
  | 'perfect_season';

export interface MilestoneCardProps {
  type: MilestoneType;
  headline: string;
  detail: string;
  onDismiss: () => void;
  /** Auto-dismiss after N milliseconds (default: 5000) */
  duration?: number;
}

const MILESTONE_ICONS: Record<MilestoneType, typeof Trophy> = {
  first_win: Star,
  first_playoff_win: Flame,
  first_championship: Crown,
  win_100: Trophy,
  season_10: Medal,
  hof_inductee: Award,
  record_broken: Trophy,
  perfect_season: Crown,
};

const MILESTONE_COLORS: Record<MilestoneType, string> = {
  first_win: 'var(--mfd-green)',
  first_playoff_win: 'var(--mfd-cyan)',
  first_championship: 'var(--mfd-gold)',
  win_100: 'var(--mfd-gold)',
  season_10: 'var(--mfd-cyan)',
  hof_inductee: 'var(--mfd-gold)',
  record_broken: 'var(--mfd-green)',
  perfect_season: 'var(--mfd-gold)',
};

const cardStyle: CSSProperties = {
  position: 'fixed',
  top: '20px',
  right: '-400px',
  zIndex: 8000,
  width: '340px',
  padding: '16px 20px',
  backgroundColor: 'rgba(0, 0, 0, 0.95)',
  border: '2px solid var(--mfd-gold)',
  borderRadius: '4px',
  transition: 'right 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  cursor: 'pointer',
};

const visibleStyle: CSSProperties = {
  ...cardStyle,
  right: '20px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '8px',
};

const headlineStyle: CSSProperties = {
  ...display,
  fontSize: '20px',
  margin: 0,
  lineHeight: 1.2,
};

const detailStyle: CSSProperties = {
  ...pixel,
  fontSize: '8px',
  color: 'var(--mfd-text-dim, #999)',
  margin: 0,
};

const labelStyle: CSSProperties = {
  ...pixel,
  fontSize: '7px',
  color: 'var(--mfd-text-dim, #777)',
  marginTop: '8px',
  textAlign: 'right',
};

export function MilestoneCard({
  type,
  headline,
  detail,
  onDismiss,
  duration = 5000,
}: MilestoneCardProps) {
  const [visible, setVisible] = useState(false);
  const Icon = MILESTONE_ICONS[type];
  const color = MILESTONE_COLORS[type];

  useEffect(() => {
    // Slide in
    const showTimer = setTimeout(() => setVisible(true), 50);

    // Auto-dismiss
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400); // wait for slide-out animation
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onDismiss]);

  return (
    <div
      style={visible ? { ...visibleStyle, border: `2px solid ${color}` } : cardStyle}
      onClick={() => {
        setVisible(false);
        setTimeout(onDismiss, 400);
      }}
      role="alert"
      aria-live="polite"
    >
      <div style={headerStyle}>
        <Icon size={28} color={color} />
        <div>
          <p style={{ ...headlineStyle, color }}>{headline}</p>
          <p style={detailStyle}>{detail}</p>
        </div>
      </div>
      <p style={labelStyle}>MILESTONE ACHIEVED — TAP TO DISMISS</p>
    </div>
  );
}
