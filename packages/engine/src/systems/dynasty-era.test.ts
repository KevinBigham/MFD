import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import {
  endDynastyEra,
  generateEraSuggestions,
  getDynastyEraHistory,
  shouldPromptEraNaming,
  startDynastyEra,
} from './dynasty-era';
import { makeLeagueState } from './test-helpers';

function seasonEntry(year: number, teamId: string, playoffFinish = 'missed_playoffs') {
  return {
    year,
    teamId,
    wins: 9,
    losses: 8,
    ties: 0,
    record: '9-8',
    pointDifferential: 12,
    playoffFinish,
    majorEvents: [],
    awardsWon: [],
    recordsBroken: [],
  };
}

describe('dynasty era system', () => {
  it('prompts after a championship when no active era exists', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;

    game.playoffBracket = {
      season: game.year,
      afc: [],
      nfc: [],
      matchups: [],
      championTeamId: userTeam.id,
    };
    game.userDynastyEras = [];

    expect(shouldPromptEraNaming(game)).toBe(true);
  });

  it('does not prompt when an era is already active', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;

    game.playoffBracket = {
      season: game.year,
      afc: [],
      nfc: [],
      matchups: [],
      championTeamId: userTeam.id,
    };
    game.userDynastyEras = [{
      name: 'The Standard',
      startYear: 2025,
      endYear: null,
      trigger: 'manual',
      achievements: ['Built the roster foundation'],
    }];

    expect(shouldPromptEraNaming(game)).toBe(false);
  });

  it('returns five unique suggestion options', () => {
    const game = makeLeagueState('offseason');
    const suggestions = generateEraSuggestions(game, mulberry32(7));

    expect(suggestions).toHaveLength(5);
    expect(new Set(suggestions.map((suggestion) => suggestion.name)).size).toBe(5);
  });

  it('uses the best player name in one of the suggestions', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;

    userTeam.roster[0]!.name = 'Elias King';
    userTeam.roster[0]!.ovr = 99;
    userTeam.roster[1]!.ovr = 70;

    const suggestions = generateEraSuggestions(game, mulberry32(11));

    expect(suggestions.some((suggestion) => suggestion.name.includes('Elias King'))).toBe(true);
  });

  it('startDynastyEra creates a new active era and mirrors it to the user team', () => {
    const game = makeLeagueState('offseason');
    game.franchiseHistory = [
      seasonEntry(2021, 'afce1'),
      seasonEntry(2022, 'afce1'),
      seasonEntry(2023, 'afce1'),
      seasonEntry(2024, 'afce1'),
      seasonEntry(2025, 'afce1'),
    ];

    const nextState = startDynastyEra(game, 'The Golden Era');
    const userTeam = Object.values(nextState.teams).find((team) => team.isUser)!;

    expect(nextState.userDynastyEras).toHaveLength(1);
    expect(nextState.userDynastyEras?.[0]?.name).toBe('The Golden Era');
    expect(nextState.userDynastyEras?.[0]?.trigger).toBe('milestone');
    expect(userTeam.era).toBe('The Golden Era');
  });

  it('startDynastyEra infers a championship trigger when the user team just won the title', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;

    game.playoffBracket = {
      season: game.year,
      afc: [],
      nfc: [],
      matchups: [],
      championTeamId: userTeam.id,
    };

    const nextState = startDynastyEra(game, 'Dynasty I');

    expect(nextState.userDynastyEras?.[0]?.trigger).toBe('championship');
  });

  it('endDynastyEra closes the active era and clears the user team label', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;

    userTeam.era = 'The Standard';
    game.userDynastyEras = [{
      name: 'The Standard',
      startYear: 2022,
      endYear: null,
      trigger: 'manual',
      achievements: ['Opened the window'],
    }];

    const nextState = endDynastyEra(game);
    const nextUserTeam = Object.values(nextState.teams).find((team) => team.isUser)!;

    expect(nextState.userDynastyEras?.[0]?.endYear).toBe(game.year);
    expect(nextUserTeam.era).toBeNull();
  });

  it('returns era history in chronological order', () => {
    const game = makeLeagueState('offseason');
    game.userDynastyEras = [
      {
        name: 'Dynasty II',
        startYear: 2031,
        endYear: null,
        trigger: 'manual',
        achievements: ['Second window'],
      },
      {
        name: 'Dynasty I',
        startYear: 2028,
        endYear: 2030,
        trigger: 'championship',
        achievements: ['Won the first title'],
      },
    ];

    expect(getDynastyEraHistory(game).map((era) => era.name)).toEqual(['Dynasty I', 'Dynasty II']);
  });

  it('does not prompt before the fifth recorded season without a championship', () => {
    const game = makeLeagueState('offseason');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;

    game.franchiseHistory = [
      seasonEntry(2022, userTeam.id),
      seasonEntry(2023, userTeam.id),
      seasonEntry(2024, userTeam.id),
      seasonEntry(2025, userTeam.id),
    ];

    expect(shouldPromptEraNaming(game)).toBe(false);
  });
});
