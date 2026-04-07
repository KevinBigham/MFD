/**
 * MFD Coach Legacy Tracking
 *
 * Tracks coaching records across seasons — wins, losses, rings,
 * best seasons, and team history for each head coach.
 */

var COACH_LEGACY_LOG={};// { coachName: {name, totalWins, totalLosses, rings, seasons, teams:[]} }

export function updateCoachLegacy(teams,season){
  teams.forEach(function(t){
    if(!t.coaches||!t.coaches.HC)return;
    var hc=t.coaches.HC;
    var key=hc.name||"HC "+t.abbr;
    if(!COACH_LEGACY_LOG[key])COACH_LEGACY_LOG[key]={name:key,totalWins:0,totalLosses:0,rings:0,seasons:0,teams:{},bestSeason:null};
    var c=COACH_LEGACY_LOG[key];
    c.totalWins+=t.wins;c.totalLosses+=t.losses;c.seasons++;
    c.teams[t.abbr]=true;
    var wpct=t.wins/(Math.max(1,t.wins+t.losses));
    if(!c.bestSeason||wpct>(c.bestSeason.wpct||0)){
      c.bestSeason={year:season.year,team:t.abbr,wins:t.wins,losses:t.losses,wpct:wpct};
    }
  });
}
export function recordCoachRing(teams,champId){
  var champ=teams.find(function(t){return t.id===champId;});
  if(!champ||!champ.coaches||!champ.coaches.HC)return;
  var key=champ.coaches.HC.name||"HC "+champ.abbr;
  if(COACH_LEGACY_LOG[key])COACH_LEGACY_LOG[key].rings++;
}
export function getCoachLegacyTop(n){
  return Object.keys(COACH_LEGACY_LOG).map(function(k){return COACH_LEGACY_LOG[k];}).sort(function(a,b){return b.totalWins-a.totalWins;}).slice(0,n||10);
}
export function replaceCoachLegacyLog(nextLog){
  Object.keys(COACH_LEGACY_LOG).forEach(function(key){
    delete COACH_LEGACY_LOG[key];
  });
  Object.assign(COACH_LEGACY_LOG,nextLog||{});
  return COACH_LEGACY_LOG;
}
export { COACH_LEGACY_LOG };
