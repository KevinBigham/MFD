/**
 * MFD Legacy Score System
 *
 * Calculates franchise legacy score (0-100) from career stats:
 * win %, championships, playoffs, draft hits, cap mastery,
 * player development, integrity, and dynasty bonuses.
 */

export var LEGACY={
  buildStats:function(history,myId,teams,season){
    var stats={games:0,wins:0,losses:0,rings:0,playoffs:0,draftHits:0,
      capMastery:0,devSuccesses:0,neverTanked:true,fired:false,years:0};
    var myT=teams?teams.find(function(t){return t.id===myId;}):null;
    (history||[]).forEach(function(h){
      if(!h.teamRecords)return;
      var myRec=h.teamRecords.find(function(r){return r.id===myId;});
      if(!myRec)return;
      stats.years++;
      stats.wins+=(myRec.wins||0);
      stats.losses+=(myRec.losses||0);
      stats.games+=(myRec.wins||0)+(myRec.losses||0);
      if(h.winnerId===myId||h.champId===myId)stats.rings++;
      if(h.madePlayoffs||myRec.madePlayoffs)stats.playoffs++;
      if((myRec.wins||0)<4)stats.neverTanked=false;
      if(h.legacyStats91){
        stats.draftHits+=(h.legacyStats91.draftHits||0);
        stats.capMastery+=(h.legacyStats91.capMastery||0);
        stats.devSuccesses+=(h.legacyStats91.devSuccesses||0);
      }
    });
    if(myT){
      stats.wins+=(myT.wins||0);stats.losses+=(myT.losses||0);
      stats.games+=(myT.wins||0)+(myT.losses||0);
    }
    return stats;
  },
  calcScore:function(stats){
    var score=0;
    var winPct=stats.games>0?(stats.wins/stats.games):0;
    var winPctScore=Math.min(30,winPct*30);
    var ringsScore=Math.min(25,stats.rings*5);
    var playoffsScore=Math.min(15,stats.playoffs*1.5);
    var draftHitsScore=Math.min(10,stats.draftHits*2);
    var capScore=Math.min(10,stats.capMastery*2);
    var devScore=Math.min(10,stats.devSuccesses*1);
    var neverTankedBonus=stats.neverTanked?5:0;
    var firedPenalty=stats.fired?-15:0;
    var dynastyDecadeBonus=(stats.rings>=3&&stats.years<=10)?10:0;
    score+=winPctScore;// Win % — 30pts
    score+=ringsScore;// Championships — 25pts (5 per ring)
    score+=playoffsScore;// Playoff appearances — 15pts
    score+=draftHitsScore;// Draft hits (90+ OVR players) — 10pts
    score+=capScore;// Cap efficiency seasons — 10pts
    score+=devScore;// Development successes — 10pts
    score+=neverTankedBonus;// Never tanked
    score+=firedPenalty;// Got fired
    score+=dynastyDecadeBonus;// Dynasty Decade bonus
    // v97.6: Additional legacy dimensions
    var coachStability=0;
    if(stats.years>=8)coachStability=5;
    else if(stats.years>=5)coachStability=3;
    score+=coachStability;
    var eraBonus=0;
    if(stats.rings>=3&&stats.years<=8)eraBonus=8;
    else if(stats.rings>=2&&stats.years<=5)eraBonus=5;
    score+=eraBonus;
    var finalScore=Math.min(100,Math.max(0,Math.round(score)));
    var tier=finalScore>=90?"Hall of Fame":finalScore>=75?"Legendary":finalScore>=60?"Great":finalScore>=45?"Good":"Average";
    return{score:finalScore,tier:tier,winPct:winPct,breakdown:{
      winPct:winPctScore,rings:ringsScore,playoffs:playoffsScore,draftHits:draftHitsScore,cap:capScore,dev:devScore,
      integrity:neverTankedBonus,firedPenalty:firedPenalty,dynastyDecade:dynastyDecadeBonus,coachStability:coachStability,eraBonus:eraBonus
    }};
  },
  buildSeasonStats:function(myT,teams,season,history){
    var draftHits=0;
    if(myT&&myT.roster){
      myT.roster.forEach(function(p){if((p.ovr||0)>=90&&p._draftYear&&p._fromTeamId===myT.id)draftHits++;});
    }
    var cap=getSalaryCap?getSalaryCap(season?season.year:2026):255;
    var used=myT?(myT.capUsed||0):0;
    var capSpace=cap-used;
    var capMastery=(capSpace<5&&capSpace>=0)?1:0;
    var devSuccesses=0;
    if(myT&&myT.roster){
      myT.roster.forEach(function(p){if((p._ovrAtSeasonStart||0)>0&&(p.ovr||0)-(p._ovrAtSeasonStart||0)>=5)devSuccesses++;});
    }
    return{draftHits:draftHits,capMastery:capMastery,devSuccesses:devSuccesses};
  }
};
