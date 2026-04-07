/**
 * MFD Story Templates & Presser Tag Triggers
 *
 * 15 story arc templates that drive the dynamic narrative engine —
 * holdouts, rookie spotlights, rivalry escalation, coaching hot seats,
 * milestone chases, QB controversies, and more. Each template defines
 * trigger conditions, progression states, headlines, and player actions.
 */
import { hasTrait95 } from './traits.js';

export var STORY_TEMPLATES=[
  {id:"holdout",type:"Holdout Saga",icon:"💰",
    triggerFn:function(ctx){return ctx.phase==="regular"&&ctx.player&&(hasTrait95(ctx.player,"mercenary")||hasTrait95(ctx.player,"cancer"))&&ctx.player.contract.years<=1&&ctx.player.ovr>=80;},
    states:["rumbling","public_demand","trade_request","resolved"],
    headlines:["💰 {name} wants a new deal — tensions rising","📢 {name}: 'Pay me what I'm worth'","🔥 {name} demands trade if deal isn't done by Week {deadline}","✅ {name} situation resolved"],
    duration:4,actions:[{id:"pay",label:"Pay Up (+$4M/yr)",cost:4},{id:"hold",label:"Hold Firm",cost:0},{id:"trade",label:"Shop Player",cost:0}]},
  {id:"rookie_spotlight",type:"Rookie Spotlight",icon:"⭐",
    triggerFn:function(ctx){return ctx.phase==="regular"&&ctx.player&&ctx.player.age<=23&&ctx.player.devTrait!=="normal"&&ctx.weekNum>=3;},
    states:["hype","struggle","decision","breakout_or_bust"],
    headlines:["⭐ Rookie {name} generating buzz","😰 {name} hitting the rookie wall","🤔 Start {name} or sit?","🚀 {name} breaks out!"],
    duration:6,actions:[{id:"start",label:"Keep Starting",cost:0},{id:"bench",label:"Bench & Develop",cost:0}]},
  {id:"rivalry_heat",type:"Rivalry Escalation",icon:"🔥",
    triggerFn:function(ctx){return ctx.phase==="regular"&&ctx.weekNum>=6;},
    states:["trash_talk","dirty_play","revenge_game"],
    headlines:["🗣️ {team1} vs {team2} war of words heats up","⚠️ Dirty hit sparks outrage","🥊 Revenge game: {team1} wants payback"],
    duration:3,actions:[]},
  {id:"hot_seat",type:"Coaching Hot Seat",icon:"🪑",
    triggerFn:function(ctx){return ctx.losses>=ctx.wins+3&&ctx.weekNum>=8;},
    states:["media_pressure","ultimatum","decision"],
    headlines:["📰 Media questioning coaching decisions","⚠️ Owner issues ultimatum: win or else","🪑 Coaching change? Decision time."],
    duration:3,actions:[{id:"keep",label:"Keep Coach",cost:0},{id:"fire",label:"Fire Coach",cost:0}]},
  {id:"milestone",type:"Milestone Chase",icon:"📈",
    triggerFn:function(ctx){return ctx.player&&ctx.player.stats&&ctx.player.stats.gp>=8;},
    states:["approaching","one_away","achieved"],
    headlines:["📈 {name} approaching franchise record","🎯 {name} ONE game away from history","🏆 {name} BREAKS the all-time record!"],
    duration:3,actions:[]},
  {id:"injury_comeback",type:"Injury Comeback",icon:"🏥",
    triggerFn:function(ctx){return ctx.phase==="regular"&&ctx.player&&ctx.player.injury&&ctx.player.injury.games>=4&&ctx.player.ovr>=75;},
    states:["surgery","rehab","setback_risk","return"],
    headlines:["🏥 {name} out with major injury — long road ahead","🏋️ {name} grinding through rehab","⚠️ {name} comeback faces setback risk","🎉 {name} returns to action!"],
    duration:5,actions:[{id:"rush",label:"Rush Back (re-injury risk)",cost:0},{id:"patient",label:"Full Rehab (+2 wks)",cost:0}]},
  {id:"trade_rumor",type:"Trade Rumor Storm",icon:"📱",
    triggerFn:function(ctx){return ctx.phase==="regular"&&ctx.weekNum>=4&&ctx.weekNum<=9&&ctx.player&&ctx.player.ovr>=78;},
    states:["whispers","national_story","locker_room_hit"],
    headlines:["📱 Trade whispers swirling around {name}","📺 {name} trade talks dominate headlines","😤 Locker room reacts to {name} rumors"],
    duration:3,actions:[{id:"deny",label:"Deny Publicly",cost:0},{id:"listen",label:"Take Calls",cost:0}]},
  {id:"fa_frenzy",type:"Free Agent Frenzy",icon:"🏪",
    triggerFn:function(ctx){return ctx.phase==="regular"&&ctx.weekNum>=15;},
    states:["market_heats","bidding_war","deadline_pressure"],
    headlines:["🏪 Offseason market heating up early","💵 Bidding war erupts for top free agents","⏰ Sign now or lose them forever"],
    duration:3,actions:[{id:"spend",label:"Open the Wallet",cost:0},{id:"wait",label:"Stay Patient",cost:0}]},
  {id:"coaching_carousel",type:"Coaching Carousel",icon:"🎠",
    triggerFn:function(ctx){return ctx.phase==="regular"&&ctx.weekNum>=14;},
    states:["rumors","interviews","poaching_threat"],
    headlines:["🎠 Coaching carousel begins across the league","🎤 Multiple teams requesting interview with your staff","🚨 {team2} trying to poach your coordinator!"],
    duration:3,actions:[{id:"block",label:"Block Interview",cost:0},{id:"allow",label:"Let Them Go",cost:0}]},
  {id:"qb_controversy",type:"QB Controversy",icon:"🏈",
    triggerFn:function(ctx){
      if(ctx.phase!=="regular"||ctx.weekNum<5)return false;
      var qbs=ctx.roster?ctx.roster.filter(function(p){return p.pos==="QB"&&!(p.injury&&p.injury.games>0);}):[];
      return qbs.length>=2&&qbs[0]&&qbs[1]&&Math.abs(qbs[0].ovr-qbs[1].ovr)<=6;},
    states:["murmurs","media_debate","coach_decides"],
    headlines:["🏈 Backup QB generating locker room buzz","📺 'Start the kid!' debate rages in media","🎯 QB decision: starter or switch?"],
    duration:4,actions:[{id:"start_vet",label:"Stick with Vet",cost:0},{id:"start_kid",label:"Start the Kid",cost:0}]},
  {id:"locker_split",type:"Locker Room Split",icon:"💥",
    triggerFn:function(ctx){
      if(ctx.phase!=="regular")return false;
      var hasHothead=ctx.roster?ctx.roster.some(function(p){return hasTrait95(p,"hothead")||hasTrait95(p,"cancer");}):false;
      var hasMentor=ctx.roster?ctx.roster.some(function(p){return hasTrait95(p,"mentor")||hasTrait95(p,"captain");}):false;
      return hasHothead&&hasMentor&&ctx.weekNum>=4;},
    states:["tension","confrontation","resolution"],
    headlines:["💥 Personality clash brewing in the locker room","🤬 Heated argument between veterans reported","🤝 Team meeting called — will they unite?"],
    duration:3,actions:[{id:"side_vet",label:"Back the Captain",cost:0},{id:"side_hot",label:"Back the Firestarter",cost:0},{id:"mediate",label:"Mediate",cost:0}]},
  {id:"contract_year",type:"Breakout Contract Year",icon:"💎",
    triggerFn:function(ctx){return ctx.phase==="regular"&&ctx.player&&ctx.player.contract.years===1&&ctx.player.ovr>=74&&ctx.player.age<=28;},
    states:["motivated","balling_out","extension_window"],
    headlines:["💎 {name} playing with chip on shoulder","🔥 {name} on a tear — contract year motivation","✍️ Extension window open for {name}"],
    duration:4,actions:[{id:"extend",label:"Extend Now ($$$)",cost:0},{id:"wait_fa",label:"Let Him Walk to FA",cost:0}]},
  {id:"rookie_wall",type:"Rookie Wall",icon:"🧱",
    triggerFn:function(ctx){return ctx.phase==="regular"&&ctx.weekNum>=10&&ctx.player&&ctx.player.age<=23;},
    states:["fatigue","slump","coaching_choice"],
    headlines:["🧱 {name} showing signs of rookie fatigue","📉 {name}'s production drops — rookie wall?","🤔 Rest {name} or push through?"],
    duration:3,actions:[{id:"rest",label:"Reduce Snaps",cost:0},{id:"push",label:"Keep Playing Through",cost:0}]},
  {id:"record_chase",type:"Record Chase",icon:"📊",
    triggerFn:function(ctx){return ctx.phase==="regular"&&ctx.weekNum>=12&&ctx.player&&ctx.player.ovr>=85;},
    states:["on_pace","closing_in","record_day"],
    headlines:["📊 {name} on pace for franchise record season","🎯 {name} needs one big game to make history","🏆 RECORD BROKEN! {name} etches name in stone!"],
    duration:4,actions:[]},
  {id:"underdog_run",type:"Underdog Run",icon:"🐺",
    triggerFn:function(ctx){return ctx.phase==="regular"&&ctx.weekNum>=10&&ctx.wins>=ctx.losses&&ctx.losses>=4;},
    states:["nobody_believes","winning_streak","cinderella"],
    headlines:["🐺 Nobody believes in this team — perfect","🔥 {team1} stringing together wins — playoff push!","✨ Cinderella story: {team1} fighting for their lives"],
    duration:4,actions:[]}
];
export var PRESSER_TAG_TRIGGERS=[
  {tags:["promise_changes","losing_streak"],storyId:"hot_seat",advance:1},
  {tags:["blame_qb","qb_low_morale"],storyId:"qb_controversy",advance:0},
  {tags:["calm","owner_low"],storyId:"hot_seat",advance:0},
  {tags:["tough","culture"],storyId:"locker_split",advance:0},
  {tags:["praise_rookie"],storyId:"rookie_spotlight",advance:1},
  {tags:["bold","winning_streak"],storyId:"underdog_run",advance:1}
];
