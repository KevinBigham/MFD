/**
 * MFD Film Study System
 *
 * Post-game film analysis with offensive, defensive, and special teams
 * grading, insights, and turning point narratives.
 */

import { cl } from '../utils/helpers.js';

export var FILM={
  analyze:function(gameResult,hTeam,aTeam,myId){
    if(!gameResult)return null;
    var hS=gameResult.home||0,aS=gameResult.away||0;
    var isUserHome=hTeam&&hTeam.id===myId;
    var userScore=isUserHome?hS:aS;var oppScore=isUserHome?aS:hS;
    var userTeam=isUserHome?hTeam:aTeam;var oppTeam=isUserHome?aTeam:hTeam;
    var won=userScore>oppScore;var margin=Math.abs(userScore-oppScore);
    var recap=gameResult.recap||{};
    var userRecap=isUserHome?recap.home:recap.away;
    var oppRecap=isUserHome?recap.away:recap.home;
    var offGrade=FILM.gradeOff(userScore,userRecap);
    var defGrade=FILM.gradeDef(oppScore,oppRecap);
    var stGrade=FILM.gradeST(userRecap,oppRecap);
    var insights=[];
    if(userRecap){
      if((userRecap.sacks||0)>=4)insights.push({emoji:"💥",text:"Pass protection collapsed — "+(userRecap.sacks||0)+" sacks allowed. Consider max-protect or quicker tempo.",grade:"F"});
      if((userRecap.ints||0)>=2)insights.push({emoji:"🖐️",text:(userRecap.ints||0)+" interceptions thrown. Ball security was a problem.",grade:"D"});
      if((userRecap.rushYds||0)>=120)insights.push({emoji:"🏃",text:"Ground game dominated: "+(userRecap.rushYds||0)+" rushing yards.",grade:"A"});
      if((userRecap.passYds||0)>=300)insights.push({emoji:"🎯",text:"Air attack was elite: "+(userRecap.passYds||0)+" passing yards.",grade:"A"});
    }
    if(oppRecap){
      if((oppRecap.rushYds||0)>=150)insights.push({emoji:"⚠️",text:"Opponent ran for "+(oppRecap.rushYds||0)+" yards. Run defense needs work.",grade:"D"});
      if((oppRecap.passYds||0)>=350)insights.push({emoji:"⚠️",text:"Opponent threw for "+(oppRecap.passYds||0)+" yards. Secondary got burned.",grade:"D"});
    }
    if(insights.length===0){
      insights.push(won?{emoji:"✅",text:"Solid all-around performance. No major red flags.",grade:"B"}
        :{emoji:"📋",text:"Competitive game. Small margins made the difference.",grade:"C"});
    }
    var turning="Game controlled from start to finish.";
    if(margin<=3)turning="Came down to the final drive — a true nail-biter.";
    else if(margin<=7)turning="One-score game. Execution in the red zone was the difference.";
    else if(margin>=21)turning=won?"Dominant performance from start to finish.":"Outclassed in every phase. Back to the drawing board.";
    else if(!won&&margin>=14)turning="Fell behind early and couldn't recover.";
    return{won:won,margin:margin,userScore:userScore,oppScore:oppScore,
      userTeam:userTeam?userTeam.abbr:"?",oppTeam:oppTeam?oppTeam.abbr:"?",
      grades:{off:offGrade,def:defGrade,st:stGrade},
      overall:Math.round((offGrade+defGrade+stGrade)/3),
      insights:insights,turning:turning,weather:gameResult.weather||null,
      halftime:gameResult.halftime||null,// v63: Halftime adjustment info
      captainMoments:gameResult.captainMoments||null,// v64: Captain moments
      practiceFocus:gameResult.practiceFocus||null,// v64: Practice focus
      gameplan:gameResult.gameplan||null};// v64: Gameplan Lab
  },
  gradeOff:function(pts,recap){
    var g=70;g+=(pts-17)*1.5;// +1.5 per point above 17
    if(recap){
      g+=((recap.passYds||0)-200)*0.03;
      g+=((recap.rushYds||0)-80)*0.04;
      g-=((recap.sacks||0))*3;
      g-=((recap.ints||0))*8;
      g+=((recap.passTD||0))*4;
    }
    return cl(Math.round(g),0,99);
  },
  gradeDef:function(oppPts,oppRecap){
    var g=75;g-=(oppPts-17)*1.5;// -1.5 per opp point above 17
    if(oppRecap){
      g-=((oppRecap.passYds||0)-200)*0.02;
      g-=((oppRecap.rushYds||0)-80)*0.03;
      g+=((oppRecap.sacks||0))*3;// sacks on opponent = good
      g+=((oppRecap.ints||0))*6;
    }
    return cl(Math.round(g),0,99);
  },
  gradeST:function(ur,or){
    var g=72;// baseline
    if(ur&&ur.fgMade)g+=ur.fgMade*3;
    if(ur&&ur.fgMiss)g-=ur.fgMiss*5;
    return cl(Math.round(g),40,95);
  },
  letterGrade:function(n){return n>=90?"A+":n>=85?"A":n>=80?"B+":n>=75?"B":n>=65?"C+":n>=55?"C":n>=45?"D":"F";}
};
