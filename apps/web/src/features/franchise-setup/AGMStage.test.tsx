import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AGMProfile } from '@mfd/engine';
import { AGMStage } from './AGMStage';

const agm: AGMProfile = {
  id: 'marcus_webb',
  name: 'Marcus Webb',
  title: 'Director of Football Strategy',
  background: 'Numbers-first operator.',
  personality: 'analytical',
  expertise: 'cap_management',
  selectionPitch: 'Check cap cost before Week 1 choices lock.',
  strengths: ['Payroll cost checks'],
  cardAccent: 'cyan',
  welcomeMonologue: 'Welcome aboard.',
  teachingNarration: {
    what_is_a_head_coach: 'Coach lesson.',
    what_is_a_scouting_director: 'Scout lesson.',
  },
  catchphrase: 'Cost, deadline, consequence.',
  toneModifiers: { enthusiasm: 0.4, bluntness: 0.6, humor: 0.1 },
};

describe('AGMStage', () => {
  it('renders the AGM scene with stage chrome and active state label', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="point" headline="The room has three fires." subhead="Roster, cap, culture." />,
    );

    expect(html).toContain('MARCUS WEBB');
    expect(html).toContain('The room has three fires.');
    expect(html).toContain('Roster, cap, culture.');
    expect(html).toContain('POINT');
  });

  it('renders the assistant as an animated character portrait', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="talk" headline="The room is moving." subhead="Keep the staff aligned." />,
    );

    expect(html).toContain('data-mfd-agm-character="true"');
    expect(html).toContain('role="img"');
    expect(html).toContain('Animated Assistant GM character: Marcus Webb');
  });

  it('uses a full illustrated SVG cartoon instead of the old CSS box puppet', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="point" headline="The room has a real character." subhead="No block puppet." />,
    );

    expect(html).toContain('data-mfd-agm-illustration="cartoon-svg"');
    expect(html).toContain('mfd-agm-svg__face');
    expect(html).not.toContain('mfd-agm-character__torso');
  });

  it('maps stage state into a visible character pose', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="approve" headline="The room bought in." subhead="The opener has a plan." />,
    );

    expect(html).toContain('data-mfd-agm-pose="approve"');
    expect(html).toContain('data-mfd-agm-state="approve"');
  });

  it('keeps the character card separate from scrollable guidance content', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="idle" headline="Start with the room." subhead="Then make the call.">
        <div>Candidate board</div>
      </AGMStage>,
    );

    expect(html).toContain('data-mfd-agm-stage-card="true"');
    expect(html).toContain('data-mfd-agm-stage-content="true"');
    expect(html).toContain('Candidate board');
  });

  it('renders reduced-motion friendly stage content without interactive children', () => {
    const html = renderToStaticMarkup(
      <AGMStage agm={agm} state="concern" headline="Cap pressure is real." subhead="The next move matters." reducedMotion />,
    );

    expect(html).toContain('Cap pressure is real.');
    expect(html).toContain('The next move matters.');
    expect(html).toContain('CONCERN');
    expect(html).toContain('data-mfd-agm-motion="reduced"');
  });

  it('widens the stage rail when Chip guidance is embedded beside early setup choices', () => {
    const html = renderToStaticMarkup(
      <AGMStage
        agm={agm}
        state="talk"
        headline="Pick the right advisor."
        subhead="The consequence changes setup guidance."
        railAddon={<aside data-chip-host="true">Chip rail</aside>}
      />,
    );
    const css = readFileSync(fileURLToPath(new URL('./AGMStage.css', import.meta.url)), 'utf8');

    expect(html).toContain('data-mfd-agm-has-rail-addon="true"');
    expect(html).toContain('Chip rail');
    expect(css).toContain(".mfd-agm-stage[data-mfd-agm-has-rail-addon='true']");
    expect(css).toContain('grid-template-columns: minmax(420px, 540px) minmax(0, 1fr);');
    expect(css).toContain(".mfd-agm-stage[data-mfd-agm-has-rail-addon='true'] .mfd-agm-stage__card");
    expect(css).toContain('overflow: auto;');
    expect(css).toContain('--agm-setup-chip-scroll-clearance: calc(420px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('--agm-setup-chip-scroll-target-clearance: calc(104px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('padding-bottom: var(--agm-setup-chip-scroll-clearance);');
    expect(css).toContain('scroll-padding-bottom: var(--agm-setup-chip-scroll-target-clearance);');
    expect(css).toContain(".mfd-agm-stage[data-mfd-agm-has-rail-addon='true'] .mfd-agm-stage__rail-addon");
    expect(css).toContain('flex: 0 0 auto;');
    expect(css).toContain('overflow: visible;');
    expect(css).toContain(".mfd-agm-stage[data-mfd-agm-has-rail-addon='true'] .mfd-agm-stage__rail-addon [data-chip-host='true']");
    expect(css).toContain('max-height: none;');
    expect(css).toContain('overflow: visible !important;');
    expect(css).toContain('padding-bottom: var(--agm-setup-chip-scroll-clearance, 12px) !important;');
    expect(css).toContain('scroll-margin-bottom: var(--agm-setup-chip-scroll-target-clearance, 104px);');
    expect(css).toContain('scroll-padding-bottom: var(--agm-setup-chip-scroll-target-clearance, 104px);');
    expect(css).toContain("[data-chip-host-companion='true']");
    expect(css).toContain("grid-template-areas:\n    'portrait'\n    'bubble'\n    'controls'\n    'details';");
    expect(css).toContain("[data-chip-host-portrait='true']");
    expect(css).toContain('min-height: clamp(220px, 28vh, 300px);');
    expect(css).toContain('@media (max-width: 1024px)');
    expect(css).toContain(".mfd-agm-stage[data-mfd-agm-has-rail-addon='true'] {\n    --agm-setup-chip-scroll-clearance: calc(480px + env(safe-area-inset-bottom, 0px));\n    --agm-setup-chip-scroll-target-clearance: calc(104px + env(safe-area-inset-bottom, 0px));\n    grid-template-columns: 1fr;");
    expect(css).toContain('max-height: none;');
    expect(css).toContain('overflow: visible !important;');
    expect(css).toContain('overflow: visible;');
    expect(css).toContain('--agm-setup-chip-scroll-clearance: calc(480px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('--agm-setup-chip-scroll-clearance: calc(520px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('--agm-setup-chip-scroll-target-clearance: calc(136px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('@media (max-width: 768px)');
    expect(css).toContain('gap: 8px !important;');
    expect(css).toContain('min-height: clamp(180px, 22vh, 220px);');
    expect(css).toContain('max-height: none;');
    expect(css).toContain('overflow: visible;');
    expect(css).toContain('overscroll-behavior: auto;');
    expect(css).toContain('margin-bottom: var(--mfd-setup-scroll-target-clearance, var(--agm-setup-chip-scroll-target-clearance));');
    expect(css).toContain('padding-bottom: var(--mfd-setup-scroll-target-clearance, var(--agm-setup-chip-scroll-target-clearance)) !important;');
    expect(css).toContain('scroll-padding-bottom: var(--mfd-setup-scroll-target-clearance, var(--agm-setup-chip-scroll-target-clearance));');
    expect(css).toContain('scroll-margin-bottom: var(--mfd-setup-scroll-target-clearance, var(--agm-setup-chip-scroll-target-clearance));');
    expect(css).toContain('padding-bottom: var(--agm-setup-chip-scroll-clearance);');
    expect(css).toContain('padding-bottom: var(--agm-setup-chip-scroll-clearance) !important;');
    expect(css).toContain('scroll-margin-bottom: var(--agm-setup-chip-scroll-target-clearance);');
    expect(css).toContain('scroll-padding-bottom: var(--agm-setup-chip-scroll-target-clearance);');
    expect(css).not.toContain('padding-bottom: 16px !important;');
    expect(css).not.toContain('scroll-padding-bottom: 16px;');
    expect(css).not.toContain('padding-bottom: 0 !important;');
    expect(css).not.toContain('scroll-padding-bottom: 0;');
    expect(css).not.toContain('padding-bottom: 112px;');
    expect(css).not.toContain('scroll-padding-bottom: 152px;');
    expect(css).not.toContain('--agm-setup-chip-scroll-clearance: calc(188px + env(safe-area-inset-bottom, 0px));');
    expect(css).not.toContain('--agm-setup-chip-scroll-clearance: calc(224px + env(safe-area-inset-bottom, 0px));');
    expect(css).not.toContain('--agm-setup-chip-scroll-clearance: calc(260px + env(safe-area-inset-bottom, 0px));');
    expect(css).not.toContain('--agm-setup-chip-scroll-clearance: calc(320px + env(safe-area-inset-bottom, 0px));');
    expect(css).not.toContain('--agm-setup-chip-scroll-clearance: calc(360px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain(".mfd-agm-stage[data-mfd-agm-has-rail-addon='true'] .mfd-agm-stage__rail-addon [data-chip-host-context-details='true']");
    expect(css).toContain('.mfd-chip-host__context-detail');
    expect(css).toContain('grid-template-columns: 1fr;');
    expect(css).toContain('.mfd-chip-host__context-detail-body');
    expect(css).toContain('font-size: 13px;');
    expect(css).toContain('overscroll-behavior: auto;');
    expect(css).toContain(".mfd-agm-stage[data-mfd-agm-has-rail-addon='true'] .mfd-agm-stage__rail-addon .mfd-chip-host__context-list::after");
    expect(css).toContain("content: '';");
    expect(css).toContain('min-height: calc(var(--mfd-setup-scroll-target-clearance, var(--agm-setup-chip-scroll-target-clearance)) + 56px);');
    expect(css).toContain('@media (max-height: 900px)');
    expect(css).toContain('min-height: clamp(180px, 24vh, 240px);');
    expect(css).toContain('@media (max-width: 768px) and (max-height: 900px)');
    expect(css).toContain('min-height: clamp(160px, 20vh, 200px);');
    expect(css).not.toContain('max-height: min(31dvh, 280px);');
    expect(css).toContain('@media (min-width: 641px) and (max-width: 768px)');
    expect(css).toContain('--agm-setup-chip-scroll-clearance: calc(620px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('--agm-setup-chip-scroll-target-clearance: calc(260px + env(safe-area-inset-bottom, 0px));');
    expect(css).toContain('margin-bottom: var(--mfd-setup-scroll-target-clearance, var(--agm-setup-chip-scroll-target-clearance));');

    const tabletBlockStart = css.indexOf('@media (max-width: 1024px)');
    const mediumTabletReachableBlockStart = css.indexOf('@media (min-width: 769px) and (max-width: 1024px)');
    const narrowTabletBlockStart = css.indexOf('@media (max-width: 768px)');
    const phoneBlockStart = css.indexOf('@media (max-width: 640px)');
    const shortBlockStart = css.indexOf('@media (max-height: 900px)');
    const narrowShortBlockStart = css.indexOf('@media (max-width: 768px) and (max-height: 900px)');
    const narrowTabletReachableBlockStart = css.indexOf('@media (min-width: 641px) and (max-width: 768px)');
    const tabletBlock = css.slice(tabletBlockStart, mediumTabletReachableBlockStart);
    const mediumTabletReachableBlock = css.slice(mediumTabletReachableBlockStart, narrowTabletBlockStart);
    const narrowTabletBlock = css.slice(narrowTabletBlockStart, shortBlockStart);
    const shortBlock = css.slice(shortBlockStart, narrowShortBlockStart);
    const narrowShortBlock = css.slice(narrowShortBlockStart, narrowTabletReachableBlockStart);
    const narrowTabletReachableBlock = css.slice(narrowTabletReachableBlockStart, phoneBlockStart);
    const phoneBlock = css.slice(phoneBlockStart);

    expect(tabletBlockStart).toBeGreaterThan(-1);
    expect(mediumTabletReachableBlockStart).toBeGreaterThan(tabletBlockStart);
    expect(narrowTabletBlockStart).toBeGreaterThan(mediumTabletReachableBlockStart);
    expect(shortBlockStart).toBeGreaterThan(narrowTabletBlockStart);
    expect(narrowShortBlockStart).toBeGreaterThan(shortBlockStart);
    expect(narrowTabletReachableBlockStart).toBeGreaterThan(narrowShortBlockStart);
    expect(phoneBlockStart).toBeGreaterThan(narrowTabletReachableBlockStart);
    expect(tabletBlock).toContain('--agm-setup-chip-scroll-clearance: calc(480px + env(safe-area-inset-bottom, 0px));');
    expect(tabletBlock).toContain('--agm-setup-chip-scroll-target-clearance: calc(104px + env(safe-area-inset-bottom, 0px));');
    expect(tabletBlock).toContain('padding-bottom: var(--agm-setup-chip-scroll-clearance) !important;');
    expect(tabletBlock).toContain('scroll-margin-bottom: var(--agm-setup-chip-scroll-target-clearance);');
    expect(tabletBlock).not.toContain('padding-bottom: 16px !important;');
    expect(tabletBlock).not.toContain('scroll-padding-bottom: 16px;');
    expect(mediumTabletReachableBlock).toContain('--agm-setup-chip-scroll-clearance: calc(660px + env(safe-area-inset-bottom, 0px));');
    expect(mediumTabletReachableBlock).toContain('--agm-setup-chip-scroll-target-clearance: calc(260px + env(safe-area-inset-bottom, 0px));');
    expect(mediumTabletReachableBlock).toContain("grid-template-areas:\n      'portrait controls'\n      'portrait bubble'\n      'details details';");
    expect(mediumTabletReachableBlock).toContain('min-height: clamp(200px, 26vh, 260px);');
    expect(mediumTabletReachableBlock).toContain('height: auto;');
    expect(mediumTabletReachableBlock).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(mediumTabletReachableBlock).toContain('grid-template-columns: 1fr;');
    expect(mediumTabletReachableBlock).toContain('gap: 6px;');
    expect(mediumTabletReachableBlock).toContain('.mfd-chip-host__context-list::after');
    expect(mediumTabletReachableBlock).toContain('grid-column: 1 / -1;');
    expect(mediumTabletReachableBlock).toContain('min-height: calc(var(--agm-setup-chip-scroll-target-clearance) + 220px);');
    expect(mediumTabletReachableBlock).not.toContain('min-height: calc(var(--agm-setup-chip-scroll-target-clearance) + 56px);');
    expect(narrowTabletBlock).toContain('max-height: none;');
    expect(narrowTabletBlock).toContain('overflow: visible;');
    expect(narrowTabletBlock).toContain('overscroll-behavior: auto;');
    expect(narrowTabletBlock).toContain('margin-bottom: var(--mfd-setup-scroll-target-clearance, var(--agm-setup-chip-scroll-target-clearance));');
    expect(narrowTabletBlock).toContain('padding-bottom: var(--mfd-setup-scroll-target-clearance, var(--agm-setup-chip-scroll-target-clearance)) !important;');
    expect(narrowTabletBlock).toContain('scroll-padding-bottom: var(--mfd-setup-scroll-target-clearance, var(--agm-setup-chip-scroll-target-clearance));');
    expect(narrowTabletBlock).toContain('scroll-margin-bottom: var(--mfd-setup-scroll-target-clearance, var(--agm-setup-chip-scroll-target-clearance));');
    expect(narrowTabletBlock).toContain('min-height: clamp(180px, 22vh, 220px);');
    expect(narrowTabletBlock).not.toContain('padding-bottom: 20px !important;');
    expect(narrowTabletBlock).not.toContain('scroll-padding-bottom: 20px;');
    expect(shortBlock).toContain('min-height: clamp(180px, 24vh, 240px);');
    expect(narrowShortBlock).toContain('min-height: clamp(160px, 20vh, 200px);');
    expect(narrowShortBlock).toContain('max-height: none;');
    expect(narrowShortBlock).toContain('overflow: visible;');
    expect(narrowTabletReachableBlock).toContain('--agm-setup-chip-scroll-clearance: calc(620px + env(safe-area-inset-bottom, 0px));');
    expect(narrowTabletReachableBlock).toContain('--agm-setup-chip-scroll-target-clearance: calc(260px + env(safe-area-inset-bottom, 0px));');
    expect(narrowTabletReachableBlock).toContain("grid-template-areas:\n      'portrait controls'\n      'portrait bubble'\n      'details details';");
    expect(narrowTabletReachableBlock).toContain('min-height: clamp(170px, 22vh, 210px);');
    expect(narrowTabletReachableBlock).toContain('height: auto;');
    expect(narrowTabletReachableBlock).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(narrowTabletReachableBlock).toContain('grid-template-columns: 1fr;');
    expect(narrowTabletReachableBlock).toContain('font-size: 12px;');
    expect(narrowTabletReachableBlock).toContain('max-height: none;');
    expect(narrowTabletReachableBlock).toContain('overflow: visible;');
    expect(narrowTabletReachableBlock).toContain('overscroll-behavior: auto;');
    expect(narrowTabletReachableBlock).toContain('margin-bottom: var(--agm-setup-chip-scroll-target-clearance);');
    expect(narrowTabletReachableBlock).toContain('padding-bottom: var(--agm-setup-chip-scroll-target-clearance) !important;');
    expect(narrowTabletReachableBlock).toContain('scroll-margin-bottom: var(--agm-setup-chip-scroll-target-clearance);');
    expect(narrowTabletReachableBlock).toContain('scroll-padding-bottom: var(--agm-setup-chip-scroll-target-clearance);');
    expect(narrowTabletReachableBlock).toContain('.mfd-chip-host__context-list::after');
    expect(narrowTabletReachableBlock).toContain('grid-column: 1 / -1;');
    expect(narrowTabletReachableBlock).toContain('min-height: calc(var(--agm-setup-chip-scroll-target-clearance) + 240px);');
    expect(narrowTabletReachableBlock).not.toContain('max-height: min(34vh, 320px);');
    expect(narrowTabletReachableBlock).not.toContain('max-height: min(34dvh, 320px);');
    expect(narrowTabletReachableBlock).not.toContain('max-height: min(40dvh, 360px);');
    expect(narrowTabletReachableBlock).not.toContain('max-height: min(31dvh, 280px);');
    expect(phoneBlock).toContain('--agm-setup-chip-scroll-clearance: calc(520px + env(safe-area-inset-bottom, 0px));');
    expect(phoneBlock).toContain('--agm-setup-chip-scroll-target-clearance: calc(136px + env(safe-area-inset-bottom, 0px));');
    expect(phoneBlock).toContain('padding-bottom: var(--agm-setup-chip-scroll-clearance) !important;');
    expect(phoneBlock).toContain('scroll-margin-bottom: var(--agm-setup-chip-scroll-target-clearance);');
    expect(phoneBlock).not.toContain('padding-bottom: 12px !important;');
    expect(phoneBlock).not.toContain('scroll-padding-bottom: 12px;');
  });
});
