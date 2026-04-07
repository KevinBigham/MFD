/**
 * MFD Stat Headlines & Trait Morale Explainer
 *
 * Context-sensitive stat headlines for post-game recaps and
 * trait-based morale modifier explanations for the roster view.
 */
import { hasTrait95 } from './traits.js';

export var STAT_HEADLINES=[
  {cond:function(g){return g&&g.passTD>=4;},text:"After throwing {passTD} TDs vs {opp}"},
  {cond:function(g){return g&&g.rushYds>=150;},text:"After rushing for {rushYds} yards vs {opp}"},
  {cond:function(g){return g&&g.sacks>=4;},text:"After {sacks} sacks vs {opp}"},
  {cond:function(g){return g&&g.ints>=2;},text:"After {ints} turnovers vs {opp}"},
  {cond:function(g){return g&&g.margin>21;},text:"After a {margin}-point blowout vs {opp}"},
  {cond:function(g){return g&&g.margin<=-21;},text:"After getting blown out by {opp}"},
  {cond:function(g){return g&&Math.abs(g.margin)<=3;},text:"After a nail-biter vs {opp}"},
  {cond:function(g){return g&&g.won&&g.streak>=3;},text:"Riding a {streak}-game win streak"},
  {cond:function(g){return g&&!g.won&&g.streak<=-3;},text:"Mired in a {streak}-game losing skid"},
  {cond:function(g){return g&&g.rushYds<50;},text:"After being held to {rushYds} rushing yards"},
  {cond:function(g){return g&&g.passTD===0&&g.ints>=2;},text:"After a scoreless passing performance with {ints} picks"},
  {cond:function(g){return g&&g.won;},text:"Coming off a win over {opp}"},
  {cond:function(g){return g&&!g.won;},text:"Coming off a loss to {opp}"}
];
export function getStatHeadline(gameCtx){
  if(!gameCtx)return "";
  for(var i=0;i<STAT_HEADLINES.length;i++){
    var h=STAT_HEADLINES[i];
    if(h.cond(gameCtx)){
      return h.text.replace("{passTD}",gameCtx.passTD||0).replace("{rushYds}",gameCtx.rushYds||0)
        .replace("{sacks}",gameCtx.sacks||0).replace("{ints}",gameCtx.ints||0)
        .replace("{margin}",Math.abs(gameCtx.margin||0)).replace("{opp}",gameCtx.opp||"OPP")
        .replace("{streak}",Math.abs(gameCtx.streak||0));
    }
  }
  return "";
}
export function getTraitMoraleExplainer(roster){
  var reasons=[];
  var hasCaptain=roster.some(function(p){return hasTrait95(p,"captain")&&!(p.injury&&p.injury.games>0);});
  var hasCancer=roster.some(function(p){return hasTrait95(p,"cancer")&&!(p.injury&&p.injury.games>0);});
  var hasMentor=roster.some(function(p){return hasTrait95(p,"mentor")&&!(p.injury&&p.injury.games>0);});
  var hasHothead=roster.some(function(p){return hasTrait95(p,"hothead")&&!(p.injury&&p.injury.games>0);});
  if(hasCaptain)reasons.push("©️ Captain +1");
  if(hasCancer)reasons.push("☢️ Cancer -1");
  if(hasMentor)reasons.push("📚 Mentor +1 rookies");
  if(hasHothead)reasons.push("🌶️ Hot Head -0.6");
  return reasons;
}
