/**
 * MFD Fuzzy Grade & Rating Display
 *
 * Scout-level-aware display functions that show exact values at high
 * scout levels and progressively noisier ranges at lower levels.
 */

export function gradeL(v){
  return v>=92?"A+":v>=86?"A":v>=80?"A-":v>=76?"B+":v>=72?"B":v>=68?"B-":v>=64?"C+":v>=60?"C":v>=55?"C-":v>=50?"D+":v>=45?"D":"F";
}
export function getFuzzyRating(val, scoutLvl){
  if(!val && val!==0) return "?";
  if(scoutLvl>=3) return String(val);
  var noise = scoutLvl===2 ? 3 : scoutLvl===1 ? 6 : 12;
  return Math.max(40, val-noise) + "–" + Math.min(99, val+noise);
}
export function getFuzzyGrade(ovr, scoutLvl){
  var _gradeL=function(v){return v>=92?"A+":v>=86?"A":v>=80?"A-":v>=76?"B+":v>=72?"B":v>=68?"B-":v>=64?"C+":v>=60?"C":v>=55?"C-":v>=50?"D+":v>=45?"D":"F";};
  if(scoutLvl>=3) return _gradeL(ovr);
  var noise = scoutLvl===2 ? 3 : scoutLvl===1 ? 6 : 12;
  var lo=_gradeL(Math.max(40, ovr-noise)), hi=_gradeL(Math.min(99, ovr+noise));
  return lo===hi ? lo : lo+"–"+hi;
}
