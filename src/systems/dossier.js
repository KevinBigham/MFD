/**
 * MFD Opponent Scouting Dossier
 *
 * Manages scouting intelligence on opponents — entry retrieval,
 * active scouting with confidence/tells/weakspots accumulation,
 * decay of stale intel, and post-game verification.
 */

export var DOSSIER={
  getEntry:function(db,oppId,year){
    var key=year+"-"+oppId;
    return db[key]||{oppId:oppId,year:year,conf:0,scoutCount:0,lastWeek:0,
      tells:[],weakSpots:[],stars:[],scheme:"",counterTip:""};
  },
  scout:function(db,oppId,year,week,scoutData,coachRating,clinicConfBonus){
    var key=year+"-"+oppId;
    var entry=db[key]||{oppId:oppId,year:year,conf:0,scoutCount:0,lastWeek:0,
      tells:[],weakSpots:[],stars:[],scheme:"",counterTip:""};
    entry.scoutCount=(entry.scoutCount||0)+1;
    entry.lastWeek=week;
    var confGain=15+Math.min((coachRating||50)-50,20)+(entry.scoutCount>1?10:0);
    confGain+=(clinicConfBonus||0);
    entry.conf=Math.min(95,entry.conf+confGain);
    if(scoutData){
      if(scoutData.offPlan)entry.scheme=scoutData.offPlan.name+" / "+scoutData.defPlan.name;
      if(scoutData.stars)entry.stars=scoutData.stars.slice(0,3);
      if(scoutData.weaknesses)entry.weakSpots=scoutData.weaknesses.slice(0,3);
      if(scoutData.schemeNote)entry.counterTip=scoutData.schemeNote;
      var newTells=[];
      if(scoutData.offPlan&&scoutData.offPlan.id!=="balanced_o")
        newTells.push("Runs "+scoutData.offPlan.name+" offense — "+scoutData.offPlan.desc.split(".")[0]);
      if(scoutData.defPlan&&scoutData.defPlan.id!=="balanced_d")
        newTells.push("Uses "+scoutData.defPlan.name+" defense — "+scoutData.defPlan.desc.split(".")[0]);
      if(scoutData.weaknesses&&scoutData.weaknesses[0]&&scoutData.weaknesses[0].avg<68)
        newTells.push("Weak at "+scoutData.weaknesses[0].pos+" ("+scoutData.weaknesses[0].avg+" OVR) — attack here");
      if(scoutData.stars&&scoutData.stars[0]&&scoutData.stars[0].ovr>=85)
        newTells.push("Must contain "+scoutData.stars[0].name+" ("+scoutData.stars[0].pos+" "+scoutData.stars[0].ovr+")");
      if(scoutData.injuredStarters&&scoutData.injuredStarters.length>0)
        newTells.push(scoutData.injuredStarters.length+" injured starter"+(scoutData.injuredStarters.length>1?"s":"")+" — exploit the depth");
      newTells.forEach(function(nt){
        if(entry.tells.indexOf(nt)<0)entry.tells.push(nt);
      });
      if(entry.tells.length>5)entry.tells=entry.tells.slice(-5);
    }
    db[key]=entry;
    return entry;
  },
  decay:function(db,year,week){
    Object.keys(db).forEach(function(key){
      var e=db[key];
      if(e.year===year&&e.lastWeek>0&&(week-e.lastWeek)>=4){
        e.conf=Math.max(0,e.conf-8);// -8 per check when stale
        if(e.conf<=0){e.tells=[];e.weakSpots=[];e.stars=[];}
      }
    });
    return db;
  },
  verify:function(db,oppId,year,gameResult,isHome){
    var key=year+"-"+oppId;
    var entry=db[key];
    if(!entry||entry.conf<=0)return null;
    var myScore=isHome?gameResult.home:gameResult.away;
    var oppScore=isHome?gameResult.away:gameResult.home;
    var won=myScore>oppScore;
    if(won){entry.conf=Math.min(95,entry.conf+5);return{status:"confirmed",delta:5};}
    else{entry.conf=Math.max(10,entry.conf-10);return{status:"wrong_read",delta:-10};}
  }
};
