import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const shellCss = readFileSync(fileURLToPath(new URL('./app-shell.css', import.meta.url)), 'utf8');

describe('app shell responsive layout CSS', () => {
  it('reserves a narrower desktop Chip runway without collapsing the command surface', () => {
    expect(shellCss).toContain('padding-right: clamp(310px, 27vw, 360px)');
    expect(shellCss).toContain('padding-right: clamp(320px, 25vw, 370px)');
  });

  it('pairs mobile content clearance with the bottom nav and compact Chip dock', () => {
    expect(shellCss).toContain('var(--mfd-mobile-nav-height)');
    expect(shellCss).toContain('var(--mfd-mobile-chip-clearance)');
    expect(shellCss).toContain('.mfd-roster-summary-grid');
  });

  it('keeps the phone Chip runway at the bottom-nav clearance even while the dock is expanded', () => {
    const phoneBlock = shellCss.slice(shellCss.indexOf('@media (max-width: 768px)'));
    expect(phoneBlock).toContain(
      "html[data-mfd-chip-dock='expanded'] [data-mfd-chip-enabled='true'] .mfd-app-main",
    );
  });

  it('adds horizontal nav rail affordance and reduced-motion protection', () => {
    expect(shellCss).toContain('.mfd-app-nav-active-strip::after');
    expect(shellCss).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
