/**
 * MFD Team Relocation System
 *
 * 10 relocation destination cities with market/fanbase/prestige data,
 * relocation eligibility checks, and relocation execution logic.
 */

import { cl } from '../utils/helpers.js';
import { rng } from '../utils/rng.js';

export var RELOCATION_CITIES976=[
  {city:"London",abbr:"LDN",icon:"🇬🇧",marketMod:1.25,fanbaseStart:40,presBoost:15,desc:"International expansion. Huge market, building a fanbase from scratch."},
  {city:"Mexico City",abbr:"MEX",icon:"🇲🇽",marketMod:1.15,fanbaseStart:45,presBoost:10,desc:"Passionate fans in North America's largest city."},
  {city:"Toronto",abbr:"TOR",icon:"🍁",marketMod:1.10,fanbaseStart:50,presBoost:8,desc:"A hungry sports town ready for football."},
  {city:"Austin",abbr:"AUS",icon:"🎸",marketMod:1.05,fanbaseStart:55,presBoost:5,desc:"Tech money and college football culture collide."},
  {city:"Portland",abbr:"PDX",icon:"🌲",marketMod:0.95,fanbaseStart:48,presBoost:3,desc:"Passionate, loyal fanbase in the Pacific Northwest."},
  {city:"St. Louis",abbr:"STL",icon:"⚜️",marketMod:0.90,fanbaseStart:60,presBoost:2,desc:"A city that lost its team and is HUNGRY for football."},
  {city:"Orlando",abbr:"ORL",icon:"🏰",marketMod:1.00,fanbaseStart:50,presBoost:4,desc:"Tourism capital with year-round warm weather."},
  {city:"Las Cruces",abbr:"LC",icon:"🏜️",marketMod:0.80,fanbaseStart:35,presBoost:-2,desc:"Small market underdog. Low cost, loyal locals."},
  {city:"Honolulu",abbr:"HNL",icon:"🌺",marketMod:0.85,fanbaseStart:42,presBoost:5,desc:"Paradise location. Recruiting advantage, travel nightmare."},
  {city:"Berlin",abbr:"BER",icon:"🇩🇪",marketMod:1.20,fanbaseStart:38,presBoost:12,desc:"European powerhouse. Football is booming in Germany."}
];
export var RELOCATION976={
  canRelocate:function(team,season,history){
    if(!team||!season)return{ok:false,msg:"Missing data."};
    if(((season.year||2026)-2026)<2)return{ok:false,msg:"Must complete at least 3 seasons before relocating."};
    if((team.cash||0)<30)return{ok:false,msg:"Need at least $30M cash to fund relocation."};
    if(team._relocYear976&&((season.year||2026)-team._relocYear976)<5)return{ok:false,msg:"Must wait 5 years between relocations."};
    var ownerForce=(team.ownerMood||70)<40;
    var playerChoice=true;
    if(!ownerForce&&!playerChoice)return{ok:false,msg:"No relocation pressure."};
    return{ok:true,ownerForced:ownerForce};
  },
  relocate:function(team,destination,season,nameParts){
    if(!team||!destination||!season)return{ok:false,msg:"Missing relocation data."};
    var cost=30+Math.floor((destination.marketMod||1.0)*20);
    if((team.cash||0)<cost)return{ok:false,msg:"Need $"+cost+"M cash for this move."};
    team.cash=(team.cash||50)-cost;
    team._prevCity976=team.city||null;
    team._prevName976=team.name||null;
    team._prevAbbr976=team.abbr||null;
    team._prevIcon976=team.icon||null;
    team._relocYear976=season.year||2026;
    team.city=destination.city;
    team.name=(nameParts&&nameParts.teamName)||team.name||(destination.city+" Football Club");
    team.abbr=(nameParts&&nameParts.abbr)||destination.abbr||team.abbr;
    team.icon=destination.icon||team.icon;
    team.fanbase=Math.max(20,(destination.fanbaseStart||40)+Math.floor((team.prestige||50)*0.15));
    team.prestige=cl((team.prestige||50)+(destination.presBoost||0),10,99);
    team.ownerMood=cl((team.ownerMood||70)+15,5,99);
    (team.roster||[]).forEach(function(p){
      p.chemistry=cl((p.chemistry||60)-rng(3,8),15,100);
      p.morale=cl((p.morale||70)-rng(2,5),15,100);
    });
    if(team.facilities)team.facilities.stad=1;
    team.stadiumName976=null;
    team.stadiumDeal976=null;
    return{ok:true,cost:cost,newCity:destination.city,newName:team.name,
      msg:"Relocated to "+destination.city+"! Cost: $"+cost+"M. New stadium construction begins."};
  }
};
