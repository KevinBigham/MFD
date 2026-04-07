/**
 * MFD Coach Trait Modifier Calculator
 *
 * Aggregates coaching staff trait effects (HC + OC + DC) into
 * a unified modifier object with capped values for game simulation.
 */
import { COACH_TRAITS } from '../config/index.js';

export function getCoachTraitMods(t){
  var mods={stallReduction:0,bigPlayBoost:0,rzTdBoost:0,pocketBoost:0,pressureBoost:0,
    bigPlayAllowed:0,intBoost:0,intReduction:0,moraleStability:0,moraleBoost:0,
    devRate:0,qbBoost:0,counterBoost:0};
  if(!t.staff)return mods;
  [t.staff.hc,t.staff.oc,t.staff.dc].forEach(function(c){
    if(!c||!c.traits)return;
    c.traits.forEach(function(tId){
      var def=COACH_TRAITS[tId];if(!def)return;
      Object.keys(def.effects).forEach(function(k){mods[k]=(mods[k]||0)+def.effects[k];});
    });
  });
  mods.stallReduction=Math.min(mods.stallReduction,0.07);
  mods.pocketBoost=Math.min(mods.pocketBoost,0.08);
  mods.pressureBoost=Math.min(mods.pressureBoost,0.08);
  mods.intBoost=Math.min(mods.intBoost,0.03);
  mods.qbBoost=Math.min(mods.qbBoost,6);
  mods.devRate=Math.min(mods.devRate,0.25);
  mods.moraleBoost=Math.min(mods.moraleBoost,8);
  return mods;
}
