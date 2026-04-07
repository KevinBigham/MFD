/**
 * MFD Coordinator Specialties
 *
 * OC and DC specialty types with gameplay effects.
 * Assigned during staff generation, provides bonuses
 * to rushing, passing, red zone, defense, etc.
 */
import { RNG } from '../utils/index.js';

export var OC_SPECIALTIES=[
  {id:"run_guru",label:"Run Game Guru",icon:"🏃",effect:{rushMod:2,runLanes:0.03},desc:"Boosts rushing efficiency"},
  {id:"pass_arch",label:"Pass Architect",icon:"🎯",effect:{passMod:2,pocket:0.02},desc:"Elevates passing game"},
  {id:"rz_spec",label:"Red Zone Specialist",icon:"🔴",effect:{rzTdPct:0.04},desc:"Better red zone TD conversion"},
  {id:"tempo",label:"Tempo Master",icon:"⚡",effect:{drivesBonus:1},desc:"Extra offensive possessions"},
  {id:"play_action",label:"Play-Action Expert",icon:"🎭",effect:{passMod:1,stallReduction:0.02},desc:"Fewer 3-and-outs with PA"}
];
export var DC_SPECIALTIES=[
  {id:"blitz_des",label:"Blitz Designer",icon:"💨",effect:{pressureBoost:0.03},desc:"More effective blitz packages"},
  {id:"cov_spec",label:"Coverage Specialist",icon:"🛡️",effect:{covAdj:0.02,intBoost:0.01},desc:"Tighter coverage, more INTs"},
  {id:"run_stop",label:"Run Stopper",icon:"🧱",effect:{rushMod:-2},desc:"Shuts down opponent run game"},
  {id:"turnover",label:"Turnover Creator",icon:"🔄",effect:{intBoost:0.02,fumbleBoost:0.01},desc:"Forces more turnovers"},
  {id:"situational",label:"Situational Master",icon:"🧠",effect:{stallReduction:0.01,lateGameBoost:0.03},desc:"Better in crucial moments"}
];
export function assignCoordSpecialty(staffMember,role){
  var pool=role==="OC"?OC_SPECIALTIES:DC_SPECIALTIES;
  if(!staffMember)return null;
  if(staffMember.specialty75)return staffMember.specialty75;// Already assigned
  staffMember.specialty75=pool[Math.floor(RNG.ai()*pool.length)];
  return staffMember.specialty75;
}
