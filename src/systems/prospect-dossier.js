/**
 * MFD Prospect Scouting Dossier
 *
 * Manages prospect-level scouting intelligence — entry retrieval,
 * multi-type scouting (combine/interview/film), confidence tracking,
 * tells/red flags accumulation, scheme fit analysis, claims integration,
 * decay of stale intel, and rookie verification.
 */
import { cl } from '../utils/index.js';
import { TRAITS } from './traits.js';
import { PROSPECT_CLAIMS } from './prospect-claims.js';

export var PROSPECT_DOSSIER={
  getEntry:function(db,prospectId,year){
    var key=year+"-"+prospectId;
    return db[key]||{prospectId:prospectId,year:year,conf:0,scoutCount:0,lastWeek:0,
      tells:[],redFlags:[],schemeFit:"",source:{combine:false,interview:false,film:false}};
  },
  scout:function(db,prospectId,year,week,prospect,scoutType,coachRating,clinicConfBonus){
    var key=year+"-"+prospectId;
    var entry=db[key]||{prospectId:prospectId,year:year,conf:0,scoutCount:0,lastWeek:0,
      tells:[],redFlags:[],schemeFit:"",source:{combine:false,interview:false,film:false}};
    entry.scoutCount=(entry.scoutCount||0)+1;
    entry.lastWeek=week;
    entry.source[scoutType]=true;
    var confGain=scoutType==="film"?20:scoutType==="interview"?15:10;
    confGain+=Math.max(0,Math.min(10,(coachRating||50)-50));
    if(entry.scoutCount>1)confGain+=Math.max(0,8-entry.scoutCount*2);
    confGain+=(clinicConfBonus||0);
    entry.conf=Math.min(90,entry.conf+confGain);
    if(prospect){
      var newTells=[];var newFlags=[];
      if(scoutType==="measurables"||scoutType==="combine"){
        if(prospect.combine){
          if(prospect.combine.forty<=4.4)newTells.push("Elite speed ("+prospect.combine.forty+"s 40yd)");
          else if(prospect.combine.forty>=4.7)newFlags.push("Below-average speed ("+prospect.combine.forty+"s 40yd)");
        }
        if(prospect.ratings){
          var topR=null;var topV=0;
          Object.keys(prospect.ratings).forEach(function(r){if(prospect.ratings[r]>topV){topV=prospect.ratings[r];topR=r;}});
          if(topR&&topV>=80)newTells.push("Standout "+topR+" ("+topV+")");
        }
      }
      if(scoutType==="interview"){
        if(prospect.trait&&TRAITS[prospect.trait])newTells.push("Personality: "+TRAITS[prospect.trait].name);
        if(prospect.devTrait==="superstar")newTells.push("Superstar development ceiling");
        else if(prospect.devTrait==="star")newTells.push("Star development potential");
        if(prospect.age>=23)newFlags.push("Already "+prospect.age+" years old — limited upside window");
      }
      if(scoutType==="film"||scoutType==="film_study"){
        if(prospect.pot&&prospect.ovr&&prospect.pot>prospect.ovr+10)
          newTells.push("Film shows high ceiling (gap: +"+(prospect.pot-prospect.ovr)+")");
        if(prospect.pot&&prospect.ovr&&prospect.pot<=prospect.ovr+3)
          newFlags.push("What you see is what you get — limited growth");
        if(prospect.ovr>=78)newTells.push("Pro-ready talent ("+prospect.ovr+" OVR)");
      }
      newTells.forEach(function(t){if(entry.tells.indexOf(t)<0)entry.tells.push(t);});
      newFlags.forEach(function(f){if(entry.redFlags.indexOf(f)<0)entry.redFlags.push(f);});
      if(entry.tells.length>4)entry.tells=entry.tells.slice(-4);
      if(entry.redFlags.length>3)entry.redFlags=entry.redFlags.slice(-3);
      if(prospect.pos){
        var goodSchemes=[];
        if(prospect.ratings&&(prospect.ratings.speed||0)>=80)goodSchemes.push("Air Raid");
        if(prospect.ratings&&(prospect.ratings.power||prospect.ratings.strength||0)>=80)goodSchemes.push("Ground & Pound");
        if(goodSchemes.length>0)entry.schemeFit="Best fit: "+goodSchemes.join(", ");
      }
      var newClaims=PROSPECT_CLAIMS.generate(prospect,scoutType,prospect.pos);
      if(!entry.claims)entry.claims=[];
      newClaims.forEach(function(nc){
        var exists=entry.claims.some(function(ec){return ec.type===nc.type;});
        if(!exists&&entry.claims.length<3)entry.claims.push(nc);
        else if(exists){
          entry.claims.forEach(function(ec){if(ec.type===nc.type&&nc.strength>ec.strength)ec.strength=nc.strength;});
        }
      });
    }
    db[key]=entry;
    return entry;
  },
  decay:function(db,year,week){
    Object.keys(db).forEach(function(key){
      var e=db[key];
      if(e.year===year&&e.lastWeek>0&&(week-e.lastWeek)>=5){
        e.conf=Math.max(0,e.conf-6);
        if(e.conf<=0){e.tells=[];e.redFlags=[];}
      }
    });
    return db;
  },
  verify:function(db,prospectId,year,rookiePlayer,gamesPlayed){
    var key=year+"-"+prospectId;
    var entry=db[key];
    if(!entry||entry.conf<=0)return null;
    var claims=entry.claims||[];
    if(claims.length===0){
      var gap=Math.abs((rookiePlayer.ovr||0)-(rookiePlayer.pot||0));
      if(gap<=5){entry.conf=Math.min(90,entry.conf+6);return{status:"VERIFIED",deltaConf:6,hits:["ovr"],misses:[],incomplete:[],notes:"Legacy check: OVR aligned"};}
      else if(gap<=12){return{status:"MIXED",deltaConf:0,hits:[],misses:[],incomplete:[],notes:"Legacy check: moderate gap"};}
      else{entry.conf=Math.max(0,entry.conf-8);return{status:"MISREAD",deltaConf:-8,hits:[],misses:["ovr"],incomplete:[],notes:"Legacy check: significant gap"};}
    }
    var result=PROSPECT_CLAIMS.verify(claims,rookiePlayer,gamesPlayed||0);
    if(!result)return null;
    var startConf=entry.conf;
    var bonus=0;
    if(startConf>=70&&result.deltaConf<0)bonus=-2;
    if(startConf<=30&&result.deltaConf>0)bonus=2;
    entry.conf=cl(entry.conf+result.deltaConf+bonus,0,90);
    entry.verifyResult=result;
    return result;
  }
};
