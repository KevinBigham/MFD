import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import {
  ChampionshipParadeEmitterView,
  resolveChampionshipParadeEvent,
  type ChampionshipSnapshot,
} from './ChampionshipParadeEmitter';

const source = readFileSync(new URL('./ChampionshipParadeEmitter.tsx', import.meta.url), 'utf-8');

const FIRST_TITLE: ChampionshipSnapshot = {
  key: 'team-1:2030',
  year: 2030,
  teamCity: 'Chicago',
  teamName: 'Blaze',
  teamAbbrev: 'CHI',
  seasonRecord: '13-4',
};

const SECOND_TITLE: ChampionshipSnapshot = {
  key: 'team-1:2031',
  year: 2031,
  teamCity: 'Chicago',
  teamName: 'Blaze',
  teamAbbrev: 'CHI',
  seasonRecord: '14-3',
};

describe('ChampionshipParadeEmitter', () => {
  it('renders nothing when the user has no championships', () => {
    const markup = renderToStaticMarkup(<ChampionshipParadeEmitterView championship={null} reducedMotion={false} onDismiss={() => undefined} />);

    expect(markup).toBe('');
  });

  it('opens the parade when the latest championship year increments', () => {
    const event = resolveChampionshipParadeEvent({
      currentChampionship: SECOND_TITLE,
      previousKey: FIRST_TITLE.key,
      firedKeys: new Set(),
    });
    const markup = renderToStaticMarkup(<ChampionshipParadeEmitterView championship={event} reducedMotion={false} onDismiss={() => undefined} />);

    expect(markup).toContain('data-championship-parade="true"');
    expect(markup).toContain('2031');
  });

  it('does not open for a championship already present on initial mount', () => {
    const event = resolveChampionshipParadeEvent({
      currentChampionship: FIRST_TITLE,
      previousKey: null,
      firedKeys: new Set(),
    });

    expect(event).toBeNull();
  });

  it('does not open when the championship snapshot is repeated', () => {
    const event = resolveChampionshipParadeEvent({
      currentChampionship: FIRST_TITLE,
      previousKey: FIRST_TITLE.key,
      firedKeys: new Set(),
    });

    expect(event).toBeNull();
  });

  it('does not re-fire for a championship already fired this session', () => {
    const event = resolveChampionshipParadeEvent({
      currentChampionship: SECOND_TITLE,
      previousKey: FIRST_TITLE.key,
      firedKeys: new Set([SECOND_TITLE.key]),
    });

    expect(event).toBeNull();
  });

  it('passes reduced motion through to the parade surface', () => {
    const markup = renderToStaticMarkup(
      <ChampionshipParadeEmitterView
        championship={SECOND_TITLE}
        reducedMotion
        onDismiss={() => undefined}
      />,
    );

    expect(markup).toContain('data-reduced-motion="true"');
  });

  it('keeps parade dismissal session-local instead of adding a persistent sidecar', () => {
    expect(source).toContain('const previousKey = useRef<string | null>');
    expect(source).toContain('const firedKeys = useRef<Set<string>>(new Set())');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sessionStorage');
  });
});
