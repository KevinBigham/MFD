/**
 * MFD Trust & Aging Systems
 *
 * TRUST_TREND — trade trust trend arrows
 * AGING_V2 — position-aware aging multipliers by rating category
 * TRUST — league-wide GM trust snapshot and reputation analysis
 */

export var TRUST_TREND={
  getArrow:function(current,lastAvg){
    if(!lastAvg&&lastAvg!==0)return "➡️";
    var diff=current-lastAvg;
    if(diff>=5)return "📈";
    if(diff<=-5)return "📉";
    if(diff>=2)return "↗️";
    if(diff<=-2)return "↘️";
    return "➡️";
  }
};
export var AGING_V2={
  getMultiplier:function(ratingName,phase,posWeight){
    var isPhysical=["speed","acceleration","agility","stamina","strength","power",
      "elusiveness","jumping","toughness","durability","changeOfDirection","catchup"].indexOf(ratingName)!==-1;
    var isMental=["awareness","playRecognition","fieldVision","decisionSpeed","leadership",
      "clutch","discipline","assignmentIQ","fieldGoalIQ","fieldSense","iceVeins","confidence"].indexOf(ratingName)!==-1;
    var isTechnique=["accuracy","shortAccuracy","deepAccuracy","routeRunning","handTechnique",
      "footwork","shortRoute","deepRoute","separation","pocketPresence","throwOnRun",
      "zoneCoverage","manCoverage","pressAbility","breakOnBall","passBlock","runBlock",
      "passBlockFinesse","runBlockFinesse","powerMoves","finesseMoves"].indexOf(ratingName)!==-1;
    if(isMental){
      if(phase==="peak"||phase==="prime")return -0.5;// Gain
      if(phase==="decline")return 0;// Holds steady
      return 0.3;// Twilight: very slow loss
    }
    if(isPhysical){
      if(phase==="peak")return 0;// No decline yet
      return posWeight>5?1.5:2.0;
    }
    if(isTechnique){
      if(phase==="peak"||phase==="prime")return 0;
      return 0.5;
    }
    return 1.0;// Default: normal decay
  }
};
export var TRUST={
  leagueSnapshot:function(tradeState,teams){
    if(!tradeState||!tradeState.gmTrustByTeam)return null;
    var trustMap=tradeState.gmTrustByTeam;
    var total=0;var count=0;
    var tiers={high:0,mid:0,low:0};
    var friendliest={id:null,val:-999,label:""};
    var coldest={id:null,val:999,label:""};
    teams.forEach(function(t){
      if(t.isUser)return;// Skip self
      var tr=trustMap[t.id];
      if(tr===undefined||tr===null)tr=50;
      total+=tr;count++;
      if(tr>=65)tiers.high++;
      else if(tr<=35)tiers.low++;
      else tiers.mid++;
      if(tr>friendliest.val){friendliest={id:t.id,val:tr,label:t.abbr};}
      if(tr<coldest.val){coldest={id:t.id,val:tr,label:t.abbr};}
    });
    var avgTrust=count>0?Math.round(total/count):50;
    var recent=tradeState.recentTrades||[];
    var fleeceCount=0;var fairCount=0;var overpayCount=0;
    recent.forEach(function(r){
      if(r.classification==="fleece")fleeceCount++;
      else if(r.classification==="fair")fairCount++;
      else if(r.classification==="overpay")overpayCount++;
    });
    var reputation="Neutral";
    if(avgTrust>=75)reputation="Legendary";
    else if(avgTrust>=60)reputation="Respected";
    else if(avgTrust<=25)reputation="Blacklisted";
    else if(avgTrust<=40)reputation="Untrustworthy";
    else if(fleeceCount>=2)reputation="Shark";
    else if(overpayCount>=2)reputation="Pushover";
    else if(fairCount>=3)reputation="Fair Dealer";
    return {
      avgTrust:avgTrust,
      reputation:reputation,
      tiers:tiers,
      friendliest:friendliest,
      coldest:coldest,
      recentPattern:{fleeceCount:fleeceCount,fairCount:fairCount,overpayCount:overpayCount}
    };
  }
};
