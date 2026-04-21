import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SeasonRecap } from '@mfd/engine';
import { copyRecapAsText, exportRecapAsPng, formatRecapAsText } from './recap-share';

const toPngMock = vi.fn(async () => 'data:image/png;base64,season-recap');
const writeTextMock = vi.fn(async () => undefined);

const recap: SeasonRecap = {
  teamId: 'afce1',
  teamName: 'Blaze',
  teamCity: 'Chicago',
  teamAbbr: 'CHI',
  seasonYear: 2026,
  record: '12-5',
  wins: 12,
  losses: 5,
  ties: 0,
  division: 'East',
  conference: 'AFC',
  divisionFinish: 1,
  conferenceFinish: 2,
  playoffResult: 'conf-loss',
  teamAwards: ['MVP'],
  topPerformers: {
    passingLeader: {
      playerId: 'qb-1',
      playerName: 'Cole Stone',
      pos: 'QB',
      value: 4612,
      gamesPlayed: 17,
      perGame: 271.3,
    },
    rushingLeader: {
      playerId: 'rb-1',
      playerName: 'Jay Mercer',
      pos: 'RB',
      value: 1487,
      gamesPlayed: 17,
      perGame: 87.5,
    },
  },
  seasonStory: 'Your contention window widened instead of closing.',
  teamMotto: 'Fear The Burn',
  breakoutCandidates: [],
};

vi.mock('html-to-image', () => ({
  toPng: toPngMock,
}));

describe('recap-share', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: writeTextMock,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    toPngMock.mockClear();
    writeTextMock.mockClear();
  });

  it('exportRecapAsPng returns a data URL string', async () => {
    const dataUrl = await exportRecapAsPng({} as HTMLElement);

    expect(dataUrl).toBe('data:image/png;base64,season-recap');
    expect(toPngMock).toHaveBeenCalledTimes(1);
  });

  it('copyRecapAsText writes the plain-text summary to navigator.clipboard', async () => {
    await copyRecapAsText(recap);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
  });

  it('copyRecapAsText output includes the record, playoff result, and season story line', async () => {
    const output = await copyRecapAsText(recap);

    expect(output).toContain('Record: 12-5');
    expect(output).toContain('Playoff Result: Conference Final Loss');
    expect(output).toContain('Story: Your contention window widened instead of closing.');
  });

  it('formatRecapAsText includes awards and leader summaries', () => {
    const output = formatRecapAsText(recap);

    expect(output).toContain('Awards: MVP');
    expect(output).toContain('Passing Leader: Cole Stone');
    expect(output).toContain('Rushing Leader: Jay Mercer');
  });
});
