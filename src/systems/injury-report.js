/**
 * MFD Injury Report Generator
 *
 * Generates league-wide injury reports with matchup notes
 * showing how injuries create advantages/disadvantages.
 */

export var INJURY_REPORT={
  generate:function(teams,week,myId,sched){
    var items=[];
    teams.forEach(function(t){
      t.roster.forEach(function(p){
        if(p.injury&&p.injury.games>0&&p.isStarter&&p.ovr>=65){
          var severity=p.injury.games>=5?"IR":p.injury.games>=3?"Out":"Questionable";
          var impact=p.ovr>=85?"HIGH":p.ovr>=75?"MED":"LOW";
          items.push({teamId:t.id,teamAbbr:t.abbr,teamIcon:t.icon,pid:p.id,name:p.name,pos:p.pos,
            ovr:p.ovr,weeksLeft:p.injury.games,type:p.injury.type,status:severity,impact:impact});
        }
      });
    });
    items.sort(function(a,b){return b.ovr-a.ovr||(b.weeksLeft-a.weeksLeft);});
    var matchupNotes=[];
    if(myId&&sched){
      var nextGame=sched.filter(function(g){return g.week===week&&(g.home===myId||g.away===myId);})[0];
      if(nextGame){
        var oppId=nextGame.home===myId?nextGame.away:nextGame.home;
        var myTeam=teams.find(function(t){return t.id===myId;});
        var oppTeam=teams.find(function(t){return t.id===oppId;});
        if(myTeam&&oppTeam){
          var myInjured=items.filter(function(x){return x.teamId===myId;});
          myInjured.forEach(function(inj){
            if(inj.pos==="CB"){
              var oppWR=oppTeam.roster.filter(function(p){return p.pos==="WR"&&p.isStarter;}).sort(function(a,b){return b.ovr-a.ovr;})[0];
              if(oppWR)matchupNotes.push({emoji:"📈",note:oppTeam.abbr+" WR "+oppWR.name+" advantage (your "+inj.pos+" "+inj.name+" out)",delta:"+"+Math.round((oppWR.ovr-inj.ovr)*0.6+5),axis:"coverage"});
            }
            if(inj.pos==="QB"){matchupNotes.push({emoji:"📉",note:"Your QB "+inj.name+" out — offense impact",delta:"-12",axis:"offense"});}
            if(inj.pos==="OL"){matchupNotes.push({emoji:"📉",note:"Your "+inj.name+" (OL) out — pressure risk",delta:"+8",axis:"pressure"});}
          });
          var oppInjured=items.filter(function(x){return x.teamId===oppId;});
          oppInjured.forEach(function(inj){
            if(inj.pos==="CB"){
              var myWR=myTeam.roster.filter(function(p){return p.pos==="WR"&&p.isStarter;}).sort(function(a,b){return b.ovr-a.ovr;})[0];
              if(myWR)matchupNotes.push({emoji:"📈",note:"Your WR "+myWR.name+" advantage ("+oppTeam.abbr+" "+inj.pos+" "+inj.name+" out)",delta:"+"+Math.round((myWR.ovr-inj.ovr)*0.6+5),axis:"coverage"});
            }
            if(inj.pos==="QB"){matchupNotes.push({emoji:"📈",note:oppTeam.abbr+" QB "+inj.name+" out — their offense crippled",delta:"+12",axis:"offense"});}
          });
        }
      }
    }
    return{items:items.slice(0,8),matchupNotes:matchupNotes.slice(0,4),week:week};
  }
};
