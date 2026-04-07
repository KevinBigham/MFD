/**
 * MFD Cap Visualization
 *
 * Builds salary cap breakdown by position, top contract hits,
 * and 3-year cap projections for a team.
 */

export function buildCapVisualization(team){
  if(!team)return null;
  var posCap={};var totalCap=0;
  team.roster.forEach(function(p){
    if(!p.contract)return;
    var sal=p.contract.salary||0;
    if(!posCap[p.pos])posCap[p.pos]=0;
    posCap[p.pos]+=sal;totalCap+=sal;
  });
  var breakdown=Object.keys(posCap).map(function(pos){
    return{pos:pos,cap:Math.round(posCap[pos]*10)/10,pct:totalCap>0?Math.round(posCap[pos]/totalCap*100):0};
  }).sort(function(a,b){return b.cap-a.cap;});
  var topHits=team.roster.filter(function(p){return p.contract&&p.contract.salary>0;})
    .sort(function(a,b){return(b.contract.salary||0)-(a.contract.salary||0);}).slice(0,10)
    .map(function(p){return{name:p.name,pos:p.pos,ovr:p.ovr,age:p.age,
      salary:p.contract.salary,years:p.contract.years,
      value:p.ovr>=75?"✅ Fair":p.ovr>=70?"⚠️ Watch":"❌ Overpay"};});
  var projections=[];
  for(var yr=0;yr<3;yr++){
    var expiring=0;var committed=0;
    team.roster.forEach(function(p){
      if(!p.contract)return;
      if(p.contract.years<=yr)expiring+=p.contract.salary||0;
      else committed+=p.contract.salary||0;
    });
    var projCap=150;// Simplified cap
    projections.push({year:"Y+"+(yr+1),committed:Math.round(committed*10)/10,
      expiring:Math.round(expiring*10)/10,space:Math.round((projCap-committed)*10)/10,
      warning:committed>projCap*0.85?"⚠️ Cap cliff":committed>projCap*0.7?"📋 Tight":""});
  }
  var deadCap=team.deadCap||0;
  return{breakdown:breakdown,topHits:topHits,projections:projections,
    totalUsed:Math.round(totalCap*10)/10,capRoom:Math.round((150-totalCap-deadCap)*10)/10,deadCap:deadCap};
}
