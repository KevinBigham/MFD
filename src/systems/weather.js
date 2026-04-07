/**
 * MFD Weather System
 *
 * Team climates, climate profiles, weather condition generation,
 * game impact modifiers, halftime conditions & strategies.
 */

import { mulberry32 } from '../utils/rng.js';

export var TEAM_CLIMATES={
  hawks:"dome",volts:"warm",reap:"warm",crown:"ne",ghost:"ne",
  titan:"cold",storm:"warm",sent:"cold",blaze:"warm",frost:"cold",
  surge:"ne",apex:"warm",bbq:"ne",yeti:"cold",gator:"warm",
  moth:"cold",cactus:"warm",kraken:"ne",comet:"ne",doom:"ne"
};
export var CLIMATE_PROFILES={
  dome:{base:72,dropPerWeek:0,min:72,snowChance:0,rainChance:0},
  cold:{base:65,dropPerWeek:3,min:10,snowChance:0.4,rainChance:0.25},
  warm:{base:82,dropPerWeek:0.5,min:55,snowChance:0,rainChance:0.2},
  ne:{base:60,dropPerWeek:2,min:20,snowChance:0.3,rainChance:0.3}
};
export var WEATHER={
  getConditions:function(homeTeamId,week,seed){
    var rng=mulberry32((seed||12345)+week*7+(homeTeamId||"x").charCodeAt(0)*13);
    var climate=TEAM_CLIMATES[homeTeamId]||"ne";
    var prof=CLIMATE_PROFILES[climate];
    var temp=prof.base-(week*(prof.dropPerWeek||0))+((rng()*20)-10);
    temp=Math.max(prof.min,Math.round(temp));
    var precip="CLEAR";
    if(climate==="dome"){precip="DOME";temp=72;}
    else{
      if(rng()<(prof.rainChance||0.2))precip="RAIN";
      if(temp<=32&&rng()<(prof.snowChance||0))precip="SNOW";
      if(rng()<0.08)precip="FOG";// 8% fog chance
    }
    var wind=climate==="dome"?0:Math.round(rng()*25);
    return{temp:temp,precip:precip,wind:wind,climate:climate,
      emoji:precip==="SNOW"?"🌨️":precip==="RAIN"?"🌧️":precip==="FOG"?"🌫️":precip==="DOME"?"🏟️":temp>=80?"☀️":"⛅",
      label:precip==="DOME"?"Dome ("+temp+"°F)":temp+"°F "+precip+(wind>10?" | 💨"+wind+"mph":"")};
  },
  getImpact:function(conditions){
    var fx={passAccMod:0,catchMod:0,fumbleMod:0,kickMod:0,fatigueMod:0};
    if(conditions.precip==="SNOW"){fx.passAccMod=-0.10;fx.fumbleMod=0.05;fx.kickMod=-0.08;}
    if(conditions.precip==="RAIN"){fx.catchMod=-0.05;fx.kickMod=-0.05;fx.passAccMod=-0.03;}
    if(conditions.precip==="FOG"){fx.passAccMod=-0.04;}
    if(conditions.wind>15){fx.passAccMod-=0.01*(conditions.wind-15);fx.kickMod-=0.01*(conditions.wind-15);}
    if(conditions.temp>=90)fx.fatigueMod=0.05;
    if(conditions.temp<=20)fx.fumbleMod+=0.02;
    return fx;
  }
};
// v93.18: Halftime redesign — conditions × strategies independently selectable
export var HT_CONDITIONS=[
  {id:"losing_big",  label:"😤 Down 8+",    condLabel:"If losing by 8+"},
  {id:"losing_close",label:"🔥 Down 1–7",   condLabel:"If losing by 1–7"},
  {id:"tied",        label:"⚖️ Tied",        condLabel:"If tied"},
  {id:"winning_close",label:"🛡️ Up 1–7",    condLabel:"If winning by 1–7"},
  {id:"winning_big", label:"✅ Up 8+",       condLabel:"If winning by 8+"}
];
export var HT_STRATEGIES=[
  {id:"go_for_broke",  label:"🚀 Go For Broke",   desc:"Open it up — big plays, push tempo, accept risk",
    effect:{stallReduction:0.08,bigPlayBoost:0.06,offProtectMod:0.04,intAvoidMod:-0.02}},
  {id:"blitz_heavy",   label:"🔥 Blitz Heavy",     desc:"Pressure defense — force turnovers, disrupt rhythm",
    effect:{defPressureMod:0.12,oppExplosiveMod:-0.06,intBoostMod:0.02,stallReduction:0.03}},
  {id:"protect_ball",  label:"🛡️ Protect the Ball",desc:"Safe decisions — avoid mistakes, play field position",
    effect:{offProtectMod:0.12,intAvoidMod:0.08,runLaneBoost:0.04}},
  {id:"run_heavy",     label:"🏃 Run Heavy",        desc:"Grind the clock — establish run game, shorten game",
    effect:{runLaneBoost:0.08,runRateMod:0.12,paceReduction:0.10,varianceReduction:0.08}},
  {id:"clock_control", label:"⏱️ Clock Control",   desc:"Bleed the clock — safe runs, no turnovers, drain time",
    effect:{offProtectMod:0.10,intAvoidMod:0.06,runRateMod:0.10,paceReduction:0.12,explosiveReduction:0.05}},
  {id:"balanced_adj",  label:"⚖️ Stay Balanced",   desc:"No major adjustment — stick to the gameplan",
    effect:{}}
];
