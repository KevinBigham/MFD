/**
 * MFD Owner Personality Events
 *
 * Weekly owner reactions based on archetype (win_now, patient_builder,
 * profit_first, fan_favorite, legacy_builder) and team performance.
 */

export var OWNER_PERSONALITY_EVENTS=[
  {archetype:"win_now",trigger:function(o,t,s){return t.losses>=4&&s.week>=6;},
    emoji:"😠",msg:"I didn't invest in this team to miss the playoffs. Make a move.",mood:-5,tag:"PRESSURE"},
  {archetype:"win_now",trigger:function(o,t,s){return t.wins>=10;},
    emoji:"😊",msg:"This is what I'm talking about. Keep it up.",mood:3,tag:"PRAISE"},
  {archetype:"patient_builder",trigger:function(o,t,s){return t.roster.filter(function(p){return p.age<=24&&p.ovr>=70;}).length>=3;},
    emoji:"🌱",msg:"Love the youth movement. These kids are the future.",mood:4,tag:"PRAISE"},
  {archetype:"patient_builder",trigger:function(o,t,s){return(t.capUsed||0)>130;},
    emoji:"⚠️",msg:"We're spending too much. I'd rather develop from within.",mood:-3,tag:"WARNING"},
  {archetype:"profit_first",trigger:function(o,t,s){return(150-(t.capUsed||0)-(t.deadCap||0))>=30;},
    emoji:"💰",msg:"Excellent cap management. The books look clean.",mood:4,tag:"PRAISE"},
  {archetype:"profit_first",trigger:function(o,t,s){return(t.deadCap||0)>=10;},
    emoji:"💸",msg:"This dead money is unacceptable. Stop overpaying.",mood:-4,tag:"WARNING"},
  {archetype:"fan_favorite",trigger:function(o,t,s){return t.roster.some(function(p){return p.ovr>=85;});},
    emoji:"🌟",msg:"The fans love our star player. Keep them happy.",mood:3,tag:"PRAISE"},
  {archetype:"fan_favorite",trigger:function(o,t,s){return t.wins<=3&&s.week>=8;},
    emoji:"😤",msg:"The stadium is half empty. Fans are losing patience.",mood:-5,tag:"PRESSURE"},
  {archetype:"legacy_builder",trigger:function(o,t,s){return t.wins>=12;},
    emoji:"👑",msg:"Dynasty material. This could be our year.",mood:5,tag:"PRAISE"},
  {archetype:"legacy_builder",trigger:function(o,t,s){return t.losses>=8;},
    emoji:"😔",msg:"This is not the legacy I envisioned. We need a plan.",mood:-4,tag:"WARNING"}
];
export function checkOwnerPersonality(owner,team,season,rng2){
  if(!owner||!team||!season)return null;
  if(season.phase!=="regular")return null;
  if(rng2()<0.6)return null;// Only 40% chance per week
  var archetype=owner.archetype||"win_now";
  var applicable=OWNER_PERSONALITY_EVENTS.filter(function(e){
    return e.archetype===archetype&&e.trigger(owner,team,season);
  });
  if(applicable.length===0)return null;
  var evt=applicable[Math.floor(rng2()*applicable.length)];
  return{emoji:evt.emoji,msg:evt.msg,mood:evt.mood,tag:evt.tag,week:season.week,year:season.year};
}
