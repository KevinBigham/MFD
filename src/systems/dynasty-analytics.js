/**
 * MFD Dynasty Analytics
 *
 * Dynasty index scoring, peak power windows, longevity tracking,
 * dominance scoring, era card generation, and hall of seasons.
 */

export function calcDominanceScore(tr,h){
  var score=tr.wins*3;// Base: 3pts per win
  if(h.winnerId===tr.id)score+=30;// Title
  if(tr.playoffWins)score+=tr.playoffWins*8;// Playoff wins
  if(tr.pf&&tr.pa)score+=Math.max(0,Math.round((tr.pf-tr.pa)/10));// Point differential
  if(tr.offRank===1)score+=10;
  if(tr.defRank===1)score+=10;
  return score;
}
export function calcDynastyIndex(teamData){
  var d=teamData;if(!d.seasons||d.seasons<1)return 0;
  var winPct=d.wins/Math.max(1,d.wins+d.losses);
  return Math.round(
    (d.titles||0)*100 +
    (d.playoffWins||0)*15 +
    winPct*50*d.seasons +
    (d.mvps||0)*25 +
    (d.dpoys||0)*20 +
    (d.rivalryDominance||0)*10
  );
}
export function calcPeakPower(history,teamId){
  if(!history||history.length<5)return{score:0,startYear:0,endYear:0};
  var bestScore=0,bestStart=0;
  for(var i=0;i<=history.length-5;i++){
    var windowScore=0;
    for(var j=i;j<i+5;j++){
      var h=history[j];if(!h.teamRecords)continue;
      var tr=h.teamRecords.find(function(r){return r.id===teamId;});
      if(tr){
        windowScore+=calcDominanceScore(tr,h);
        if(h.winnerId===teamId)windowScore+=30;// Championship bonus in window
      }
    }
    if(windowScore>bestScore){bestScore=windowScore;bestStart=i;}
  }
  return{score:Math.round(bestScore),startYear:history[bestStart]?history[bestStart].year:0,
    endYear:history[Math.min(bestStart+4,history.length-1)]?history[Math.min(bestStart+4,history.length-1)].year:0};
}
export function calcLongevity(history,teamId){
  if(!history||history.length<1)return{score:0,winningSzns:0,playoffAppearances:0};
  var winningSzns=0,playoffApp=0,totalDom=0;
  history.forEach(function(h){
    if(!h.teamRecords)return;
    var tr=h.teamRecords.find(function(r){return r.id===teamId;});
    if(tr){
      if(tr.wins>tr.losses)winningSzns++;
      if(tr.playoffWins&&tr.playoffWins>0)playoffApp++;
      totalDom+=calcDominanceScore(tr,h);
    }
  });
  var consistency=history.length>0?Math.round(winningSzns/history.length*100):0;
  return{score:Math.round(totalDom/Math.max(1,history.length)*10+winningSzns*8+playoffApp*12),
    winningSzns:winningSzns,playoffAppearances:playoffApp,consistency:consistency};
}
export function generateIdentityTags(tr,h){
  var tags=[];
  if(tr.defRank===1||tr.defRank<=3)tags.push({id:"lockdown",label:"🛡️ Lockdown Defense",color:"#34d399"});
  if(tr.offRank===1||tr.offRank<=3)tags.push({id:"airraid",label:"✈️ Air Raid",color:"#60a5fa"});
  var pf=tr.pf||0,pa=tr.pa||0;
  if(pf-pa>=100)tags.push({id:"dominant",label:"💪 Dominant",color:"#f59e0b"});
  if(pa<(pf*0.7)&&pa>0)tags.push({id:"fortress",label:"🏰 Fortress",color:"#a78bfa"});
  if(tr.wins>=10&&tr.losses<=6)tags.push({id:"juggernaut",label:"🚂 Juggernaut",color:"#ef4444"});
  if(h&&h.mvp&&h.mvp.tm===tr.abbr)tags.push({id:"mvp_team",label:"⭐ MVP Factory",color:"#fbbf24"});
  if(h&&h.winnerId===tr.id)tags.push({id:"clutch",label:"👑 Clutch Kings",color:"#f472b6"});
  if(tr.defRank<=2)tags.push({id:"ballhawks",label:"🦅 Ball Hawks",color:"#22d3ee"});
  return tags.slice(0,3);// Max 3 tags per season
}
export var ERA_THRESHOLD=30;
export var ALMANAC_SCHEMA_VERSION=2;
export function generateEraCards(history,teams){
  if(!history||history.length<3)return[];
  var teamStreaks={};
  var eras=[];
  history.forEach(function(h){
    if(!h.teamRecords)return;
    h.teamRecords.forEach(function(tr){
      var k=tr.abbr;var ds=calcDominanceScore(tr,h);
      if(!teamStreaks[k])teamStreaks[k]={start:h.year,end:h.year,wins:0,losses:0,titles:0,
        playoffWins:0,domScores:[],downYears:0,id:tr.id,offRank1:0,defRank1:0};
      var s=teamStreaks[k];
      if(ds>=ERA_THRESHOLD){
        s.wins+=tr.wins;s.losses+=tr.losses;s.end=h.year;
        if(h.winnerId===tr.id)s.titles+=1;
        s.playoffWins+=(tr.playoffWins||0);
        s.domScores.push(ds);s.downYears=0;
        if(tr.offRank===1)s.offRank1+=1;
        if(tr.defRank===1)s.defRank1+=1;
      }else{
        s.downYears+=1;
        if(s.downYears>=2&&s.domScores.length>=2){
          var t2=teams.find(function(t3){return t3.abbr===k;});
          var avgDom=Math.round(s.domScores.reduce(function(a,b){return a+b;},0)/s.domScores.length);
          eras.push({abbr:k,team:t2,start:s.start,end:s.end,wins:s.wins,losses:s.losses,
            titles:s.titles,seasons:s.domScores.length,avgDom:avgDom,playoffWins:s.playoffWins,
            offRank1:s.offRank1,defRank1:s.defRank1,totalDom:s.domScores.reduce(function(a,b){return a+b;},0)});
        }
        if(s.downYears>=2){
          teamStreaks[k]={start:h.year,end:h.year,wins:tr.wins>=10?tr.wins:0,losses:tr.wins>=10?tr.losses:0,
            titles:h.winnerId===tr.id?1:0,playoffWins:tr.playoffWins||0,
            domScores:ds>=ERA_THRESHOLD?[ds]:[],downYears:ds>=ERA_THRESHOLD?0:1,id:tr.id,offRank1:0,defRank1:0};
        }
      }
    });
  });
  Object.keys(teamStreaks).forEach(function(k){
    var s=teamStreaks[k];
    if(s.domScores.length>=2){
      var t2=teams.find(function(t3){return t3.abbr===k;});
      var avgDom=Math.round(s.domScores.reduce(function(a,b){return a+b;},0)/s.domScores.length);
      eras.push({abbr:k,team:t2,start:s.start,end:s.end,wins:s.wins,losses:s.losses,
        titles:s.titles,seasons:s.domScores.length,avgDom:avgDom,playoffWins:s.playoffWins,
        offRank1:s.offRank1,defRank1:s.defRank1,totalDom:s.domScores.reduce(function(a,b){return a+b;},0)});
    }
  });
  return eras.sort(function(a,b){return b.totalDom-a.totalDom;}).slice(0,10);
}
function generateHallPlaque(tr,h,ds,sigWin,topPlayer){
  var parts=[];
  if(h.winnerId===tr.id)parts.push("🏆 Champions");
  if(tr.offRank===1)parts.push("#1 Offense");
  if(tr.defRank===1)parts.push("#1 Defense");
  if(tr.wins>=14)parts.push("Dominant "+tr.wins+"-"+tr.losses);
  else if(tr.wins>=12)parts.push("Elite "+tr.wins+"-"+tr.losses);
  else parts.push(tr.wins+"-"+tr.losses);
  parts.push(ds+" DOM");
  if(topPlayer)parts.push("⭐ "+topPlayer.name+" ("+topPlayer.label+")");
  if(sigWin)parts.push("Sig win: Wk"+sigWin.week+" "+(sigWin.margin<=3?"thriller":"")+" "+sigWin.hAbbr+" "+sigWin.hScore+"-"+sigWin.aScore+" "+sigWin.aAbbr);
  return parts.slice(0,4).join(" · ");
}
export function buildHallOfSeasons(history,teams){
  if(!history||history.length<1)return[];
  var seasons=[];
  history.forEach(function(h){
    if(!h.teamRecords)return;
    h.teamRecords.forEach(function(tr){
      var ds=calcDominanceScore(tr,h);
      var t2=teams.find(function(t3){return t3.abbr===tr.abbr;});
      var sigWin=h.topGames&&h.topGames.length>0?h.topGames[0]:null;
      var topPlayer=null;
      if(h.mvp&&h.mvp.tm===tr.abbr)topPlayer={name:h.mvp.name,pos:h.mvp.pos,label:"MVP"};
      else if(h.allPro1st){
        Object.keys(h.allPro1st).forEach(function(pos){
          if(!topPlayer)h.allPro1st[pos].forEach(function(ap){
            if(!topPlayer&&ap.tm===tr.abbr)topPlayer={name:ap.name,pos:pos,label:"All-Pro"};
          });
        });
      }
      var plaque=generateHallPlaque(tr,h,ds,sigWin,topPlayer);
      var idTags=generateIdentityTags(tr,h);
      seasons.push({year:h.year,abbr:tr.abbr,team:t2,icon:t2?t2.icon:"",
        wins:tr.wins,losses:tr.losses,dom:ds,isChamp:h.winnerId===tr.id,
        topPlayer:topPlayer,sigWin:sigWin,plaque:plaque,idTags:idTags,schemaV:ALMANAC_SCHEMA_VERSION});
    });
  });
  return seasons.sort(function(a,b){return b.dom-a.dom;}).slice(0,20);
}
