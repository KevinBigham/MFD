/**
 * MFD Theme Configuration — Terminal Maximalism Edition
 *
 * All visual tokens — colors, spacing, border radius, shadows,
 * typography, motion, and base component style objects.
 *
 * Design language: Bloomberg Terminal meets editorial data visualization.
 * Amber dominant with sharp accents, bold typography, atmospheric depth.
 * IBM Plex Sans for body, IBM Plex Serif for display headers,
 * JetBrains Mono for terminal/data.
 */

// ── Typography ──────────────────────────────────────────
export var FONT = {
  body: "'IBM Plex Sans','Inter',system-ui,sans-serif",
  display: "'IBM Plex Serif','Georgia',serif",
  mono: "'JetBrains Mono','Fira Code','Courier New',monospace",
};

// ── Color Palette ───────────────────────────────────────
export var T = {
  bg: '#070d17',
  bg2: '#0e1826',
  bg3: '#19253a',
  surface: '#0e1826',
  text: '#e8ecf1',
  dim: '#8a97aa',
  faint: '#4a5a6e',
  gold: '#f0a028',          // Bloomberg amber — dominant accent
  goldDim: 'rgba(240,160,40,0.12)',
  goldMid: 'rgba(240,160,40,0.25)',
  green: '#00b87a',
  red: '#e03c3c',
  blue: '#4a9fe8',
  orange: '#e07a10',
  purple: '#8b72ea',
  cyan: '#00afc8',
  border: 'rgba(255,255,255,0.09)',
  borderHover: 'rgba(240,160,40,0.3)',
  glass: '#0e1826',         // solid surface — no blur
  glassBorder: 'rgba(255,255,255,0.09)',
  shadow: '0 1px 3px rgba(0,0,0,0.7)',
  neonGlow: 'none',
  backdrop: 'none',
  // Atmospheric gradients
  gradientSubtle: 'linear-gradient(135deg, #070d17 0%, #0e1826 50%, #0a1020 100%)',
  gradientCard: 'linear-gradient(180deg, #19253a 0%, #0e1826 100%)',
  gradientGold: 'linear-gradient(135deg, rgba(240,160,40,0.08) 0%, transparent 60%)',
};

// ── Spacing Scale ───────────────────────────────────────
export var SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 };

// ── Border Radius Scale — sharp, Bloomberg-style ────────
export var RAD = { xs: 1, sm: 2, md: 3, lg: 4, xl: 6 };

// ── Shadow Scale ────────────────────────────────────────
export var SH = {
  sm: '0 1px 3px rgba(0,0,0,0.7)',
  md: '0 2px 8px rgba(0,0,0,0.6)',
  lg: '0 4px 16px rgba(0,0,0,0.7)',
  glow: 'none',
  goldGlow: '0 0 8px rgba(240,160,40,0.15)',
  goldGlowStrong: '0 0 16px rgba(240,160,40,0.3)',
};

// ── Motion Tokens ───────────────────────────────────────
export var MOTION = {
  fast: '0.08s ease',
  normal: '0.2s ease',
  slow: '0.4s ease-out',
  spring: '0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  fadeIn: 'mfd-fadein 0.3s ease-out both',
  slideIn: 'mfd-slideIn 0.3s ease-out both',
  pulse: 'mfd-pulse 2s ease-in-out infinite',
};

// ── Base Component Style Objects ────────────────────────
export var S = {
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    border: 'none',
    borderRadius: RAD.md,
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: FONT.body,
    letterSpacing: '0.3px',
  },
  btnPrimary: {
    background: '#f0a028',
    color: '#000',
    boxShadow: '0 2px 8px rgba(240,160,40,0.2)',
  },
  btnGhost: {
    background: 'transparent',
    color: T.dim,
    border: '1px solid ' + T.border,
  },
  btnDanger: {
    background: 'rgba(224,60,60,0.15)',
    color: T.red,
    border: '1px solid rgba(224,60,60,0.3)',
  },
  btnSmall: {
    padding: '5px 10px',
    fontSize: 10,
    borderRadius: RAD.sm,
  },
  card: {
    background: T.gradientCard,
    border: '1px solid ' + T.border,
    borderRadius: RAD.lg,
    padding: SP.lg,
    boxShadow: SH.md,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '2px 8px',
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: FONT.body,
    letterSpacing: '0.3px',
  },
  badgeGold: { background: 'rgba(240,160,40,0.18)', color: T.gold },
  badgeGreen: { background: 'rgba(0,184,122,0.18)', color: T.green },
  badgeRed: { background: 'rgba(224,60,60,0.18)', color: T.red },
  badgePurple: { background: 'rgba(139,114,234,0.18)', color: T.purple },
  badgeCyan: { background: 'rgba(0,175,200,0.18)', color: T.cyan },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    fontFamily: FONT.display,
    letterSpacing: '0.5px',
    marginBottom: SP.md,
    color: T.text,
  },
  kpiBox: {
    textAlign: 'center',
    padding: SP.md,
    borderRadius: RAD.md,
    background: 'rgba(255,255,255,0.03)',
    minWidth: 70,
    transition: 'background 0.2s ease',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1,
    fontFamily: FONT.mono,
    letterSpacing: '-0.5px',
  },
  kpiLabel: {
    fontSize: 9,
    color: T.dim,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontFamily: FONT.body,
    fontWeight: 600,
  },
  scanlines: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background:
      'repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(0,0,0,0.03) 1px,rgba(0,0,0,0.03) 2px)',
    pointerEvents: 'none',
    zIndex: 9999,
    opacity: 0.5,
  },
  header: {
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontWeight: 700,
    fontFamily: FONT.display,
  },
  mono: {
    fontFamily: FONT.mono,
    letterSpacing: '0.5px',
  },
  studioCard: {
    background: T.gradientCard,
    border: '1px solid rgba(240,160,40,0.2)',
    borderRadius: RAD.lg,
    padding: SP.lg,
  },
  ticker: {
    background: 'rgba(0,0,0,0.7)',
    borderTop: '2px solid ' + T.gold,
    padding: '6px 12px',
    fontSize: 10,
    color: T.gold,
    fontWeight: 700,
    fontFamily: FONT.mono,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    letterSpacing: '0.5px',
  },
  fab: {
    position: 'fixed',
    bottom: 16,
    right: 16,
    zIndex: 100,
    borderRadius: RAD.md,
    padding: '14px 24px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 4px 16px rgba(240,160,40,0.3)',
    background: '#f0a028',
    color: '#000',
    letterSpacing: '0.5px',
    fontFamily: FONT.body,
    transition: 'all 0.2s ease',
  },
  toastArea: {
    position: 'fixed',
    top: 12,
    right: 12,
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    pointerEvents: 'none',
  },
  toast: {
    pointerEvents: 'auto',
    background: T.bg2,
    border: '1px solid ' + T.border,
    borderRadius: RAD.md,
    padding: '8px 12px',
    boxShadow: SH.lg,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 220,
    maxWidth: 280,
    animation: 'mfd-slideIn 0.3s ease-out forwards',
    color: T.text,
    fontFamily: FONT.body,
  },
  bracketContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: 20,
    overflowX: 'auto',
    background: T.bg2,
    borderRadius: RAD.lg,
    border: '1px solid ' + T.border,
  },
  matchCard: {
    background: T.bg,
    border: '1px solid ' + T.border,
    borderRadius: RAD.md,
    padding: 8,
    width: 150,
    position: 'relative',
    boxShadow: SH.sm,
    transition: 'border-color 0.2s ease',
  },
  // ── Atmosphere layer — subtle grid pattern behind content ──
  atmosphere: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
    opacity: 0.35,
    background:
      'radial-gradient(ellipse at 20% 50%, rgba(240,160,40,0.04) 0%, transparent 50%),' +
      'radial-gradient(ellipse at 80% 20%, rgba(74,159,232,0.03) 0%, transparent 40%),' +
      'radial-gradient(ellipse at 50% 80%, rgba(139,114,234,0.02) 0%, transparent 45%)',
  },
  // ── Data grid pattern — dot matrix overlay ──
  gridPattern: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
    opacity: 0.12,
    backgroundImage:
      'radial-gradient(circle, rgba(240,160,40,0.3) 1px, transparent 1px)',
    backgroundSize: '24px 24px',
  },
  // ── Gold accent line — top border for premium sections ──
  goldAccent: {
    borderTop: '2px solid ' + T.gold,
    boxShadow: '0 -2px 8px rgba(240,160,40,0.15)',
  },
  // ── Display header — for big moments, overlays, titles ──
  displayHeader: {
    fontFamily: FONT.display,
    fontWeight: 700,
    letterSpacing: '1px',
    lineHeight: 1.1,
  },
};
