/**
 * MFD Awards Ceremony Builder
 *
 * Constructs the end-of-season awards reveal sequence:
 * ROY → COTY → OPOY → DPOY → MVP, with runner-up info.
 */

export function buildAwardsCeremony(awards){
  if(!awards)return null;
  var reveal=[];
  if(awards.roy){
    var royLine=awards.roy.pos+" "+awards.roy.name+" ("+awards.roy.team+", Age "+awards.roy.age+")";
    var roySub=awards.roy.runnerUp74?"Runner-up: "+awards.roy.runnerUp74.name+" ("+awards.roy.runnerUp74.pos+", "+awards.roy.runnerUp74.tm+")":"";
    reveal.push({category:"🌱 OFFENSIVE ROOKIE OF THE YEAR",winner:awards.roy,line:royLine,sub:roySub,emoji:"🌱"});
  }
  if(awards.coty)reveal.push({category:"🎓 COACH OF THE YEAR",winner:awards.coty,
    line:awards.coty.name+" ("+awards.coty.team+", "+awards.coty.wins+"-"+awards.coty.losses+")",sub:"",emoji:"🎓"});
  if(awards.opoy){
    var opoyLine=awards.opoy.pos+" "+awards.opoy.name+" ("+awards.opoy.team+")";
    var opoySub=awards.opoy.runnerUp74?"Runner-up: "+awards.opoy.runnerUp74.name+" ("+awards.opoy.runnerUp74.pos+", "+awards.opoy.runnerUp74.tm+")":"";
    reveal.push({category:"⚡ OFFENSIVE PLAYER OF THE YEAR",winner:awards.opoy,line:opoyLine,sub:opoySub,emoji:"⚡"});
  }
  if(awards.dpoy){
    var dpoyLine=awards.dpoy.pos+" "+awards.dpoy.name+" ("+awards.dpoy.team+") — "+awards.dpoy.line;
    var dpoySub=awards.dpoy.runnerUp74?"Runner-up: "+awards.dpoy.runnerUp74.name+" ("+awards.dpoy.runnerUp74.pos+", "+awards.dpoy.runnerUp74.tm+")":"";
    reveal.push({category:"🛡️ DEFENSIVE PLAYER OF THE YEAR",winner:awards.dpoy,line:dpoyLine,sub:dpoySub,emoji:"🛡️"});
  }
  if(awards.mvp){
    var mvpLine=awards.mvp.pos+" "+awards.mvp.name+" ("+awards.mvp.team+") — "+awards.mvp.line;
    var mvpSub=awards.mvp.runnerUp74?"Runner-up: "+awards.mvp.runnerUp74.name+" ("+awards.mvp.runnerUp74.pos+", "+awards.mvp.runnerUp74.tm+")"+(awards.mvp.margin74?" — margin: "+awards.mvp.margin74+" pts":""):"";
    reveal.push({category:"🏆 MOST VALUABLE PLAYER",winner:awards.mvp,line:mvpLine,sub:mvpSub,emoji:"🏆"});
  }
  return{reveal:reveal,year:awards.year};
}
