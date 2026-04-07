/**
 * MFD Rivalry Game Day System (v97.7)
 *
 * Trophy generation, rivalry week atmosphere, pregame speeches,
 * halftime adjustments, postgame locker room, game-of-the-week
 * selection, and rivalry dashboard builder.
 */
import { RNG, pick } from '../utils/rng.js';
import { getRivalryLabel, findRivalObj } from './rivalry-engine.js';

function _sharedTrait(c1,c2){
  var a=(c1||"").toLowerCase(),b=(c2||"").toLowerCase();
  if(a.indexOf("new")===0||b.indexOf("new")===0)return"New World";
  if(a.indexOf("san ")===0||b.indexOf("san ")===0)return"Coast";
  if(a.indexOf("lake")>=0||b.indexOf("lake")>=0)return"Lakes";
  if(a.indexOf("city")>=0||b.indexOf("city")>=0)return"Cities";
  return pick(["Plains","Rust","Coast","Heartland","Bay","Mountains","Desert","River","Capitals"]);
}

export var RIVALRY_TROPHIES977={
  templates:[
    {name:"The {city1}-{city2} Cup",icon:"🏆",tier:"gold"},
    {name:"The {shared} Bell",icon:"🔔",tier:"silver"},
    {name:"The Iron Boot",icon:"🥾",tier:"bronze"},
    {name:"The Founders Trophy",icon:"🏛️",tier:"gold"},
    {name:"The {city1} Axe",icon:"🪓",tier:"silver"},
    {name:"The Border War Shield",icon:"🛡️",tier:"bronze"},
    {name:"The Eternal Flame",icon:"🔥",tier:"gold"},
    {name:"The Old Grudge Hammer",icon:"🔨",tier:"silver"}
  ],
  generateTrophy:function(t1,t2){
    var tmpl=RIVALRY_TROPHIES977.templates[Math.floor(RNG.ui()*RIVALRY_TROPHIES977.templates.length)];
    var name=tmpl.name.replace("{city1}",t1.city||t1.abbr).replace("{city2}",t2.city||t2.abbr).replace("{shared}",_sharedTrait(t1.city,t2.city));
    return{name:name,icon:tmpl.icon,tier:tmpl.tier,holderId:null,created:null,history:[]};
  },
  updateTrophy:function(trophy,winnerId,year,week,score){
    var changed=trophy.holderId!==winnerId;
    trophy.holderId=winnerId;
    trophy.history.push({year:year,week:week,winnerId:winnerId,score:score});
    return changed;
  }
};

export var RIVALRY_WEEK977={
  getAtmosphere:function(myTeam,oppTeam,rivalObj,week){
    if(!rivalObj||(rivalObj.heat||0)<40)return null;
    var tier=getRivalryLabel(rivalObj.heat);
    var trophy=rivalObj.trophy977||null;
    var atmo={tier:tier.tier,label:rivalObj.name||(tier.label+": "+myTeam.abbr+" vs "+oppTeam.abbr),emoji:tier.emoji,trophy:trophy,hypeLines:[],effects:{moraleBoost:0,chemBoost:0,crowdBoost:0,injuryRisk:0}};
    if(tier.tier==="war"){atmo.hypeLines.push("🔥🔥🔥 BLOOD FEUD WEEK — The entire league is watching.");atmo.effects.moraleBoost=5;atmo.effects.crowdBoost=5;atmo.effects.injuryRisk=0.08;}
    else if(tier.tier==="intense"){atmo.hypeLines.push("🔥🔥 RIVALRY WEEK — Circle this one on the calendar.");atmo.effects.moraleBoost=3;atmo.effects.crowdBoost=3;atmo.effects.injuryRisk=0.05;}
    else{atmo.hypeLines.push("🔥 Growing rivalry — this matchup is starting to mean something.");atmo.effects.moraleBoost=2;atmo.effects.crowdBoost=1;}
    if(trophy&&trophy.holderId){var holdsIt=trophy.holderId===myTeam.id;atmo.hypeLines.push(trophy.icon+(holdsIt?" You hold "+trophy.name+". Defend it.":" "+oppTeam.abbr+" holds "+trophy.name+". Time to take it back."));}
    var streak=(rivalObj.history||{}).streak||0;
    if(streak>=3)atmo.hypeLines.push("📈 You've won "+streak+" straight in this rivalry.");
    if(streak<=-3)atmo.hypeLines.push("📉 You've lost "+Math.abs(streak)+" straight. Enough is enough.");
    return atmo;
  }
};

export var PREGAME_TALK977={
  generate:function(myTeam,oppTeam,season,rivalryAtmo,isPlayoff){
    var speeches=[];
    speeches.push({id:"motivate",label:"🔥 Fire Them Up",text:"This is OUR house! Let's come out swinging and punch them in the mouth!",effect:{moraleBoost:3,chemBoost:1,turnoverRisk:0.02},desc:"+3 morale, +1 chem, slight turnover risk"});
    speeches.push({id:"focus",label:"🧠 Lock In",text:"Forget the noise. Execute the game plan. Trust your preparation.",effect:{moraleBoost:1,chemBoost:2,turnoverRisk:-0.02},desc:"+1 morale, +2 chem, fewer turnovers"});
    speeches.push({id:"personal",label:"💪 Make It Personal",text:"They don't respect us. They don't think we belong here. Prove. Them. Wrong.",effect:{moraleBoost:4,chemBoost:-1,injuryRisk:0.02},desc:"+4 morale, -1 chem, slight injury risk"});
    if(rivalryAtmo&&rivalryAtmo.tier!=="none"&&rivalryAtmo.tier!=="budding"){speeches.push({id:"rivalry",label:rivalryAtmo.emoji+" Rivalry Speech",text:"This game is bigger than a W. This is about pride. About history. About WHO WE ARE.",effect:{moraleBoost:5,chemBoost:3,turnoverRisk:0.01},desc:"+5 morale, +3 chem — rivalry intensity"});}
    else if(isPlayoff){speeches.push({id:"playoff",label:"🏆 Championship Mentality",text:"We didn't come this far to come this far. Leave everything on that field.",effect:{moraleBoost:5,chemBoost:2},desc:"+5 morale, +2 chem"});}
    else if((myTeam.losses||0)>(myTeam.wins||0)){speeches.push({id:"desperation",label:"😤 Back Against the Wall",text:"Our season is slipping away. Every man in this room needs to decide: are we done or are we fighters?",effect:{moraleBoost:4,chemBoost:2,clutchBoost:0.05},desc:"+4 morale, +2 chem, clutch boost"});}
    return speeches;
  }
};

export var HALFTIME_PANEL977={
  generate:function(margin){
    var adjustments=[];
    adjustments.push({id:"stay_course",label:"📋 Stay the Course",text:margin>=0?"We're executing well. Keep doing what got us here.":"We're close. Trust the process.",effect:{scoringMod:0,turnoverMod:-0.01},desc:"No changes — steady play, fewer mistakes"});
    adjustments.push({id:"attack",label:"⚡ Open It Up",text:"We're going aggressive. Take shots downfield. Put pressure on their secondary.",effect:{scoringMod:0.08,turnoverMod:0.04},desc:"+scoring chance, +turnover risk"});
    adjustments.push({id:"grind",label:"🏃 Control the Clock",text:"Run the ball. Chew clock. Win the time of possession battle.",effect:{scoringMod:-0.03,turnoverMod:-0.03,clockMod:0.1},desc:"Ball control, fewer turnovers, shorter game"});
    if(margin<=-14){adjustments.push({id:"desperation",label:"🚨 Desperation Mode",text:"Empty the playbook. Onside kicks, trick plays, everything. We have nothing to lose.",effect:{scoringMod:0.15,turnoverMod:0.10},desc:"Maximum aggression — feast or famine"});}
    else if(margin>=14){adjustments.push({id:"prevent",label:"🛡️ Protect the Lead",text:"Sit on the ball. Protect the football. Don't give them life.",effect:{scoringMod:-0.05,turnoverMod:-0.05},desc:"Conservative — lock it down"});}
    else{adjustments.push({id:"two_minute",label:"⏱️ Two-Minute Specialist",text:"We need points before half AND to start the 3rd quarter. Manage the clock perfectly.",effect:{scoringMod:0.05,clutchMod:0.03},desc:"Efficient drive management"});}
    // v98.6 #1: HALFTIME V2 — Additional Tactical Options
    adjustments.push({id:"blitz_heavy_986",label:"🔥 Blitz Heavy",text:"Bring the house every play. Get to their QB. Force mistakes.",effect:{scoringMod:0.03,turnoverMod:0.06,clutchMod:0.02},desc:"Sack/INT chance UP, risk deep passes"});
    adjustments.push({id:"no_huddle_986",label:"⚡ No-Huddle Tempo",text:"Speed it up. Don't let them substitute. We control the pace.",effect:{scoringMod:0.10,turnoverMod:0.05,clockMod:-0.1},desc:"High-octane scoring, fatigue risk"});
    adjustments.push({id:"target_mismatch_986",label:"🎯 Exploit Mismatch",text:"We found a mismatch underneath. Feed the WR2 and TE.",effect:{scoringMod:0.06,turnoverMod:-0.02},desc:"Safe completions, move chains"});
    return adjustments;
  }
};

export var POSTGAME_LOCKER977={
  generate:function(userWon,myScore,oppScore,myTeam,isRivalry){
    var margin=Math.abs((myScore||0)-(oppScore||0));var blowout=margin>=21;var nailbiter=margin<=3;
    var mood=userWon?(blowout?"euphoric":nailbiter?"relieved":"satisfied"):(blowout?"devastated":nailbiter?"gutted":"disappointed");
    var locker=[];
    var starters=(myTeam&&myTeam.roster)?myTeam.roster.filter(function(p){return p.isStarter;}):[];
    if(starters.length>0){
      var star=starters.slice().sort(function(a,b){return(b.ovr||0)-(a.ovr||0);})[0];
      if(userWon){
        locker.push({player:star.name,pos:star.pos,quote:blowout?"We were LOCKED IN from the first snap!":nailbiter?"I've never been more nervous. But this team... we just find a way.":"Great team win. Everybody did their job."});
        if(isRivalry)locker.push({player:star.name,pos:star.pos,quote:"That trophy is OURS. They can come get it if they want it back."});
      }else{
        locker.push({player:star.name,pos:star.pos,quote:blowout?"I don't even know what to say. We weren't ready.":nailbiter?"That one stings. We had it. We HAD it.":"We'll be back. This team doesn't quit."});
      }
      var young=starters.filter(function(p){return p.age<=24&&p.id!==star.id;})[0];
      if(young)locker.push({player:young.name,pos:young.pos,quote:userWon?"The vets told me what this would feel like. It's even better than they said.":"I'm going to remember this feeling. Use it."});
    }
    return{mood:mood,locker:locker};
  }
};

export var GAME_OF_WEEK977={
  pick:function(sched,teams,week,myId){
    var weekGames=sched.filter(function(g){return g.week===week&&!g.played;});
    if(weekGames.length===0)return null;
    var scored=weekGames.map(function(g){
      var h=teams.find(function(t){return t.id===g.home;}),a=teams.find(function(t){return t.id===g.away;});
      if(!h||!a)return{game:g,score:0,home:null,away:null};
      var rivalHeat=0;var rObj=findRivalObj(h,a.id);if(rObj)rivalHeat=rObj.heat||0;
      var isUser=g.home===myId||g.away===myId;
      return{game:g,home:h,away:a,score:(h.wins||0)*2+(a.wins||0)*2+rivalHeat*0.5+(isUser?20:0)+((h.prestige||50)+(a.prestige||50))*0.1};
    });
    scored.sort(function(a,b){return b.score-a.score;});
    var gotw=scored[0];if(!gotw||!gotw.home)return null;
    return{home:gotw.home,away:gotw.away,isUser:gotw.game.home===myId||gotw.game.away===myId,label:"📺 GAME OF THE WEEK: "+gotw.home.icon+gotw.home.abbr+" vs "+gotw.away.icon+gotw.away.abbr,effects:{attendanceBoost:0.15,moraleBoost:2,revenueBoost:3}};
  }
};

export function buildRivalryDashboard977(myTeam,teams){
  if(!myTeam||!myTeam.rivals)return{active:[],trophies:[]};
  var active=myTeam.rivals.filter(function(r){return(r.heat||0)>=20;}).sort(function(a,b){return(b.heat||0)-(a.heat||0);}).map(function(r){
    var opp=teams.find(function(t){return t.id===r.teamId;});
    return{rival:r,opp:opp,tier:getRivalryLabel(r.heat),h2h:r.history||{wins:0,losses:0,streak:0},trophy:r.trophy977||null,holdsTrophy:r.trophy977?r.trophy977.holderId===myTeam.id:false};
  });
  var trophies=active.filter(function(a){return a.holdsTrophy;});
  return{active:active,trophies:trophies};
}
