/**
 * MFD Prospect Claims System
 *
 * Generates scouting claims (speed, hands, IQ, motor, durability,
 * scheme fit) based on scout type, then verifies claims against
 * actual rookie performance.
 */

export var PROSPECT_CLAIMS={
  CLAIM_TYPES:["durability","iq","hands","speed","motor","schemeFit"],
  SOURCE_MAP:{combine:["speed","motor","durability"],interview:["iq","schemeFit"],film:["hands","schemeFit","motor"]},
  generate:function(prospect,scoutType,pos){
    if(!prospect)return[];
    var candidates=[];
    var r=prospect.ratings||{};
    var validTypes=PROSPECT_CLAIMS.SOURCE_MAP[scoutType==="measurables"?"combine":scoutType==="film_study"?"film":scoutType]||[];
    validTypes.forEach(function(claimType){
      var strength=0;
      if(claimType==="speed"){
        var spd=r.speed||r.spd||0;
        if(prospect.combine&&prospect.combine.forty){
          strength=prospect.combine.forty<=4.35?3:prospect.combine.forty<=4.5?2:prospect.combine.forty<=4.6?1:0;
        }else{strength=spd>=88?3:spd>=78?2:spd>=70?1:0;}
      }else if(claimType==="hands"){
        var cth=r.catching||r.cth||r.hands||0;
        if(["WR","TE","RB"].indexOf(pos)>=0)strength=cth>=85?3:cth>=75?2:cth>=65?1:0;
        else if(["LB","CB","S"].indexOf(pos)>=0)strength=cth>=80?3:cth>=70?2:cth>=60?1:0;
      }else if(claimType==="iq"){
        var awr=r.awareness||r.awr||r.iq||0;
        strength=awr>=85?3:awr>=75?2:awr>=65?1:0;
      }else if(claimType==="motor"){
        var sta=r.stamina||r.sta||r.toughness||0;
        strength=sta>=85?3:sta>=75?2:sta>=65?1:0;
      }else if(claimType==="durability"){
        var dur=r.toughness||r.durability||r.stamina||0;
        strength=dur>=85?3:dur>=78?2:dur>=68?1:0;
      }else if(claimType==="schemeFit"){
        if(prospect.schemeFit||prospect.archetype)strength=2;
        else{var top=0;Object.keys(r).forEach(function(k){if(r[k]>top)top=r[k];});strength=top>=82?2:top>=72?1:0;}
      }
      if(strength>0)candidates.push({type:claimType,strength:strength,source:scoutType==="measurables"?"combine":scoutType==="film_study"?"film":scoutType});
    });
    var priority={"durability":0,"iq":1,"hands":2,"speed":3,"motor":4,"schemeFit":5};
    candidates.sort(function(a,b){return b.strength-a.strength||(priority[a.type]||9)-(priority[b.type]||9);});
    return candidates.slice(0,3);
  },
  verify:function(claims,rookiePlayer,gamesPlayed){
    if(!claims||claims.length===0)return null;
    var r=rookiePlayer.ratings||{};
    var s=rookiePlayer.stats||{};
    var pos=rookiePlayer.pos;
    var lowSnaps=gamesPlayed<4;
    var hits=[];var misses=[];var incomplete=[];
    var rawScore=0;var maxScore=0;
    claims.forEach(function(claim){
      var hit=false;var checkable=true;
      maxScore+=claim.strength;
      if(lowSnaps){
        checkable=false;
        var fallbackHit=false;
        if(claim.type==="speed")fallbackHit=(r.speed||r.spd||50)>=70;
        else if(claim.type==="hands")fallbackHit=(r.catching||r.cth||50)>=70;
        else if(claim.type==="iq")fallbackHit=(r.awareness||r.awr||50)>=70;
        else if(claim.type==="motor")fallbackHit=(r.stamina||r.toughness||50)>=70;
        else if(claim.type==="durability")fallbackHit=gamesPlayed>=2;
        else if(claim.type==="schemeFit")fallbackHit=(rookiePlayer.ovr||50)>=68;
        if(fallbackHit){rawScore+=claim.strength*0.5;hits.push(claim.type);}
        else{rawScore-=claim.strength*0.5;misses.push(claim.type);}
        incomplete.push(claim.type);
        return;
      }
      if(claim.type==="speed"){
        if(pos==="QB")hit=(s.rushYds||0)>50||(r.speed||r.spd||50)>=72;
        else if(pos==="RB")hit=s.rushYds>0&&(s.rushYds/(Math.max(1,s.rushAtt||s.gp*8)))>=4.0;
        else if(pos==="WR"||pos==="TE")hit=(s.recYds||0)>0&&(s.targets||1)>0&&(s.recYds/(s.targets||1))>=10;
        else hit=(r.speed||r.spd||50)>=72;
      }else if(claim.type==="hands"){
        if(["WR","TE"].indexOf(pos)>=0)hit=(s.rec||0)>=10&&(s.recTD||0)>=1;
        else if(pos==="RB")hit=(s.rec||0)>=5;
        else if(["LB","CB","S"].indexOf(pos)>=0)hit=(s.defINT||0)>=1;
        else hit=(r.catching||r.cth||50)>=70;
      }else if(claim.type==="iq"){
        if(pos==="QB")hit=(s.int||0)<=Math.max(2,Math.round(gamesPlayed*0.6));
        else if(["DL","LB"].indexOf(pos)>=0)hit=(s.sacks||0)>=2;
        else hit=(r.awareness||r.awr||50)>=70;
      }else if(claim.type==="motor"){
        hit=(s.snaps||0)>=gamesPlayed*3;// Active snap count
        if(!hit)hit=(r.stamina||r.toughness||50)>=72;
      }else if(claim.type==="durability"){
        hit=gamesPlayed>=Math.max(8,12);// Played most of the season
      }else if(claim.type==="schemeFit"){
        hit=(rookiePlayer.ovr||50)>=(rookiePlayer.pot?rookiePlayer.pot-8:65);
      }
      if(hit){rawScore+=claim.strength;hits.push(claim.type);}
      else{rawScore-=claim.strength;misses.push(claim.type);}
    });
    var norm=maxScore>0?rawScore/maxScore:0;
    var deltaConf=Math.round(norm*8);
    var status=incomplete.length===claims.length?"INCOMPLETE":norm>=0.5?"VERIFIED":norm<=-0.5?"MISREAD":"MIXED";
    var notes=lowSnaps?"Limited snaps: used ratings fallback":hits.length>0&&misses.length>0?
      "You nailed "+hits.join("/")+", missed on "+misses.join("/"):
      hits.length===claims.length?"Clean read — all claims confirmed":
      misses.length===claims.length?"Full bust — re-evaluate your scouting process":"";
    return{status:status,deltaConf:deltaConf,hits:hits,misses:misses,incomplete:incomplete,notes:notes};
  }
};
