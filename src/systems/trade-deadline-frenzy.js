/**
 * MFD Trade Deadline Frenzy
 *
 * AI trade generation during deadline window (weeks 8-10):
 * contender needs analysis, seller matching, and trade execution.
 */

import { RNG } from '../utils/rng.js';

export var TRADE_DEADLINE_FRENZY={
  isDeadlineWindow:function(week){return week>=8&&week<=10;},
  generateAITrades:function(teams,week,myId){
    if(week<8||week>10)return[];
    var trades=[];
    var contenders=teams.filter(function(t){return t.id!==myId&&(t.wins||0)>=Math.max(5,Math.round((week-1)*0.5));});
    var sellers=teams.filter(function(t){return t.id!==myId&&(t.losses||0)>=Math.max(6,Math.round((week-1)*0.6));});
    contenders.forEach(function(ct){
      if(RNG.ai()<0.25){// 25% chance per contender per deadline week
        var needs={};var posList=["QB","RB","WR","TE","OL","DL","LB","CB","S"];
        posList.forEach(function(pos){
          var sts=(ct.roster||[]).filter(function(p){return p.pos===pos;}).sort(function(a,b){return b.ovr-a.ovr;});
          if(sts.length>0&&sts[0].ovr<72)needs[pos]=80-sts[0].ovr;
        });
        var topNeed=null;var topVal=0;
        Object.keys(needs).forEach(function(pos){if(needs[pos]>topVal){topVal=needs[pos];topNeed=pos;}});
        if(topNeed){
          var seller=sellers.find(function(s){
            return (s.roster||[]).some(function(p){return p.pos===topNeed&&(p.ovr||50)>=70;});
          });
          if(seller){
            var traded=(seller.roster||[]).find(function(p){return p.pos===topNeed&&(p.ovr||50)>=70;});
            if(traded){
              trades.push({
                buyer:ct.abbr,buyerIcon:ct.icon,
                seller:seller.abbr,sellerIcon:seller.icon,
                player:traded.name,pos:traded.pos,ovr:traded.ovr,
                text:ct.icon+ct.abbr+" acquires "+traded.name+" ("+traded.pos+" "+traded.ovr+") from "+seller.icon+seller.abbr+"!",
                week:week
              });
            }
          }
        }
      }
    });
    return trades.slice(0,3);// Max 3 trades per week
  }
};
