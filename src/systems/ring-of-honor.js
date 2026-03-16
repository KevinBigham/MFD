/**
 * MFD Ring of Honor
 *
 * Tracks retired player honors per team. Players with 82+ OVR
 * are automatically nominated when they leave a roster.
 */

import { mulberry32 } from '../utils/rng.js';

var RING_OF_HONOR_LOG={};// {teamId: [{name, pos, number, year, seasons, ovr, reason}]}

export function nominateForRing(teamId,player,year){
  if(!RING_OF_HONOR_LOG[teamId])RING_OF_HONOR_LOG[teamId]=[];
  if(RING_OF_HONOR_LOG[teamId].some(function(h){return h.name===player.name;}))return false;
  RING_OF_HONOR_LOG[teamId].push({name:player.name,pos:player.pos,
    number:player.number||Math.floor(mulberry32(42+RING_OF_HONOR_LOG[teamId].length)()*89)+10,// deterministic fallback
    year:year,ovr:player.ovr,
    reason:player.ovr>=85?"Franchise legend":player.ovr>=80?"Fan favorite":"Beloved veteran"});
  return true;
}
export function autoRingOfHonor(teams,history,year){
  if(history.length<3)return;
  var currentNames={};
  teams.forEach(function(t){t.roster.forEach(function(p){currentNames[p.name]=true;});});
  var lastSeason=history[history.length-1];
  if(!lastSeason||!lastSeason.teams)return;
  lastSeason.teams.forEach(function(ht){
    ht.roster.forEach(function(p){
      if(!currentNames[p.name]&&p.ovr>=82){
        nominateForRing(ht.id||ht.abbr,p,year);
      }
    });
  });
}
export function getRingOfHonor(teamId){
  return(RING_OF_HONOR_LOG[teamId]||[]).slice().sort(function(a,b){return b.ovr-a.ovr;});
}
export function replaceRingOfHonorLog(nextLog){
  Object.keys(RING_OF_HONOR_LOG).forEach(function(key){
    delete RING_OF_HONOR_LOG[key];
  });
  Object.assign(RING_OF_HONOR_LOG,nextLog||{});
  return RING_OF_HONOR_LOG;
}
export { RING_OF_HONOR_LOG };
