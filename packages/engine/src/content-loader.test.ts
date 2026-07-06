import { describe, expect, it } from 'vitest';
import {
  getAgmDialogueLine,
  getAwardSpeech,
  getBroadcastTemplate,
  getCallYourShotReactions,
  getCoachArchetype,
  getContingencyCallouts,
  getPersonalityLine,
  getRevengeLineTemplates,
  getScoutingReportTemplate,
  getTeamContent,
  getTeamFanCulture,
  getTeamStadiumContent,
  getTeamStadiumTradition,
  getTeamRivalryContent,
} from './content-loader';

describe('content loader dormant content accessors', () => {
  it('returns scouting report template arrays by position and tier', () => {
    const template = getScoutingReportTemplate('QB', 'elite');

    expect(template).not.toBeNull();
    expect(template?.length).toBeGreaterThan(0);
    expect(template?.[0]).toContain('arm');
  });

  it('normalizes live coach archetype labels into content entries', () => {
    const archetype = getCoachArchetype('Air Attack');

    expect(archetype).not.toBeNull();
    expect(archetype?.id).toBe('offensive_genius');
    expect(archetype?.press_conference[0]).toContain('leverage');
  });

  it('builds award speeches using player personality tone and interpolation', () => {
    const speech = getAwardSpeech('mvp', {
      name: 'Quincy Hale',
      teamName: 'Chicago Deep Dish',
      coachName: 'Dana Price',
      year: 2031,
      stat: '4,982 passing yards',
      personality: { workEthic: 9, loyalty: 7, greed: 3, pressure: 9, ambition: 10 },
    }, () => 0);

    expect(speech).not.toBeNull();
    expect(speech?.presenterIntro).toContain('Quincy Hale');
    expect(speech?.acceptance).toContain('Chicago Deep Dish');
    expect(speech?.acceptance).toContain('4,982 passing yards');
  });

  it('chooses personality flavor lines from the strongest personality signal for a scenario', () => {
    const line = getPersonalityLine({
      workEthic: 9,
      loyalty: 4,
      greed: 3,
      pressure: 7,
      ambition: 8,
    }, 'socialPost', () => 0);

    expect(line).toContain('5AM');
  });

  it('loads AGM dialogue by persona, event, and context', () => {
    const line = getAgmDialogueLine('marcus_webb', 'gameStart', 'winning_record', () => 0);

    expect(line).toContain('keep the current starters together');
    expect(line).not.toContain('numbers never lie');
  });

  it('loads authored revenge-game line pools through the content loader', () => {
    const pregame = getRevengeLineTemplates('pregame.agm');
    const halftime = getRevengeLineTemplates('halftime.commentary');
    const recap = getRevengeLineTemplates('postgame.agm');
    const newsline = getRevengeLineTemplates('postgame.newsline');

    expect(pregame.length).toBeGreaterThan(0);
    expect(halftime.length).toBeGreaterThan(0);
    expect(recap.length).toBeGreaterThan(0);
    expect(newsline.length).toBeGreaterThan(0);
    expect(pregame[0]).toContain('{{subjectName}}');
    expect(halftime.some((line) => line.includes('{{formerTeam}}'))).toBe(true);
    expect(recap[0]).toContain('{{subjectName}}');
    expect(newsline[0]).toContain('{{currentTeam}}');
  });

  it('renders broadcast templates with placeholder interpolation', () => {
    const opener = getBroadcastTemplate('routine_pass', 'openers', () => 0, {
      player: 'Jules Mercer',
      team: 'Peaches',
      yards: 9,
    });
    const ending = getBroadcastTemplate('routine_pass', 'endings', () => 0, {
      player: 'Jules Mercer',
      team: 'Peaches',
      yards: 9,
    });

    expect(opener).toBe('Jules Mercer quick throw');
    expect(ending).toBe('for 9, moves chains.');
  });

  it('returns authored Call Your Shot reaction pools by outcome', () => {
    const hitReactions = getCallYourShotReactions('hit');
    const missReactions = getCallYourShotReactions('miss');
    const partialReactions = getCallYourShotReactions('partial');

    expect(hitReactions.length).toBeGreaterThanOrEqual(3);
    expect(missReactions.length).toBeGreaterThanOrEqual(3);
    expect(partialReactions.length).toBeGreaterThanOrEqual(3);
    expect(hitReactions[0]?.quote).toBeTruthy();
    expect(missReactions[0]?.speaker).toBeTruthy();
  });

  it('returns contingency callout pools for sprint trigger types', () => {
    const callouts = getContingencyCallouts('go_air_raid');

    expect(callouts.length).toBeGreaterThanOrEqual(5);
    expect(callouts[0]).toContain('{responseLabel}');
  });

  it('loads full team identity content by team id', () => {
    const team = getTeamContent('KC');

    expect(team).not.toBeNull();
    expect(team?.stadium.name).toBe('The Smokehouse');
    expect(team?.fanCulture.nickname).toBe('Burnt End Brigade');
  });

  it('returns stadium tradition and fan-culture accessors', () => {
    const tradition = getTeamStadiumTradition('DEN');
    const fanCulture = getTeamFanCulture('DEN');

    expect(tradition).toContain('Opening Bell');
    expect(fanCulture?.nickname).toBe('The Brokers');
  });

  it('prefers standalone stadium content over embedded team stadium fields', () => {
    const atlTeam = getTeamContent('ATL');
    const atlStadium = getTeamStadiumContent('ATL');
    const balTeam = getTeamContent('BAL');
    const balStadium = getTeamStadiumContent('BAL');
    const bosTeam = getTeamContent('BOS');
    const bosStadium = getTeamStadiumContent('BOS');
    const chiTeam = getTeamContent('CHI');
    const chiStadium = getTeamStadiumContent('CHI');
    const cinTeam = getTeamContent('CIN');
    const cinStadium = getTeamStadiumContent('CIN');
    const cleTeam = getTeamContent('CLE');
    const cleStadium = getTeamStadiumContent('CLE');
    const dalTeam = getTeamContent('DAL');
    const dalStadium = getTeamStadiumContent('DAL');
    const kcTeam = getTeamContent('KC');
    const kcStadium = getTeamStadiumContent('KC');
    const denTeam = getTeamContent('DEN');
    const denStadium = getTeamStadiumContent('DEN');
    const detTeam = getTeamContent('DET');
    const detStadium = getTeamStadiumContent('DET');
    const nycTeam = getTeamContent('NYC');
    const nycStadium = getTeamStadiumContent('NYC');
    const phiTeam = getTeamContent('PHI');
    const phiStadium = getTeamStadiumContent('PHI');
    const pitTeam = getTeamContent('PIT');
    const pitStadium = getTeamStadiumContent('PIT');
    const seaTeam = getTeamContent('SEA');
    const seaStadium = getTeamStadiumContent('SEA');
    const sfTeam = getTeamContent('SF');
    const sfStadium = getTeamStadiumContent('SF');

    expect(atlTeam?.stadium.tradition).toContain('Pit Spit');
    expect(atlStadium?.tradition).toContain('gold-painted peach pit');
    expect(getTeamStadiumTradition('ATL')).toContain('midfield crate');

    if (!atlStadium || !('cue' in atlStadium)) throw new Error('Expected standalone ATL stadium cue');
    expect(atlStadium.cue?.pregameLine).toContain('gold peach pit');

    expect(balTeam?.stadium.tradition).toContain('Mallet Smash');
    expect(balStadium?.tradition).toContain('score-prediction pieces');
    expect(getTeamStadiumTradition('BAL')).toContain('former Crab Pickers defender');

    if (!balStadium || !('cue' in balStadium)) throw new Error('Expected standalone BAL stadium cue');
    expect(balStadium.cue?.pregameLine).toContain('giant mallet');

    expect(bosTeam?.stadium.tradition).toContain('20-foot ladle');
    expect(bosStadium?.tradition).toContain('north end-zone bread bowl');
    expect(getTeamStadiumTradition('BOS')).toContain('wicked loud');

    if (!bosStadium || !('cue' in bosStadium)) throw new Error('Expected standalone BOS stadium cue');
    expect(bosStadium.cue?.pregameLine).toContain('harbor bell');

    expect(chiTeam?.stadium.tradition).toContain('hockey stick');
    expect(chiStadium?.tradition).toContain('lake-wind roar');
    expect(getTeamStadiumTradition('CHI')).toContain('Casserole Crew');

    if (!chiStadium || !('cue' in chiStadium)) throw new Error('Expected standalone CHI stadium cue');
    expect(chiStadium.cue?.pregameLine).toContain('six-foot pie');

    expect(cinTeam?.stadium.tradition).toContain('drone swarm');
    expect(cinStadium?.tradition).toContain('chrome flying pig');
    expect(getTeamStadiumTradition('CIN')).toContain('sky loop');

    if (!cinStadium || !('cue' in cinStadium)) throw new Error('Expected standalone CIN stadium cue');
    expect(cinStadium.cue?.pregameLine).toContain('chrome flying pig');

    expect(cleTeam?.stadium.tradition).toContain('30-second riff');
    expect(cleStadium?.tradition).toContain('kickoff shakes the amps');
    expect(getTeamStadiumTradition('CLE')).toContain('Dawg Pound Pit');

    if (!cleStadium || !('cue' in cleStadium)) throw new Error('Expected standalone CLE stadium cue');
    expect(cleStadium.cue?.pregameLine).toContain('opening solo');

    expect(dalTeam?.stadium.tradition).toContain('mechanical bull');
    expect(dalStadium?.tradition).toContain('scoreboard cattle gate');
    expect(getTeamStadiumTradition('DAL')).toContain('eight-second horn');

    if (!dalStadium || !('cue' in dalStadium)) throw new Error('Expected standalone DAL stadium cue');
    expect(dalStadium.cue?.pregameLine).toContain('silver mechanical bull');

    expect(kcTeam?.stadium.tradition).toContain("Pitmaster's Torch");
    expect(kcStadium?.tradition).toContain('smoker-fountain');
    expect(getTeamStadiumTradition('KC')).toContain('Burnt End Brigade');

    expect(denTeam?.stadium.tradition).toContain('NYSE bell');
    expect(denStadium?.tradition).toContain('north deck');
    expect(getTeamStadiumTradition('DEN')).toContain('green rally towels');

    if (!denStadium || !('cue' in denStadium)) throw new Error('Expected standalone DEN stadium cue');
    expect(denStadium.cue?.pregameLine).toContain('brass bell');

    expect(detTeam?.stadium.tradition).toContain('Bass Drop');
    expect(detStadium?.tradition).toContain('Motor City Bass Drop');
    expect(getTeamStadiumTradition('DET')).toContain('first drive is already on beat');

    if (!detStadium || !('cue' in detStadium)) throw new Error('Expected standalone DET stadium cue');
    expect(detStadium.cue?.pregameLine).toContain('assembly-belt countdown');

    expect(nycTeam?.stadium.tradition).toContain('78 yellow cabs');
    expect(nycStadium?.tradition).toContain('kickoff fare');
    expect(getTeamStadiumTradition('NYC')).toContain('seventy-eight cab horns');

    if (!nycStadium || !('cue' in nycStadium)) throw new Error('Expected standalone NYC stadium cue');
    expect(nycStadium.cue?.pregameLine).toContain('dispatch board');

    expect(phiTeam?.stadium.tradition).toContain("Crack Heard 'Round the World");
    expect(phiStadium?.tradition).toContain('Liberty Bell Run');
    expect(getTeamStadiumTradition('PHI')).toContain('retired Bell-Ringers captain');

    if (!phiStadium || !('cue' in phiStadium)) throw new Error('Expected standalone PHI stadium cue');
    expect(phiStadium.cue?.pregameLine).toContain('cracked bell');

    expect(pitTeam?.stadium.tradition).toContain('molten steel');
    expect(pitStadium?.tradition).toContain('scoreboard slag chute');
    expect(getTeamStadiumTradition('PIT')).toContain('The Mill');

    if (!pitStadium || !('cue' in pitStadium)) throw new Error('Expected standalone PIT stadium cue');
    expect(pitStadium.cue?.pregameLine).toContain('ceremonial ladle');

    expect(seaTeam?.stadium.tradition).toContain('The Feedback');
    expect(seaStadium?.tradition).toContain('Eleven-String Feedback');
    expect(getTeamStadiumTradition('SEA')).toContain('first defensive stand');

    if (!seaStadium || !('cue' in seaStadium)) throw new Error('Expected standalone SEA stadium cue');
    expect(seaStadium.cue?.pregameLine).toContain('tunnel guitars');

    expect(sfTeam?.stadium.tradition).toContain('Mother Dough');
    expect(sfStadium?.tradition).toContain('Dough Keeper');
    expect(getTeamStadiumTradition('SF')).toContain('offense is ready to proof');

    if (!sfStadium || !('cue' in sfStadium)) throw new Error('Expected standalone SF stadium cue');
    expect(sfStadium.cue?.pregameLine).toContain('old starter');
  });

  it('looks up authored rivalry content between two teams', () => {
    const rivalry = getTeamRivalryContent('KC', 'DEN');

    expect(rivalry).not.toBeNull();
    expect(rivalry?.name).toBe('The Cookout');
    expect(rivalry?.narrative).toContain('Sauce');
  });
});
