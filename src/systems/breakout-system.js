/**
 * MFD Breakout System
 *
 * Young player breakout candidate selection, resolution,
 * and milestone tracking during the season.
 */

import { POS_DEF } from '../config/positions.js';

export var BREAKOUT_SYSTEM={
  isEligible:function(p){return p.age>=21&&p.age<=26&&p.ovr>=62&&p.ovr<=74&&p.pot>=(p.ovr+5)&&p.devTrait!=="superstar"&&!(p.injury&&p.injury.games>0);},
  pick:function(roster,rng2){
    var eligible=roster.filter(BREAKOUT_SYSTEM.isEligible);
    eligible.sort(function(a,b){return(b.pot-b.ovr)-(a.pot-a.ovr);});
    var count=eligible.length>=6?3:eligible.length>=3?2:eligible.length>=1?1:0;
    var picked=[];
    for(var i=0;i<eligible.length&&picked.length<count;i++){if(rng2()<0.7)picked.push(eligible[i]);}
    return picked.slice(0,3).map(function(p){return{playerId:p.id,name:p.name,pos:p.pos,ovrAtStart:p.ovr,potAtStart:p.pot,targetOvr:Math.min(p.pot,p.ovr+Math.round(8+rng2()*6)),hit:false,bust:false,resolved:false};});
  },
  resolve:function(candidate,player,rng2){
    if(!player||candidate.resolved)return candidate;
    var didHit=rng2()<0.55;
    var updated=Object.assign({},candidate,{resolved:true,hit:didHit,bust:!didHit,finalOvr:player.ovr});
    if(didHit){
      var gain=candidate.targetOvr-player.ovr;
      if(gain>0){
        player.ovr=candidate.targetOvr;
        if(POS_DEF&&POS_DEF[player.pos]){var attrs=POS_DEF[player.pos].r||[];attrs.forEach(function(r){player.ratings[r]=Math.min(99,(player.ratings[r]||60)+Math.round(gain*0.4));});}
      }
      if(player.devTrait==="normal")player.devTrait="star";
    }
    return updated;
  },
  milestoneCheck:function(candidate,player,week){
    if(!player||!candidate||candidate.resolved)return null;
    var s=player.stats||{};
    var gained=(player.ovr||0)-(candidate.ovrAtStart||0);
    if(gained>=3&&!candidate._m3){candidate._m3=true;return{msg:player.name+" gained +"+gained+" OVR! Breakout looking REAL."};}
    if(week>=8&&week<=12){
      if(player.pos==="QB"&&(s.passTD||0)>=14&&!candidate._mStat){candidate._mStat=true;return{msg:player.name+" has 14+ TDs at midseason!"};}
      if(player.pos==="RB"&&(s.rushYds||0)>=550&&!candidate._mStat){candidate._mStat=true;return{msg:player.name+" on pace for 1000+ rush yards!"};}
      if((player.pos==="WR"||player.pos==="TE")&&(s.recYds||0)>=450&&!candidate._mStat){candidate._mStat=true;return{msg:player.name+" emerging as top target!"};}
      if(player.pos==="DL"&&(s.sacks||0)>=5&&!candidate._mStat){candidate._mStat=true;return{msg:player.name+" already has "+s.sacks+" sacks!"};}
    }
    return null;
  }
};
