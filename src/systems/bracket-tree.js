/**
 * MFD Playoff Bracket Tree
 *
 * Builds a visual bracket tree from playoff game results,
 * organized by round (wildcard, divisional, conf championship, super bowl).
 */

export function buildBracketTree(playoffGames,teams){
  if(!playoffGames||playoffGames.length===0)return null;
  var rounds={wildcard:[],divisional:[],confChamp:[],superBowl:[]};
  playoffGames.forEach(function(g){
    if(!g)return;
    var r=g.round||"wildcard";
    if(rounds[r])rounds[r].push(g);
  });
  function toNode(g){
    if(!g)return null;
    var home=teams.find(function(t){return t.id===g.home;});
    var away=teams.find(function(t){return t.id===g.away;});
    return{home:{id:g.home,abbr:home?home.abbr:"?",icon:home?home.icon:"?",seed:g.homeSeed||0},
      away:{id:g.away,abbr:away?away.abbr:"?",icon:away?away.icon:"?",seed:g.awaySeed||0},
      homeScore:g.result?g.result.homeScore:null,awayScore:g.result?g.result.awayScore:null,
      played:!!g.played,winnerId:g.result?(g.result.homeScore>g.result.awayScore?g.home:g.away):null};
  }
  return{wildcard:rounds.wildcard.map(toNode),divisional:rounds.divisional.map(toNode),
    confChamp:rounds.confChamp.map(toNode),superBowl:rounds.superBowl.map(toNode)};
}
