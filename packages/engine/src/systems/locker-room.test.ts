import { describe, expect, it } from 'vitest';
import {
  assignCliques,
  callTeamMeeting,
  electCaptains,
  getCultureLabel,
  getLockerRoomGameBonus,
  initializeLockerRoom,
  triggerCaptainRally,
  updateLockerRoomWeekly,
} from './locker-room';
import { makeTeam } from './test-helpers';

function sequenceRng(values: number[]) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

describe('locker room system', () => {
  it('assigns 28+ players to the vets clique', () => {
    const team = makeTeam('vet', 'AFC', 'East', true, 80);
    const veteran = team.roster[0]!;
    veteran.age = 29;
    veteran.yearsExp = 7;
    veteran.ovr = 80;
    veteran.devTrait = 'normal';

    const assignments = assignCliques(team.roster);

    expect(assignments[veteran.id]).toBe(0);
    expect(veteran.cliqueId).toBe(0);
  });

  it('gives stars precedence over vets when both rules match', () => {
    const team = makeTeam('star', 'AFC', 'East', true, 80);
    const player = team.roster[0]!;
    player.age = 31;
    player.yearsExp = 9;
    player.ovr = 91;
    player.devTrait = 'superstar';

    const assignments = assignCliques(team.roster);

    expect(assignments[player.id]).toBe(2);
  });

  it('elects vocal leaders before other captain candidates', () => {
    const team = makeTeam('capt', 'AFC', 'East', true, 80);
    const vocal = team.roster[1]!;
    vocal.ovr = 82;
    vocal.yearsExp = 6;
    vocal.traits = ['vocal_leader'];
    const higherOvr = team.roster[0]!;
    higherOvr.ovr = 90;
    higherOvr.yearsExp = 8;
    higherOvr.traits = [];

    const captains = electCaptains(team, initializeLockerRoom(team, () => 0.4), () => 0.1);

    expect(captains[0]?.playerId).toBe(vocal.id);
  });

  it('applies the cancer trait penalty to clique cohesion on weekly update', () => {
    const team = makeTeam('cancer', 'AFC', 'East', true, 80);
    const trouble = team.roster[0]!;
    trouble.traits = ['cancer'];
    const lockerRoom = initializeLockerRoom(team, () => 0.3);
    const cliqueId = trouble.cliqueId!;
    const before = lockerRoom.cliques.find((clique) => clique.id === cliqueId)!.cohesion;

    const updated = updateLockerRoomWeekly(team, lockerRoom, null, () => 0.99).lockerRoom;
    const after = updated.cliques.find((clique) => clique.id === cliqueId)!.cohesion;

    expect(after).toBe(before - 6);
  });

  it('boosts every clique when a captain rally succeeds', () => {
    const team = makeTeam('rally', 'AFC', 'East', true, 80);
    team.streak = -3;
    const captain = team.roster[0]!;
    captain.traits = ['vocal_leader'];
    captain.ovr = 85;
    captain.yearsExp = 8;
    const lockerRoom = initializeLockerRoom(team, () => 0.2);
    const rallyCaptain = lockerRoom.captains[0]!;
    const before = lockerRoom.cliques.map((clique) => clique.cohesion);

    const after = triggerCaptainRally(lockerRoom, rallyCaptain.playerId, team);

    expect(after.cliques.map((clique) => clique.cohesion)).toEqual(before.map((value) => value + 5));
  });

  it('resolves active tensions during a team meeting', () => {
    const team = makeTeam('meet', 'AFC', 'East', true, 80);
    const lockerRoom = {
      ...initializeLockerRoom(team, () => 0.2),
      tensions: [
        { id: 't1', type: 'playing_time' as const, involvedPlayerIds: [team.roster[0]!.id], involvedCliqueIds: [0], severity: 'minor' as const, weekCreated: 1, resolved: false, narrative: 'Rotation fight.' },
        { id: 't2', type: 'contract_envy' as const, involvedPlayerIds: [team.roster[1]!.id], involvedCliqueIds: [1], severity: 'moderate' as const, weekCreated: 1, resolved: false, narrative: 'Money side-eye.' },
      ],
    };

    const outcome = callTeamMeeting(team, lockerRoom, () => 0.8, 5);

    expect(outcome.lockerRoom.tensions.filter((tension) => tension.resolved)).toHaveLength(2);
    expect(outcome.narrative).toContain('cooled off');
  });

  it('maps culture scores to the correct labels', () => {
    expect(getCultureLabel(18)).toBe('toxic');
    expect(getCultureLabel(35)).toBe('fragile');
    expect(getCultureLabel(55)).toBe('stable');
    expect(getCultureLabel(70)).toBe('strong');
    expect(getCultureLabel(88)).toBe('elite');
  });

  it('applies negative game bonus for toxic culture', () => {
    const bonus = getLockerRoomGameBonus({
      cliques: [],
      captains: [],
      culture: 'toxic',
      cultureScore: 12,
      tensions: [],
      lastMeetingWeek: null,
    });

    expect(bonus.teamOvrBonus).toBe(-2);
  });

  it('prevents rookie hazing tensions when a captain has hazing shield', () => {
    const team = makeTeam('shield', 'AFC', 'East', true, 74);
    const veteran = team.roster[0]!;
    veteran.age = 31;
    veteran.yearsExp = 8;
    const rookie = team.roster[1]!;
    rookie.age = 22;
    rookie.yearsExp = 0;
    rookie.pos = veteran.pos;
    const lockerRoom = initializeLockerRoom(team, () => 0.2);
    lockerRoom.captains = [{
      playerId: veteran.id,
      playerName: veteran.name,
      captainMoments: 0,
      rallyCooldown: 0,
      perks: ['hazing_shield'],
    }];
    lockerRoom.culture = 'fragile';
    lockerRoom.cultureScore = 35;

    const outcome = updateLockerRoomWeekly(team, lockerRoom, null, sequenceRng([0, 0.9, 0.2]));

    expect(outcome.events[0]?.type).not.toBe('rookie_hazing');
  });
});
