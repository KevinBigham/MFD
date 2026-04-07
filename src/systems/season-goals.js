/**
 * MFD Season Goals System
 *
 * Three-layer goal system — owner goals (franchise objectives),
 * coach goals (performance targets), and player goals (stat milestones).
 * Includes goal generation, progress tracking, and end-of-season evaluation.
 */
import { rng } from '../utils/index.js';

export var OWNER_GOAL_TEMPLATES=[
  {id:"win_title",label:"Win the Championship",forGoal:"title",reward:{ownerMood:12,cash:8},penalty:{ownerMood:-18}},
  {id:"win_division",label:"Win Your Division",forGoal:"title",reward:{ownerMood:8,cash:4},penalty:{ownerMood:-10}},
  {id:"make_playoffs",label:"Make the Playoffs",forGoal:"playoff",reward:{ownerMood:10,cash:5},penalty:{ownerMood:-15}},
  {id:"sell_tickets",label:"Average 90%+ Attendance",forGoal:"playoff",reward:{ownerMood:7,cash:6},penalty:{ownerMood:-8}},
  {id:"no_blowouts",label:"No Losses by 21+",forGoal:"playoff",reward:{ownerMood:6},penalty:{ownerMood:-10}},
  {id:"develop_youth",label:"Start 3+ Players Under 25",forGoal:"rebuild",reward:{ownerMood:8},penalty:{ownerMood:-10}},
  {id:"stay_solvent",label:"Finish Cash-Positive",forGoal:"rebuild",reward:{ownerMood:6,cash:6},penalty:{ownerMood:-12}}
];
export var COACH_GOAL_TEMPLATES=[
  {id:"top10_offense",label:"Finish Top-10 in Scoring",reward:{coachDev:2,morale:4},penalty:{coachDev:-2}},
  {id:"top10_defense",label:"Finish Top-10 in Scoring Defense",reward:{coachDev:2,morale:4},penalty:{coachDev:-2}},
  {id:"develop_rookie",label:"Rookie Starter Reaches 75+ OVR",reward:{coachDev:2,morale:3},penalty:{coachDev:-1}},
  {id:"win_streak_5",label:"Win 5 Games in a Row",reward:{morale:6},penalty:{morale:-2}},
  {id:"no_shutouts",label:"Never Get Shut Out",reward:{morale:3},penalty:{morale:-3}}
];
export var PLAYER_GOAL_TEMPLATES=[
  {id:"3500_pass",label:"3,500 Passing Yards",pos:["QB"],stat:"passYds",target:3500,compare:"gte",reward:{morale:8,devBoost:1},penalty:{morale:-3}},
  {id:"24_td",label:"24 Touchdown Passes",pos:["QB"],stat:"passTD",target:24,compare:"gte",reward:{morale:8,devBoost:1},penalty:{morale:-3}},
  {id:"low_int",label:"Under 12 Interceptions",pos:["QB"],stat:"int",target:12,compare:"lte",reward:{morale:6},penalty:{morale:-3}},
  {id:"800_rush",label:"800 Rushing Yards",pos:["RB"],stat:"rushYds",target:800,compare:"gte",reward:{morale:8,devBoost:1},penalty:{morale:-3}},
  {id:"7_rush_td",label:"7 Rushing Touchdowns",pos:["RB"],stat:"rushTD",target:7,compare:"gte",reward:{morale:7},penalty:{morale:-3}},
  {id:"700_rec",label:"700 Receiving Yards",pos:["WR","TE"],stat:"recYds",target:700,compare:"gte",reward:{morale:8,devBoost:1},penalty:{morale:-3}},
  {id:"55_rec",label:"55 Receptions",pos:["WR","TE"],stat:"rec",target:55,compare:"gte",reward:{morale:6},penalty:{morale:-3}},
  {id:"7_sacks",label:"7 Sack Season",pos:["DL","LB"],stat:"sacks",target:7,compare:"gte",reward:{morale:7,devBoost:1},penalty:{morale:-3}},
  {id:"3_int",label:"3 Interceptions",pos:["CB","S"],stat:"defINT",target:3,compare:"gte",reward:{morale:7},penalty:{morale:-3}},
  {id:"75_tackles",label:"75 Tackles",pos:["LB","S"],stat:"tackles",target:75,compare:"gte",reward:{morale:6},penalty:{morale:-3}},
  {id:"83pct_fg",label:"83% FG Accuracy",pos:["K"],stat:"fgPct",target:83,compare:"gte",reward:{morale:6},penalty:{morale:-3}}
];
function _cloneGoal(t){
  return{id:t.id,label:t.label,stat:t.stat||null,target:typeof t.target==="number"?t.target:null,
    compare:t.compare||"gte",reward:t.reward||{},penalty:t.penalty||{},status:"active",current:0};
}
export function generateSeasonGoals(team){
  var ownerType=(team&&team.ownerGoal)?team.ownerGoal:"playoff";
  var ownerPool=OWNER_GOAL_TEMPLATES.filter(function(g){return g.forGoal===ownerType;});
  if(!ownerPool.length)ownerPool=OWNER_GOAL_TEMPLATES.slice();
  var ownerGoals=[];var oc=rng(1,2);
  for(var i=0;i<oc&&ownerPool.length;i++){var idx=rng(0,ownerPool.length-1);ownerGoals.push(_cloneGoal(ownerPool[idx]));ownerPool.splice(idx,1);}
  var coachPool=COACH_GOAL_TEMPLATES.slice();var coachGoals=[];var cc=rng(1,2);
  for(var j=0;j<cc&&coachPool.length;j++){var jx=rng(0,coachPool.length-1);coachGoals.push(_cloneGoal(coachPool[jx]));coachPool.splice(jx,1);}
  return{ownerGoals:ownerGoals,coachGoals:coachGoals};
}
export function generatePlayerGoals(team){
  var out=[];if(!team||!team.roster)return out;
  var eligible=team.roster.filter(function(p){
    return (p.ovr>=78)||(p.devTrait&&p.devTrait!=="normal");
  }).sort(function(a,b){return b.ovr-a.ovr;}).slice(0,8);
  eligible.forEach(function(p){
    var pool=PLAYER_GOAL_TEMPLATES.filter(function(t){
      for(var i=0;i<t.pos.length;i++){if(t.pos[i]==="ALL"||t.pos[i]===p.pos)return true;}return false;
    });
    if(!pool.length)return;
    var chosen=pool[rng(0,pool.length-1)];
    out.push({playerId:p.id,playerName:p.name,pos:p.pos,goal:_cloneGoal(chosen)});
  });
  return out;
}
function _getGoalStat(p,stat){
  if(!p||!p.stats)return 0;
  if(stat==="fgPct"){var a=p.stats.fgA||0;return a<=0?0:Math.round((p.stats.fgM||0)/a*100);}
  return p.stats[stat]||0;
}
export function updateGoalProgress(team,playerGoals){
  var newly=[];if(!team||!playerGoals)return newly;
  playerGoals.forEach(function(pg){
    if(!pg||!pg.goal||pg.goal.status!=="active")return;
    var p=team.roster.find(function(x){return x.id===pg.playerId;});if(!p)return;
    pg.goal.current=_getGoalStat(p,pg.goal.stat);
    var met=pg.goal.compare==="lte"?pg.goal.current<=pg.goal.target:pg.goal.current>=pg.goal.target;
    if(met){pg.goal.status="completed";newly.push({goalId:pg.goal.id,playerId:pg.playerId,playerName:pg.playerName,label:pg.goal.label});}
  });
  return newly;
}
export function evaluateGoals(team,allTeams,ownerGoals,coachGoals,playerGoals,tracking){
  var completed=[],failed=[],rewards={},penalties={};
  var tr=tracking||{};
  function _sum(target,src,mult){if(!src)return;for(var k in src){if(src.hasOwnProperty(k)&&typeof src[k]==="number"){target[k]=(target[k]||0)+src[k]*(mult||1);}}}
  (ownerGoals||[]).forEach(function(og){
    if(og.status!=="active")return;var ok=false;
    if(og.id==="win_title")ok=!!tr.isChamp;
    else if(og.id==="make_playoffs")ok=!!tr.madePlayoffs;
    else if(og.id==="win_division")ok=team._divRank76===1;
    else if(og.id==="no_blowouts")ok=(tr.blowoutLosses||0)===0;
    else if(og.id==="sell_tickets")ok=(team.attendance||0)>=((team.facilities?team.facilities.stad||0:0)*900*0.9);
    else if(og.id==="develop_youth")ok=team.roster.filter(function(p){return p.isStarter&&p.age<=25;}).length>=3;
    else if(og.id==="stay_solvent")ok=(team.cash||0)>0;
    if(ok){og.status="completed";completed.push({layer:"owner",id:og.id,label:og.label});_sum(rewards,og.reward);}
    else{og.status="failed";failed.push({layer:"owner",id:og.id,label:og.label});_sum(penalties,og.penalty);}
  });
  (coachGoals||[]).forEach(function(cg){
    if(cg.status!=="active")return;var ok=false;
    var pfRank=allTeams.slice().sort(function(a,b){return b.pf-a.pf;}).findIndex(function(t){return t.id===team.id;})+1;
    var paRank=allTeams.slice().sort(function(a,b){return a.pa-b.pa;}).findIndex(function(t){return t.id===team.id;})+1;
    if(cg.id==="top10_offense")ok=pfRank<=10;
    else if(cg.id==="top10_defense")ok=paRank<=10;
    else if(cg.id==="develop_rookie")ok=team.roster.some(function(p){return p.isStarter&&p.age<=23&&p.ovr>=75;});
    else if(cg.id==="win_streak_5")ok=(tr.bestWinStreak||0)>=5;
    else if(cg.id==="no_shutouts")ok=(tr.shutoutLosses||0)===0;
    if(ok){cg.status="completed";completed.push({layer:"coach",id:cg.id,label:cg.label});_sum(rewards,cg.reward);}
    else{cg.status="failed";failed.push({layer:"coach",id:cg.id,label:cg.label});_sum(penalties,cg.penalty);}
  });
  (playerGoals||[]).forEach(function(pg){
    var g=pg.goal;if(!g)return;
    if(g.status==="completed"){completed.push({layer:"player",id:g.id,label:g.label,playerName:pg.playerName});_sum(rewards,g.reward);}
    else{var met=g.compare==="lte"?g.current<=g.target:g.current>=g.target;
      if(met){g.status="completed";completed.push({layer:"player",id:g.id,label:g.label,playerName:pg.playerName});_sum(rewards,g.reward);}
      else{g.status="failed";failed.push({layer:"player",id:g.id,label:g.label,playerName:pg.playerName});_sum(penalties,g.penalty);}
    }
  });
  return{completed:completed,failed:failed,rewards:rewards,penalties:penalties};
}
