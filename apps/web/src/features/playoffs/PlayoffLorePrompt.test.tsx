import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PlayoffLoreCard } from '../../lib/playoff-lore';

const { exportRecapAsPngMock } = vi.hoisted(() => ({
  exportRecapAsPngMock: vi.fn(async () => 'data:image/png;base64,stub'),
}));

const {
  createExportFrameMock,
  exportCleanupMock,
  framedNode,
} = vi.hoisted(() => ({
  createExportFrameMock: vi.fn(),
  exportCleanupMock: vi.fn(),
  framedNode: {} as HTMLElement,
}));

const baseCard: PlayoffLoreCard = {
  gameId: 'playoff-2026-19',
  seasonYear: 2026,
  week: 19,
  round: 'wild_card',
  outcome: 'win',
  headline: 'Chicago survives the knife fight',
  finalScore: '27-24',
  opponentTeamId: 'opp',
  loreHook: 'Won after trailing by 14+ entering the fourth quarter.',
  heroBlocks: [
    { label: 'Spotlight', value: 'Cole Stone // 23/34, 288 yds, 2 TD' },
    { label: 'Swing', value: 'Turnover edge turned the quarter.' },
    { label: 'Tagline', value: 'The season stayed alive.' },
  ],
  tags: ['Cinderella', 'Named Game', 'Call Shot Hit'],
  namedGameName: 'The Comeback',
};

const mockStore = {
  team: { id: 'team-1' as string | null },
  pendingPlayoffLoreReveal: baseCard as PlayoffLoreCard | null,
  actions: {
    clearPendingPlayoffLoreReveal: vi.fn(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
  selectUserTeam: (state: typeof mockStore) => state.team,
}));

vi.mock('@mfd/design-system/components', () => ({
  PixelBadge: ({ children }: any) => <span>{children}</span>,
  PixelButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  PixelModal: ({ title, children }: any) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  PixelPanel: ({ title, children }: any) => (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  ),
}));

vi.mock('../season/recap-share', () => ({
  exportRecapAsPng: exportRecapAsPngMock,
}));

vi.mock('../season/export-frame', () => ({
  createExportFrame: createExportFrameMock,
}));

import {
  dismissPlayoffLorePrompt,
  exportPlayoffLoreAsPng,
  PlayoffLorePrompt,
} from './PlayoffLorePrompt';

describe('PlayoffLorePrompt', () => {
  beforeEach(() => {
    createExportFrameMock.mockReset();
    exportCleanupMock.mockReset();
    createExportFrameMock.mockReturnValue({
      frame: framedNode,
      cleanup: exportCleanupMock,
    });
  });

  it('renders the scoreboard-led playoff lore modal when a reveal card exists', () => {
    const markup = renderToStaticMarkup(<PlayoffLorePrompt open onClose={() => undefined} />);

    expect(markup).toContain('Playoff Lore Card');
    expect(markup).toContain('Wild Card');
    expect(markup).toContain('27-24');
    expect(markup).toContain('The Comeback');
  });

  it('includes export and dismiss actions in the prompt body', () => {
    const markup = renderToStaticMarkup(<PlayoffLorePrompt open onClose={() => undefined} />);

    expect(markup).toContain('Export PNG');
    expect(markup).toContain('Dismiss');
  });

  it('returns null when no pending reveal card exists', () => {
    mockStore.pendingPlayoffLoreReveal = null as never;

    const markup = renderToStaticMarkup(<PlayoffLorePrompt open onClose={() => undefined} />);

    expect(markup).toBe('');

    mockStore.pendingPlayoffLoreReveal = baseCard;
  });

  it('dismiss helper clears the reveal card and closes the modal', () => {
    const onClose = vi.fn();
    dismissPlayoffLorePrompt(mockStore.actions.clearPendingPlayoffLoreReveal, onClose);

    expect(mockStore.actions.clearPendingPlayoffLoreReveal).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exports the lore card through the shared html-to-image helper without emoji', async () => {
    const target = {} as HTMLElement;
    const markup = renderToStaticMarkup(<PlayoffLorePrompt open onClose={() => undefined} />);

    expect(markup).not.toMatch(/\p{Extended_Pictographic}/u);
    await exportPlayoffLoreAsPng(target, mockStore.pendingPlayoffLoreReveal!);

    expect(createExportFrameMock).toHaveBeenCalled();
    expect(exportRecapAsPngMock).toHaveBeenCalledWith(framedNode);
    expect(exportCleanupMock).toHaveBeenCalledTimes(1);
  });
});
