/**
 * MFD Player Archetypes & Aging System
 *
 * Player archetype classification by position (QB, RB, WR, TE, OL, DL, LB, CB, S)
 * and archetype-specific aging curves that modify the base AGE_CURVES.
 */

export var AGE_CURVES={
  // v95: Sharper decline — ChatGPT Deep Research validated + amplified per Kevin request
  // decayRate = annual OVR loss multiplier past cliff (higher = faster fall-off)
  QB:{prime:[26,33],cliff:36,decayRate:0.9},// QBs last longest but fall harder now
  RB:{prime:[23,27],cliff:29,decayRate:2.4},// RBs: brutal cliff at 29, fastest decline in league
  WR:{prime:[24,30],cliff:32,decayRate:1.5},// WRs: speed loss hits at 32
  TE:{prime:[25,31],cliff:32,decayRate:1.3},// TEs: lose burst fast after 32
  OL:{prime:[25,32],cliff:34,decayRate:1.0},// OL: technique carries but athleticism fades
  DL:{prime:[24,30],cliff:32,decayRate:1.6},// DL: motor/burst dependent, falls off hard
  LB:{prime:[24,29],cliff:31,decayRate:1.7},// LBs: range drops fast after 31
  CB:{prime:[23,28],cliff:30,decayRate:2.0},// CBs lose speed earliest — steep cliff at 30
  S:{prime:[24,30],cliff:31,decayRate:1.5},// Safeties: range matters, goes at 31
  K:{prime:[24,38],cliff:42,decayRate:0.4} // Kickers last forever — slight bump
};

export var PLAYER_ARCHETYPES={
  classify:function(p){
    if(!p||!p.pos)return null;
    var pos=p.pos;
    if(pos==="K"||pos==="P")return null;
    var r=p.ratings||{};
    function sc(keys){
      var s=0;
      for(var i=0;i<keys.length;i++){
        var k=keys[i];
        s+=((r[k]||50)-50);
      }
      return s;
    }
    function pick(list){
      var best=null;var bestS=-999999;
      for(var i=0;i<list.length;i++){
        var a=list[i];
        var s=sc(a.keys);
        if(s>bestS){bestS=s;best=a;}
      }
      if(!best)return null;
      return {archetype:best.id,label:best.label,emoji:best.emoji,description:best.desc};
    }
    if(pos==="QB")return pick([
      {id:"pocket_passer",label:"Pocket Passer",emoji:"🎯",desc:"Wins from the pocket with accuracy, poise, and vision.",keys:["pocketPresence","accuracy","fieldVision","decisionSpeed"]},
      {id:"dual_threat",label:"Dual Threat",emoji:"⚡",desc:"Creates pressure with legs and breaks the pocket.",keys:["speed","scramble","acceleration","agility"]},
      {id:"game_manager",label:"Game Manager",emoji:"🧠",desc:"Protects the ball and keeps the offense on schedule.",keys:["awareness","shortAccuracy","decisionSpeed","leadership"]},
      {id:"gunslinger",label:"Gunslinger",emoji:"💣",desc:"Attacks downfield with big arm and aggressive throws.",keys:["arm","deepAccuracy","throwOnRun","release"]}
    ]);
    if(pos==="RB")return pick([
      {id:"power_back",label:"Power Back",emoji:"🦬",desc:"Runs through contact and finishes falling forward.",keys:["power","truckPower","breakTackle","strength"]},
      {id:"speed_back",label:"Speed Back",emoji:"🏎️",desc:"Threatens the edge with burst and change of direction.",keys:["speed","acceleration","changeOfDirection","elusiveness"]},
      {id:"receiving_back",label:"Receiving Back",emoji:"🧤",desc:"A mismatch in space as a route runner and pass catcher.",keys:["catching","routeRunning","ballCarrierVision","passProtection"]},
      {id:"all_purpose",label:"All-Purpose",emoji:"🌀",desc:"Does a bit of everything: vision, elusiveness, and hands.",keys:["ballCarrierVision","elusiveness","catching","speed"]}
    ]);
    if(pos==="WR")return pick([
      {id:"deep_threat",label:"Deep Threat",emoji:"🚀",desc:"Stretches the field and wins vertically.",keys:["speed","deepRoute","separation","spectacularCatch"]},
      {id:"possession",label:"Possession",emoji:"🧲",desc:"Moves the chains with reliable hands and routes.",keys:["catching","catchInTraffic","shortRoute","awareness"]},
      {id:"slot",label:"Slot",emoji:"🧬",desc:"Quick separator underneath with YAC potential.",keys:["agility","shortRoute","release","yacAbility"]},
      {id:"red_zone",label:"Red Zone Target",emoji:"🗼",desc:"Wins contested catches near the goal line.",keys:["jumping","catchInTraffic","spectacularCatch","strength"]}
    ]);
    if(pos==="TE")return pick([
      {id:"blocking_te",label:"Blocking TE",emoji:"🧱",desc:"Sets edges, moves bodies, and protects the pocket.",keys:["blocking","runBlocking","impactBlocking","passProtection"]},
      {id:"receiving_te",label:"Receiving TE",emoji:"🎣",desc:"Primary receiving threat who attacks seams.",keys:["catching","routeRunning","speed","catchInTraffic"]},
      {id:"hybrid_te",label:"Hybrid",emoji:"⚖️",desc:"Balanced two-way TE: reliable hands + functional blocking.",keys:["catching","blocking","routeRunning","impactBlocking"]}
    ]);
    if(pos==="OL")return pick([
      {id:"pass_protector",label:"Pass Protector",emoji:"🛡️",desc:"Anchors vs rush and keeps the QB clean.",keys:["passBlock","passBlockFinesse","anchorStrength","footwork"]},
      {id:"road_grader",label:"Road Grader",emoji:"🚜",desc:"Creates movement in the run game and finishes blocks.",keys:["runBlock","impactBlocking","strength","pullBlock"]},
      {id:"technician",label:"Technician",emoji:"🧰",desc:"Wins with technique, IQ, and assignment consistency.",keys:["handTechnique","footwork","assignmentIQ","awareness"]}
    ]);
    if(pos==="DL")return pick([
      {id:"power_rusher",label:"Power Rusher",emoji:"💪",desc:"Collapses pockets with strength and power moves.",keys:["strength","powerMoves","bullRush","blockShedding"]},
      {id:"speed_rusher",label:"Speed Rusher",emoji:"💨",desc:"Wins with get-off, bend, and pursuit.",keys:["speed","acceleration","finesseMoves","pursuit"]},
      {id:"run_stuffer",label:"Run Stuffer",emoji:"🧱",desc:"Holds gaps and erases inside runs.",keys:["runStop","blockShedding","strength","toughness"]}
    ]);
    if(pos==="LB")return pick([
      {id:"coverage_lb",label:"Coverage LB",emoji:"🛰️",desc:"Range + instincts to handle backs and TEs.",keys:["coverage","zoneCoverage","speed","awareness"]},
      {id:"pass_rush_lb",label:"Pass Rush LB",emoji:"🦂",desc:"Pressure specialist with burst and pursuit.",keys:["passRush","acceleration","blockShedding","pursuit"]},
      {id:"thumper",label:"Thumper",emoji:"🔨",desc:"Physical downhill tackler who sets the tone.",keys:["tackle","hitPower","strength","toughness"]}
    ]);
    if(pos==="CB")return pick([
      {id:"lockdown",label:"Lockdown",emoji:"🗝️",desc:"Sticks in coverage and limits separation.",keys:["manCoverage","coverage","speed","agility"]},
      {id:"ball_hawk",label:"Ball Hawk",emoji:"🦅",desc:"Plays the ball and creates turnovers.",keys:["ballSkills","zoneCoverage","awareness","jumping"]},
      {id:"physical_cb",label:"Physical",emoji:"🧷",desc:"Disrupts routes and tackles aggressively.",keys:["pressAbility","hitPower","tackling","strength"]}
    ]);
    if(pos==="S")return pick([
      {id:"free_safety",label:"Free Safety",emoji:"🧊",desc:"Deep range and instincts as the last line.",keys:["zoneCoverage","ballSkills","speed","awareness"]},
      {id:"strong_safety",label:"Strong Safety",emoji:"🪓",desc:"Box defender who tackles and hits.",keys:["hitPower","tackling","strength","toughness"]},
      {id:"hybrid_s",label:"Hybrid",emoji:"🔁",desc:"Can cover and support the run without being a liability.",keys:["coverage","zoneCoverage","tackling","speed"]}
    ]);
    return null;
  }
};
export var ARCHETYPE_AGING={
  mods:{
    pocket_passer:{cliffShift:1,decayMult:0.85},// Technique-based, ages gracefully
    dual_threat:{cliffShift:-2,decayMult:1.4},// Speed-dependent, legs go fast
    game_manager:{cliffShift:2,decayMult:0.7},// Mental-based, the ageless wonder
    gunslinger:{cliffShift:0,decayMult:1.0},// Arm talent, average aging
    power_back:{cliffShift:1,decayMult:0.8},// Strength holds longer than speed
    speed_back:{cliffShift:-1,decayMult:1.5},// Burst goes first, devastating decline
    receiving_back:{cliffShift:1,decayMult:0.85},// Route craft ages well
    all_purpose:{cliffShift:0,decayMult:1.1},// Slight speed reliance
    deep_threat:{cliffShift:-1,decayMult:1.4},// Speed-dependent
    possession:{cliffShift:2,decayMult:0.75},// Hands and routes = ageless
    slot:{cliffShift:0,decayMult:1.1},// Agility fades moderately
    red_zone:{cliffShift:1,decayMult:0.9},// Size/hands don't fade fast
    blocking_te:{cliffShift:1,decayMult:0.8},// Strength/technique
    receiving_te:{cliffShift:0,decayMult:1.1},// Speed matters more
    hybrid_te:{cliffShift:0,decayMult:1.0},// Balanced
    pass_protector:{cliffShift:1,decayMult:0.85},
    road_grader:{cliffShift:0,decayMult:1.0},
    technician:{cliffShift:2,decayMult:0.7},// IQ-based, plays into late 30s
    power_rusher:{cliffShift:0,decayMult:0.9},
    speed_rusher:{cliffShift:-1,decayMult:1.35},// First step goes
    run_stuffer:{cliffShift:1,decayMult:0.8},// Strength+technique
    coverage_lb:{cliffShift:-1,decayMult:1.2},// Speed-dependent coverage
    pass_rush_lb:{cliffShift:0,decayMult:1.15},// Burst fades
    thumper:{cliffShift:1,decayMult:0.85},// Strength/instinct
    lockdown:{cliffShift:-1,decayMult:1.3},// Man coverage needs elite speed
    ball_hawk:{cliffShift:1,decayMult:0.85},// Instinct/vision
    physical_cb:{cliffShift:0,decayMult:1.0},// Balanced
    free_safety:{cliffShift:0,decayMult:1.15},// Speed-reliant
    strong_safety:{cliffShift:1,decayMult:0.85},// Physical
    hybrid_s:{cliffShift:0,decayMult:1.0}
  },
  getCurve:function(p){
    var baseCurve=AGE_CURVES[p.pos]||AGE_CURVES.WR;
    var arch=p.archetype?p.archetype.archetype||p.archetype:null;
    if(!arch||!this.mods[arch])return baseCurve;
    var mod=this.mods[arch];
    return {
      prime:[baseCurve.prime[0],baseCurve.prime[1]+Math.round(mod.cliffShift*0.5)],
      cliff:baseCurve.cliff+mod.cliffShift,
      decayRate:Math.round(baseCurve.decayRate*mod.decayMult*100)/100
    };
  }
};
