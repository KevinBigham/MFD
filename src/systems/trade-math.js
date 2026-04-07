/**
 * MFD Trade Math, Records Wall & GM Trade Pitch
 *
 * Trade classification (fleece/fair/overpay), trust math,
 * league record tracking, and GM personality trade dialogue.
 */

import { cl } from '../utils/helpers.js';
import { RNG } from '../utils/rng.js';

export var TRADE_MATH={
  classify:function(valueDelta,isRival){
    if(valueDelta>=33)return{classification:"fleece",severity:3,trustImpact:isRival?-12:-6};
    if(valueDelta>=23)return{classification:"fleece",severity:2,trustImpact:isRival?-8:-4};
    if(valueDelta>=15)return{classification:"fleece",severity:1,trustImpact:isRival?-6:-3};
    if(valueDelta<=-23)return{classification:"overpay",severity:3,trustImpact:isRival?4:2};
    if(valueDelta<=-15)return{classification:"overpay",severity:2,trustImpact:isRival?3:1};
    if(valueDelta<=-8)return{classification:"overpay",severity:1,trustImpact:isRival?2:1};
    return{classification:"fair",severity:1,trustImpact:isRival?4:2};
  },
  calcDelta:function(params){
    var base=TRADE_MATH.classify(params.valueDelta||0,params.isRival||false);
    var credMod=params.credibility>=70?1:params.credibility<=30?-1:0;
    var pattern=params.recentTradePattern||{fleeceCount:0,fairCount:0};
    var patternMod=pattern.fleeceCount>=2?-1:pattern.fairCount>=2?1:0;
    var perkMod=0;
    if(params.perks&&base.classification!=="fleece"){
      if(params.perks.indexOf("ldr1")>=0||params.perks.indexOf("anl1")>=0)perkMod=1;
    }
    return cl(base.trustImpact+credMod+patternMod+perkMod,-8,6);
  },
  acceptBonus:function(trust){
    return cl(Math.round((trust-50)/8.3),-6,6);
  },
  decaySeason:function(gmTrust){
    if(!gmTrust)return{};
    var result={};
    for(var tid in gmTrust){
      if(Object.prototype.hasOwnProperty.call(gmTrust,tid)){
        result[tid]=cl(Math.round(gmTrust[tid]+(50-gmTrust[tid])*0.20),0,100);
      }
    }
    return result;
  },
  pushRecentTrade:function(recent,entry){
    var arr=[entry].concat((recent||[]).slice(0,3));
    return arr;
  },
  getPattern:function(recent){
    var p={fleeceCount:0,fairCount:0,overpayCount:0};
    (recent||[]).forEach(function(r){
      if(r.classification==="fleece")p.fleeceCount++;
      else if(r.classification==="fair")p.fairCount++;
      else if(r.classification==="overpay")p.overpayCount++;
    });
    return p;
  },
  trustLabel:function(t){
    if(t>=75)return{label:"Trusted",color:"#22c55e",emoji:"🤝"};
    if(t>=60)return{label:"Friendly",color:"#60a5fa",emoji:"👍"};
    if(t>=40)return{label:"Neutral",color:"#94a3b8",emoji:"😐"};
    if(t>=25)return{label:"Wary",color:"#f59e0b",emoji:"⚠️"};
    return{label:"Hostile",color:"#ef4444",emoji:"🚫"};
  }
};
export var RECORDS_WALL={
  categories:[
    {id:"passYds_season",label:"Single-Season Pass Yards",stat:"passYds",scope:"season",icon:"🏈"},
    {id:"passTD_season",label:"Single-Season Pass TDs",stat:"passTD",scope:"season",icon:"🎯"},
    {id:"rushYds_season",label:"Single-Season Rush Yards",stat:"rushYds",scope:"season",icon:"💨"},
    {id:"rushTD_season",label:"Single-Season Rush TDs",stat:"rushTD",scope:"season",icon:"🏃"},
    {id:"recYds_season",label:"Single-Season Rec Yards",stat:"recYds",scope:"season",icon:"🙌"},
    {id:"sacks_season",label:"Single-Season Sacks",stat:"sacks",scope:"season",icon:"💥"},
    {id:"ints_season",label:"Single-Season INTs",stat:"ints",scope:"season",icon:"🚫"},
    {id:"tackles_season",label:"Single-Season Tackles",stat:"tackles",scope:"season",icon:"🛡️"},
    {id:"passYds_career",label:"Career Pass Yards",stat:"passYds",scope:"career",icon:"🏈"},
    {id:"passTD_career",label:"Career Pass TDs",stat:"passTD",scope:"career",icon:"🎯"},
    {id:"rushYds_career",label:"Career Rush Yards",stat:"rushYds",scope:"career",icon:"💨"},
    {id:"recYds_career",label:"Career Rec Yards",stat:"recYds",scope:"career",icon:"🙌"},
    {id:"sacks_career",label:"Career Sacks",stat:"sacks",scope:"career",icon:"💥"}
  ],
  build:function(history,teams,myId){
    var records={};
    RECORDS_WALL.categories.forEach(function(cat){records[cat.id]={cat:cat,holder:null,value:0,year:null,team:null};});
    history.forEach(function(h){
      if(!h.teams)return;
      h.teams.forEach(function(tr){
        if(!tr.roster)return;
        tr.roster.forEach(function(p){
          if(!p.stats)return;
          RECORDS_WALL.categories.filter(function(cat){return cat.scope==="season";}).forEach(function(cat){
            var val=(p.stats[cat.stat]||0);
            if(val>records[cat.id].value){records[cat.id]={cat:cat,holder:p.name,value:val,year:h.year,team:tr.abbr,pos:p.pos};}
          });
        });
      });
    });
    return records;
  }
};
export var GM_TRADE_PITCH={
  analytics:["The model says this deal improves both teams. Take a look at the numbers.","Our analytics team projects a value surplus here. Worth a conversation.","Data-driven offer. No fluff — the chart says this works."],
  old_school:["Old-fashioned deal. A veteran for a veteran. That's how it used to be done.","Two proud franchises making a fair trade. Let's shake on it.","My scouts watched your guy for weeks. We want him."],
  contender:["We're in our window. We need to win NOW — here's what we're offering.","Championship teams make bold moves. This is ours. What do you say?","Clock is ticking on our window. Let's make this happen."],
  rebuilder:["Long-term value play. You get youth, we get a vet for the stretch run.","We're thinking three years out. This deal sets us up right.","Our rebuild is ahead of schedule. Ready to add a piece — interested?"],
  moneyball:["Cap-efficient swap. Both sides get more flexibility out of this.","Running the numbers, this creates space for both teams. Win-win.","Contract arbitrage. Your guy costs too much for what he delivers — we'll take him."],
  loyalist:["We rarely do this, but the fit is too perfect to ignore.","Our core is set. We're looking for the right complement — and that's your guy.","This is about the right player in the right system. We think that's here."],
  fallback:["Interested in making a deal? Here's our offer."]
};
function resolveTradePitchRng(rng2){
  return typeof rng2==="function"?rng2:RNG.trade;
}
export function getGMTradePitch(archId,rng2){
  var lines=GM_TRADE_PITCH[archId||"fallback"]||GM_TRADE_PITCH.fallback;
  var pitchRng=resolveTradePitchRng(rng2);
  return lines[Math.floor(pitchRng()*lines.length)];
}
