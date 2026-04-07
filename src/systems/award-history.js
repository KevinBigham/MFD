/**
 * MFD Award History & Career Pages
 *
 * Tracks award winners across seasons, multi-time winners,
 * rivalry trophy names, and builds player career page data.
 */

var AWARD_HISTORY_LOG=[];// [{year, mvp:{name,pos,team}, dpoy, roy, coty}]

export function recordAwardHistory(awards,year){
  if(!awards)return;
  AWARD_HISTORY_LOG.push({year:year,
    mvp:awards.mvp?{name:awards.mvp.name,pos:awards.mvp.pos,team:awards.mvp.team}:null,
    dpoy:awards.dpoy?{name:awards.dpoy.name,pos:awards.dpoy.pos,team:awards.dpoy.team}:null,
    roy:awards.roy?{name:awards.roy.name,pos:awards.roy.pos,team:awards.roy.team}:null,
    coty:awards.coty?{name:awards.coty.name,team:awards.coty.team}:null
  });
}
export function getMultiTimeWinners(awardKey){
  var counts={};
  AWARD_HISTORY_LOG.forEach(function(h){
    var winner=h[awardKey];if(!winner)return;
    var key=winner.name+"|"+winner.pos;
    if(!counts[key])counts[key]={name:winner.name,pos:winner.pos||"HC",team:winner.team,count:0,years:[]};
    counts[key].count++;counts[key].years.push(h.year);
  });
  return Object.keys(counts).map(function(k){return counts[k];}).filter(function(c){return c.count>=2;}).sort(function(a,b){return b.count-a.count;});
}
export function getTrophyName(trophyNames,teamA,teamB){
  if(!trophyNames)return null;
  var key=[teamA,teamB].sort().join("-");
  return trophyNames[key]||null;
}
export function setTrophyNameForRivalry(trophyNames,teamA,teamB,name){
  var key=[teamA,teamB].sort().join("-");
  var updated=Object.assign({},trophyNames||{});
  if(name&&name.trim())updated[key]=name.trim();
  else delete updated[key];
  return updated;
}
export function buildCareerPage(playerName,history,teams){
  if(!playerName||!history)return null;
  var seasons=[];var careerStats={passYds:0,passTD:0,rushYds:0,rushTD:0,recYds:0,sacks:0,ints:0,tackles:0};
  var teamsPlayed={};var awards=[];
  history.forEach(function(h){
    if(!h.teams)return;
    h.teams.forEach(function(t){
      t.roster.forEach(function(p){
        if(p.name!==playerName)return;
        teamsPlayed[t.abbr]=true;
        var s={year:h.year,team:t.abbr,icon:t.icon||"🏈",pos:p.pos,ovr:p.ovr,age:p.age,stats:Object.assign({},p.stats||{})};
        var st=p.stats||{};
        careerStats.passYds+=(st.passYds||0);careerStats.passTD+=(st.passTD||0);
        careerStats.rushYds+=(st.rushYds||0);careerStats.rushTD+=(st.rushTD||0);
        careerStats.recYds+=(st.recYds||0);careerStats.sacks+=(st.sacks||0);
        careerStats.ints+=(st.ints||0);careerStats.tackles+=(st.tackles||0);
        seasons.push(s);
      });
    });
    if(h.mvp&&h.mvp.name===playerName)awards.push({year:h.year,award:"🏆 MVP"});
    if(h.dpoy&&h.dpoy.name===playerName)awards.push({year:h.year,award:"🛡️ DPOY"});
    if(h.roy&&h.roy.name===playerName)awards.push({year:h.year,award:"🌱 ROY"});
  });
  AWARD_HISTORY_LOG.forEach(function(ah){
    if(ah.mvp&&ah.mvp.name===playerName&&!awards.some(function(a){return a.year===ah.year&&a.award==="🏆 MVP";}))
      awards.push({year:ah.year,award:"🏆 MVP"});
    if(ah.dpoy&&ah.dpoy.name===playerName&&!awards.some(function(a){return a.year===ah.year&&a.award==="🛡️ DPOY";}))
      awards.push({year:ah.year,award:"🛡️ DPOY"});
    if(ah.roy&&ah.roy.name===playerName&&!awards.some(function(a){return a.year===ah.year&&a.award==="🌱 ROY";}))
      awards.push({year:ah.year,award:"🌱 ROY"});
  });
  if(seasons.length===0)return null;
  return{name:playerName,pos:seasons[0].pos,seasons:seasons,career:careerStats,
    teams:Object.keys(teamsPlayed),awards:awards,yearsPlayed:seasons.length};
}
export { AWARD_HISTORY_LOG };
