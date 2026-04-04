import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import {
  RELOCATION_DESTINATIONS,
  acceptStadiumDeal,
  canRelocate,
  createDefaultFranchiseIdentity,
  generateStadiumDeals,
  getStadiumHomeFieldBonus,
  initializeFranchiseIdentity,
  relocateTeam,
  updateAttendance,
  updateFanbase,
  updatePrestige,
  upgradeStadium,
} from './franchise-identity';
import { makeTeam } from './test-helpers';

describe('franchise identity', () => {
  it('increases fanbase after a winning playoff season and decreases it after a losing season', () => {
    const team = makeTeam('chi', 'AFC', 'North', true, 82);
    const identity = { ...createDefaultFranchiseIdentity({ city: team.city, stadiumType: team.stadiumType }), fanbase: 60 };

    const improved = updateFanbase(identity, { ...team, streak: 4 }, { wins: 12, losses: 5, playoffFinish: 'divisional_exit' });
    const dropped = updateFanbase(identity, { ...team, streak: -4 }, { wins: 4, losses: 13, playoffFinish: 'missed_playoffs' });

    expect(improved.fanbase).toBeGreaterThan(identity.fanbase);
    expect(dropped.fanbase).toBeLessThan(identity.fanbase);
  });

  it('grows prestige from championships and decays it on losing seasons', () => {
    const team = makeTeam('chi', 'AFC', 'North', true, 82);
    const identity = { ...createDefaultFranchiseIdentity({ city: team.city, stadiumType: team.stadiumType }), prestige: 55 };

    const dynasty = updatePrestige(identity, { ...team, wins: 13, losses: 4 }, { championships: 1, playoffAppearances: 1, hallOfFamers: 0 });
    const decline = updatePrestige(identity, { ...team, wins: 5, losses: 12 }, { championships: 0, playoffAppearances: 0, hallOfFamers: 0 });

    expect(dynasty.prestige).toBeGreaterThan(identity.prestige);
    expect(decline.prestige).toBeLessThan(identity.prestige);
  });

  it('generates three valid stadium naming-rights deals with deterministic rng', () => {
    const left = generateStadiumDeals(mulberry32(42));
    const right = generateStadiumDeals(mulberry32(42));

    expect(left).toEqual(right);
    expect(left).toHaveLength(3);
    for (const deal of left) {
      expect(deal.revenuePerYear).toBeGreaterThanOrEqual(3.2);
      expect(deal.revenuePerYear).toBeLessThanOrEqual(14.4);
      expect(deal.yearsTotal).toBeGreaterThanOrEqual(3);
      expect(deal.yearsTotal).toBeLessThanOrEqual(15);
    }
  });

  it('upgrades stadium levels at the correct cost and increases home field bonus', () => {
    const team = makeTeam('chi', 'AFC', 'North', true, 82);
    team.capSpace = 60;
    const identity = createDefaultFranchiseIdentity({ city: team.city, stadiumType: team.stadiumType });

    const upgraded = upgradeStadium(identity, team);

    expect(upgraded).not.toBeNull();
    expect(upgraded?.cost).toBe(50);
    expect(upgraded?.identity.stadiumLevel).toBe(2);
    expect(getStadiumHomeFieldBonus(upgraded!.identity)).toBe(1);
  });

  it('relocates the team identity and applies chemistry and morale hits', () => {
    const team = makeTeam('chi', 'AFC', 'North', true, 82);
    const destination = RELOCATION_DESTINATIONS.find((entry) => entry.city === 'London')!;
    const beforeChemistry = team.roster.map((player) => player.chemistry);
    const beforeMorale = team.roster.map((player) => player.morale);

    const moved = relocateTeam(team, team.franchiseIdentity, destination, 2031, mulberry32(9));

    expect(moved.team.city).toBe('London');
    expect(moved.team.name).toBe('Monarchs');
    expect(moved.team.abbr).toBe('LDN');
    expect(moved.identity.relocationHistory).toHaveLength(1);
    expect(moved.identity.stadiumLevel).toBe(1);
    expect(moved.team.roster.some((player, index) => player.chemistry < beforeChemistry[index]!)).toBe(true);
    expect(moved.team.roster.some((player, index) => player.morale < beforeMorale[index]!)).toBe(true);
  });

  it('blocks relocation when the five-year cooldown has not elapsed', () => {
    const team = makeTeam('chi', 'AFC', 'North', true, 82);
    team.capSpace = 100;
    const identity = {
      ...team.franchiseIdentity,
      relocationHistory: [{
        fromCity: 'Chicago',
        fromName: 'Club',
        toCity: 'Austin',
        toName: 'Blazers',
        year: 2028,
      }],
    };

    expect(canRelocate(identity, team, 2031)).toBe(false);
    expect(canRelocate(identity, team, 2034)).toBe(true);
  });

  it('attendance rises with stronger fanbase, prestige, and record', () => {
    const lowTeam = makeTeam('chi', 'AFC', 'North', true, 82);
    lowTeam.wins = 4;
    lowTeam.losses = 13;
    const highTeam = makeTeam('dal', 'NFC', 'East', false, 86);
    highTeam.wins = 13;
    highTeam.losses = 4;

    const lowAttendance = updateAttendance({
      ...lowTeam.franchiseIdentity,
      fanbase: 35,
      prestige: 30,
      stadiumLevel: 1,
    }, lowTeam);
    const highAttendance = updateAttendance({
      ...highTeam.franchiseIdentity,
      fanbase: 88,
      prestige: 82,
      stadiumLevel: 3,
    }, highTeam);

    expect(highAttendance).toBeGreaterThan(lowAttendance);
  });

  it('scales home field bonus by stadium level', () => {
    const identity = createDefaultFranchiseIdentity({ city: 'Chicago', stadiumType: 'outdoor' });

    expect(getStadiumHomeFieldBonus(identity)).toBe(0);
    expect(getStadiumHomeFieldBonus({ ...identity, stadiumLevel: 2 })).toBe(1);
    expect(getStadiumHomeFieldBonus({ ...identity, stadiumLevel: 3 })).toBe(2);
  });

  it('initializes identity deterministically from a seeded rng', () => {
    const team = makeTeam('chi', 'AFC', 'North', true, 82);

    expect(initializeFranchiseIdentity(team, mulberry32(21))).toEqual(
      initializeFranchiseIdentity(team, mulberry32(21)),
    );
  });

  it('accepts stadium deals by updating the name and prestige bonus', () => {
    const identity = createDefaultFranchiseIdentity({ city: 'Chicago', stadiumType: 'outdoor' });
    const [deal] = generateStadiumDeals(mulberry32(7));

    const next = acceptStadiumDeal(identity, deal!);

    expect(next.stadiumName).toBe(deal!.sponsorName);
    expect(next.stadiumDeal?.yearsRemaining).toBe(deal!.yearsTotal);
    expect(next.prestige).toBeGreaterThan(identity.prestige);
  });
});
