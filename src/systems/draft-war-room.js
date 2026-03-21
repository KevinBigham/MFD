/**
 * MFD Draft War Room
 *
 * Draft-day intelligence engine — builds a target board ranked
 * by composite value (OVR + need + scheme fit), generates BPA
 * alerts, and produces auto-pick recommendations.
 */
import { avg, cl } from '../utils/index.js';

function starters(r,pos,n){
  var healthy=r.filter(function(p){return p.pos===pos&&!(p.injury&&p.injury.games>0);});
  healthy.sort(function(a,b){var aS=a.isStarter?1:0;var bS=b.isStarter?1:0;return bS-aS||b.ovr-a.ovr;});
  return healthy.slice(0,n||1);
}

export var DRAFT_WAR_ROOM={
  getIntel:function(dc,team,pick,schemes){
    dc=dc||{};team=team||{};schemes=schemes||{};
    var pool=dc.pool||dc.draftClass||dc.class||dc.prospects||[];
    var rem=pool.filter(function(p){return p&&!(p._drafted||p.draftedBy||p.draftPick);});
    var posList=["QB","RB","WR","TE","OL","DL","LB","CB","S","K","P"];
    var needs={};
    posList.forEach(function(pos){
      var sts=team.roster?starters(team.roster,pos,pos==="OL"?5:pos==="WR"?2:1):[];
      var o=sts&&sts.length?avg(sts,function(pl){return pl.ovr||50;}):50;
      needs[pos]=cl(80-o,0,40);// 0..40
    });
    var scored=rem.map(function(p){
      var need=needs[p.pos]||0;
      var schemeFit=DRAFT_WAR_ROOM.schemeFitScore(p,schemes);
      var val=(p.ovr||50)+need*0.35+schemeFit*0.20+(p.pos==='QB'?12:0);
      return {p:p,val:val,need:need,fit:schemeFit};
    }).sort(function(a,b){return b.val-a.val;});
    var targetBoard=scored.slice(0,5).map(function(x){
      return {id:x.p.id||x.p.name, name:x.p.name, pos:x.p.pos, ovr:x.p.ovr||50, value:Math.round(x.val), need:Math.round(x.need), schemeFit:Math.round(x.fit)};
    });
    var bpa=scored[0]||null;
    var next=scored[1]||null;
    var bpaAlert=null;
    if(bpa&&next&&bpa.val-next.val>=6){
      bpaAlert={msg:"BPA gap: "+bpa.p.name+" is "+Math.round(bpa.val-next.val)+" points above next best.", prospect:{id:bpa.p.id||bpa.p.name,name:bpa.p.name,pos:bpa.p.pos,ovr:bpa.p.ovr||50}};
    }
    var pickRec=bpa;
    if(scored.length){
      var needFirst=scored.slice(0,12).sort(function(a,b){
        var na=(a.need*1.2)+(a.fit*0.3)+(a.p.ovr||50)*0.2;
        var nb=(b.need*1.2)+(b.fit*0.3)+(b.p.ovr||50)*0.2;
        return nb-na;
      })[0];
      if(needFirst&&bpa&&bpa.val-needFirst.val<10)pickRec=needFirst;
    }
    var recReason=[];
    if(pickRec){
      if(pickRec===bpa)recReason.push("Best player available by value.");
      if((pickRec.need||0)>=20)recReason.push("Fills a high team need.");
      if((pickRec.fit||0)>=15)recReason.push("Strong scheme fit.");
    }
    return {
      targetBoard:targetBoard,
      bpaAlert:bpaAlert,
      schemeFit:{off:schemes.off||null, def:schemes.def||null},
      autoPick:pickRec?{id:pickRec.p.id||pickRec.p.name,name:pickRec.p.name,pos:pickRec.p.pos,ovr:pickRec.p.ovr||50,reason:recReason.join(" ")}:null
    };
  },
  schemeFitScore:function(p,schemes){
    p=p||{};schemes=schemes||{};
    var off=schemes.off||"";var def=schemes.def||"";
    var r=p.ratings||{};
    var score=0;
    if(p.pos==="QB"){
      if(off==="west_coast")score+=(r.shortAccuracy||50)*0.10+(r.fieldVision||50)*0.08;
      if(off==="air_raid")score+=(r.deepAccuracy||50)*0.10+(r.throwPower||r.arm||50)*0.08;
      if(off==="balanced_o")score+=(r.awareness||50)*0.08+(r.accuracy||50)*0.08;
      if(off==="smashmouth")score+=(r.toughness||50)*0.06+(r.pocketPresence||50)*0.06;
    }else if(p.pos==="RB"){
      if(off==="ground_pound"||off==="smashmouth")score+=(r.power||50)*0.10+(r.truckPower||50)*0.06;
      if(off==="west_coast"||off==="balanced_o")score+=(r.ballCarrierVision||50)*0.08+(r.elusiveness||50)*0.06;
    }else if(p.pos==="WR"||p.pos==="TE"){
      if(off==="west_coast")score+=(r.shortRoute||50)*0.10+(r.separation||50)*0.06;
      if(off==="air_raid")score+=(r.deepRoute||50)*0.10+(r.speed||50)*0.06;
      score+=(r.catching||50)*0.05+(r.catchInTraffic||50)*0.05;
    }else if(p.pos==="OL"){
      if(off==="ground_pound"||off==="smashmouth")score+=(r.pullBlock||50)*0.10+(r.runBlock||50)*0.06;
      else score+=(r.passBlock||50)*0.08+(r.assignmentIQ||50)*0.06;
    }else if(p.pos==="DL"){
      if(def==="blitz_heavy")score+=(r.powerMoves||50)*0.08+(r.motorEffort||50)*0.06;
      if(def==="zone_cov")score+=(r.pursuit||50)*0.06+(r.blockShedding||50)*0.06;
      if(def==="man_press")score+=(r.finesseMoves||50)*0.08;
    }else if(p.pos==="LB"){
      if(def==="zone_cov")score+=(r.zoneCoverage||50)*0.10+(r.range||r.speed||50)*0.04;
      if(def==="blitz_heavy")score+=(r.hitPower||50)*0.06+(r.pursuit||50)*0.05;
    }else if(p.pos==="CB"){
      if(def==="man_press")score+=(r.manCoverage||50)*0.12+(r.breakOnBall||50)*0.05;
      if(def==="zone_cov")score+=(r.zoneCoverage||50)*0.12+(r.breakOnBall||50)*0.04;
    }else if(p.pos==="S"){
      if(def==="zone_cov")score+=(r.rangeAbility||50)*0.12+(r.zoneCoverage||50)*0.05;
      if(def==="man_press")score+=(r.manCoverage||50)*0.08+(r.breakOnBall||50)*0.04;
    }
    score=(score/10)-5;
    return cl(Math.round(score),0,25);
  }
};
