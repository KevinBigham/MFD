/**
 * MFD Coach Skill Tree
 *
 * Three coaching trees (Strategist, Motivator, Disciplinarian)
 * with 3 branches each, 3 tiers per branch.
 */

export var COACH_SKILL_TREE={
  trees:{
    Strategist:{branches:[
      {id:"air_raid",name:"Air Raid",icon:"✈️",tiers:[
        {level:3,label:"Quick Release",bonus:{passMod:2},desc:"+2% pass efficiency"},
        {level:6,label:"Spread Master",bonus:{passMod:3},desc:"+3% pass efficiency"},
        {level:9,label:"Aerial Dominance",bonus:{passMod:5,rzBoost:3},desc:"+5% pass, +3% red zone"}
      ]},
      {id:"ground_pound",name:"Ground & Pound",icon:"🏃",tiers:[
        {level:3,label:"Power Run",bonus:{rushMod:2},desc:"+2% rush efficiency"},
        {level:6,label:"Clock Killer",bonus:{rushMod:3,drivesBonus:1},desc:"+3% rush, +1 drive/game"},
        {level:9,label:"Steamroller",bonus:{rushMod:5,stallReduction:0.03},desc:"+5% rush, fewer stalls"}
      ]},
      {id:"analytics",name:"Analytics King",icon:"📊",tiers:[
        {level:3,label:"4th Down Guru",bonus:{stallReduction:0.02},desc:"Better 4th down conversion"},
        {level:6,label:"Matchup Hunter",bonus:{counterBoost:2},desc:"+2 scheme counter bonus"},
        {level:9,label:"Moneyball",bonus:{stallReduction:0.04,counterBoost:3},desc:"Peak analytics edge"}
      ]}
    ]},
    Motivator:{branches:[
      {id:"player_dev",name:"Player Developer",icon:"📈",tiers:[
        {level:3,label:"Growth Mindset",bonus:{devBoost:1},desc:"+1 OVR growth/season"},
        {level:6,label:"Star Maker",bonus:{devBoost:2},desc:"+2 OVR growth/season"},
        {level:9,label:"Legend Factory",bonus:{devBoost:3,breakoutBoost:15},desc:"+3 OVR, +15% breakout chance"}
      ]},
      {id:"morale_king",name:"Morale King",icon:"❤️",tiers:[
        {level:3,label:"Locker Room",bonus:{moraleMod:0.8},desc:"-20% morale drain"},
        {level:6,label:"Unity",bonus:{moraleMod:0.6,chemBoost:5},desc:"-40% drain, +5 chemistry"},
        {level:9,label:"Brotherhood",bonus:{moraleMod:0.4,chemBoost:10},desc:"-60% drain, +10 chem"}
      ]},
      {id:"clutch_coach",name:"Clutch Coach",icon:"🎯",tiers:[
        {level:3,label:"Ice Water",bonus:{clutchBoost:3},desc:"+3 clutch rating boost"},
        {level:6,label:"Big Game",bonus:{clutchBoost:5,playoffMod:1.05},desc:"+5 clutch, +5% playoffs"},
        {level:9,label:"Mr. February",bonus:{clutchBoost:8,playoffMod:1.10},desc:"+8 clutch, +10% playoffs"}
      ]}
    ]},
    Disciplinarian:{branches:[
      {id:"iron_d",name:"Iron Defense",icon:"🛡️",tiers:[
        {level:3,label:"Lockdown",bonus:{defMod:2},desc:"+2% defensive efficiency"},
        {level:6,label:"Fortress",bonus:{defMod:3,pressureBoost:0.02},desc:"+3% def, +2% pressure"},
        {level:9,label:"Shutdown",bonus:{defMod:5,intBoost:0.02},desc:"+5% def, +2% INT rate"}
      ]},
      {id:"special_teams",name:"Special Teams Ace",icon:"⚡",tiers:[
        {level:3,label:"Coverage",bonus:{stMod:2},desc:"+2% ST efficiency"},
        {level:6,label:"Return Game",bonus:{stMod:3,fieldPosMod:3},desc:"+3% ST, +3 field position"},
        {level:9,label:"Hidden Yards",bonus:{stMod:5,fieldPosMod:5},desc:"+5% ST, +5 field position"}
      ]},
      {id:"conditioning",name:"Conditioning",icon:"💪",tiers:[
        {level:3,label:"Iron Man",bonus:{injMod:0.85},desc:"-15% injury risk"},
        {level:6,label:"Recovery",bonus:{injMod:0.75,recoveryBoost:1},desc:"-25% injury, +1wk recovery"},
        {level:9,label:"Machine",bonus:{injMod:0.60,recoveryBoost:2},desc:"-40% injury, +2wk recovery"}
      ]}
    ]}
  },
  getTreeKey:function(arch){
    if(["Strategist","QB Guru","Air Attack","Innovator"].indexOf(arch)>=0)return "Strategist";
    if(["Motivator","Player's Coach","DB Whisperer"].indexOf(arch)>=0)return "Motivator";
    return "Disciplinarian";
  },
  getActiveBonus:function(selections,coachId,coachLevel,arch){
    var sel=selections[coachId];if(!sel)return{};
    var treeKey=COACH_SKILL_TREE.getTreeKey(arch||sel.archForLookup||"Disciplinarian");
    var tree=COACH_SKILL_TREE.trees[treeKey];if(!tree)return{};
    var branch=null;tree.branches.forEach(function(b){if(b.id===sel.branch)branch=b;});
    if(!branch)return{};
    var bonus={};
    branch.tiers.forEach(function(t,ti){
      if(coachLevel>=t.level&&sel.tier>ti){
        Object.keys(t.bonus).forEach(function(k){bonus[k]=(bonus[k]||0)+(typeof t.bonus[k]==="number"?t.bonus[k]:0);});
      }
    });
    return bonus;
  }
};
