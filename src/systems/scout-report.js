/**
 * MFD Scout Report Generator
 *
 * Generates opponent scouting reports with scheme analysis,
 * star players, weaknesses, scheme counter tips, injury
 * intel, momentum, and rivalry heat.
 */
import { OFF_PLANS, DEF_PLANS, SCHEME_COUNTERS } from '../config/schemes.js';
import { rivalryKey } from './rivalry-engine.js';

export var SCOUT_REPORT={
  generate:function(myTeam,oppTeam,sched,season,rivalries){
    if(!myTeam||!oppTeam)return null;
    var offPlan=OFF_PLANS.find(function(p){return p.id===(oppTeam.gameplanOff||"balanced_o");})||OFF_PLANS[0];
    var defPlan=DEF_PLANS.find(function(p){return p.id===(oppTeam.gameplanDef||"balanced_d");})||DEF_PLANS[0];
    var stars=oppTeam.roster.filter(function(p){return p.isStarter&&p.ovr>=78;})
      .sort(function(a,b){return b.ovr-a.ovr;}).slice(0,4)
      .map(function(p){return{name:p.name,pos:p.pos,ovr:p.ovr,trait:p.trait||"none",
        threat:p.ovr>=88?"ELITE":p.ovr>=82?"DANGEROUS":"SOLID"};});
    var posAvg={};
    oppTeam.roster.filter(function(p){return p.isStarter;}).forEach(function(p){
      if(!posAvg[p.pos])posAvg[p.pos]={total:0,count:0};
      posAvg[p.pos].total+=p.ovr;posAvg[p.pos].count++;
    });
    var weaknesses=Object.keys(posAvg).map(function(pos){return{pos:pos,avg:Math.round(posAvg[pos].total/posAvg[pos].count)};})
      .sort(function(a,b){return a.avg-b.avg;}).slice(0,3)
      .map(function(w){return{pos:w.pos,avg:w.avg,note:w.avg<65?"Exploitable":w.avg<72?"Below average":"Mediocre"};});
    var myOff=OFF_PLANS.find(function(p){return p.id===(myTeam.gameplanOff||"balanced_o");})||OFF_PLANS[0];
    var counterBonus=SCHEME_COUNTERS[myOff.id]&&SCHEME_COUNTERS[myOff.id][defPlan.id]?SCHEME_COUNTERS[myOff.id][defPlan.id]:0;
    var schemeNote=counterBonus>=4?"Your offense has a BIG advantage vs their D":counterBonus>=1?"Slight edge for your offense":
      counterBonus<=-4?"Their defense counters your offense HARD":counterBonus<=-1?"They have a slight defensive edge":"Neutral matchup";
    var injuredStarters=oppTeam.roster.filter(function(p){return p.isStarter&&p.injury&&p.injury.games>0&&p.ovr>=65;})
      .map(function(p){return{name:p.name,pos:p.pos,ovr:p.ovr,weeks:p.injury.games,type:p.injury.type};});
    var streak=oppTeam.streak||0;
    var momentum=streak>=3?"🔥 HOT ("+streak+"W streak)":streak<=-3?"❄️ COLD ("+Math.abs(streak)+"L streak)":"➡️ Steady";
    var rivHeat=0;
    if(rivalries){
      var rk=rivalryKey?rivalryKey(myTeam.id,oppTeam.id):null;
      if(rk&&rivalries[rk])rivHeat=rivalries[rk].heat||0;
    }
    return{opp:oppTeam.icon+oppTeam.abbr+" ("+oppTeam.wins+"-"+oppTeam.losses+")",
      offPlan:offPlan,defPlan:defPlan,stars:stars,weaknesses:weaknesses,
      schemeNote:schemeNote,counterBonus:counterBonus,injuredStarters:injuredStarters,
      momentum:momentum,rivHeat:rivHeat};
  }
};
