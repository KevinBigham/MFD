/**
 * MFD Scout Perception System
 *
 * Gaussian noise model for scouting accuracy. Higher scout level
 * means tighter range and more accurate perceived ratings.
 */
import { mulberry32 } from '../utils/index.js';

function getLetterGrade(n){return n>=90?"A+":n>=85?"A":n>=80?"B+":n>=75?"B":n>=65?"C+":n>=55?"C":n>=45?"D":"F";}

export var SCOUT={
  gaussian:function(mean,stdDev,seed){
    var s=mulberry32(seed);var u1=s();var u2=s();
    var z=Math.sqrt(-2*Math.log(Math.max(0.0001,u1)))*Math.cos(2*Math.PI*u2);
    return mean+z*stdDev;
  },
  getPerceived:function(trueVal,scoutLevel,playerId,week){
    var seed=(parseInt((playerId||"p0").replace(/\D/g,""))||0)+week+999;
    var noiseFactor=Math.max(1,12-Math.min(scoutLevel||0,10));// Level 10=±2, Level 0=±12
    var perceived=SCOUT.gaussian(trueVal,noiseFactor,seed);
    return Math.max(30,Math.min(99,Math.round(perceived)));
  },
  getRange:function(trueVal,scoutLevel){
    var noise=Math.max(1,12-Math.min(scoutLevel||0,10));
    var lo=Math.max(30,Math.round(trueVal-noise*1.5));
    var hi=Math.min(99,Math.round(trueVal+noise*1.5));
    return{lo:lo,hi:hi,display:lo+"–"+hi,confident:noise<=3};
  },
  getGradeRange:function(trueVal,scoutLevel){
    var r=SCOUT.getRange(trueVal,scoutLevel);
    return getLetterGrade(r.lo)+" – "+getLetterGrade(r.hi);
  }
};
