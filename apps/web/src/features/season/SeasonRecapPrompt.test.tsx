import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const { buildSeasonRecapMock, navigateToMock } = vi.hoisted(() => ({
  buildSeasonRecapMock: vi.fn(),
  navigateToMock: vi.fn(),
}));

const mockStore = {
  game: {
    year: 2027,
  },
  team: {
    id: 'afce1',
    city: 'Chicago',
    name: 'Blaze',
  },
  actions: {
    setRecapPromptSeenThisSession: vi.fn(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
  selectUserTeam: (state: typeof mockStore) => state.team,
}));

vi.mock('@mfd/engine', () => ({
  buildSeasonRecap: buildSeasonRecapMock,
}));

vi.mock('../shared/pixelUi', () => ({
  monoSm: {},
  pixelSm: {},
  navigateTo: navigateToMock,
}));

import {
  SeasonRecapPrompt,
  dismissSeasonRecapPrompt,
  openSeasonRecapScreen,
  shouldOpenSeasonRecapPrompt,
} from './SeasonRecapPrompt';

describe('SeasonRecapPrompt', () => {
  it('renders when the prompt is open and a recap is available', () => {
    buildSeasonRecapMock.mockReturnValue({
      seasonYear: 2026,
      record: '12-5',
      seasonStory: 'A title push stayed alive deep into January.',
    });

    const markup = renderToStaticMarkup(<SeasonRecapPrompt open onClose={() => undefined} />);

    expect(markup).toContain('Season Recap Ready');
    expect(markup).toContain('View Season Recap');
    expect(markup).toContain('12-5');
  });

  it('prompt helper returns true when the year just rolled and the recap exists', () => {
    buildSeasonRecapMock.mockReturnValue({ seasonYear: 2026 });

    expect(shouldOpenSeasonRecapPrompt(2026, { year: 2027 } as never, 'afce1', false)).toBe(true);
  });

  it('dismissing marks the prompt seen and prevents re-fire', () => {
    const setSeen = vi.fn();
    const onClose = vi.fn();
    buildSeasonRecapMock.mockReturnValue({ seasonYear: 2026 });

    dismissSeasonRecapPrompt(setSeen, onClose);

    expect(setSeen).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(shouldOpenSeasonRecapPrompt(2026, { year: 2027 } as never, 'afce1', true)).toBe(false);
  });

  it('cta navigates to the season recap route', () => {
    const setSeen = vi.fn();
    const onClose = vi.fn();

    openSeasonRecapScreen(setSeen, onClose);

    expect(setSeen).toHaveBeenCalledWith(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(navigateToMock).toHaveBeenCalledWith('/season/recap');
  });

  it('does not render on mid-season state changes when no recap is available', () => {
    buildSeasonRecapMock.mockReturnValue(null);

    expect(shouldOpenSeasonRecapPrompt(2027, { year: 2027 } as never, 'afce1', false)).toBe(false);
  });
});
