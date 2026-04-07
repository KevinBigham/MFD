/**
 * MFD Game Simulation Helpers
 *
 * Utility functions for in-game calculations:
 * - Fatigue multiplier (snap count based)
 * - Game script multiplier (score differential)
 * - Week-over-week delta tracking
 * - Causal attribution for performance changes
 */

export function calcFatigueMultiplier(snapsThisGame,maxSnaps){
  if(!maxSnaps||maxSnaps<=0)return 1.0;
  var usage=snapsThisGame/maxSnaps;
  if(usage>0.85)return 0.92;// Heavy usage = -8% effectiveness
  if(usage>0.7)return 0.96;
  return 1.0;
}
export function calcGameScriptMult(teamScore,oppScore,pos,role){
  var diff=teamScore-oppScore;
  if(diff>=14){// Blowout lead — ground and pound
    if(pos==="RB"&&(role==="rb1"||role==="goal_line"))return 1.15;
    if(pos==="WR"&&role==="wr_deep")return 0.85;
  }else if(diff<=-14){// Down big — passing game
    if(pos==="WR")return 1.12;
    if(pos==="RB"&&role==="3rd_down")return 1.10;
    if(pos==="RB"&&role==="rb1")return 0.88;
  }else if(diff<=-7){// Down a score — slight pass lean
    if(pos==="WR"&&role==="wr_slot")return 1.06;
  }
  return 1.0;
}
export function calcWeekDeltas(currentRecap,prevRecap){
  if(!currentRecap||!prevRecap)return null;
  var metrics=[
    {key:"pressureRate",label:"Pocket Win",icon:"🛡️"},
    {key:"turnovers",label:"Turnovers",icon:"🦋",invert:true},
    {key:"rzEff",label:"Red Zone",icon:"🎯"},
    {key:"coverageWin",label:"Coverage",icon:"📡"},
    {key:"runLaneAdv",label:"Run Lanes",icon:"🏃"}
  ];
  var deltas=[];
  metrics.forEach(function(m){
    var cur=currentRecap[m.key];var prev=prevRecap[m.key];
    if(cur!==undefined&&prev!==undefined){
      var d=cur-prev;
      if(Math.abs(d)>=3){// Only show meaningful changes
        deltas.push({key:m.key,label:m.label,icon:m.icon,prev:prev,cur:cur,delta:d,good:m.invert?d<0:d>0});
      }
    }
  });
  return deltas.length>0?deltas:null;
}
export function attributeCause(delta,recentLedger){
  if(!recentLedger||recentLedger.length===0)return{cause:"Natural variance",confidence:"LOW",proofs:[]};
  var matches=[];
  recentLedger.forEach(function(e){
    if(e.type==="INJURY"&&(delta.key==="pressureRate"||delta.key==="coverageWin"))
      matches.push({cause:"Injury: "+((e.detail||{}).name||"player"),entry:e,relevance:3});
    if(e.type==="SCHEME_CHANGE")matches.push({cause:"Scheme change",entry:e,relevance:2});
    if(e.type==="TRADE")matches.push({cause:"Roster move",entry:e,relevance:2});
    if(e.type==="LOCKER_CHOICE")matches.push({cause:"Locker room decision",entry:e,relevance:1});
    if(e.type==="HATE_WEEK")matches.push({cause:"Rivalry energy",entry:e,relevance:1});
    if(e.type==="FIX_APPLIED"){
      var fixType=(e.detail||{}).fix||"";
      var fixRelevance=1;
      if((fixType==="quick_pass"||fixType==="power_run")&&delta.key==="pressureRate")fixRelevance=3;
      if(fixType==="conservative"&&delta.key==="turnovers")fixRelevance=3;
      if(fixType==="red_zone"&&delta.key==="rzEff")fixRelevance=3;
      matches.push({cause:"Fix: "+fixType,entry:e,relevance:fixRelevance});
    }
  });
  if(matches.length===0)return{cause:"Natural variance",confidence:"LOW",proofs:[]};
  matches.sort(function(a,b){return b.relevance-a.relevance;});
  var best=matches[0];
  var confidence=best.relevance>=3?"HIGH":best.relevance>=2?"MED":"LOW";
  return{cause:best.cause,confidence:confidence,proofs:matches.slice(0,3).map(function(m){return m.entry;})};
}
