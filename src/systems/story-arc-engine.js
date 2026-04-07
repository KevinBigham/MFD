/**
 * MFD Story Arc Engine
 *
 * Player narrative state machine: initializes arc states
 * (breakout, elite, mentor, swan song, holdout, etc.),
 * transitions between states based on performance and season context.
 */

import { NARRATIVE_STATES } from './story-arcs.js';

export var STORY_ARC_ENGINE={
  normalizePlayer:function(p){
    if(!p||!p.id)return p;
    if(p._arcState===undefined)p._arcState=null;
    if(typeof p._arcState!=="string"&&p._arcState!==null)p._arcState=null;
    if(typeof p._arcTurns!=="number"||!isFinite(p._arcTurns)||p._arcTurns<0)p._arcTurns=0;
    return p;
  },
  initPlayer:function(p){
    STORY_ARC_ENGINE.normalizePlayer(p);
    if(p._arcState===null){
      p._arcState=p.age<=24&&p.ovr>=72?NARRATIVE_STATES.BREAKOUT:p.age>=35?NARRATIVE_STATES.SWAN_SONG:p.age>=32?NARRATIVE_STATES.MENTOR:p.ovr>=85?NARRATIVE_STATES.ELITE:null;
      p._arcTurns=0;
    }
    return p;
  },
  getTargetState:function(p,teamWins,teamLosses,wk){
    var recentBad=(p.stats&&(p.stats.gp||0)>0&&p.pos==="QB"&&(p.stats.int||0)/(p.stats.gp||1)>1.5);
    var recentGood=(p.stats&&(p.stats.gp||0)>0&&p.pos==="QB"&&(p.stats.passTD||0)/(p.stats.gp||1)>2.5);
    var isHoldout=p.holdout75||false;
    if(isHoldout)return NARRATIVE_STATES.HOLDOUT;
    if(p.age>=37&&p.ovr>=70)return NARRATIVE_STATES.SWAN_SONG;
    if(p.age>=32&&p.ovr>=75)return NARRATIVE_STATES.MENTOR;
    if(p._arcState===NARRATIVE_STATES.SLUMP&&recentGood)return NARRATIVE_STATES.COMEBACK;
    if(p._arcState===NARRATIVE_STATES.COMEBACK&&p.ovr>=80)return NARRATIVE_STATES.ELITE;
    if(p.age>=(({QB:29,RB:27,WR:28,TE:28,OL:30,DL:28,LB:28,CB:27,S:28})[p.pos]||28)&&p.ovr<75)return NARRATIVE_STATES.DECLINE;
    if(recentBad&&wk>4)return NARRATIVE_STATES.SLUMP;
    if(p.age<=24&&p.ovr>=74)return NARRATIVE_STATES.BREAKOUT;
    if(p.ovr>=87)return NARRATIVE_STATES.ELITE;
    if(p._arcState===NARRATIVE_STATES.SLUMP||p._arcState===NARRATIVE_STATES.HOLDOUT)return NARRATIVE_STATES.REDEMPTION;
    return p._arcState;
  },
  tickPlayer:function(p,teamWins,teamLosses,wk,addNFn){
    if(!p||!p.id)return p;
    STORY_ARC_ENGINE.initPlayer(p);
    p._arcTurns=(p._arcTurns||0)+1;
    var minDwell=4+Math.floor(RNG.play()*5);
    if(p._arcTurns<minDwell)return p;
    var newState=STORY_ARC_ENGINE.getTargetState(p,teamWins,teamLosses,wk);
    if(!newState||newState===p._arcState)return p;
    p._arcState=newState;p._arcTurns=0;
    var events=STORY_ARC_EVENTS[newState];if(!events)return p;
    var evt=pickWeightedEvent(events);if(!evt)return p;
    var headline=evt.headline.replace(/{name}/g,p.name).replace(/{pos}/g,p.pos);
    if(evt.ovrMod&&evt.ovrMod!==0)p.ovr=Math.max(40,Math.min(99,p.ovr+evt.ovrMod));
    if(evt.moraleMod)p.morale=Math.max(30,Math.min(99,(p.morale||70)+evt.moraleMod));
    if(addNFn)addNFn("📰 "+headline,newState===NARRATIVE_STATES.SLUMP||newState===NARRATIVE_STATES.DECLINE?"red":newState===NARRATIVE_STATES.ELITE||newState===NARRATIVE_STATES.BREAKOUT?"gold":"cyan");
    return p;
  },
  tickTeam:function(roster,wins,losses,wk,addNFn){
    if(!roster)return roster;
    roster.forEach(function(p){
      STORY_ARC_ENGINE.normalizePlayer(p);
      if(p.isStarter&&p.ovr>=70&&RNG.play()<0.08){
        STORY_ARC_ENGINE.tickPlayer(p,wins,losses,wk,addNFn);
      }
    });
    return roster;
  }
};
