/**
 * Sprint 44 — Mobile bottom tab bar.
 *
 * Renders 5 primary destinations as a sticky bottom bar at phone widths
 * (max-width: 768px) and a hamburger-style "More" drawer for everything
 * else. Desktop / tablet continue to use the grouped TopNav.
 *
 * Visibility is controlled by CSS (design-system/tokens/index.css):
 *   - [data-mfd-mobile-nav="true"] is display:none above --mfd-bp-md.
 *   - [data-mfd-top-nav="true"]   is display:none below --mfd-bp-md.
 */
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { LayoutDashboard, Users, Map as MapIcon, Play, Menu, X } from 'lucide-react';

interface PrimaryItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

/** 4 primary destinations + a trailing "More" slot = 5 total columns. */
const PRIMARY_ITEMS: ReadonlyArray<Omit<PrimaryItem, 'icon'>> = [
  { path: '/',             label: 'Briefing' },
  { path: '/roster',       label: 'Roster' },
  { path: '/game-plan',    label: 'Plan' },
  { path: '/week-advance', label: 'Advance' },
];

const PRIMARY_ICON: Record<string, React.ReactNode> = {
  '/':             <LayoutDashboard size={16} />,
  '/roster':       <Users size={16} />,
  '/game-plan':    <MapIcon size={16} />,
  '/week-advance': <Play size={16} />,
};

export interface MobileBottomTabBarProps {
  activePath: string;
  /** Grouped secondary nav — mirrors desktop NAV_GROUPS so "More" feels familiar. */
  drawerGroups: Array<{
    id: string;
    label: string;
    items: Array<{ path: string; shortLabel: string; icon: React.ReactNode }>;
  }>;
  badges: Record<string, number>;
}

export function MobileBottomTabBar({ activePath, drawerGroups, badges }: MobileBottomTabBarProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const primaryPaths = useMemo(() => new Set(PRIMARY_ITEMS.map((i) => i.path)), []);
  const moreActive = !primaryPaths.has(activePath);
  const activeLabel = useMemo(() => {
    const primary = PRIMARY_ITEMS.find((item) => item.path === activePath);
    if (primary) return primary.label;
    for (const group of drawerGroups) {
      const item = group.items.find((candidate) => candidate.path === activePath);
      if (item) return item.shortLabel;
    }
    return 'Current route';
  }, [activePath, drawerGroups]);

  const go = useCallback((path: string) => {
    void router.navigate({ to: path });
    setDrawerOpen(false);
  }, [router]);

  return (
    <>
      <nav
        data-mfd-mobile-nav="true"
        aria-label="Primary"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'none', /* enabled via media query */
          zIndex: 52,
          background: 'linear-gradient(0deg, rgba(3, 4, 5, 0.98) 0%, rgba(17, 24, 32, 0.98) 100%)',
          borderTop: '1px solid rgba(255, 215, 0, 0.62)',
          boxShadow: '0 -18px 36px rgba(0, 0, 0, 0.46)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          width: '100%',
        }}>
          {PRIMARY_ITEMS.map((item) => {
            const active = item.path === activePath;
            const badge = badges[item.path] ?? 0;
            return (
              <button
                key={item.path}
                type="button"
                data-nav={item.path}
                data-mfd-nav-item="true"
                aria-current={active ? 'page' : undefined}
                onClick={() => go(item.path)}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  minHeight: 'var(--mfd-touch-min)',
                  padding: '9px 4px',
                  background: active ? 'rgba(255, 215, 0, 0.12)' : 'transparent',
                  border: 'none',
                  borderTop: active ? '2px solid var(--mfd-gold)' : '2px solid transparent',
                  color: active ? 'var(--mfd-gold)' : 'var(--mfd-text-dim)',
                  fontFamily: 'var(--mfd-font-pixel)',
                  fontSize: '7px',
                  lineHeight: 1.2,
                  letterSpacing: 0,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {PRIMARY_ICON[item.path]}
                <span>{item.label}</span>
                {badge > 0 ? (
                  <span
                    aria-label={`${badge} update`}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 10,
                      minWidth: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--mfd-red)',
                    }}
                  />
                ) : null}
              </button>
            );
          })}

          {/* "More" — opens drawer with every other destination */}
          <button
            type="button"
            data-mfd-nav-item="true"
            data-selected={drawerOpen || moreActive ? 'true' : 'false'}
            aria-current={moreActive ? 'page' : undefined}
            aria-expanded={drawerOpen}
            aria-controls="mfd-mobile-drawer"
            onClick={() => setDrawerOpen((v) => !v)}
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              minHeight: 'var(--mfd-touch-min)',
              padding: '9px 4px',
              background: drawerOpen || moreActive ? 'rgba(255, 215, 0, 0.12)' : 'transparent',
              border: 'none',
              borderTop: drawerOpen || moreActive ? '2px solid var(--mfd-gold)' : '2px solid transparent',
              color: drawerOpen || moreActive ? 'var(--mfd-gold)' : 'var(--mfd-text-dim)',
              fontFamily: 'var(--mfd-font-pixel)',
              fontSize: '7px',
              lineHeight: 1.2,
              letterSpacing: 0,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            <Menu size={16} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {drawerOpen ? (
        <div
          data-mfd-mobile-nav="true"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'none', /* enabled via media query */
            zIndex: 70,
          }}
        >
          {/* Scrim */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeDrawer}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.72)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          />
          {/* Sheet */}
          <div
            id="mfd-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="More destinations"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: '82vh',
              overflowY: 'auto',
              background: 'var(--mfd-surface-raised)',
              borderTop: '1px solid rgba(255, 215, 0, 0.64)',
              padding: '12px 12px calc(12px + env(safe-area-inset-bottom, 0))',
              boxShadow: 'var(--mfd-shadow-lg)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 10,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <span style={{
                  fontFamily: 'var(--mfd-font-pixel)',
                  fontSize: 9,
                  letterSpacing: 0,
                  color: 'var(--mfd-gold)',
                }}>
                  ALL DESTINATIONS
                </span>
                <span style={{
                  overflow: 'hidden',
                  color: 'var(--mfd-text-dim)',
                  fontFamily: 'var(--mfd-font-mono)',
                  fontSize: 11,
                  lineHeight: 1.35,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  Current: {activeLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  background: 'transparent',
                  border: '2px solid var(--mfd-border)',
                  color: 'var(--mfd-text)',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {drawerGroups.map((group) => {
                const items = group.items.filter((i) => !primaryPaths.has(i.path));
                if (items.length === 0) return null;
                return (
                  <section key={group.id}>
                    <h3 style={{
                      margin: '0 0 6px 0',
                      fontFamily: 'var(--mfd-font-pixel)',
                      fontSize: 7,
                      letterSpacing: 0,
                      color: 'var(--mfd-text-faint)',
                      textTransform: 'uppercase',
                    }}>
                      {group.label}
                    </h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 6,
                    }}>
                      {items.map((item) => {
                        const active = item.path === activePath;
                        const badge = badges[item.path] ?? 0;
                        return (
                          <button
                            key={item.path}
                            type="button"
                            data-nav={item.path}
                            data-mfd-nav-item="true"
                            data-selected={active ? 'true' : 'false'}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => go(item.path)}
                            style={{
                              position: 'relative',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 'var(--mfd-touch-min)',
                              padding: '8px 10px',
                              background: active ? 'rgba(255, 215, 0, 0.12)' : 'var(--mfd-bg-3)',
                              border: `2px solid ${active ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                              borderRadius: 'var(--mfd-rad-md)',
                              color: active ? 'var(--mfd-gold)' : 'var(--mfd-text)',
                              fontFamily: 'var(--mfd-font-pixel)',
                              fontSize: 8,
                              lineHeight: 1.25,
                              letterSpacing: 0,
                              textTransform: 'uppercase',
                              textAlign: 'left',
                              cursor: 'pointer',
                            }}
                          >
                            {item.icon}
                            <span style={{ flex: 1 }}>{item.shortLabel}</span>
                            {active ? (
                              <span
                                aria-hidden="true"
                                style={{
                                  padding: '2px 4px',
                                  border: '1px solid var(--mfd-gold)',
                                  color: 'var(--mfd-gold)',
                                  fontSize: 6,
                                  lineHeight: 1,
                                  flexShrink: 0,
                                }}
                              >
                                ACTIVE
                              </span>
                            ) : null}
                            {badge > 0 ? (
                              <span
                                aria-hidden="true"
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: 'var(--mfd-red)',
                                  flexShrink: 0,
                                }}
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
