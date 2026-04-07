/**
 * MFD All-Time Records System
 *
 * League-wide record tracking across 12 statistical categories
 * (9 individual + 3 team), with history scanning and top-10 lists.
 */

export var ALL_TIME_RECORDS={
  categories:[
    {id:"passYds",label:"Passing Yards",pos:"QB",type:"season"},
    {id:"passTD",label:"Passing TDs",pos:"QB",type:"season"},
    {id:"rushYds",label:"Rushing Yards",pos:"RB",type:"season"},
    {id:"rushTD",label:"Rushing TDs",pos:"RB",type:"season"},
    {id:"recYds",label:"Receiving Yards",pos:"WR",type:"season"},
    {id:"rec",label:"Receptions",pos:"WR",type:"season"},
    {id:"sacks",label:"Sacks",pos:"DL",type:"season"},
    {id:"defINT",label:"Interceptions",pos:"DB",type:"season"},
    {id:"tackles",label:"Tackles",pos:"LB",type:"season"},
    {id:"teamWins",label:"Team Wins",pos:null,type:"team_season"},
    {id:"teamPF",label:"Points Scored",pos:null,type:"team_season"},
    {id:"teamPA",label:"Fewest Points Allowed",pos:null,type:"team_season",invert:true}
  ],
  buildRecords:function(history){
    var records={};
    ALL_TIME_RECORDS.categories.forEach(function(cat){records[cat.id]=[];});
    if(!history)return records;
    history.forEach(function(h){
      if(!h||!h.teams)return;
      h.teams.forEach(function(t){
        if(t.wins!==undefined)records.teamWins.push({val:t.wins,name:t.abbr,icon:t.icon||"",year:h.year});
        if(t.pointsFor!==undefined)records.teamPF.push({val:t.pointsFor,name:t.abbr,icon:t.icon||"",year:h.year});
        if(t.pointsAgainst!==undefined)records.teamPA.push({val:t.pointsAgainst,name:t.abbr,icon:t.icon||"",year:h.year});
        if(t.rosterSnap){
          t.rosterSnap.forEach(function(p){
            if(!p||!p.stats)return;
            var s=p.stats;
            if(s.passYds)records.passYds.push({val:s.passYds,name:p.name,pos:p.pos,team:t.abbr,year:h.year});
            if(s.passTD)records.passTD.push({val:s.passTD,name:p.name,pos:p.pos,team:t.abbr,year:h.year});
            if(s.rushYds)records.rushYds.push({val:s.rushYds,name:p.name,pos:p.pos,team:t.abbr,year:h.year});
            if(s.rushTD)records.rushTD.push({val:s.rushTD,name:p.name,pos:p.pos,team:t.abbr,year:h.year});
            if(s.recYds)records.recYds.push({val:s.recYds,name:p.name,pos:p.pos,team:t.abbr,year:h.year});
            if(s.rec)records.rec.push({val:s.rec,name:p.name,pos:p.pos,team:t.abbr,year:h.year});
            if(s.sacks)records.sacks.push({val:s.sacks,name:p.name,pos:p.pos,team:t.abbr,year:h.year});
            if(s.defINT)records.defINT.push({val:s.defINT,name:p.name,pos:p.pos,team:t.abbr,year:h.year});
            if(s.tackles)records.tackles.push({val:s.tackles,name:p.name,pos:p.pos,team:t.abbr,year:h.year});
          });
        }
      });
    });
    ALL_TIME_RECORDS.categories.forEach(function(cat){
      if(cat.invert){records[cat.id].sort(function(a,b){return a.val-b.val;});}
      else{records[cat.id].sort(function(a,b){return b.val-a.val;});}
      records[cat.id]=records[cat.id].slice(0,10);// Top 10
    });
    return records;
  }
};
