/**
 * MFD Coaching Clinic System
 *
 * 5 coaching skill tracks (offense, defense, analytics, leadership, development)
 * with XP progression and perk unlocks. Tracks coaching actions and
 * calculates active modifier bonuses.
 */

export var CLINIC_TRACKS=[
  {id:"offense",label:"📋 Offensive Mind",desc:"Gameplan diversity",perks:[
    {id:"off1",name:"Play Variety",desc:"+2% scoring on non-balanced OFF plans",xpReq:30,fx:{scoringBoost:0.02}},
    {id:"off2",name:"Audible Master",desc:"+3% halftime adjustment effectiveness",xpReq:80,fx:{halftimeBoost:0.03}}
  ]},
  {id:"defense",label:"🛡️ Defensive Architect",desc:"Defensive mastery",perks:[
    {id:"def1",name:"Pressure Schemes",desc:"+2% sack rate on non-balanced DEF plans",xpReq:30,fx:{sackBoost:0.02}},
    {id:"def2",name:"Situational D",desc:"+3% stop rate in clutch drives (9+)",xpReq:80,fx:{clutchDefBoost:0.03}}
  ]},
  {id:"analytics",label:"📊 Analytics",desc:"Scouting & intelligence",perks:[
    {id:"anl1",name:"Film Junkie",desc:"+3 confidence on dossier scouting",xpReq:30,fx:{scoutConfBonus:3}},
    {id:"anl2",name:"Data Driven",desc:"Scout report shows counter suggestions",xpReq:80,fx:{counterSuggest:true}}
  ]},
  {id:"leadership",label:"🎙️ Leadership",desc:"Media & locker room",perks:[
    {id:"ldr1",name:"Media Savvy",desc:"+1 credibility from all press answers",xpReq:30,fx:{credBonus:1}},
    {id:"ldr2",name:"Locker Room Voice",desc:"+1 morale from captain moments",xpReq:80,fx:{captainMoraleBonus:1}}
  ]},
  {id:"development",label:"📈 Player Dev",desc:"Growth & recovery",perks:[
    {id:"dev1",name:"Practice Guru",desc:"+15% dev camp progression chance",xpReq:30,fx:{devBoost:0.15}},
    {id:"dev2",name:"Iron Man",desc:"-10% injury risk from Full Pads",xpReq:80,fx:{padsInjReduction:0.10}}
  ]}
];
export var CLINIC={
  earnXP:function(clinic,action,amount){
    if(!clinic.xp)clinic.xp={};
    clinic.perks=(clinic.perks||[]).slice();// v67 fix: deep copy perks array to avoid state mutation
    var trackMap={
      gameplan_change:"offense",halftime_pick:"offense",def_plan_change:"defense",
      scout_practice:"analytics",dossier_scout:"analytics",prospect_scout:"analytics",
      press_answer:"leadership",captain_moment:"leadership",
      dev_camp:"development",recovery:"development",full_pads:"development"
    };
    var track=trackMap[action];
    if(!track)return clinic;
    clinic.xp=Object.assign({},clinic.xp);// v67 fix: deep copy xp object
    clinic.xp[track]=(clinic.xp[track]||0)+(amount||5);
    var trackDef=CLINIC_TRACKS.find(function(t){return t.id===track;});
    if(!trackDef)return clinic;
    if(!clinic.perks)clinic.perks=[];
    trackDef.perks.forEach(function(perk){
      if(clinic.perks.indexOf(perk.id)<0&&(clinic.xp[track]||0)>=perk.xpReq){
        clinic.perks.push(perk.id);
      }
    });
    return clinic;
  },
  hasPerk:function(clinic,perkId){
    return clinic&&clinic.perks&&clinic.perks.indexOf(perkId)>=0;
  },
  getTrackXP:function(clinic,trackId){
    return(clinic&&clinic.xp&&clinic.xp[trackId])||0;
  }
};
export var CLINIC_MATH={
  getMods:function(clinic){
    var mods={scoringBoost:0,halftimeBoost:0,sackBoost:0,clutchDefBoost:0,
      scoutConfBonus:0,counterSuggest:false,credBonus:0,captainMoraleBonus:0,
      devBoost:0,padsInjReduction:0};
    if(!clinic||!clinic.perks)return mods;
    var perks=clinic.perks;
    if(perks.indexOf("off1")>=0)mods.scoringBoost=0.02;
    if(perks.indexOf("off2")>=0)mods.halftimeBoost=0.03;
    if(perks.indexOf("def1")>=0)mods.sackBoost=0.02;
    if(perks.indexOf("def2")>=0)mods.clutchDefBoost=0.03;
    if(perks.indexOf("anl1")>=0)mods.scoutConfBonus=3;
    if(perks.indexOf("anl2")>=0)mods.counterSuggest=true;
    if(perks.indexOf("ldr1")>=0)mods.credBonus=1;
    if(perks.indexOf("ldr2")>=0)mods.captainMoraleBonus=1;
    if(perks.indexOf("dev1")>=0)mods.devBoost=0.15;
    if(perks.indexOf("dev2")>=0)mods.padsInjReduction=0.10;
    return mods;
  },
  logApply:function(clinic,perkId){
    if(!clinic)return clinic;
    if(!clinic.perkStats)clinic.perkStats={};
    clinic.perkStats[perkId]=(clinic.perkStats[perkId]||0)+1;
    return clinic;
  },
  getApplyCount:function(clinic,perkId){
    return(clinic&&clinic.perkStats&&clinic.perkStats[perkId])||0;
  }
};
