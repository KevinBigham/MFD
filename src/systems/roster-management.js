/**
 * MFD Roster Management
 *
 * Position battle detection and cut advisor for roster management.
 */
import { STARTER_COUNTS } from './scouting.js';
import { v36_capHit, v36_deadIfCut } from './contract-helpers.js';
import { ROSTER_CAP } from '../config/cap-math.js';

export function detectPositionBattles974(roster){
  var battles=[];
  var starterSlots=STARTER_COUNTS||{};
  Object.keys(starterSlots).forEach(function(pos){
    if(pos==="K"||pos==="P")return;
    var players=(roster||[]).filter(function(p){
      return p&&p.pos===pos&&(!p.injury||!p.injury.games);
    }).sort(function(a,b){return (b.ovr||0)-(a.ovr||0);});
    if(players.length<2)return;
    var starter=players[0];
    var challenger=players[1];
    var gap=(starter.ovr||0)-(challenger.ovr||0);
    if(gap<=5||((challenger.age||99)<=24&&((challenger.pot||0)>=(starter.ovr||0)))){
      battles.push({
        pos:pos,
        incumbent:{id:starter.id,name:starter.name,ovr:starter.ovr||0,age:starter.age||0,salary:v36_capHit(starter.contract||{})},
        challenger:{id:challenger.id,name:challenger.name,ovr:challenger.ovr||0,age:challenger.age||0,pot:challenger.pot||0,salary:v36_capHit(challenger.contract||{})},
        resolved:false,
        winner:null
      });
    }
  });
  return battles.slice(0,4);
}

export function buildCutAdvisor974(roster,rosterCap){
  var overBy=(roster||[]).length-(rosterCap||ROSTER_CAP);
  if(overBy<=0)return null;
  var candidates=(roster||[]).slice().sort(function(a,b){
    var aScore=(a.ovr||0)+(a.isStarter?20:0)+(((a.pot||0)>(a.ovr||0))?5:0)+((a.age||99)<=24?5:0);
    var bScore=(b.ovr||0)+(b.isStarter?20:0)+(((b.pot||0)>(b.ovr||0))?5:0)+((b.age||99)<=24?5:0);
    var aSal=v36_capHit(a.contract||{})||0;
    var bSal=v36_capHit(b.contract||{})||0;
    if((a.ovr||0)<65)aScore-=aSal*2;
    if((b.ovr||0)<65)bScore-=bSal*2;
    return aScore-bScore;
  });
  return {
    overBy:overBy,
    suggestions:candidates.slice(0,Math.min(overBy+3,10)).map(function(p){
      var deadMoney=v36_deadIfCut(p.contract||{});
      var salary=v36_capHit(p.contract||{})||0;
      var reason=(p.ovr||0)<60?"Low OVR":
        ((p.ovr||0)<65&&salary>3)?"Overpaid backup":
        (!p.isStarter&&(p.age||0)>=30)?"Aging non-starter":"Roster crunch";
      return {id:p.id,name:p.name,pos:p.pos,ovr:p.ovr||0,age:p.age||0,salary:salary,deadMoney:deadMoney,reason:reason};
    })
  };
}
