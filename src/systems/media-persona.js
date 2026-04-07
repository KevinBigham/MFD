/**
 * MFD Media Persona System
 *
 * Coach media tags (accountability, tough love, players' coach, swagger,
 * deflector, stoic), press tag mapping, media persona detection,
 * credibility math, and rivalry heat calculation.
 */

export var MEDIA_TAGS={
  accountability:{label:"Accountability Coach",emoji:"🤝",desc:"Takes blame, builds trust"},
  tough_love:{label:"Taskmaster",emoji:"🔥",desc:"Demands excellence, pushes hard"},
  players_coach:{label:"Players' Coach",emoji:"💪",desc:"Supports the locker room"},
  swagger:{label:"Showman",emoji:"😎",desc:"Confident, media-friendly"},
  deflector:{label:"Deflector",emoji:"😤",desc:"Blames refs, dodges questions"},
  stoic:{label:"The Stoic",emoji:"🎯",desc:"Business-only, no emotion"}
};
export var PRESS_TAG_MAP={
  blame:"tough_love",own_it:"accountability",deflect:"deflector",
  rally:"players_coach",tough_love:"tough_love",next_up:"stoic",
  humble:"accountability",swagger:"swagger",focused:"stoic",
  gritty:"players_coach",critical:"tough_love",clutch:"swagger",
  respect:"accountability",fire:"swagger",business:"stoic",
  scheme_buyin:"players_coach",scheme_temp:"stoic",scheme_honest:"accountability"
};
export function getMediaPersona(tagHistory){
  if(!tagHistory||tagHistory.length<3)return null;
  var recent=tagHistory.slice(-6);
  var counts={};
  recent.forEach(function(t){counts[t]=(counts[t]||0)+1;});
  var topTag=null;var topCount=0;
  Object.keys(counts).forEach(function(t){if(counts[t]>topCount){topCount=counts[t];topTag=t;}});
  if(topCount>=2&&MEDIA_TAGS[topTag])return MEDIA_TAGS[topTag];
  return null;
}
export var CREDIBILITY_MATH={
  calcDelta:function(tag,margin){
    var isWin=margin>0;
    var isBlowoutLoss=margin<=-14;
    if(tag==="accountability")return isWin?1:4;// Taking blame after loss = massive trust
    if(tag==="stoic")return 2;// Steady hand always good
    if(tag==="deflector")return isWin?-1:(isBlowoutLoss?-4:-1);// Weak after blowout
    if(tag==="swagger")return isWin?2:-5;// Bragging after loss = fool
    if(tag==="tough_love")return isBlowoutLoss?-2:2;// Risky after blowout
    if(tag==="players_coach")return 1;// Always safe, low reward
    return 0;
  }
};
export var RIVALRY_MATH={
  calcDelta:function(margin,isPlayoff,isUpset,streakLength){
    var delta=1;// Base: every game = +1
    if(isPlayoff)delta+=4;// Playoffs are intense
    if(margin>=21)delta+=3;// Blowout disrespect
    else if(margin>=14)delta+=2;
    if(margin<=3&&margin>0)delta+=2;// Heartbreaker
    else if(margin<=7&&margin>3)delta+=1;// Tight game
    if(isUpset)delta+=3;// Shock factor
    if((streakLength||0)>=3)delta+=1;// Dominance builds hate
    return Math.min(12,delta);// Cap per game
  }
};
