/**
 * MFD Rivalry Engine
 *
 * Rivalry key generation, hate week detection, trophy cases,
 * rivalry ladder, moments, highlights, fuel events, and trash talk.
 */

export function rivalryKey(a,b){var ids=[a,b].sort();return ids[0]+"|"+ids[1];}

export function checkHateWeek(rivalries,teamId,opponentId){
  if(!rivalries)return null;
  var key=rivalryKey(teamId,opponentId);var r=rivalries[key];
  if(!r||r.heat<9)return null;
  var tier=r.heat>=13?"BLOOD_FEUD":r.heat>=9?"BITTER":"RIVALRY";
  return{isHateWeek:true,heat:r.heat,tier:tier,series:r,
    seriesRecord:(r.a===teamId?(r.seriesA||0)+"-"+(r.seriesB||0):(r.seriesB||0)+"-"+(r.seriesA||0))};
}

export var MOMENT_GRAVITY={thriller:1,upset:2,playoff:3,elimination:4,championship:5};
export function addRivalryMoment(rivalries,key,moment){
  if(!rivalries||!rivalries[key])return;
  if(!rivalries[key].moments)rivalries[key].moments=[];
  moment.gravity=MOMENT_GRAVITY[moment.type]||1;
  rivalries[key].moments.push(moment);
  if(rivalries[key].moments.length>10)rivalries[key].moments=rivalries[key].moments.slice(-10);
}
export function getBiggestMoment(moments){
  if(!moments||moments.length===0)return null;
  return moments.slice().sort(function(a,b){return (b.gravity||0)-(a.gravity||0);})[0];
}
export function getMostRecentMoment(moments){
  if(!moments||moments.length===0)return null;
  return moments[moments.length-1];
}

export var MOMENT_CATEGORIES={
  upset:{label:"Upset",emoji:"😱",check:function(m){return m.gravity&&m.gravity>=3&&m.text&&m.text.indexOf("upset")>=0;}},
  playoff:{label:"Playoff Heartbreak",emoji:"💔",check:function(m){return m.text&&(m.text.indexOf("playoff")>=0||m.text.indexOf("championship")>=0);}},
  revenge:{label:"Revenge Game",emoji:"😤",check:function(m){return m.text&&m.text.indexOf("revenge")>=0;}},
  blowout:{label:"Blowout",emoji:"💥",check:function(m){return m.margin&&m.margin>=21;}},
  thriller:{label:"Thriller",emoji:"⚡",check:function(m){return m.margin!==undefined&&m.margin<=3;}}
};
export function categorizeMoment(m){
  var cats=[];
  Object.keys(MOMENT_CATEGORIES).forEach(function(k){
    if(MOMENT_CATEGORIES[k].check(m))cats.push(k);
  });
  return cats.length>0?cats:["general"];
}

export function buildRivalryTrophyCase(rivalry){
  var trophies=[];
  var winsA=rivalry.seriesA||0;var winsB=rivalry.seriesB||0;
  if(winsA>winsB)trophies.push({label:"Most Wins",value:winsA+"-"+winsB,winner:"a"});
  else if(winsB>winsA)trophies.push({label:"Most Wins",value:winsB+"-"+winsA,winner:"b"});
  else trophies.push({label:"Most Wins",value:"Tied "+winsA+"-"+winsB,winner:"tie"});
  var streakA=rivalry.streakA||0;var streakB=rivalry.streakB||0;
  if(streakA>0)trophies.push({label:"Current Streak",value:streakA+"W",winner:"a"});
  else if(streakB>0)trophies.push({label:"Current Streak",value:streakB+"W",winner:"b"});
  var biggest=null;
  (rivalry.moments||[]).forEach(function(m){
    if(m.margin&&(!biggest||m.margin>biggest.margin))biggest=m;
  });
  if(biggest)trophies.push({label:"Biggest Blowout",value:biggest.margin+"pts (Yr"+biggest.year+")",winner:"moment"});
  return trophies;
}
export function buildRivalryLadder(rivalries,teams){
  if(!rivalries)return[];
  return Object.keys(rivalries).map(function(k){
    var r=rivalries[k];
    var tA=teams.find(function(t){return t.id===r.a;});
    var tB=teams.find(function(t){return t.id===r.b;});
    var recentMoments=(r.moments||[]).slice(-3).reverse().map(function(m){
      m.categories=categorizeMoment(m);return m;
    });
    var emoji=r.heat>=13?"🔥🔥🔥":r.heat>=9?"🔥🔥":r.heat>=6?"🔥":"";
    var trophies=buildRivalryTrophyCase(r);
    return{key:k,heat:r.heat||0,tier:r.heat>=13?"BLOOD_FEUD":r.heat>=9?"BITTER":r.heat>=6?"HEATED":"WARM",
      t1:tA,t2:tB,seriesRecord:(r.seriesA||0)+"-"+(r.seriesB||0),
      moments:recentMoments,emoji:emoji,meetings:r.meetings||0,trophies:trophies};
  }).filter(function(r){return r.heat>=4;}).sort(function(a,b){return b.heat-a.heat;}).slice(0,10);
}
export function buildRivalryLadderLite(rivalries,teams){
  if(!rivalries)return[];
  var entries=[];
  Object.keys(rivalries).forEach(function(key){
    var r=rivalries[key];if(!r||!r.heat)return;
    var t1=teams.find(function(t){return t.id===r.a;});
    var t2=teams.find(function(t){return t.id===r.b;});
    if(!t1||!t2)return;
    var seriesRec=(r.seriesA||0)+"-"+(r.seriesB||0);
    var recentMoments=(r.moments||[]).slice(-3);
    entries.push({key:key,heat:r.heat,tier:r.heat>=13?"BLOOD_FEUD":r.heat>=9?"BITTER":"HOT",
      t1:t1,t2:t2,seriesRecord:seriesRec,moments:recentMoments,
      emoji:r.heat>=13?"🔥🔥🔥":r.heat>=9?"🔥🔥":"🔥"});
  });
  return entries.sort(function(a,b){return b.heat-a.heat;}).slice(0,10);
}

export function generateHighlights(gameResult){
  if(!gameResult||!gameResult.drives)return[];
  var highlights=[];var drives=gameResult.drives||[];
  var swingDrive=null;var maxSwing=0;
  drives.forEach(function(d,i){
    if(d.pts&&d.pts>0){var swing=d.pts+(d.turnover?7:0);
      if(swing>maxSwing){maxSwing=swing;swingDrive={idx:i,drive:d,swing:swing};}}
  });
  if(swingDrive)highlights.push({type:"swing",icon:"⚡",text:swingDrive.drive.team+" scored "+swingDrive.drive.pts+" on a "+
    (swingDrive.drive.type||"drive")+" — biggest momentum shift of the game"});
  var bigStop=drives.find(function(d){return d.turnover||d.type==="INT"||d.type==="FUM";});
  if(bigStop)highlights.push({type:"stop",icon:"🛡️",text:(bigStop.defTeam||"Defense")+" forced a "+(bigStop.type||"turnover")+" — momentum killer"});
  var longestTD=null;var maxPlays=0;
  drives.forEach(function(d){if(d.pts>=6&&(d.plays||0)>maxPlays){maxPlays=d.plays||0;longestTD=d;}});
  if(longestTD&&longestTD!==swingDrive)highlights.push({type:"clutch",icon:"🎯",text:longestTD.team+" converted a "+maxPlays+"-play TD drive — patience wins"});
  if(highlights.length<2&&gameResult.home!==undefined){
    var margin=Math.abs((gameResult.home||0)-(gameResult.away||0));
    if(margin<=7)highlights.push({type:"close",icon:"😤",text:"A "+margin+"-point game decided in the final drives"});
  }
  return highlights.slice(0,3);
}

export function generateReceipts(gameResult,reason){
  if(!gameResult||!gameResult.drives)return[];
  var drives=gameResult.drives||[];
  var receipts=[];
  if(reason.key==="pressureRate"||reason.key==="pocket"){
    drives.forEach(function(dr,di){
      if(dr.type==="SACK")receipts.push({drive:di+1,text:"Drive "+(di+1)+": "+dr.d,type:"sack"});
      if(dr.d&&dr.d.indexOf("Pressure")>=0)receipts.push({drive:di+1,text:"Drive "+(di+1)+": "+dr.d,type:"pressure"});
      if(dr.d&&dr.d.indexOf("Clean pocket")>=0)receipts.push({drive:di+1,text:"Drive "+(di+1)+": "+dr.d,type:"clean"});
    });
  }
  if(reason.key==="turnovers"||reason.key==="int"){
    drives.forEach(function(dr,di){
      if(dr.type==="INT"||dr.type==="FUMBLE")receipts.push({drive:di+1,text:"Drive "+(di+1)+": "+dr.d,type:"turnover"});
    });
  }
  if(reason.key==="redZone"||reason.key==="rzEff"){
    drives.forEach(function(dr,di){
      if(dr.type&&dr.type.indexOf("TD")>=0)receipts.push({drive:di+1,text:"Drive "+(di+1)+": "+dr.d,type:"td"});
      if(dr.type==="FG")receipts.push({drive:di+1,text:"Drive "+(di+1)+": "+dr.d,type:"fg"});
      if(dr.type==="FG_MISS")receipts.push({drive:di+1,text:"Drive "+(di+1)+": "+dr.d,type:"miss"});
    });
  }
  if(reason.key==="runLanes"||reason.key==="runLaneAdv"){
    drives.forEach(function(dr,di){
      if(dr.d&&dr.d.indexOf("BREAKAWAY")>=0)receipts.push({drive:di+1,text:"Drive "+(di+1)+": "+dr.d,type:"breakaway"});
      if(dr.type&&dr.type.indexOf("Rush")>=0)receipts.push({drive:di+1,text:"Drive "+(di+1)+": "+dr.d,type:"rush_td"});
    });
  }
  return receipts.slice(0,5);
}

export function getRivalryLabel(heat){
  var h=heat||0;
  if(h<20)return{tier:"none",label:null,emoji:""};
  if(h<40)return{tier:"budding",label:"Growing Rivalry",emoji:"🔥"};
  if(h<60)return{tier:"heated",label:"Rivalry Game",emoji:"🔥"};
  if(h<80)return{tier:"intense",label:"Bitter Rivals",emoji:"🔥🔥"};
  return{tier:"war",label:"Blood Feud",emoji:"🔥🔥🔥"};
}

export function findRivalObj(team,oppId){
  if(!team)return null;if(!team.rivals)team.rivals=[];
  for(var i=0;i<team.rivals.length;i++){if(team.rivals[i]&&team.rivals[i].teamId===oppId)return team.rivals[i];}
  return null;
}

export var FIX_IT_DRILLS={
  pressureRate:{drill:"Pass Pro Emphasis",action:"Reduce pressure rate this week",icon:"🛡️",fix:"quick_pass"},
  pocket:{drill:"Pass Pro Emphasis",action:"Focus OL assignments — reduce pressure rate",icon:"🛡️",fix:"quick_pass"},
  turnovers:{drill:"Ball Security",action:"QB conservative gameplan + protect the football",icon:"🏈",fix:"conservative"},
  int:{drill:"Ball Security",action:"QB safe reads — reduce interception risk",icon:"🏈",fix:"conservative"},
  redZone:{drill:"Red Zone Package",action:"Tweak red zone playcalling for higher conversion",icon:"🎯",fix:"red_zone"},
  rzEff:{drill:"Red Zone Package",action:"Install goal-line heavy sets — score TDs not FGs",icon:"🎯",fix:"red_zone"},
  runLanes:{drill:"Run Blocking Emphasis",action:"Power run focus — create lanes for RB",icon:"🏃",fix:"power_run"},
  runLaneAdv:{drill:"Run Blocking Emphasis",action:"Heavy sets — establish the run game",icon:"🏃",fix:"power_run"},
  coverageWin:{drill:"Coverage Emphasis",action:"Man-press or zone shell — limit explosive plays",icon:"📡",fix:"coverage"}
};
