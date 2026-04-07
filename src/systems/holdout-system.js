/**
 * MFD Holdout System
 *
 * Player holdout mechanics — checks eligibility based on contract,
 * performance, morale and scheme fit. Progression through 5 stages
 * from no-show to nuclear crisis.
 */

import { cl } from '../utils/helpers.js';
import { RNG } from '../utils/rng.js';
import { getContractPersonalityEffects } from './personality.js';
import { calcPlayerIdentityFit } from './scheme-fit.js';

var POS_MARKET_DEFAULT86={tier:3,mult:1.0,holdoutRaisePct:0.15};
var POS_MARKET_TIER={
  QB:{tier:1,mult:2.5,holdoutRaisePct:0.18},
  WR:{tier:2,mult:1.2,holdoutRaisePct:0.18},
  LT:{tier:2,mult:1.2,holdoutRaisePct:0.18},
  DE:{tier:2,mult:1.2,holdoutRaisePct:0.18},
  CB:{tier:2,mult:1.2,holdoutRaisePct:0.18},
  RB:{tier:3,mult:1.0,holdoutRaisePct:0.15},
  S:{tier:3,mult:1.0,holdoutRaisePct:0.15},
  LB:{tier:3,mult:1.0,holdoutRaisePct:0.15},
  TE:{tier:3,mult:1.0,holdoutRaisePct:0.15},
  OL:{tier:3,mult:1.0,holdoutRaisePct:0.15},
  DL:{tier:2,mult:1.2,holdoutRaisePct:0.18},
  K:{tier:4,mult:0.5,holdoutRaisePct:0.10},
  P:{tier:4,mult:0.5,holdoutRaisePct:0.10}
};
export function getPosMarketTier86(pos){
  var key=String(pos||"").toUpperCase();
  return POS_MARKET_TIER[key]||POS_MARKET_DEFAULT86;
}

export var HOLDOUT_SYSTEM={
  checkHoldouts:function(team,isUser){
    var holdouts=[];
    if(!team||!team.roster)return holdouts;
    team.roster.forEach(function(p){
      if(p.holdout75)return;// Already holding out
      var marketTier86=getPosMarketTier86(p.pos);
      var underpaidLine86=Math.max(0,((p.ovr||50)-60)*0.4)*(marketTier86.mult||1);
      var isUnderpaid=(p.ovr||50)>=80&&p.contract&&p.contract.salary<underpaidLine86;
      var isExpiring=p.contract&&p.contract.years<=1;
      var isUnhappy=(p.morale||70)<50;
      var isStar=(p.ovr||50)>=82;
      var chance=0;
      if(isStar&&isExpiring&&isUnderpaid)chance=0.25;
      else if(isStar&&isUnhappy)chance=0.15;
      else if(isExpiring&&isUnderpaid&&(p.ovr||50)>=76)chance=0.10;
      if(chance>0){// v83: personality modifies holdout probability
        var _hFx=getContractPersonalityEffects(p,{});
        chance+=_hFx.holdoutChanceAdj;
        var fitHold86=calcPlayerIdentityFit(p,team);
        if(fitHold86.score<=55)chance+=0.06;
        else if(fitHold86.score<=62)chance+=0.03;
        else if(fitHold86.score>=84)chance-=0.05;
        else if(fitHold86.score>=76)chance-=0.02;
        chance=cl(chance,0,0.85);
      }
      if(chance>0&&RNG.ai()<chance){
        p.holdout75={week:0,demands:"extension",severity:isUnhappy?"severe":"moderate"};
        holdouts.push(p);
      }
    });
    return holdouts;
  },
  weeklyHoldout:function(p){
    if(!p||!p.holdout75)return null;
    p.holdout75.week=(p.holdout75.week||0)+1;
    var wk=p.holdout75.week;
    p.morale=Math.max(20,(p.morale||70)-4);// v80: Steeper morale drain per week
    var stage=wk<=1?1:wk<=2?2:wk<=4?3:wk<=6?4:5;
    p.holdout75.stage=stage;
    if(stage===1){
      return{type:"holdout_noshow",stage:1,name:p.name,pos:p.pos,ovr:p.ovr,
        headline:p.name+" ("+p.pos+") no-shows training camp. Agent: 'Exploring all options.'"};
    }else if(stage===2&&wk===2){
      return{type:"holdout_statement",stage:2,name:p.name,pos:p.pos,
        headline:"STATEMENT: "+p.name+" says he 'deserves to be paid like a top-"+p.pos+". No hard feelings.' MFSN at 11."};
    }else if(stage===3&&!p.holdout75.tradeRequest){
      p.holdout75.tradeRequest=true;p.holdout75.severity="severe";p.onTradeBlock=true;
      return{type:"trade_request",stage:3,name:p.name,pos:p.pos,
        headline:"🚨 "+p.name+" DEMANDS TRADE. Agent: 'He will not report under any circumstances.' MFSN BREAKING."};
    }else if(stage===4&&!p.holdout75.suspendOption){
      p.holdout75.suspendOption=true;
      return{type:"suspend_option",stage:4,name:p.name,pos:p.pos,
        headline:"WEEK "+wk+": "+p.name+" holdout enters critical stage. Team weighing suspension. Locker room fracturing."};
    }else if(stage===5){
      p.morale=Math.max(10,(p.morale||30)-8);
      return{type:"nuclear",stage:5,name:p.name,pos:p.pos,
        headline:"☢️ NUCLEAR: "+p.name+" holdout hits Week "+wk+". MFSN: 'This is a franchise-defining crisis.'"};
    }
    return{type:"holdout_week",stage:stage,name:p.name,pos:p.pos,weeks:wk};
  },
  resolve:function(p){
    if(!p||!p.holdout75)return;
    delete p.holdout75;
    p.morale=Math.min(99,(p.morale||70)+10);
  }
};
