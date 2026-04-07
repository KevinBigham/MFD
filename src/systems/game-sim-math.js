/**
 * MFD Game Sim Math Engine (DeepSeek v99.2)
 *
 * Pure math functions for the play-by-play engine:
 * win-probability lookup, momentum decay, edge-to-probability
 * conversion, and draft pick overall rating generation.
 */
import { RNG } from '../utils/rng.js';

// Win Probability lookup table (sigmoid: 1/(1+exp(-scoreDiff*0.15*leverage)))
// leverage = 1 + (quarter-1)*0.55
export var WP_TABLE_DEEPSEEK={
  "neg21_q1":4,"neg14_q1":11,"neg7_q1":26,"0_q1":50,
  "pos7_q1":74,"pos14_q1":89,"pos21_q1":96,
  "neg21_q2":3,"neg14_q2":9,"neg7_q2":22,"0_q2":50,
  "pos7_q2":78,"pos14_q2":91,"pos21_q2":97,
  "neg21_q3":2,"neg14_q3":6,"neg7_q3":16,"0_q3":50,
  "pos7_q3":84,"pos14_q3":94,"pos21_q3":98,
  "neg21_q4":1,"neg14_q4":3,"neg7_q4":9,"0_q4":50,
  "pos7_q4":91,"pos14_q4":97,"pos21_q4":99
};

// Momentum decay: slowly drifts toward 0 each play
export function momentumDecay991(currentMomentum){
  var decay=0.5;
  if(currentMomentum>0)return Math.max(0,currentMomentum-decay);
  else if(currentMomentum<0)return Math.min(0,currentMomentum+decay);
  return 0;
}

// Edge-to-probability: maps edge (-15 to +15) to win prob [0.30, 0.70]
// edge=0→0.50, edge=+10→~0.65, edge=-10→~0.35
export function edgeToProbability991(edge){
  var k=0.1946;
  return 0.3+0.4/(1+Math.exp(-k*edge));
}

// Draft pick overall rating: Box-Muller normal distribution per round
// round: 1-7, pick: 1-32 within round. Returns integer 40-99.
export function draftPickOvr991(round,pick){
  var ranges=[{min:78,max:85},{min:72,max:79},{min:68,max:74},{min:65,max:71},{min:62,max:68},{min:58,max:64},{min:55,max:61}];
  var idx=Math.min(6,Math.max(0,round-1));
  var min=ranges[idx].min;var max=ranges[idx].max;
  var spread=max-min;var mid=(min+max)/2;var step=spread/31;
  var mean=mid+(16.5-pick)*step;var stdDev=5;
  var u=0,v=0;
  while(u===0)u=RNG.draft();
  while(v===0)v=RNG.draft();
  var z=Math.sqrt(-2.0*Math.log(u))*Math.cos(2.0*Math.PI*v);
  var rating=Math.round(mean+z*stdDev);
  if(rating<40)rating=40;if(rating>99)rating=99;return rating;
}
