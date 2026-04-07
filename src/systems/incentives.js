/**
 * MFD Contract Incentives System (v98.6)
 *
 * Performance-based bonus triggers for player contracts.
 * Seven incentive types across all positions.
 */

export var INCENTIVES_986 = {
  types: [
    { id: 'pass_yds', label: 'Pass Yards', threshold: 3500, bonus: 2.0, pos: ['QB'] },
    { id: 'rush_yds', label: 'Rush Yards', threshold: 800, bonus: 1.5, pos: ['RB'] },
    { id: 'rec_yds', label: 'Rec Yards', threshold: 700, bonus: 1.5, pos: ['WR', 'TE'] },
    { id: 'sacks', label: 'Sacks', threshold: 8, bonus: 1.5, pos: ['DL', 'LB'] },
    { id: 'ints', label: 'Interceptions', threshold: 4, bonus: 1.0, pos: ['CB', 'S'] },
    {
      id: 'pro_bowl',
      label: 'Pro Bowl',
      threshold: 1,
      bonus: 2.5,
      pos: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'],
    },
    {
      id: 'playoffs',
      label: 'Make Playoffs',
      threshold: 1,
      bonus: 1.0,
      pos: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'],
    },
  ],
  check: function (player, teamRecord) {
    if (!player || !player.incentives986)
      return { hit: [], miss: [], totalBonus: 0 };
    var hit = [],
      miss = [],
      total = 0;
    var s = player.stats || {};
    (player.incentives986 || []).forEach(function (inc) {
      var val = 0;
      if (inc.id === 'pass_yds') val = s.passYds || 0;
      else if (inc.id === 'rush_yds') val = s.rushYds || 0;
      else if (inc.id === 'rec_yds') val = s.recYds || 0;
      else if (inc.id === 'sacks') val = s.sacks || 0;
      else if (inc.id === 'ints') val = s.defINT || 0;
      else if (inc.id === 'playoffs')
        val = teamRecord && teamRecord.madePlayoffs ? 1 : 0;
      if (val >= inc.threshold) {
        hit.push(inc);
        total += inc.bonus;
      } else miss.push(inc);
    });
    return { hit: hit, miss: miss, totalBonus: total };
  },
};
