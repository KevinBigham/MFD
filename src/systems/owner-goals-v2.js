/**
 * MFD Owner Goals V2
 *
 * Owner personality types and associated season goals with
 * check/exceed functions for end-of-season evaluation.
 */

export var OWNER_TYPES=[
  {id:"patient",name:"Patient Builder",icon:"🧱",desc:"Values long-term growth",goalBias:["develop_rookie","cap_discipline","draft_well"]},
  {id:"win_now",name:"Win-Now Mandate",icon:"🏆",desc:"Results or consequences",goalBias:["make_playoffs","win_division","win_sb"]},
  {id:"penny",name:"Penny Pincher",icon:"💵",desc:"Bottom line first",goalBias:["cap_discipline","revenue","no_dead_cap"]}
];
export var OWNER_GOALS=[
  {id:"make_playoffs",label:"Make the Playoffs",check:function(ctx){return ctx.madePlayoffs;},exceed:function(ctx){return ctx.wonChamp;}},
  {id:"win_division",label:"Win the Division",check:function(ctx){return ctx.divRank===1;},exceed:function(ctx){return ctx.divRank===1&&ctx.wins>=12;}},
  {id:"win_sb",label:"Win the Championship",check:function(ctx){return ctx.wonChamp;},exceed:function(ctx){return ctx.wonChamp&&ctx.losses<=4;}},
  {id:"develop_rookie",label:"Develop a Rookie Starter",check:function(ctx){return ctx.rookieStarters>=1;},exceed:function(ctx){return ctx.rookieStarters>=2;}},
  {id:"cap_discipline",label:"Keep Cap Room Above $20M",check:function(ctx){return ctx.capRoom>=20;},exceed:function(ctx){return ctx.capRoom>=40;}},
  {id:"revenue",label:"Boost Revenue (Win 8+ Games)",check:function(ctx){return ctx.wins>=8;},exceed:function(ctx){return ctx.wins>=12;}},
  {id:"top_defense",label:"Top-10 Defense",check:function(ctx){return ctx.defRank<=10;},exceed:function(ctx){return ctx.defRank<=3;}},
  {id:"no_dead_cap",label:"Avoid Dead Cap Over $15M",check:function(ctx){return ctx.deadCap<=15;},exceed:function(ctx){return ctx.deadCap<=5;}},
  {id:"draft_well",label:"Draft a 70+ OVR Rookie",check:function(ctx){return ctx.bestRookieOvr>=70;},exceed:function(ctx){return ctx.bestRookieOvr>=78;}}
];
